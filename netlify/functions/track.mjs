// Customer-facing endpoints. Access needs the ticket number plus its secret key (from the tracking link),
// or the ticket number plus the phone number used on the request.
//   GET  /api/track?id=&k=          ticket status, visit, messages, documents
//   POST /api/track/reply            { id, k, message }
//   POST /api/track/confirm          { id, k }  customer confirms the visit date
//   POST /api/track/lookup           { id, phone } -> { k }
//   GET  /api/track/ics?id=&k=       calendar file for the visit
import { getTicket, saveTicket, getDoc } from "../lib/store.mjs";
import { getSettings } from "../lib/settings.mjs";
import { appointmentIcs, businessActivityEmail, sendEmail, ticketAdminLink } from "../lib/email.mjs";
import { docUrl } from "../lib/docs.mjs";
import { STATUSES, cleanText, error, fullName, json, normalisePhone, now, readJson, safeEqual, statusInfo } from "../lib/util.mjs";

async function load(id, k) {
  const t = await getTicket(id);
  return t && k && safeEqual(k, t.token) ? t : null;
}

async function publicView(t) {
  const docs = [];
  for (const n of t.docs || []) {
    const d = await getDoc(n);
    if (d && d.status !== "draft" && d.status !== "cancelled") {
      docs.push({ number: d.number, type: d.type, status: d.status, total: d.totals.total, issueDate: d.issueDate, url: docUrl(d) });
    }
  }
  return {
    id: t.id,
    name: t.customer.name,
    status: t.status,
    statusLabel: statusInfo(t.status).label,
    statusText: statusInfo(t.status).customer,
    steps: STATUSES.filter((s) => s.key !== "cancelled").map((s) => ({ key: s.key, label: s.label })),
    createdAt: t.createdAt,
    services: t.services,
    location: t.customer.location,
    message: t.message,
    appointment: t.appointment,
    docs,
    events: t.events.filter((e) => e.public).map((e) => ({
      at: e.at, type: e.type, text: e.text || "", status: e.status ? statusInfo(e.status).label : undefined,
      appointment: e.appointment, from: e.by === "customer" ? "You" : "Zicco Plumbers",
    })),
  };
}

export default async (req) => {
  const url = new URL(req.url);
  const action = url.pathname.replace(/^\/api\/track\/?/, "");

  if (req.method === "GET" && (action === "" || action === "ics")) {
    const t = await load(url.searchParams.get("id"), url.searchParams.get("k"));
    if (!t) return error("We couldn't find that request. Check the link or look it up with your phone number.", 404);
    if (action === "ics") {
      const ics = appointmentIcs(t);
      if (!ics) return error("No visit is scheduled yet.", 404);
      return new Response(ics, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": `attachment; filename="zicco-plumbers-${t.id}.ics"` } });
    }
    return json(await publicView(t));
  }

  if (req.method !== "POST") return error("Method not allowed", 405);
  let body;
  try { body = await readJson(req); } catch (e) { return error(e.message); }

  if (action === "lookup") {
    const t = await getTicket(String(body.id || "").trim().toUpperCase());
    const ok = t && normalisePhone(body.phone) && normalisePhone(body.phone) === normalisePhone(t.customer.phone);
    if (!ok) return error("No request matches that ticket number and phone number.", 404);
    return json({ id: t.id, k: t.token });
  }

  const t = await load(body.id, body.k);
  if (!t) return error("Request not found.", 404);
  const s = await getSettings();

  if (action === "reply") {
    const message = cleanText(body.message, 3000);
    if (!message) return error("Please write a message.");
    t.events.push({ at: now(), type: "message", public: true, by: "customer", text: message });
    t.unread = true;
    await saveTicket(t);
    if (s.notifyEmail) {
      await sendEmail(businessActivityEmail(s, {
        subject: `${t.id}: new message from ${fullName(t.customer)}`, title: `${fullName(t.customer)} replied on ticket ${t.id}.`,
        body: message, link: ticketAdminLink(t), replyTo: t.customer.email || undefined,
      }));
    }
    return json(await publicView(t));
  }

  if (action === "confirm") {
    if (!t.appointment) return error("There is no visit to confirm.");
    t.appointment.confirmedAt = now();
    t.events.push({ at: now(), type: "message", public: true, by: "customer", text: "I confirm the visit date." });
    t.unread = true;
    await saveTicket(t);
    if (s.notifyEmail) {
      await sendEmail(businessActivityEmail(s, {
        subject: `${t.id}: visit confirmed by ${fullName(t.customer)}`, title: `${fullName(t.customer)} confirmed the visit on ${t.appointment.date}.`,
        link: ticketAdminLink(t),
      }));
    }
    return json(await publicView(t));
  }

  return error("Not found", 404);
};

export const config = { path: ["/api/track", "/api/track/*"] };
