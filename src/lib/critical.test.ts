import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, bangkokDate, paymentCountdown } from "./calculations.ts";
import { effectivePaymentStatus, paymentTotals, unpaidAmount } from "./payments/logic.ts";

test("payment dates use Bangkok days and only unpaid jobs become overdue after the due date", () => {
  assert.equal(addDays("2028-02-28", 2), "2028-03-01");
  assert.equal(bangkokDate(new Date("2028-02-28T17:01:00Z")), "2028-02-29");
  assert.equal(paymentCountdown("2028-03-01", "2028-02-29"), "อีก 1 วัน");
  const job = { income: 1000, paidAmount: 250, paymentStatus: "partially_paid", expectedPaymentDate: "2028-03-01" };
  assert.equal(effectivePaymentStatus(job, "2028-03-01"), "partially_paid");
  assert.equal(effectivePaymentStatus(job, "2028-03-02"), "overdue");
  assert.equal(effectivePaymentStatus({ ...job, paymentStatus: "paid", paidAmount: 1000 }, "2028-03-02"), "paid");
  assert.equal(effectivePaymentStatus({ ...job, paymentStatus: "cancelled" }, "2028-03-02"), "cancelled");
  assert.equal(effectivePaymentStatus({ ...job, income: 0, paidAmount: 0, paymentStatus: "not_invoiced" }, "2028-03-02"), "not_invoiced");
});

test("totals use cents, subtract partial payments, and retain cancelled expenses without cancelled income", () => {
  const expense = (amount: number) => ({ id: "expense", label: "เดินทาง", amount });
  const job = { income: .1, paidAmount: 0, paymentStatus: "waiting_for_payment", syncStatus: "synced" as const, expenses: [expense(.1)] };
  assert.deepEqual(paymentTotals([
    job,
    { ...job, income: .2, paidAmount: .1, paymentStatus: "partially_paid", expenses: [expense(.2)] },
    { ...job, income: 10, paymentStatus: "cancelled", expenses: [expense(.3)] },
    { ...job, income: 99, syncStatus: "delete_pending", expenses: [expense(99)] }
  ]), { income: .3, expenses: .6, net: -.3, outstanding: .2 });
  assert.equal(unpaidAmount({ ...job, income: 1000, paidAmount: 250 }), 750);
  assert.equal(unpaidAmount({ ...job, paymentStatus: "paid" }), 0);
  assert.equal(unpaidAmount({ ...job, paymentStatus: "cancelled" }), 0);
});
