import fs from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { docTitle, docUrl } from "./docs.mjs";
import {
  BUSINESS, SITE_URL, esc, formatAppointment, formatDate, formatMoney, fullName, statusInfo, trackUrl, whatsappLink,
} from "./util.mjs";

// ---------- sending ----------
// Two options (see README):
//  1. Gmail / any SMTP:  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS   (easiest for a demo, can send to anyone)
//  2. Resend API:        RESEND_API_KEY                                (needs a verified domain to email customers)
// With neither set, emails are skipped (or saved to EMAIL_OUTBOX_DIR by the local dev server).
export const emailMode = () => (process.env.SMTP_HOST && process.env.SMTP_USER ? "smtp" : process.env.RESEND_API_KEY ? "resend" : "off");
export const emailConfigured = () => emailMode() !== "off";

const fromAddress = () =>
  process.env.EMAIL_FROM || (process.env.SMTP_USER ? `Zicco Plumbers <${process.env.SMTP_USER}>` : "Zicco Plumbers <onboarding@resend.dev>");

let transporter;
function smtp() {
  transporter ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

// attachments: [{ filename, content: Buffer|string, contentType }]
export async function sendEmail({ to, bcc, subject, html, replyTo, attachments }) {
  if (!to) return { skipped: "no recipient" };
  const mode = emailMode();
  try {
    if (mode === "smtp") {
      await smtp().sendMail({ from: fromAddress(), to, bcc: bcc || undefined, subject, html, replyTo: replyTo || undefined, attachments });
      return { sent: true };
    }
    if (mode === "resend") {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: fromAddress(), to: [to], bcc: bcc ? [bcc] : undefined, subject, html, reply_to: replyTo || undefined,
          attachments: attachments?.map((a) => ({ filename: a.filename, content: Buffer.from(a.content).toString("base64") })),
        }),
      });
      if (!res.ok) {
        console.error("Resend error", res.status, await res.text());
        return { error: `Email failed (${res.status})` };
      }
      return { sent: true };
    }
  } catch (e) {
    console.error("Email error", e);
    return { error: "Email failed: " + e.message };
  }
  if (process.env.EMAIL_OUTBOX_DIR) {
    const dir = process.env.EMAIL_OUTBOX_DIR;
    await fs.mkdir(dir, { recursive: true });
    const base = path.join(dir, `${Date.now()}-${String(to).replace(/[^a-z0-9@.]/gi, "_")}`);
    await fs.writeFile(base + ".html", `<!-- To: ${esc(to)}${bcc ? ` | Bcc: ${esc(bcc)}` : ""} | Subject: ${esc(subject)} -->\n${html}`);
    for (const a of attachments || []) await fs.writeFile(`${base}-${a.filename}`, a.content);
  }
  console.log(`[email not configured, skipped] to=${to} subject=${subject}`);
  return { skipped: process.env.EMAIL_SKIP_REASON || "email is not set up yet (see README)" };
}

// ---------- layout ----------
function layout(s, title, inner) {
  return `<!doctype html><html><body style="margin:0;background:#f3f1ec;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#133c4b;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:700;border-bottom:5px solid #1d5c73">${esc(s.businessName)}
<div style="font-size:12px;font-weight:400;opacity:.8;margin-top:2px">${esc(s.registration)}</div></td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:20px;margin:0 0 16px;color:#133c4b">${title}</h1>
${inner}
</td></tr>
<tr><td style="background:#f7f5f0;padding:18px 28px;font-size:13px;color:#5b6672;line-height:1.5">
${esc(s.businessName)} &middot; ${esc(s.address).replace(/\n/g, ", ")}<br>
Call or WhatsApp <a href="tel:${BUSINESS.phoneTel}" style="color:#1d5c73">${esc(s.phone)}</a> &middot; <a href="${SITE_URL}" style="color:#1d5c73">${esc(s.website)}</a>
</td></tr></table></td></tr></table></body></html>`;
}

