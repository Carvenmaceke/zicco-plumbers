/* global PropertiesService, MailApp, Utilities, ContentService, ScriptApp, Session */
// Zicco Plumbers backend for Google Apps Script. Bundled into apps-script/Code.gs by apps-script/build.mjs.
//
// The website sends every API call as one POST with a JSON body:
//   { path: "/api/...", method, query: {...}, json: {...} | form: {...}, files: {...}, token }
// and gets back { status, json } or { status, file: { base64, type, name, inline } }.
// Email templates, quote/invoice maths and validation are shared with the original backend in netlify/lib.
import {
  OPEN_STATUSES, SERVICES, SOURCES, STATUS_KEYS, STATUSES, clean, cleanText, formatAppointment, formatDate, formatMoney, fullName,
  newToken, normalisePhone, now, safeEqual, sastDate, statusInfo, trackUrl, validEmail, validPhone, esc, SITE_URL,
} from "../../netlify/lib/util.mjs";
import { DOC_STATUSES, applyDocInput, docTitle, docUrl, newDoc } from "../../netlify/lib/docs.mjs";
import {
  appointmentIcs, businessActivityEmail, businessDigestEmail, businessNewTicketEmail, customerReceivedEmail, customerReminderEmail,
  customerUpdateEmail, docAdminLink, docEmail, ticketAdminLink,
} from "../../netlify/lib/email.mjs";
import { DEFAULT_SETTINGS } from "../../netlify/lib/settings.mjs";
import * as store from "./store.mjs";

const props = () => PropertiesService.getScriptProperties();

// ---------- responses ----------
const res = (status, json) => ({ status, json });
const ok = (data) => res(200, { ok: true, ...data });
const err = (message, status = 400) => res(status, { error: message });
const file = (bytes, type, name, inline) => ({ status: 200, file: { base64: Utilities.base64Encode(bytes), type, name, inline: !!inline } });
const textFile = (text, type, name) => file(Utilities.newBlob(text, type, name).getBytes(), type, name, false);

// ---------- settings ----------
export function getSettings() {
  const s = { ...DEFAULT_SETTINGS, ...store.getSettingsRaw() };
  if (!s.notifyEmail) s.notifyEmail = props().getProperty("BUSINESS_EMAIL") || "";
  if (!s.googleReviewUrl) s.googleReviewUrl = props().getProperty("GOOGLE_REVIEW_URL") || "";
  return s;
}

function updateSettings(input) {
  const s = getSettings();
  const textFields = ["businessName", "contactPerson", "phone", "email", "website", "registration", "vatNumber", "bankName", "accountName", "accountNumber", "branchCode", "notifyEmail", "googleReviewUrl"];
  textFields.forEach((f) => { if (f in input) s[f] = clean(input[f], 300); });
  ["address", "quoteTerms", "invoiceNotes"].forEach((f) => { if (f in input) s[f] = cleanText(input[f], 2000); });
  if ("vatRate" in input) s.vatRate = Math.min(Math.max(Number(input.vatRate) || 0, 0), 30);
  if ("quoteValidDays" in input) s.quoteValidDays = Math.min(Math.max(parseInt(input.quoteValidDays, 10) || 30, 1), 365);
  if ("invoiceDueDays" in input) s.invoiceDueDays = Math.min(Math.max(parseInt(input.invoiceDueDays, 10) || 0, 0), 365);
  if (Array.isArray(input.priceList)) {
    s.priceList = input.priceList.map((p) => ({ description: clean(p.description, 300), unitPrice: Math.max(0, Number(p.unitPrice) || 0) }))
      .filter((p) => p.description).slice(0, 100);
  }
  store.saveSettingsRaw(s);
  return s;
}

// ---------- email (sent from the Gmail account that owns the script) ----------
function sendEmail(msg, s) {
  if (!msg || !msg.to) return { skipped: "no recipient" };
  try {
    const attachments = (msg.attachments || []).map((a) =>
      a.content && a.content.getBytes ? a.content.setName(a.filename) : Utilities.newBlob(a.content, a.contentType || "application/octet-stream", a.filename));
    MailApp.sendEmail({
      to: msg.to, bcc: msg.bcc || undefined, subject: msg.subject, htmlBody: msg.html,
      replyTo: msg.replyTo || undefined, name: (s && s.businessName) || "Zicco Plumbers", attachments,
    });
    return { sent: true };
  } catch (e) {
    return { error: "Email failed: " + e.message };
  }
}

