// Dashboard API. Everything under /api/admin/* needs a login (except /login).
import { runDaily } from "../lib/daily.mjs";
import { checkLogin, clearCookie, currentUser, sessionCookie, usingDemoLogin } from "../lib/auth.mjs";
import {
  createTicket, deleteDoc, deleteTicket, getDoc, getFile, getTicket, listDocs, listTickets, nextNumber, saveDoc, saveTicket,
} from "../lib/store.mjs";
import { getSettings, updateSettings } from "../lib/settings.mjs";
import { DOC_STATUSES, applyDocInput, docUrl, newDoc, renderPdf } from "../lib/docs.mjs";
import { customerUpdateEmail, docEmail, emailConfigured, emailMode, sendEmail } from "../lib/email.mjs";
import {
  SERVICES, SOURCES, STATUS_KEYS, clean, cleanText, error, fullName, json, newToken, now, readJson, statusInfo, trackUrl, validEmail, validPhone, formatAppointment,
} from "../lib/util.mjs";

const ok = (data) => json({ ok: true, ...data });

export default async (req) => {
  const url = new URL(req.url);
  const parts = url.pathname.replace(/^\/api\/admin\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const [resource, id, sub] = parts;
  const method = req.method;

  if (resource === "login" && method === "POST") {
    const body = await readJson(req).catch(() => ({}));
    const name = checkLogin(body.user, body.password);
    if (!name) return error("Wrong username or password.", 401);
    return json({ ok: true, user: name }, 200, { "set-cookie": sessionCookie(req, name) });
  }
  if (resource === "logout") return json({ ok: true }, 200, { "set-cookie": clearCookie(req) });

  const user = currentUser(req);
  if (!user) return error("Please log in.", 401);

  try {
    if (resource === "me") return ok({ user, demoLogin: usingDemoLogin(), emailMode: emailMode(), services: SERVICES, sources: SOURCES });
    if (resource === "tickets") return await tickets(req, method, id, sub, user);
    if (resource === "docs") return await docs(req, method, id, sub, user);
    if (resource === "settings") {
      if (method === "GET") return ok({ settings: await getSettings() });
      if (method === "POST") return ok({ settings: await updateSettings(await readJson(req, 256 * 1024)) });
    }
    if (resource === "export") return await exportCsv(id);
    if (resource === "run-daily" && method === "POST") return ok({ result: await runDaily() });
    if (resource === "test-email" && method === "POST") {
      const body = await readJson(req);
      if (!validEmail(body.to) || !body.to) return error("Enter a valid email address.");
      const s = await getSettings();
      const r = await sendEmail({ to: body.to, subject: "Test email from the Zicco Plumbers dashboard", html: `<p>Email sending works. Sent by ${user} at ${new Date().toISOString()}.</p><p>Mode: ${emailMode()}</p><p>${s.businessName}</p>` });
      return r.sent ? ok({ message: "Test email sent." }) : error(r.error || "Email is not configured yet (see README).", 400);
    }
  } catch (e) {
    console.error(e);
    return error(e.message || "Something went wrong", 500);
  }
  return error("Not found", 404);
};

// ---------- tickets ----------
async function tickets(req, method, id, sub, user) {
  if (!id) {
    if (method === "GET") return ok({ tickets: await listTickets() });
    if (method === "POST") return createManualTicket(await readJson(req), user);
  }
  const t = await getTicket(id);
  if (!t) return error("Ticket not found", 404);

  if (sub === "photo" && method === "GET") {
    if (!t.photo) return error("No photo", 404);
    const f = await getFile(t.photo.key);
    if (!f) return error("Photo missing", 404);
    return new Response(f.data, { headers: { "content-type": f.metadata?.type || "image/jpeg", "cache-control": "private, max-age=3600" } });
  }
  if (method === "GET") {
    if (t.unread) { t.unread = false; await saveTicket(t); }
    const all = await listDocs();
    return ok({ ticket: t, trackUrl: trackUrl(t), docs: all.filter((d) => d.ticketId === t.id) });
  }
  if (method === "DELETE") {
    await deleteTicket(t);
    return ok({});
  }
  if (method === "POST") return updateTicket(t, await readJson(req), user);
  return error("Not found", 404);
}

async function createManualTicket(body, user) {
  const c = body.customer || {};
  const customer = {
    name: clean(c.name, 80), surname: clean(c.surname, 80), email: clean(c.email, 200).toLowerCase(),
    phone: clean(c.phone, 40), location: clean(c.location, 200),
  };
  if (!customer.name) return error("Enter the customer's name.");
  if (!validPhone(customer.phone)) return error("Enter a valid phone number.");
  if (!validEmail(customer.email)) return error("Enter a valid email address.");
  const services = (body.services || []).filter((s) => SERVICES.includes(s));
  const t = {
    id: null, token: newToken(), status: "new", priority: body.priority === "urgent" ? "urgent" : "normal",
    source: SOURCES.includes(body.source) ? body.source : "phone",
    customer, services: services.length ? services : ["Other"], message: cleanText(body.message, 3000),
    photo: null, appointment: null, docs: [], unread: false, createdAt: now(), updatedAt: now(),
    events: [{ at: now(), type: "created", public: true, by: user, text: `Request logged by ${user}` }],
  };
  await createTicket(t);
  return ok({ ticket: t });
}

async function updateTicket(t, body, user) {
  const changes = {};
  const prevStatus = t.status;

  if (body.priority && ["normal", "urgent"].includes(body.priority)) t.priority = body.priority;
  if (Array.isArray(body.services)) {
    const sv = body.services.filter((s) => SERVICES.includes(s));
    if (sv.length) t.services = sv;
  }
  if (body.customer) {
    for (const f of ["name", "surname", "phone", "location"]) if (body.customer[f] !== undefined) t.customer[f] = clean(body.customer[f], f === "location" ? 200 : 80);
    if (body.customer.email !== undefined) {
      const e = clean(body.customer.email, 200).toLowerCase();
      if (!validEmail(e)) return error("Enter a valid email address.");
      t.customer.email = e;
    }
  }

  // Visit date
  if (body.appointment !== undefined) {
    const a = body.appointment;
    if (a && a.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) return error("Invalid visit date.");
      const next = { date: a.date, time: /^\d{2}:\d{2}$/.test(a.time || "") ? a.time : "", window: clean(a.window, 40), note: cleanText(a.note, 500) };
      const prev = t.appointment || {};
      if (next.date !== prev.date || next.time !== prev.time || next.window !== prev.window || next.note !== prev.note) {
        t.appointment = { ...next, setBy: user, setAt: now() };
        t.events.push({ at: now(), type: "appointment", public: true, by: user, appointment: t.appointment, text: `Visit booked: ${formatAppointment(t.appointment)}` });
        changes.appointment = true;
        if (!body.status && ["new", "contacted", "quoted"].includes(t.status)) body.status = "scheduled";
      }
    } else if (a === null && t.appointment) {
      t.appointment = null;
      t.events.push({ at: now(), type: "appointment", public: true, by: user, text: "Visit cancelled" });
      changes.appointmentCancelled = true;
    }
  }

  if (body.status && body.status !== prevStatus) {
    if (!STATUS_KEYS.includes(body.status)) return error("Invalid status.");
    t.status = body.status;
    t.events.push({ at: now(), type: "status", public: true, by: user, status: t.status, text: `Status changed to ${statusInfo(t.status).label}` });
    changes.status = true;
  }

  const message = cleanText(body.message, 3000);
  if (message) {
    t.events.push({ at: now(), type: "message", public: true, by: user, text: message });
    changes.message = message;
    changes.messageBy = `${user}, Zicco Plumbers`;
  }
  const note = cleanText(body.note, 3000);
  if (note) t.events.push({ at: now(), type: "note", public: false, by: user, text: note });

  let email = null;
  const customerVisible = changes.status || changes.appointment || changes.appointmentCancelled || changes.message;
  if (body.notify && customerVisible) {
    if (!t.customer.email) email = { skipped: "This customer has no email address. Use WhatsApp instead." };
    else {
      const s = await getSettings();
      email = await sendEmail(customerUpdateEmail(t, changes, s));
      t.events.push({ at: now(), type: "email", public: false, by: user, text: email.sent ? `Update emailed to ${t.customer.email}` : `Email not sent: ${email.error || email.skipped}` });
    }
  }
  await saveTicket(t);
  return ok({ ticket: t, email });
}

