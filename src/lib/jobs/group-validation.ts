import { z } from "zod";
import { jobInputSchema } from "./validation";
import { paymentInputSchema } from "../payments/validation";
import { paymentStatuses } from "../payments/logic";

export const dayPaymentSchema = z.object({ paymentStatus: z.enum(paymentStatuses), paidAmount: z.number().finite().min(0), paidDate: z.string() }).strict().superRefine((value, context) => {
  const result = paymentInputSchema.safeParse({ ...value, updatedAt: "2000-01-01T00:00:00.000Z" });
  if (!result.success) context.addIssue({ code: "custom", message: "กรุณาตรวจยอดและวันที่รับเงินของวันนั้น" });
});
export const groupDaySchema = z.object({ id: z.uuid(), input: jobInputSchema, payment: dayPaymentSchema.optional() }).strict();
export const groupInputSchema = z.object({ days: z.array(groupDaySchema).min(1).max(31), payAfterLast: z.boolean().optional() }).strict().superRefine((value, context) => {
  if (new Set(value.days.map((day) => day.input.workDate)).size !== value.days.length) context.addIssue({ code: "custom", message: "วันที่ทำงานต้องไม่ซ้ำกัน" });
  if (new Set(value.days.map((day) => day.id)).size !== value.days.length) context.addIssue({ code: "custom", message: "รหัสงานต้องไม่ซ้ำกัน" });
});
export const groupDeleteSchema = z.object({ versions: z.array(z.object({ id: z.uuid(), updatedAt: z.iso.datetime() }).strict()).min(1).max(31) }).strict().refine((value) => new Set(value.versions.map((day) => day.id)).size === value.versions.length);
export type GroupInput = z.infer<typeof groupInputSchema>;
