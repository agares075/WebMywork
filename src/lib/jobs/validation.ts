import { z } from "zod";

export const outfits = ["All Black Private", "Black Polo", "Black Shirt", "Black Short-Sleeve Shirt"] as const;
export const shoes = ["1 – Black canvas shoes", "2 – Sandals", "3 – Any canvas shoes"] as const;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, "วันที่ไม่ถูกต้อง");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const stamp = z.union([z.literal(""), z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value)) return false;
  return date.safeParse(value.slice(0, 10)).success;
}, "วันและเวลาไม่ถูกต้อง")]);
const money = z.number().finite().min(0).max(999999999.99).refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < .0001, "ระบุทศนิยมไม่เกิน 2 ตำแหน่ง");

export const jobInputSchema = z.object({
  client: z.string().trim().min(1, "กรุณาระบุผู้ว่าจ้าง").max(200),
  workDate: date,
  startTime: time,
  endTime: time,
  details: z.string().trim().max(10000),
  location: z.string().trim().max(500),
  checkIn: stamp,
  checkOut: stamp,
  income: money,
  outfit: z.enum(outfits),
  shoes: z.enum(shoes),
  creditDays: z.number().int().min(0).max(3650),
  comment: z.string().trim().max(10000),
  reminderEnabled: z.boolean(),
  expenses: z.array(z.object({ id: z.uuid(), label: z.string().trim().min(1, "กรุณาระบุรายการค่าใช้จ่าย").max(200), amount: money }).strict()).max(50),
  teamMemberIds: z.array(z.uuid()).max(100).refine((ids) => new Set(ids).size === ids.length).optional(),
  baseUpdatedAt: z.iso.datetime().optional()
}).strict().superRefine((value, ctx) => {
  if (value.checkOut && !value.checkIn) ctx.addIssue({ code: "custom", path: ["checkIn"], message: "กรุณาระบุเวลาเช็กอิน" });
  if (value.checkIn && value.checkOut && value.checkOut < value.checkIn) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "เวลาเช็กเอาต์ต้องไม่ก่อนเวลาเช็กอิน" });
  if (new Set(value.expenses.map((item) => item.id)).size !== value.expenses.length) ctx.addIssue({ code: "custom", path: ["expenses"], message: "รายการค่าใช้จ่ายซ้ำกัน" });
});