// ---------- quotes & invoices ----------
async function docs(req, method, number, sub, user) {
  const s = await getSettings();
  if (!number) {
    if (method === "GET") return ok({ docs: await listDocs() });
    if (method === "POST") {
      const body = await readJson(req, 256 * 1024);
      const type = body.type === "invoice" ? "invoice" : "quote";
      let t = null;
      if (body.ticketId) {
        t = await getTicket(body.ticketId);
        if (!t) return error("Ticket not found", 404);
        body.client ||= {};
        body.client.name ||= fullName(t.customer);
        body.client.email ||= t.customer.email;
        body.client.phone ||= t.customer.phone;
        body.client.address ||= t.customer.location;
        body.reference ||= t.id;
      }
      const d = newDoc(type, body, s, user);
      d.number = await nextNumber(type);
      await saveDoc(d);
      if (t) {
        t.docs = [...(t.docs || []), d.number];
        t.events.push({ at: now(), type: "doc", public: false, by: user, text: `${type === "quote" ? "Quote" : "Invoice"} ${d.number} created` });
        await saveTicket(t);
      }
      return ok({ doc: d });
    }
    return error("Not found", 404);
  }

  const d = await getDoc(number);
  if (!d) return error("Document not found", 404);

  if (method === "GET" && sub === "pdf") {
    return new Response(await renderPdf(d, s), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${d.number}.pdf"`, "cache-control": "no-store" } });
  }
  if (method === "GET") return ok({ doc: d, publicUrl: docUrl(d), settings: { vatNumber: s.vatNumber } });
  if (method === "DELETE") {
    await deleteDoc(d);
    if (d.ticketId) {
      const t = await getTicket(d.ticketId);
      if (t) { t.docs = (t.docs || []).filter((n) => n !== d.number); await saveTicket(t); }
    }
    return ok({});
  }
  if (method !== "POST") return error("Not found", 404);
  const body = await readJson(req, 256 * 1024);

  if (!sub) {
    applyDocInput(d, body, s);
    d.history.push({ at: now(), by: user, text: "Edited" });
    await saveDoc(d);
    return ok({ doc: d });
  }

  if (sub === "send") {
    if (!d.client.email) return error("Add the client's email address first.");
    if (!validEmail(d.client.email)) return error("The client's email address is not valid.");
    if (!d.items.length) return error("Add at least one line item.");
    if (d.status === "draft") d.status = "sent";
    d.sentAt = now();
    const pdf = await renderPdf(d, s);
    const r = await sendEmail(docEmail(d, s, pdf, cleanText(body.message, 2000)));
    d.history.push({ at: now(), by: user, text: r.sent ? `Emailed to ${d.client.email}${s.notifyEmail ? ` (copy to ${s.notifyEmail})` : ""}` : `Email not sent: ${r.error || r.skipped}` });
    await saveDoc(d);
    await logOnTicket(d, user, r.sent ? `${d.type === "quote" ? "Quote" : "Invoice"} ${d.number} emailed to the customer` : null, r.sent);
    return ok({ doc: d, email: r, publicUrl: docUrl(d) });
  }

  if (sub === "status") {
    const status = body.status;
    if (!DOC_STATUSES[d.type].includes(status)) return error("Invalid status for this document.");
    d.status = status;
    if (status === "paid") d.paidAt = body.paidAt || now();
    if (status === "accepted") { d.acceptedAt = now(); d.acceptedBy = `${user} (marked in dashboard)`; }
    d.history.push({ at: now(), by: user, text: `Marked as ${status}` });
    let r = null;
    if (status === "paid" && body.sendReceipt && d.client.email) {
      r = await sendEmail(docEmail(d, s, await renderPdf(d, s), cleanText(body.message, 2000)));
      d.history.push({ at: now(), by: user, text: r.sent ? `Receipt emailed to ${d.client.email}` : `Receipt not sent: ${r.error || r.skipped}` });
    }
    await saveDoc(d);
    await logOnTicket(d, user, `${d.number} marked as ${status}`, false);
    return ok({ doc: d, email: r });
  }

  if (sub === "convert") {
    if (d.type !== "quote") return error("Only quotes can be converted.");
    if (d.convertedTo) return error(`Already converted to ${d.convertedTo}.`);
    const inv = newDoc("invoice", {
      client: d.client, items: d.items, vatRate: d.vatRate, reference: d.reference || d.ticketId || d.number, ticketId: d.ticketId,
    }, s, user);
    inv.fromQuote = d.number;
    inv.number = await nextNumber("invoice");
    inv.history.push({ at: now(), by: user, text: `Created from quote ${d.number}` });
    await saveDoc(inv);
    d.convertedTo = inv.number;
    d.history.push({ at: now(), by: user, text: `Converted to invoice ${inv.number}` });
    if (d.status === "sent") { d.status = "accepted"; d.acceptedAt ||= now(); d.acceptedBy ||= `${user} (converted)`; }
    await saveDoc(d);
    if (d.ticketId) {
      const t = await getTicket(d.ticketId);
      if (t) { t.docs = [...(t.docs || []), inv.number]; await saveTicket(t); }
    }
    return ok({ doc: inv });
  }

  if (sub === "duplicate") {
    const copy = newDoc(d.type, { client: d.client, items: d.items, vatRate: d.vatRate, notes: d.notes }, s, user);
    copy.number = await nextNumber(d.type);
    copy.history.push({ at: now(), by: user, text: `Duplicated from ${d.number}` });
    await saveDoc(copy);
    return ok({ doc: copy });
  }
  return error("Not found", 404);
}

async function logOnTicket(d, user, text, isPublic) {
  if (!d.ticketId || !text) return;
  const t = await getTicket(d.ticketId);
  if (!t) return;
  t.events.push({ at: now(), type: "doc", public: !!isPublic, by: user, text });
  if (d.type === "quote" && isPublic && ["new", "contacted"].includes(t.status)) {
    t.status = "quoted";
    t.events.push({ at: now(), type: "status", public: true, by: user, status: "quoted", text: "Status changed to Quote sent" });
  }
  await saveTicket(t);
}

// ---------- CSV export ----------
function csv(rows) {
  const cell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

async function exportCsv(which) {
  let body, name;
  if (which === "tickets.csv") {
    const list = await listTickets();
    body = csv([
      ["Ticket", "Created", "Status", "Priority", "Source", "Name", "Surname", "Phone", "Email", "Location", "Services", "Visit date", "Visit time", "Documents"],
      ...list.map((t) => [t.id, t.createdAt, statusInfo(t.status).label, t.priority, t.source, t.name, t.surname, t.phone, t.email, t.location, (t.services || []).join("; "), t.appointment?.date || "", t.appointment?.time || "", (t.docs || []).join("; ")]),
    ]);
    name = "zicco-tickets.csv";
  } else if (which === "docs.csv") {
    const list = await listDocs();
    body = csv([
      ["Number", "Type", "Status", "Client", "Company", "Email", "Issue date", "Due / valid until", "Total (ZAR)", "Ticket"],
      ...list.map((d) => [d.number, d.type, d.status, d.clientName, d.clientCompany, d.clientEmail, d.issueDate, d.dueDate, d.total.toFixed(2), d.ticketId || ""]),
    ]);
    name = "zicco-quotes-invoices.csv";
  } else return error("Not found", 404);
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"` } });
}

export const config = { path: "/api/admin/*" };
