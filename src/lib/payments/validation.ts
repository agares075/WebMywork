import { z } from "zod";
import { paymentStatuses } from "./logic";
import { isCalendarDate } from "../calendar";

export const paymentInputSchema = z.object({
  paymentStatus: z.enum(paymentStatuses),
  paidAmount: z.number().finite().min(0).max(999999999.99).refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < .0001),
  paidDate: z.string().refine((value) => value === "" || isCalendarDate(value)),
  updatedAt: z.iso.datetime()
}).strict().superRefine((input, context) => {
  if ((input.paidAmount > 0 || input.paymentStatus === "paid") && !input.paidDate) context.addIssue({ code: "custom", path: ["paidDate"], message: "กรุณาระบุวันที่รับเงิน" });
  if (["not_invoiced", "waiting_for_payment"].includes(input.paymentStatus) && input.paidAmount !== 0) context.addIssue({ code: "custom", path: ["paidAmount"], message: "กรุณาเลือกชำระบางส่วนเมื่อมีเงินที่รับแล้ว" });
  if (input.paidAmount === 0 && input.paidDate && input.paymentStatus !== "paid") context.addIssue({ code: "custom", path: ["paidDate"], message: "กรุณาล้างวันที่รับเงินเมื่อยังไม่ได้รับเงิน" });
});
export type PaymentInput = z.infer<typeof paymentInputSchema>;
export function paymentAmountError(input: Pick<PaymentInput, "paymentStatus" | "paidAmount">, income: number): string {
  if (Math.round(input.paidAmount * 100) > Math.round(income * 100)) return "ยอดรับแล้วต้องไม่เกินรายรับของงาน";
  if (input.paymentStatus === "paid" && Math.round(input.paidAmount * 100) !== Math.round(income * 100)) return "สถานะชำระแล้วต้องรับเงินครบตามรายรับของงาน";
  if (input.paymentStatus === "partially_paid" && (input.paidAmount <= 0 || input.paidAmount >= income)) return "ยอดชำระบางส่วนต้องมากกว่า 0 และน้อยกว่ารายรับของงาน";
  if (input.paymentStatus === "overdue" && input.paidAmount >= income) return "งานเกินกำหนดต้องมียอดค้างรับ";
  return "";
}
