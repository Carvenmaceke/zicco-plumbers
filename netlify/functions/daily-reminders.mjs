// Runs every morning at 06:00 South African time (04:00 UTC):
//  - emails customers whose visit is tomorrow
//  - emails the business a summary: today's visits, unanswered requests, unread replies, overdue invoices
import { runDaily } from "../lib/daily.mjs";

export default async () => {
  const result = await runDaily();
  console.log("daily-reminders", result);
};

export const config = { schedule: "0 4 * * *" };
