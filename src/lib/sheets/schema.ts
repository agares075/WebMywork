import type { SheetName } from "@/types/sheets";

// Column order is a storage contract; add future columns only through a migration.
export const sheetHeaders = {
  Jobs: [
    "id", "client", "work_date", "start_time", "end_time", "details", "location",
    "check_in", "check_out", "total_hours", "income", "outfit", "shoes", "credit_days",
    "expected_payment_date", "comment", "payment_status", "paid_amount", "paid_date",
    "team_member_ids", "calendar_event_id", "payment_reminder_event_id", "created_at", "updated_at",
    "payment_reminder_enabled", "calendar_sync_status"
  ],
  Expenses: ["id", "job_id", "label", "amount", "created_at", "updated_at"],
  Contacts: ["id", "phone", "real_name", "nickname", "created_at", "updated_at"],
  Files: ["id", "job_id", "drive_file_id", "name", "mime_type", "url", "created_at"],
  Summary: ["month", "income", "expenses", "net_profit", "unpaid_total", "client", "job_count"]
} as const satisfies Record<SheetName, readonly string[]>;

export const sheetNames = Object.keys(sheetHeaders) as SheetName[];
