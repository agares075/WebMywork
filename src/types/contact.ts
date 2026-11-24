import type { z } from "zod";
import type { contactInputSchema } from "@/lib/contacts/validation";

export type ContactInput = z.infer<typeof contactInputSchema>;
export type Contact = ContactInput & { id: string; createdAt: string; updatedAt: string };
export type ContactHistory = Contact & { jobCount: number; lastJobDate: string };
