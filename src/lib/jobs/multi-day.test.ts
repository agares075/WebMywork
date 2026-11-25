import { test } from "node:test";
import assert from "node:assert/strict";
import { dateRange, toggleDate, selectedDates, expandDays, splitIncome, type MultiDayDraft } from "./multi-day.ts";

test("date selection and expansion support inclusive ranges, separate days, and independent daily overrides", () => {
  assert.deepEqual(dateRange("2026-11-25", "2026-11-27"), ["2026-11-25", "2026-11-26", "2026-11-27"]);
  assert.deepEqual(dateRange("2028-02-28", "2028-03-01"), ["2028-02-28", "2028-02-29", "2028-03-01"]);
  assert.deepEqual(toggleDate(["2026-11-25"], "2026-11-27"), ["2026-11-25", "2026-11-27"]);
  assert.deepEqual(toggleDate(["2026-11-25"], "2026-11-25"), []);
  assert.throws(() => selectedDates([]));
  assert.throws(() => selectedDates(["2026-11-25", "2026-11-25"]));
  assert.throws(() => dateRange("2026-11-27", "2026-11-25"));
  assert.throws(() => dateRange("2026-02-30", "2026-03-01"));
  assert.throws(() => dateRange("2026-11-01", "2026-12-02"));
  assert.equal(dateRange("2026-12-01", "2026-12-31").length, 31);
  const draft: MultiDayDraft = {
    id: "11111111-1111-4111-8111-111111111111", dates: ["2026-11-30", "2026-11-25", "2026-11-27"],
    mode: "individual", rangeStart: "", rangeEnd: "", incomeMode: "per_day", totalIncome: 0, payAfterLast: false,
    common: { client: "ลูกค้า", workDate: "2026-11-25", startTime: "09:00", endTime: "18:00", details: "", location: "", checkIn: "2026-11-25T22:00", checkOut: "2026-11-26T01:00", income: 100, creditDays: 7, outfit: "Black Polo", shoes: "1 – Black canvas shoes", comment: "", reminderEnabled: false, expenses: [{ id: "22222222-2222-4222-8222-222222222222", label: "เดินทาง", amount: 10 }] },
    overrides: { "2026-11-27": { income: 200, startTime: "10:00", expenses: [] } }
  };
  const days = expandDays(draft);
  assert.deepEqual(days.map((day) => day.input.workDate), ["2026-11-25", "2026-11-27", "2026-11-30"]);
  assert.deepEqual(days.map((day) => day.input.income), [100, 200, 100]);
  assert.equal(days[1].input.startTime, "10:00");
  assert.equal(days[1].input.expenses.length, 0);
  assert.equal(days[2].input.checkOut, "2026-12-01T01:00");
  assert.equal(new Set(days.map((day) => day.id)).size, 3);
  assert.notEqual(days[0].input.expenses[0].id, days[2].input.expenses[0].id);
  assert.deepEqual(expandDays(draft), days);
  assert.equal(draft.common.income, 100);
  assert.deepEqual(expandDays({ ...draft, overrides: {}, incomeMode: "total", totalIncome: 100 }).map((day) => day.input.income), [33.34, 33.33, 33.33]);
});

test("income splitting preserves every satang, including remainders and amounts smaller than the number of days", () => {
  assert.deepEqual(splitIncome(100, 3), [33.34, 33.33, 33.33]);
  assert.deepEqual(splitIncome(.01, 3), [.01, 0, 0]);
  assert.deepEqual(splitIncome(0, 2), [0, 0]);
  for (const total of [0, .01, 1, 100.01, 999999999.99]) for (let count = 1; count <= 31; count++) {
    const amounts = splitIncome(total, count).map((amount) => Math.round(amount * 100));
    assert.equal(amounts.reduce((sum, amount) => sum + amount, 0), Math.round(total * 100));
    assert.ok(Math.max(...amounts) - Math.min(...amounts) <= 1);
  }
  assert.throws(() => splitIncome(-1, 3));
  assert.throws(() => splitIncome(1.001, 3));
  assert.throws(() => splitIncome(1, 0));
  assert.throws(() => splitIncome(1, 32));
});
