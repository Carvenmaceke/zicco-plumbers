import { getStore } from "@netlify/blobs";
import { newTicketId, now } from "./util.mjs";

// Netlify Blobs, with strong consistency so the dashboard always sees the latest write.
const db = () => getStore({ name: "zicco", consistency: "strong" });
const files = () => getStore({ name: "zicco-files", consistency: "strong" });

// ---------- small helpers ----------
// Read-modify-write with an ETag check, retried if two requests collide.
async function update(key, fallback, mutate) {
  const store = db();
  for (let attempt = 0; attempt < 8; attempt++) {
    const cur = await store.getWithMetadata(key, { type: "json" });
    const data = cur?.data ?? structuredClone(fallback);
    const result = mutate(data);
    const res = cur
      ? await store.setJSON(key, data, { onlyIfMatch: cur.etag })
      : await store.setJSON(key, data, { onlyIfNew: true });
    if (res.modified) return result === undefined ? data : result;
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 120));
  }
  throw new Error("The database is busy, please try again");
}

// ---------- tickets ----------
export function ticketSummary(t) {
  return {
    id: t.id,
    name: t.customer.name,
    surname: t.customer.surname,
    phone: t.customer.phone,
    email: t.customer.email,
    location: t.customer.location,
    services: t.services,
    status: t.status,
    priority: t.priority || "normal",
    source: t.source,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    appointment: t.appointment || null,
    unread: !!t.unread,
    hasPhoto: !!t.photo,
    docs: t.docs || [],
  };
}

export async function listTickets() {
  const data = await db().get("index/tickets", { type: "json" });
  return Object.values(data || {}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTicket(id) {
  if (!/^ZP-\d{5}$/.test(String(id))) return null;
  return db().get(`ticket/${id}`, { type: "json" });
}

export async function createTicket(t) {
  for (let i = 0; i < 10; i++) {
    t.id = newTicketId();
    const res = await db().setJSON(`ticket/${t.id}`, t, { onlyIfNew: true });
    if (res.modified) {
      await update("index/tickets", {}, (idx) => { idx[t.id] = ticketSummary(t); });
      return t;
    }
  }
  throw new Error("Could not allocate a ticket number");
}

export async function saveTicket(t) {
  t.updatedAt = now();
  await db().setJSON(`ticket/${t.id}`, t);
  await update("index/tickets", {}, (idx) => { idx[t.id] = ticketSummary(t); });
  return t;
}

export async function deleteTicket(t) {
  await db().delete(`ticket/${t.id}`);
  if (t.photo) await files().delete(t.photo.key);
  await update("index/tickets", {}, (idx) => { delete idx[t.id]; });
}

// ---------- quotes & invoices ----------
export function docSummary(d) {
  return {
    number: d.number,
    type: d.type,
    status: d.status,
    ticketId: d.ticketId || null,
    clientName: d.client.name,
    clientCompany: d.client.company || "",
    clientEmail: d.client.email || "",
    issueDate: d.issueDate,
    dueDate: d.dueDate || null,
    total: d.totals?.total ?? 0,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    sentAt: d.sentAt || null,
  };
}

export async function nextNumber(type) {
  const prefix = type === "invoice" ? "INV" : "Q";
  const n = await update("counters", { quote: 0, invoice: 0 }, (c) => {
    c[type] = (c[type] || 0) + 1;
    return c[type];
  });
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

export async function listDocs() {
  const data = await db().get("index/docs", { type: "json" });
  return Object.values(data || {}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDoc(number) {
  if (!/^(Q|INV)-\d{4,}$/.test(String(number))) return null;
  return db().get(`doc/${number}`, { type: "json" });
}

export async function saveDoc(d) {
  d.updatedAt = now();
  await db().setJSON(`doc/${d.number}`, d);
  await update("index/docs", {}, (idx) => { idx[d.number] = docSummary(d); });
  return d;
}

export async function deleteDoc(d) {
  await db().delete(`doc/${d.number}`);
  await update("index/docs", {}, (idx) => { delete idx[d.number]; });
}

// ---------- settings ----------
export async function getSettingsRaw() {
  return (await db().get("settings", { type: "json" })) || {};
}

export async function saveSettingsRaw(s) {
  await db().setJSON("settings", s);
}

// ---------- files (customer photos) ----------
export async function saveFile(key, buffer, type) {
  await files().set(key, buffer, { metadata: { type } });
}

export async function getFile(key) {
  return files().getWithMetadata(key, { type: "arrayBuffer" });
}
