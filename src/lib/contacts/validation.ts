import { z } from "zod";

export const contactInputSchema = z.object({
  phone: z.string().trim().min(1, "กรุณาระบุเบอร์โทรศัพท์").max(32).regex(/^[+\d\s().\-๐-๙]+$/, "เบอร์โทรศัพท์ไม่ถูกต้อง").refine((value) => value.replace(/[^0-9๐-๙]/g, "").length >= 6, "เบอร์โทรศัพท์ต้องมีอย่างน้อย 6 หลัก"),
  realName: z.string().trim().min(1, "กรุณาระบุชื่อจริง").max(150),
  nickname: z.string().trim().max(80)
}).strict();
