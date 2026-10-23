/* global SpreadsheetApp, DriveApp, PropertiesService, LockService, Utilities */
// Google Sheets + Drive storage for the Apps Script backend.
// Each request / quote / invoice is one row: readable columns for people, plus a hidden "data"
// column with the full record. Customer photos are files in a Drive folder.
import { newTicketId, now } from "../../netlify/lib/util.mjs";

export const TICKET_SHEET = "Requests";
export const DOC_SHEET = "Quotes & Invoices";

const TICKET_COLS = ["Ticket", "Received", "Status", "Priority", "Name", "Surname", "Phone", "Email", "Location", "Services",
  "Visit date", "Visit time", "Unread reply", "Quotes & invoices", "Last update", "data"];
const DOC_COLS = ["Number", "Type", "Status", "Client", "Company", "Email", "Date", "Due / valid until", "Total (R)", "Ticket",
  "Created", "Last update", "data"];

const props = () => PropertiesService.getScriptProperties();

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

export function sheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const cols = name === TICKET_SHEET ? TICKET_COLS : DOC_COLS;
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold");
    sh.setFrozenRows(1);
    sh.hideColumns(cols.length); // the "data" column is for the website, not for people
  }
  return sh;
}

// Rows as [rowNumber, record] pairs, read from the hidden data column.
function rows(name) {
  const sh = sheet(name);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const width = sh.getLastColumn();
  return sh.getRange(2, 1, last - 1, width).getValues()
    .map((r, i) => [i + 2, r[width - 1]])
    .filter(([, raw]) => raw)
    .map(([row, raw]) => [row, JSON.parse(raw)]);
}

function findRow(name, key, value) {
  const hit = rows(name).find(([, rec]) => rec[key] === value);
  return hit ? hit[0] : 0;
}

// ---------- tickets ----------
export function ticketSummary(t) {
  return {
    id: t.id, name: t.customer.name, surname: t.customer.surname, phone: t.customer.phone, email: t.customer.email,
    location: t.customer.location, services: t.services, status: t.status, priority: t.priority || "normal", source: t.source,
    createdAt: t.createdAt, updatedAt: t.updatedAt, appointment: t.appointment || null, unread: !!t.unread,
    hasPhoto: !!t.photo, docs: t.docs || [],
  };
}

function ticketRow(t) {
  const a = t.appointment || {};
  return [t.id, t.createdAt.slice(0, 16).replace("T", " "), t.status, t.priority || "normal", t.customer.name, t.customer.surname,
    t.customer.phone, t.customer.email, t.customer.location, (t.services || []).join(", "), a.date || "", a.time || "",
    t.unread ? "yes" : "", (t.docs || []).join(", "), (t.updatedAt || "").slice(0, 16).replace("T", " "), JSON.stringify(t)];
}

export function listTickets() {
  return rows(TICKET_SHEET).map(([, t]) => ticketSummary(t)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTicket(id) {
  if (!/^ZP-\d{5}$/.test(String(id))) return null;
  const hit = rows(TICKET_SHEET).find(([, t]) => t.id === id);
  return hit ? hit[1] : null;
}

export function createTicket(t) {
  return withLock(() => {
    const taken = new Set(rows(TICKET_SHEET).map(([, x]) => x.id));
    do { t.id = newTicketId(); } while (taken.has(t.id));
    sheet(TICKET_SHEET).appendRow(ticketRow(t));
    return t;
  });
}

export function saveTicket(t) {
  t.updatedAt = now();
  return withLock(() => {
    const row = findRow(TICKET_SHEET, "id", t.id);
    const values = [ticketRow(t)];
    if (row) sheet(TICKET_SHEET).getRange(row, 1, 1, values[0].length).setValues(values);
    else sheet(TICKET_SHEET).appendRow(values[0]);
    return t;
  });
}

export function deleteTicket(t) {
  withLock(() => {
    const row = findRow(TICKET_SHEET, "id", t.id);
    if (row) sheet(TICKET_SHEET).deleteRow(row);
  });
  if (t.photo) deleteFile(t.photo.key);
}

// ---------- quotes & invoices ----------
export function docSummary(d) {
  return {
    number: d.number, type: d.type, status: d.status, ticketId: d.ticketId || null, clientName: d.client.name,
    clientCompany: d.client.company || "", clientEmail: d.client.email || "", issueDate: d.issueDate, dueDate: d.dueDate || null,
    total: d.totals ? d.totals.total : 0, createdAt: d.createdAt, updatedAt: d.updatedAt, sentAt: d.sentAt || null,
  };
}

function docRow(d) {
  return [d.number, d.type, d.status, d.client.name, d.client.company || "", d.client.email || "", d.issueDate, d.dueDate || "",
    d.totals ? d.totals.total : 0, d.ticketId || "", (d.createdAt || "").slice(0, 16).replace("T", " "),
    (d.updatedAt || "").slice(0, 16).replace("T", " "), JSON.stringify(d)];
}

export function nextNumber(type) {
  return withLock(() => {
    const key = "COUNTER_" + type;
    const n = Number(props().getProperty(key) || 0) + 1;
    props().setProperty(key, String(n));
    return (type === "invoice" ? "INV-" : "Q-") + String(n).padStart(4, "0");
  });
}

export function listDocs() {
  return rows(DOC_SHEET).map(([, d]) => docSummary(d)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDoc(number) {
  if (!/^(Q|INV)-\d{4,}$/.test(String(number))) return null;
  const hit = rows(DOC_SHEET).find(([, d]) => d.number === number);
  return hit ? hit[1] : null;
}

export function saveDoc(d) {
  d.updatedAt = now();
  return withLock(() => {
    const row = findRow(DOC_SHEET, "number", d.number);
    const values = [docRow(d)];
    if (row) sheet(DOC_SHEET).getRange(row, 1, 1, values[0].length).setValues(values);
    else sheet(DOC_SHEET).appendRow(values[0]);
    return d;
  });
}

export function deleteDoc(d) {
  withLock(() => {
    const row = findRow(DOC_SHEET, "number", d.number);
    if (row) sheet(DOC_SHEET).deleteRow(row);
  });
}

// ---------- settings (stored as JSON in script properties) ----------
export function getSettingsRaw() {
  const raw = props().getProperty("SETTINGS");
  return raw ? JSON.parse(raw) : {};
}

export function saveSettingsRaw(s) {
  props().setProperty("SETTINGS", JSON.stringify(s));
}

// ---------- files (customer photos) in Google Drive ----------
export function photoFolder() {
  const id = props().getProperty("PHOTO_FOLDER_ID");
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* deleted: make a new one */ } }
  const f = DriveApp.createFolder("Zicco Plumbers - customer photos");
  props().setProperty("PHOTO_FOLDER_ID", f.getId());
  return f;
}

// bytes: Apps Script byte array; returns the Drive file id, which is stored as the photo "key".
export function saveFile(name, bytes, type) {
  return photoFolder().createFile(Utilities.newBlob(bytes, type, name)).getId();
}

export function getFile(id) {
  try {
    const blob = DriveApp.getFileById(id).getBlob();
    return { bytes: blob.getBytes(), type: blob.getContentType() };
  } catch (e) {
    return null;
  }
}

function deleteFile(id) {
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* already gone */ }
}