// ---------- PDF quotes and invoices (HTML converted by Google) ----------
function pdfHtml(d, s) {
  const isQuote = d.type === "quote";
  const title = docTitle(d, s).toUpperCase();
  const lines = (t) => esc(t).replace(/\n/g, "<br>");
  const items = d.items.map((i) => `<tr><td>${lines(i.description)}</td><td class="r">${i.qty}</td><td class="r">${formatMoney(i.unitPrice)}</td><td class="r"><b>${formatMoney(i.qty * i.unitPrice)}</b></td></tr>`).join("");
  const bank = !isQuote && d.status !== "paid" && s.accountNumber
    ? `<div class="note"><div class="lbl">Payment details</div>${[s.bankName && "Bank: " + esc(s.bankName), "Account name: " + esc(s.accountName), "Account number: " + esc(s.accountNumber), s.branchCode && "Branch code: " + esc(s.branchCode), "Reference: <b>" + esc(d.number) + "</b>"].filter(Boolean).join("<br>")}</div>` : "";
  const stamp = d.status === "paid" ? '<div class="stamp">PAID</div>' : d.status === "accepted" ? '<div class="stamp">ACCEPTED</div>' : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body, table, td, th { font-family: Arial, Helvetica, sans-serif; color: #1f2933; font-size: 11px; }
    body { margin: 0; } table { border-collapse: collapse; }
    .head { background: #133c4b; color: #fff; padding: 22px 28px; border-bottom: 5px solid #1d5c73; }
    .head table { width: 100%; } .head td { color: #fff; } .brand { font-size: 22px; font-weight: bold; color: #fff; } .sub { font-size: 10px; color: #cfe0e6; }
    .title { text-align: right; font-size: 22px; font-weight: bold; color: #fff; } .num { text-align: right; color: #cfe0e6; }
    .wrap { padding: 20px 28px; } .lbl { font-size: 8px; font-weight: bold; color: #5b6672; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .parties td { vertical-align: top; width: 50%; } .muted { color: #5b6672; }
    .meta { background: #e8eff1; margin: 16px 0; } .meta td { padding: 8px 10px; } .meta b, .parties b { font-size: 12px; }
    .items { width: 100%; border-collapse: collapse; } .items th { background: #1d5c73; color: #fff; text-align: left; padding: 7px 8px; font-size: 9px; text-transform: uppercase; } .items th.r { text-align: right; }
    .items td { padding: 8px; border-bottom: 1px solid #dde3e6; vertical-align: top; } .r { text-align: right; white-space: nowrap; }
    .totals { width: 260px; margin: 12px 0 0 auto; } .totals td { padding: 4px 8px; } .grand td { background: #133c4b; color: #fff; font-size: 13px; font-weight: bold; padding: 8px; }
    .totals td.muted { color: #5b6672; }
    .note { margin-top: 16px; color: #33414b; } .stamp { display: inline-block; border: 3px solid #18794a; color: #18794a; font-size: 18px; font-weight: bold; padding: 4px 12px; margin-top: 10px; }
  </style></head><body>
    <div class="head"><table><tr><td><div class="brand">${esc(s.businessName)}</div><div class="sub">${esc(s.registration)}${s.vatNumber ? " &middot; VAT no. " + esc(s.vatNumber) : ""}</div></td>
      <td><div class="title">${title}</div><div class="num">${esc(d.number)}</div></td></tr></table></div>
    <div class="wrap">
      <table class="parties" width="100%"><tr>
        <td><div class="lbl">From</div><b>${esc(s.businessName)}</b><div class="muted">${lines(s.address)}<br>${esc(s.phone)}${s.email ? "<br>" + esc(s.email) : ""}<br>${esc(s.website)}</div></td>
        <td><div class="lbl">${isQuote ? "Quote for" : "Bill to"}</div><b>${esc(d.client.name || "Client")}</b><div class="muted">${[d.client.company, d.client.address, d.client.phone, d.client.email].filter(Boolean).map(lines).join("<br>")}</div></td>
      </tr></table>
      <table class="meta" width="100%"><tr>
        <td><div class="lbl">${isQuote ? "Quote no." : "Invoice no."}</div><b>${esc(d.number)}</b></td>
        <td><div class="lbl">Date</div><b>${formatDate(d.issueDate).replace(/^\w+, /, "")}</b></td>
        <td><div class="lbl">${isQuote ? "Valid until" : "Due date"}</div><b>${formatDate(d.dueDate).replace(/^\w+, /, "")}</b></td>
        <td><div class="lbl">Reference</div><b>${esc(d.reference || d.ticketId || "-")}</b></td>
      </tr></table>
      <table class="items"><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr>${items}</table>
      <table class="totals">
        <tr><td class="muted">Subtotal</td><td class="r">${formatMoney(d.totals.subtotal)}</td></tr>
        ${Number(d.vatRate) > 0 ? `<tr><td class="muted">VAT (${d.vatRate}%)</td><td class="r">${formatMoney(d.totals.vat)}</td></tr>` : ""}
        <tr class="grand"><td>${isQuote ? "Total" : d.status === "paid" ? "Total (paid)" : "Total due"}</td><td class="r">${formatMoney(d.totals.total)}</td></tr>
      </table>
      ${stamp}${bank}
      ${d.notes ? `<div class="note"><div class="lbl">${isQuote ? "Terms" : "Notes"}</div>${lines(d.notes)}</div>` : ""}
      ${isQuote && d.status !== "accepted" ? `<div class="note"><div class="lbl">Accept this quote</div>Accept online at ${esc(docUrl(d))}</div>` : ""}
    </div></body></html>`;
}

export function renderPdf(d, s) {
  return Utilities.newBlob(pdfHtml(d, s), "text/html", d.number + ".html").getAs("application/pdf").setName(d.number + ".pdf");
}

// ---------- dashboard login (token sent with each request; no cookies across domains) ----------
function users() {
  return String(props().getProperty("ADMIN_USERS") || "").split(",").map((p) => {
    const i = p.indexOf(":");
    return i > 0 ? { name: p.slice(0, i).trim(), password: p.slice(i + 1) } : null;
  }).filter(Boolean);
}

function sign(text) {
  let key = props().getProperty("SESSION_SECRET");
  // Normally made by setup(); create it here too so a missing one can't block logins.
  if (!key) { key = Utilities.getUuid() + Utilities.getUuid(); props().setProperty("SESSION_SECRET", key); }
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, key));
}

function makeToken(name) {
  const body = Utilities.base64EncodeWebSafe(JSON.stringify({ u: name, exp: Date.now() + 24 * 3600 * 1000 }));
  return body + "." + sign(body);
}

function tokenUser(token) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac || !safeEqual(mac, sign(body))) return null;
  try {
    const data = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(body)).getDataAsString());
    return data.exp > Date.now() ? data.u : null;
  } catch (e) {
    return null;
  }
}

// ---------- public: quote request form ----------
const MAX_PHOTO = 5 * 1024 * 1024;

function createRequest(req) {
  const f = req.form || {};
  if (f.company_website) return ok({}); // honeypot
  const customer = {
    name: clean(f.name, 80), surname: clean(f.surname, 80), email: clean(f.email, 200).toLowerCase(),
    phone: clean(f.phone, 40), location: clean(f.location, 200),
  };
  const services = [].concat(f["services[]"] || []).map(String).filter((x) => SERVICES.includes(x));
  if (!customer.name || !customer.surname) return err("Please enter your name and surname.");
  if (!validPhone(customer.phone)) return err("Please enter a valid contact number.");
  if (!validEmail(customer.email)) return err("Please enter a valid email address.");
  if (!customer.location) return err("Please tell us where you are situated.");
  if (!services.length) return err("Please choose at least one service.");

  const t = {
    id: null, token: newToken(), status: "new", priority: "normal", source: "website", customer, services,
    message: cleanText(f.message, 3000), photo: null, appointment: null, docs: [], unread: false, page: clean(f.page, 200),
    createdAt: now(), updatedAt: now(), events: [{ at: now(), type: "created", public: true, by: "customer", text: "Request received" }],
  };
  const photo = req.files && req.files.photo;
  let bytes = null;
  if (photo && photo.base64) {
    if (!/^image\//.test(photo.type || "")) return err("Please attach an image file.");
    bytes = Utilities.base64Decode(photo.base64);
    if (bytes.length > MAX_PHOTO) return err("The photo is too large (max 5 MB).");
  }
  store.createTicket(t);
  if (bytes) {
    const id = store.saveFile(`${t.id} - ${clean(photo.name, 80) || "photo"}`, bytes, photo.type);
    t.photo = { key: id, type: photo.type, name: clean(photo.name, 120), size: bytes.length };
    store.saveTicket(t);
  }
  const s = getSettings();
  if (customer.email) sendEmail(customerReceivedEmail(t, s), s);
  if (s.notifyEmail) sendEmail(businessNewTicketEmail(t, s), s);
  const base = SITE_URL.replace(/^https?:\/\/[^/]+/, "");
  return res(201, { ok: true, id: t.id, trackUrl: trackUrl(t), redirect: `${base}/thank-you/?id=${encodeURIComponent(t.id)}&k=${encodeURIComponent(t.token)}` });
}

// ---------- public: request tracking ----------
function loadTicket(id, k) {
  const t = store.getTicket(id);
  return t && k && safeEqual(k, t.token) ? t : null;
}

function publicTicket(t) {
  const docs = (t.docs || []).map((n) => store.getDoc(n)).filter((d) => d && d.status !== "draft" && d.status !== "cancelled")
    .map((d) => ({ number: d.number, type: d.type, status: d.status, total: d.totals.total, issueDate: d.issueDate, url: docUrl(d) }));
  return {
    id: t.id, name: t.customer.name, status: t.status, statusLabel: statusInfo(t.status).label, statusText: statusInfo(t.status).customer,
    steps: STATUSES.filter((x) => x.key !== "cancelled").map((x) => ({ key: x.key, label: x.label })),
    createdAt: t.createdAt, services: t.services, location: t.customer.location, message: t.message, appointment: t.appointment, docs,
    events: t.events.filter((e) => e.public).map((e) => ({
      at: e.at, type: e.type, text: e.text || "", status: e.status ? statusInfo(e.status).label : undefined,
      appointment: e.appointment, from: e.by === "customer" ? "You" : "Zicco Plumbers",
    })),
  };
}

function track(action, req) {
  const q = req.query || {};
  const body = req.json || {};
  if (req.method === "GET" && (action === "" || action === "ics")) {
    const t = loadTicket(q.id, q.k);
    if (!t) return err("We couldn't find that request. Check the link or look it up with your phone number.", 404);
    if (action === "ics") {
      const ics = appointmentIcs(t);
      return ics ? textFile(ics, "text/calendar", `zicco-plumbers-${t.id}.ics`) : err("No visit is scheduled yet.", 404);
    }
    return res(200, publicTicket(t));
  }
  if (action === "lookup") {
    const t = store.getTicket(String(body.id || "").trim().toUpperCase());
    if (!t || !normalisePhone(body.phone) || normalisePhone(body.phone) !== normalisePhone(t.customer.phone)) {
      return err("No request matches that ticket number and phone number.", 404);
    }
    return res(200, { id: t.id, k: t.token });
  }
  const t = loadTicket(body.id, body.k);
  if (!t) return err("Request not found.", 404);
  const s = getSettings();
  if (action === "reply") {
    const message = cleanText(body.message, 3000);
    if (!message) return err("Please write a message.");
    t.events.push({ at: now(), type: "message", public: true, by: "customer", text: message });
    t.unread = true;
    store.saveTicket(t);
    if (s.notifyEmail) sendEmail(businessActivityEmail(s, { subject: `${t.id}: new message from ${fullName(t.customer)}`, title: `${fullName(t.customer)} replied on ticket ${t.id}.`, body: message, link: ticketAdminLink(t), replyTo: t.customer.email || undefined }), s);
    return res(200, publicTicket(t));
  }
  if (action === "confirm") {
    if (!t.appointment) return err("There is no visit to confirm.");
    t.appointment.confirmedAt = now();
    t.events.push({ at: now(), type: "message", public: true, by: "customer", text: "I confirm the visit date." });
    t.unread = true;
    store.saveTicket(t);
    if (s.notifyEmail) sendEmail(businessActivityEmail(s, { subject: `${t.id}: visit confirmed by ${fullName(t.customer)}`, title: `${fullName(t.customer)} confirmed the visit on ${t.appointment.date}.`, link: ticketAdminLink(t) }), s);
    return res(200, publicTicket(t));
  }
  return err("Not found", 404);
}

// ---------- public: online quote / invoice ----------
function loadDoc(n, k) {
  const d = store.getDoc(n);
  return d && k && safeEqual(k, d.token) && d.status !== "draft" ? d : null;
}

function publicDoc(d, s) {
  const t = d.ticketId ? store.getTicket(d.ticketId) : null;
  return {
    number: d.number, type: d.type, title: docTitle(d, s), status: d.status, client: d.client, issueDate: d.issueDate, dueDate: d.dueDate,
    reference: d.reference || d.ticketId || "", items: d.items, vatRate: d.vatRate, totals: d.totals, notes: d.notes,
    acceptedAt: d.acceptedAt || null, acceptedBy: d.acceptedBy || null, paidAt: d.paidAt || null, trackUrl: t ? trackUrl(t) : null,
    business: {
      name: s.businessName, registration: s.registration, vatNumber: s.vatNumber, address: s.address, phone: s.phone, email: s.email, website: s.website,
      bank: d.type === "invoice" && s.accountNumber ? { bankName: s.bankName, accountName: s.accountName, accountNumber: s.accountNumber, branchCode: s.branchCode } : null,
    },
  };
}

function docPublic(action, req) {
  const s = getSettings();
  if (req.method === "GET") {
    const d = loadDoc(req.query.n, req.query.k);
    if (!d) return err("Document not found. Please check the link in your email.", 404);
    if (action === "pdf") { const pdf = renderPdf(d, s); return file(pdf.getBytes(), "application/pdf", d.number + ".pdf", true); }
    return res(200, publicDoc(d, s));
  }
  const body = req.json || {};
  const d = loadDoc(body.n, body.k);
  if (!d) return err("Document not found.", 404);
  if (d.type !== "quote") return err("Only quotes can be accepted or declined.");
  if (!["sent", "accepted", "declined"].includes(d.status)) return err("This quote can no longer be changed.");
  let subject, title, note;
  if (action === "accept") {
    d.status = "accepted"; d.acceptedAt = now(); d.acceptedBy = clean(body.name, 120) || d.client.name;
    d.history.push({ at: now(), by: "client", text: `Quote accepted online by ${d.acceptedBy}` });
    subject = `Quote ${d.number} accepted by ${d.acceptedBy}`; title = `${d.acceptedBy} accepted quote ${d.number} online.`;
  } else if (action === "decline") {
    d.status = "declined"; note = cleanText(body.reason, 1000);
    d.history.push({ at: now(), by: "client", text: `Quote declined online${note ? `: ${note}` : ""}` });
    subject = `Quote ${d.number} declined by ${d.client.name}`; title = `${d.client.name} declined quote ${d.number}.`;
  } else return err("Not found", 404);
  store.saveDoc(d);
  if (d.ticketId) {
    const t = store.getTicket(d.ticketId);
    if (t) {
      t.events.push({ at: now(), type: "message", public: true, by: "customer", text: `${action === "accept" ? "Accepted" : "Declined"} quote ${d.number}${note ? `: ${note}` : ""}` });
      t.unread = true; store.saveTicket(t);
    }
  }
  if (s.notifyEmail) sendEmail(businessActivityEmail(s, { subject, title, body: note, link: docAdminLink(d), replyTo: d.client.email || undefined }), s);
  return res(200, publicDoc(d, s));
}

// ---------- dashboard ----------
function admin(parts, req) {
  const [resource, id, sub] = parts;
  const method = req.method;
  const body = req.json || {};
  if (resource === "login" && method === "POST") {
    const u = users().find((x) => x.name.toLowerCase() === String(body.user || "").trim().toLowerCase());
    if (!u || !safeEqual(String(body.password || ""), u.password)) return err("Wrong username or password.", 401);
    return ok({ user: u.name, token: makeToken(u.name) });
  }
  if (resource === "logout") return ok({});
  const user = tokenUser(req.token);
  if (!user) return err("Please log in.", 401);

  if (resource === "me") return ok({ user, demoLogin: false, emailMode: "gmail", services: SERVICES, sources: SOURCES });
  if (resource === "tickets") return adminTickets(method, id, sub, body, user);
  if (resource === "docs") return adminDocs(method, id, sub, body, user);
  if (resource === "settings") return method === "GET" ? ok({ settings: getSettings() }) : ok({ settings: updateSettings(body) });
  if (resource === "export") return exportCsv(id);
  if (resource === "run-daily" && method === "POST") return ok({ result: runDaily() });
  if (resource === "test-email" && method === "POST") {
    if (!body.to || !validEmail(body.to)) return err("Enter a valid email address.");
    const s = getSettings();
    const r = sendEmail({ to: body.to, subject: "Test email from the Zicco Plumbers dashboard", html: `<p>Email sending works. Sent by ${esc(user)} at ${now()}.</p><p>${esc(s.businessName)}</p>` }, s);
    return r.sent ? ok({ message: "Test email sent." }) : err(r.error || "Email failed.");
  }
  return err("Not found", 404);
}

function adminTickets(method, id, sub, body, user) {
  if (!id) {
    if (method === "GET") return ok({ tickets: store.listTickets() });
    if (method === "POST") return createManual(body, user);
  }
  const t = store.getTicket(id);
  if (!t) return err("Ticket not found", 404);
  if (sub === "photo") {
    const f = t.photo && store.getFile(t.photo.key);
    return f ? file(f.bytes, f.type, t.photo.name || "photo.jpg", true) : err("No photo", 404);
  }
  if (method === "GET") {
    if (t.unread) { t.unread = false; store.saveTicket(t); }
    return ok({ ticket: t, trackUrl: trackUrl(t), docs: store.listDocs().filter((d) => d.ticketId === t.id) });
  }
  if (method === "DELETE") { store.deleteTicket(t); return ok({}); }
  return updateTicket(t, body, user);
}

function createManual(body, user) {
  const c = body.customer || {};
  const customer = { name: clean(c.name, 80), surname: clean(c.surname, 80), email: clean(c.email, 200).toLowerCase(), phone: clean(c.phone, 40), location: clean(c.location, 200) };
  if (!customer.name) return err("Enter the customer's name.");
  if (!validPhone(customer.phone)) return err("Enter a valid phone number.");
  if (!validEmail(customer.email)) return err("Enter a valid email address.");
  const services = (body.services || []).filter((x) => SERVICES.includes(x));
  const t = {
    id: null, token: newToken(), status: "new", priority: body.priority === "urgent" ? "urgent" : "normal",
    source: SOURCES.includes(body.source) ? body.source : "phone", customer, services: services.length ? services : ["Other"],
    message: cleanText(body.message, 3000), photo: null, appointment: null, docs: [], unread: false, createdAt: now(), updatedAt: now(),
    events: [{ at: now(), type: "created", public: true, by: user, text: `Request logged by ${user}` }],
  };
  store.createTicket(t);
  return ok({ ticket: t });
}

function updateTicket(t, body, user) {
  const changes = {};
  if (body.priority && ["normal", "urgent"].includes(body.priority)) t.priority = body.priority;
  if (Array.isArray(body.services)) { const sv = body.services.filter((x) => SERVICES.includes(x)); if (sv.length) t.services = sv; }
  if (body.customer) {
    ["name", "surname", "phone", "location"].forEach((f) => { if (body.customer[f] !== undefined) t.customer[f] = clean(body.customer[f], f === "location" ? 200 : 80); });
    if (body.customer.email !== undefined) {
      const e = clean(body.customer.email, 200).toLowerCase();
      if (!validEmail(e)) return err("Enter a valid email address.");
      t.customer.email = e;
    }
  }
  if (body.appointment !== undefined) {
    const a = body.appointment;
    if (a && a.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) return err("Invalid visit date.");
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
  if (body.status && body.status !== t.status) {
    if (!STATUS_KEYS.includes(body.status)) return err("Invalid status.");
    t.status = body.status;
    t.events.push({ at: now(), type: "status", public: true, by: user, status: t.status, text: `Status changed to ${statusInfo(t.status).label}` });
    changes.status = true;
  }
  const message = cleanText(body.message, 3000);
  if (message) { t.events.push({ at: now(), type: "message", public: true, by: user, text: message }); changes.message = message; changes.messageBy = `${user}, Zicco Plumbers`; }
  const note = cleanText(body.note, 3000);
  if (note) t.events.push({ at: now(), type: "note", public: false, by: user, text: note });

  let email = null;
  if (body.notify && (changes.status || changes.appointment || changes.appointmentCancelled || changes.message)) {
    if (!t.customer.email) email = { skipped: "This customer has no email address. Use WhatsApp instead." };
    else {
      const s = getSettings();
      email = sendEmail(customerUpdateEmail(t, changes, s), s);
      t.events.push({ at: now(), type: "email", public: false, by: user, text: email.sent ? `Update emailed to ${t.customer.email}` : `Email not sent: ${email.error || email.skipped}` });
    }
  }
  store.saveTicket(t);
  return ok({ ticket: t, email });
}

function logOnTicket(d, user, text, isPublic) {
  if (!d.ticketId || !text) return;
  const t = store.getTicket(d.ticketId);
  if (!t) return;
  t.events.push({ at: now(), type: "doc", public: !!isPublic, by: user, text });
  if (d.type === "quote" && isPublic && ["new", "contacted"].includes(t.status)) {
    t.status = "quoted";
    t.events.push({ at: now(), type: "status", public: true, by: user, status: "quoted", text: "Status changed to Quote sent" });
  }
  store.saveTicket(t);
}

function adminDocs(method, number, sub, body, user) {
  const s = getSettings();
  if (!number) {
    if (method === "GET") return ok({ docs: store.listDocs() });
    const type = body.type === "invoice" ? "invoice" : "quote";
    let t = null;
    if (body.ticketId) {
      t = store.getTicket(body.ticketId);
      if (!t) return err("Ticket not found", 404);
      body.client = body.client || {};
      body.client.name = body.client.name || fullName(t.customer);
      body.client.email = body.client.email || t.customer.email;
      body.client.phone = body.client.phone || t.customer.phone;
      body.client.address = body.client.address || t.customer.location;
      body.reference = body.reference || t.id;
    }
    const d = newDoc(type, body, s, user);
    d.number = store.nextNumber(type);
    store.saveDoc(d);
    if (t) {
      t.docs = (t.docs || []).concat(d.number);
      t.events.push({ at: now(), type: "doc", public: false, by: user, text: `${type === "quote" ? "Quote" : "Invoice"} ${d.number} created` });
      store.saveTicket(t);
    }
    return ok({ doc: d });
  }
  const d = store.getDoc(number);
  if (!d) return err("Document not found", 404);
  if (method === "GET" && sub === "pdf") { const pdf = renderPdf(d, s); return file(pdf.getBytes(), "application/pdf", d.number + ".pdf", true); }
  if (method === "GET") return ok({ doc: d, publicUrl: docUrl(d), settings: { vatNumber: s.vatNumber } });
  if (method === "DELETE") {
    store.deleteDoc(d);
    if (d.ticketId) { const t = store.getTicket(d.ticketId); if (t) { t.docs = (t.docs || []).filter((n) => n !== d.number); store.saveTicket(t); } }
    return ok({});
  }
  if (!sub) {
    applyDocInput(d, body, s);
    d.history.push({ at: now(), by: user, text: "Edited" });
    store.saveDoc(d);
    return ok({ doc: d });
  }
  if (sub === "send") {
    if (!d.client.email) return err("Add the client's email address first.");
    if (!validEmail(d.client.email)) return err("The client's email address is not valid.");
    if (!d.items.length) return err("Add at least one line item.");
    if (d.status === "draft") d.status = "sent";
    d.sentAt = now();
    const r = sendEmail(docEmail(d, s, renderPdf(d, s), cleanText(body.message, 2000)), s);
    d.history.push({ at: now(), by: user, text: r.sent ? `Emailed to ${d.client.email}${s.notifyEmail ? ` (copy to ${s.notifyEmail})` : ""}` : `Email not sent: ${r.error || r.skipped}` });
    store.saveDoc(d);
    logOnTicket(d, user, r.sent ? `${d.type === "quote" ? "Quote" : "Invoice"} ${d.number} emailed to the customer` : null, r.sent);
    return ok({ doc: d, email: r, publicUrl: docUrl(d) });
  }
  if (sub === "status") {
    if (!DOC_STATUSES[d.type].includes(body.status)) return err("Invalid status for this document.");
    d.status = body.status;
    if (d.status === "paid") d.paidAt = body.paidAt || now();
    if (d.status === "accepted") { d.acceptedAt = now(); d.acceptedBy = `${user} (marked in dashboard)`; }
    d.history.push({ at: now(), by: user, text: `Marked as ${d.status}` });
    let r = null;
    if (d.status === "paid" && body.sendReceipt && d.client.email) {
      r = sendEmail(docEmail(d, s, renderPdf(d, s), cleanText(body.message, 2000)), s);
      d.history.push({ at: now(), by: user, text: r.sent ? `Receipt emailed to ${d.client.email}` : `Receipt not sent: ${r.error || r.skipped}` });
    }
    store.saveDoc(d);
    logOnTicket(d, user, `${d.number} marked as ${d.status}`, false);
    return ok({ doc: d, email: r });
  }
  if (sub === "convert") {
    if (d.type !== "quote") return err("Only quotes can be converted.");
    if (d.convertedTo) return err(`Already converted to ${d.convertedTo}.`);
    const inv = newDoc("invoice", { client: d.client, items: d.items, vatRate: d.vatRate, reference: d.reference || d.ticketId || d.number, ticketId: d.ticketId }, s, user);
    inv.fromQuote = d.number;
    inv.number = store.nextNumber("invoice");
    inv.history.push({ at: now(), by: user, text: `Created from quote ${d.number}` });
    store.saveDoc(inv);
    d.convertedTo = inv.number;
    d.history.push({ at: now(), by: user, text: `Converted to invoice ${inv.number}` });
    if (d.status === "sent") { d.status = "accepted"; d.acceptedAt = d.acceptedAt || now(); d.acceptedBy = d.acceptedBy || `${user} (converted)`; }
    store.saveDoc(d);
    if (d.ticketId) { const t = store.getTicket(d.ticketId); if (t) { t.docs = (t.docs || []).concat(inv.number); store.saveTicket(t); } }
    return ok({ doc: inv });
  }
  if (sub === "duplicate") {
    const copy = newDoc(d.type, { client: d.client, items: d.items, vatRate: d.vatRate, notes: d.notes }, s, user);
    copy.number = store.nextNumber(d.type);
    copy.history.push({ at: now(), by: user, text: `Duplicated from ${d.number}` });
    store.saveDoc(copy);
    return ok({ doc: copy });
  }
  return err("Not found", 404);
}

function csv(rows) {
  const cell = (v) => { const x = String(v == null ? "" : v); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

function exportCsv(which) {
  if (which === "tickets.csv") {
    const list = store.listTickets();
    return textFile(csv([["Ticket", "Created", "Status", "Priority", "Source", "Name", "Surname", "Phone", "Email", "Location", "Services", "Visit date", "Visit time", "Documents"],
      ...list.map((t) => [t.id, t.createdAt, statusInfo(t.status).label, t.priority, t.source, t.name, t.surname, t.phone, t.email, t.location, (t.services || []).join("; "), t.appointment ? t.appointment.date : "", t.appointment ? t.appointment.time : "", (t.docs || []).join("; ")])]), "text/csv", "zicco-tickets.csv");
  }
  if (which === "docs.csv") {
    const list = store.listDocs();
    return textFile(csv([["Number", "Type", "Status", "Client", "Company", "Email", "Issue date", "Due / valid until", "Total (ZAR)", "Ticket"],
      ...list.map((d) => [d.number, d.type, d.status, d.clientName, d.clientCompany, d.clientEmail, d.issueDate, d.dueDate, Number(d.total).toFixed(2), d.ticketId || ""])]), "text/csv", "zicco-quotes-invoices.csv");
  }
  return err("Not found", 404);
}

// ---------- daily reminders and summary ----------
export function runDaily() {
  const s = getSettings();
  const today = sastDate();
  const tomorrow = sastDate(new Date(Date.now() + 24 * 3600 * 1000));
  const tickets = store.listTickets();
  let reminders = 0;
  tickets.forEach((sum) => {
    if (!sum.appointment || sum.appointment.date !== tomorrow || !OPEN_STATUSES.includes(sum.status) || !sum.email) return;
    const t = store.getTicket(sum.id);
    if (!t || t.appointment.reminderSentFor === tomorrow) return;
    if (sendEmail(customerReminderEmail(t, s), s).sent) {
      t.appointment.reminderSentFor = tomorrow;
      t.events.push({ at: now(), type: "email", public: false, by: "system", text: "Visit reminder emailed to customer" });
      store.saveTicket(t);
      reminders++;
    }
  });
  const cutoff = Date.now() - 12 * 3600 * 1000;
  const digest = {
    today: tickets.filter((t) => t.appointment && t.appointment.date === today && OPEN_STATUSES.includes(t.status)),
    waiting: tickets.filter((t) => t.status === "new" && Date.parse(t.createdAt) < cutoff),
    unread: tickets.filter((t) => t.unread),
    overdue: store.listDocs().filter((d) => d.type === "invoice" && d.status === "sent" && d.dueDate && d.dueDate < today),
  };
  if (s.notifyEmail && Object.keys(digest).some((k) => digest[k].length)) sendEmail(businessDigestEmail(s, digest), s);
  return { reminders, today: digest.today.length, waiting: digest.waiting.length, unread: digest.unread.length, overdue: digest.overdue.length };
}

// ---------- entry points ----------
export function handle(req) {
  const path = String(req.path || "");
  req.method = String(req.method || "GET").toUpperCase();
  req.query = req.query || {};
  try {
    if (path === "/api/tickets") return req.method === "POST" ? createRequest(req) : err("Method not allowed", 405);
    if (path === "/api/track" || path.indexOf("/api/track/") === 0) return track(path.replace(/^\/api\/track\/?/, ""), req);
    if (path === "/api/doc" || path.indexOf("/api/doc/") === 0) return docPublic(path.replace(/^\/api\/doc\/?/, ""), req);
    if (path.indexOf("/api/admin/") === 0) return admin(path.replace(/^\/api\/admin\/?/, "").split("/").filter(Boolean).map(decodeURIComponent), req);
    return err("Not found", 404);
  } catch (e) {
    return err((e && e.message) || "Something went wrong", 500);
  }
}

export function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (x) { req = {}; }
  // Remember the website's address the first time it calls in, for links in emails (only if not set already).
  if (req.site && /^https?:\/\/[^\s"<>]+$/.test(req.site) && !props().getProperty("SITE_URL")) props().setProperty("SITE_URL", String(req.site).slice(0, 200));
  return ContentService.createTextOutput(JSON.stringify(handle(req))).setMimeType(ContentService.MimeType.JSON);
}

export function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: "Zicco Plumbers backend" })).setMimeType(ContentService.MimeType.JSON);
}

// Run once from the editor: creates the sheets, the Drive folder, the dashboard login and the 06:00 daily job.
export function setup() {
  const p = props();
  store.sheet(store.TICKET_SHEET);
  store.sheet(store.DOC_SHEET);
  if (!p.getProperty("SESSION_SECRET")) p.setProperty("SESSION_SECRET", Utilities.getUuid() + Utilities.getUuid());
  if (!p.getProperty("ADMIN_USERS")) p.setProperty("ADMIN_USERS", "admin:" + Utilities.getUuid().replace(/-/g, "").slice(0, 12));
  if (!p.getProperty("BUSINESS_EMAIL")) p.setProperty("BUSINESS_EMAIL", Session.getEffectiveUser().getEmail());
  store.photoFolder();
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === "dailyJob").forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("dailyJob").timeBased().atHour(6).everyDays(1).inTimezone("Africa/Johannesburg").create();
  MailApp.getRemainingDailyQuota();
  const login = p.getProperty("ADMIN_USERS").split(",")[0];
  const msg = "Setup complete.\n\nDashboard login: " + login.replace(":", " / ") + "\nNotifications go to: " + p.getProperty("BUSINESS_EMAIL") +
    "\nWebsite address: " + (SITE_URL.indexOf("ziccoplumbersgp.co.za") < 0 || p.getProperty("SITE_URL") ? SITE_URL : "not set yet: paste it into WEBSITE_URL at the top of the script (or it's learned from the first visit)");
  console.log(msg);
  return msg;
}

export function dailyJob() {
  return runDaily();
}
