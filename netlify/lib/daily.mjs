// Daily job: visit reminders for customers and a summary email for the business.
import { getTicket, listDocs, listTickets, saveTicket } from "./store.mjs";
import { getSettings } from "./settings.mjs";
import { businessDigestEmail, customerReminderEmail, sendEmail } from "./email.mjs";
import { OPEN_STATUSES, now, sastDate } from "./util.mjs";

export async function runDaily() {
  const s = await getSettings();
  const today = sastDate();
  const tomorrow = sastDate(new Date(Date.now() + 24 * 3600 * 1000));
  const tickets = await listTickets();
  let reminders = 0;

  for (const sum of tickets) {
    if (sum.appointment?.date !== tomorrow || !OPEN_STATUSES.includes(sum.status) || !sum.email) continue;
    const t = await getTicket(sum.id);
    if (!t || t.appointment?.reminderSentFor === tomorrow) continue;
    const r = await sendEmail(customerReminderEmail(t, s));
    if (r.sent) {
      t.appointment.reminderSentFor = tomorrow;
      t.events.push({ at: now(), type: "email", public: false, by: "system", text: "Visit reminder emailed to customer" });
      await saveTicket(t);
      reminders++;
    }
  }

  const cutoff = Date.now() - 12 * 3600 * 1000;
  const digest = {
    today: tickets.filter((t) => t.appointment?.date === today && OPEN_STATUSES.includes(t.status)),
    waiting: tickets.filter((t) => t.status === "new" && Date.parse(t.createdAt) < cutoff),
    unread: tickets.filter((t) => t.unread),
    overdue: (await listDocs()).filter((d) => d.type === "invoice" && d.status === "sent" && d.dueDate && d.dueDate < today),
  };
  const anything = Object.values(digest).some((l) => l.length);
  if (anything && s.notifyEmail) await sendEmail(businessDigestEmail(s, digest));
  return { reminders, ...Object.fromEntries(Object.entries(digest).map(([k, v]) => [k, v.length])) };
}