const p = (s) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${s}</p>`;
const button = (href, label, color = "#1d5c73") =>
  `<p style="margin:22px 0"><a href="${href}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px">${label}</a></p>`;
const box = (label, body, color = "#1d5c73") =>
  `<div style="border-left:4px solid ${color};background:#f3f7f8;border-radius:6px;padding:12px 16px;margin:0 0 14px"><div style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#5b6672;font-weight:700;margin-bottom:4px">${label}</div><div style="font-size:15px;line-height:1.55">${body}</div></div>`;
const nl2br = (s) => esc(s).replace(/\n/g, "<br>");

function table(rows) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;margin:0 0 14px">${rows
    .map(([k, v]) => `<tr><td style="padding:7px 10px 7px 0;color:#5b6672;width:120px;vertical-align:top;border-bottom:1px solid #eee">${k}</td><td style="padding:7px 0;border-bottom:1px solid #eee">${esc(v)}</td></tr>`)
    .join("")}</table>`;
}

const requestTable = (t) => table([
  ["Ticket", t.id], ["Name", fullName(t.customer)], ["Phone", t.customer.phone], ["Email", t.customer.email || "Not given"],
  ["Location", t.customer.location], ["Services", (t.services || []).join(", ")], ["Source", t.source],
]);

// ---------- calendar invite ----------
export function appointmentIcs(t) {
  const a = t.appointment;
  if (!a?.date) return null;
  const [h, m] = (a.time || "08:00").split(":").map(Number);
  const [y, mo, d] = a.date.split("-").map(Number);
  const start = new Date(Date.UTC(y, mo - 1, d, h - 2, m)); // SAST is UTC+2
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const fmt = (dt) => dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const e = (s) => String(s || "").replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Zicco Plumbers//Tickets//EN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${t.id}-${a.date}@ziccoplumbersgp.co.za`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${e(`Zicco Plumbers visit (${t.id})`)}`, `LOCATION:${e(t.customer.location)}`,
    `DESCRIPTION:${e(`${(t.services || []).join(", ")}${a.window ? `\nArrival window: ${a.window}` : ""}${a.note ? `\n${a.note}` : ""}\nQuestions? Call ${BUSINESS.phone}\n${trackUrl(t)}`)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

const icsAttachment = (t) => {
  const ics = appointmentIcs(t);
  return ics ? [{ filename: `zicco-plumbers-${t.id}.ics`, content: ics, contentType: "text/calendar" }] : undefined;
};

// ---------- customer emails (tickets) ----------
export function customerReceivedEmail(t, s) {
  const inner =
    p(`Hi ${esc(t.customer.name)},`) +
    p(`Thank you for contacting ${esc(s.businessName)}. We've received your request and will be in touch soon.`) +
    box("Your ticket number", `<strong style="font-size:18px">${esc(t.id)}</strong>`) +
    requestTable(t) +
    p("You can follow your request, read our messages and reply to us here:") +
    button(trackUrl(t), "Track your request") +
    p(`If it's urgent, call or WhatsApp us on <a href="tel:${BUSINESS.phoneTel}">${esc(s.phone)}</a> and quote ticket ${esc(t.id)}.`);
  return { to: t.customer.email, subject: `We've received your request (${t.id})`, html: layout(s, "Request received", inner) };
}

export function customerUpdateEmail(t, changes, s) {
  const st = statusInfo(t.status);
  let inner = p(`Hi ${esc(t.customer.name)},`) + p(`There's an update on your request <strong>${esc(t.id)}</strong>.`);
  if (changes.status) inner += box("Status", `<strong>${esc(st.label)}</strong><br>${esc(st.customer)}`);
  if (changes.appointment && t.appointment) {
    inner += box("We will come on", `<strong>${esc(formatAppointment(t.appointment))}</strong>${t.appointment.note ? `<br>${nl2br(t.appointment.note)}` : ""}<br><span style="color:#5b6672;font-size:13px">A calendar invite is attached.</span>`, "#18794a");
  }
  if (changes.appointmentCancelled) inner += box("Visit", "Your scheduled visit has been cancelled. We'll be in touch to arrange a new date.", "#b42318");
  if (changes.message) inner += box(`Message from ${esc(changes.messageBy || s.businessName)}`, nl2br(changes.message));
  if (t.status === "completed" && changes.status) {
    inner += p(`Thank you for choosing ${esc(s.businessName)}.`);
    if (s.googleReviewUrl) inner += p("If you're happy with our work, a quick Google review would help us a lot:") + button(s.googleReviewUrl, "Leave a Google review", "#18794a");
  }
  inner += button(trackUrl(t), "View your request") + p(`You can reply on your tracking page, or call or WhatsApp <a href="tel:${BUSINESS.phoneTel}">${esc(s.phone)}</a>.`);
  const subject = changes.appointment && t.appointment
    ? `We will come on ${formatAppointment({ date: t.appointment.date, time: t.appointment.time })} (${t.id})`
    : changes.status ? `${st.label}: your request ${t.id}`
    : `New message about your request (${t.id})`;
  return { to: t.customer.email, subject, html: layout(s, "Update on your request", inner), attachments: changes.appointment ? icsAttachment(t) : undefined };
}

export function customerReminderEmail(t, s) {
  const inner = p(`Hi ${esc(t.customer.name)},`) +
    p(`This is a reminder that ${esc(s.businessName)} is coming tomorrow.`) +
    box("Visit", `<strong>${esc(formatAppointment(t.appointment))}</strong><br>${esc(t.customer.location)}`, "#18794a") +
    p("If the time no longer suits you, please let us know as soon as possible.") + button(trackUrl(t), "View your request");
  return { to: t.customer.email, subject: `Reminder: our visit is tomorrow (${t.id})`, html: layout(s, "See you tomorrow", inner), attachments: icsAttachment(t) };
}

// ---------- quotes & invoices ----------
export function docEmail(d, s, pdf, message) {
  const title = docTitle(d, s);
  const isQuote = d.type === "quote";
  const items = d.items.map((i) => `<tr><td style="padding:8px 8px 8px 0;border-bottom:1px solid #eee">${nl2br(i.description)}<div style="color:#5b6672;font-size:12px">${i.qty} &times; ${esc(formatMoney(i.unitPrice))}</div></td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${esc(formatMoney(i.qty * i.unitPrice))}</td></tr>`).join("");
  const totals = `<tr><td style="padding:8px 8px 4px 0;color:#5b6672">Subtotal</td><td style="text-align:right">${esc(formatMoney(d.totals.subtotal))}</td></tr>` +
    (Number(d.vatRate) > 0 ? `<tr><td style="padding:4px 8px 4px 0;color:#5b6672">VAT (${d.vatRate}%)</td><td style="text-align:right">${esc(formatMoney(d.totals.vat))}</td></tr>` : "") +
    `<tr><td style="padding:10px 8px 0 0;font-weight:700;font-size:17px">${isQuote ? "Total" : d.status === "paid" ? "Total (paid)" : "Total due"}</td><td style="padding-top:10px;text-align:right;font-weight:700;font-size:17px;color:#133c4b">${esc(formatMoney(d.totals.total))}</td></tr>`;
  let inner = p(`Hi ${esc(d.client.name || "there")},`);
  inner += p(isQuote
    ? `Please find your quote <strong>${esc(d.number)}</strong> from ${esc(s.businessName)} below. The PDF is attached.`
    : d.status === "paid"
      ? `Thank you, we've received your payment for invoice <strong>${esc(d.number)}</strong>. The paid invoice is attached for your records.`
      : `Please find invoice <strong>${esc(d.number)}</strong> from ${esc(s.businessName)} below. The PDF is attached.`);
  if (message) inner += box(`Message from ${esc(s.businessName)}`, nl2br(message));
  inner += table([
    [isQuote ? "Quote no." : "Invoice no.", d.number],
    ["Date", formatDate(d.issueDate)],
    [isQuote ? "Valid until" : "Due date", formatDate(d.dueDate)],
  ]);
  inner += `<table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;border-collapse:collapse;margin:0 0 18px">${items}${totals}</table>`;
  if (!isQuote && d.status !== "paid" && s.accountNumber) {
    inner += box("Payment details", [s.bankName && `Bank: ${esc(s.bankName)}`, `Account name: ${esc(s.accountName)}`, `Account number: ${esc(s.accountNumber)}`, s.branchCode && `Branch code: ${esc(s.branchCode)}`, `Reference: <strong>${esc(d.number)}</strong>`].filter(Boolean).join("<br>"));
  }
  inner += button(docUrl(d), isQuote ? "View and accept quote" : "View invoice online", isQuote ? "#18794a" : "#1d5c73");
  inner += p(`Questions? Reply to this email or call ${esc(s.phone)}.`);
  const subject = isQuote ? `Quote ${d.number} from ${s.businessName}`
    : d.status === "paid" ? `Receipt: invoice ${d.number} paid` : `${title} ${d.number} from ${s.businessName}`;
  return {
    to: d.client.email,
    bcc: s.notifyEmail || undefined,
    subject,
    html: layout(s, `${title} ${esc(d.number)}`, inner),
    replyTo: s.notifyEmail || s.email || undefined,
    attachments: [{ filename: `${d.number}.pdf`, content: pdf, contentType: "application/pdf" }],
  };
}

// ---------- business emails ----------
const adminLink = (hash) => `${SITE_URL}/admin/#${hash}`;

export function businessNewTicketEmail(t, s) {
  const inner =
    p(`A new request has come in${t.source === "website" ? " from the website" : ""}.`) + requestTable(t) +
    (t.message ? box("Message", nl2br(t.message)) : "") +
    (t.photo ? p("A photo was attached. Open the ticket to see it.") : "") +
    button(adminLink(`/t/${t.id}`), "Open ticket") +
    p(`<a href="tel:${esc(t.customer.phone)}">Call ${esc(t.customer.phone)}</a> &middot; <a href="${whatsappLink(t.customer.phone, `Hi ${t.customer.name}, this is ${s.businessName} about your request ${t.id}.`)}">WhatsApp</a>`);
  return { to: s.notifyEmail, subject: `New request ${t.id}: ${(t.services || []).join(", ")} in ${t.customer.location}`, html: layout(s, `New request ${esc(t.id)}`, inner), replyTo: t.customer.email || undefined };
}

export function businessActivityEmail(s, { subject, title, body, link, replyTo }) {
  const inner = p(esc(title)) + (body ? box("Message", nl2br(body)) : "") + button(link, "Open in dashboard");
  return { to: s.notifyEmail, subject, html: layout(s, esc(subject), inner), replyTo };
}

export const ticketAdminLink = (t) => adminLink(`/t/${t.id}`);
export const docAdminLink = (d) => adminLink(`/d/${d.number}`);

export function businessDigestEmail(s, { waiting, today, unread, overdue }) {
  const list = (items, fmt) => items.length
    ? `<ul style="padding-left:18px;margin:0 0 14px">${items.map(fmt).map((x) => `<li style="margin:4px 0">${x}</li>`).join("")}</ul>`
    : p("None.");
  const tLink = (t) => `<a href="${adminLink(`/t/${t.id}`)}">${esc(t.id)}</a>`;
  const inner =
    `<h2 style="font-size:16px;margin:18px 0 8px">Today's visits (${today.length})</h2>` +
    list(today, (t) => `${tLink(t)} ${esc(t.name)} ${esc(t.surname)}, ${esc(t.location)}${t.appointment?.time ? ` at ${esc(t.appointment.time)}` : ""}`) +
    `<h2 style="font-size:16px;margin:18px 0 8px">New requests waiting for a reply (${waiting.length})</h2>` +
    list(waiting, (t) => `${tLink(t)} ${esc(t.name)} ${esc(t.surname)}: ${esc((t.services || []).join(", "))}`) +
    `<h2 style="font-size:16px;margin:18px 0 8px">Unread customer replies (${unread.length})</h2>` +
    list(unread, (t) => `${tLink(t)} ${esc(t.name)} ${esc(t.surname)}`) +
    `<h2 style="font-size:16px;margin:18px 0 8px">Overdue invoices (${overdue.length})</h2>` +
    list(overdue, (d) => `<a href="${adminLink(`/d/${d.number}`)}">${esc(d.number)}</a> ${esc(d.clientName)}: ${esc(formatMoney(d.total))}, due ${esc(formatDate(d.dueDate))}`) +
    button(`${SITE_URL}/admin/`, "Open dashboard");
  return { to: s.notifyEmail, subject: `Daily summary: ${today.length} visits today, ${waiting.length} new requests`, html: layout(s, "Daily summary", inner) };
}
