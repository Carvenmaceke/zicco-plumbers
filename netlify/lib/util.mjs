import crypto from "node:crypto";

export const BUSINESS = {
  name: "Zicco Plumbers",
  phone: "+27 81 440 5778",
  phoneTel: "+27814405778",
  whatsapp: "27814405778",
  address: "Braamfontein, Johannesburg",
};

export const SITE_URL = (process.env.SITE_URL || process.env.URL || "https://ziccoplumbersgp.co.za").replace(/\/$/, "");

// Order matters: it's the order shown to customers on the tracking page.
export const STATUSES = [
  { key: "new", label: "Received", customer: "We've received your request." },
  { key: "contacted", label: "Contacted", customer: "We've been in touch about your request." },
  { key: "quoted", label: "Quote sent", customer: "We've sent you a quote." },
  { key: "scheduled", label: "Visit scheduled", customer: "Your visit has been booked." },
  { key: "in_progress", label: "In progress", customer: "Work on your job is under way." },
  { key: "completed", label: "Completed", customer: "Your job has been completed." },
  { key: "cancelled", label: "Cancelled", customer: "This request has been closed." },
];
export const STATUS_KEYS = STATUSES.map((s) => s.key);
export const statusInfo = (key) => STATUSES.find((s) => s.key === key) || STATUSES[0];
export const OPEN_STATUSES = ["new", "contacted", "quoted", "scheduled", "in_progress"];

export const SERVICES = [
  "Plumbing service / maintenance",
  "Drains (blocked drain, drain cleaning)",
  "Leak detection",
  "Subsoil drainage",
  "Water jetting",
  "Heat pumps / Geysers",
  "New building plumbing installation",
  "Water booster pump",
  "Metered showers",
  "Plumbing COC",
  "Drain camera",
  "Above-ground drainage",
  "Below-ground drainage",
  "Rainwater drainage",
  "Cold water installation",
  "Other",
];

export const SOURCES = ["website", "phone", "whatsapp", "email", "walk-in", "referral"];

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

export const error = (message, status = 400) => json({ error: message }, status);

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

export const now = () => new Date().toISOString();

export function newTicketId() {
  return "ZP-" + crypto.randomInt(10000, 100000);
}

export function newToken() {
  return crypto.randomBytes(18).toString("base64url");
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const clean = (v, max = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
export const cleanText = (v, max = 4000) => String(v ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);

export function validEmail(e) {
  return !e || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

export function normalisePhone(p) {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 10) d = "27" + d.slice(1);
  return d;
}

export function validPhone(p) {
  const d = normalisePhone(p);
  return d.length >= 9 && d.length <= 15;
}

export function trackUrl(t) {
  return `${SITE_URL}/track/?id=${encodeURIComponent(t.id)}&k=${encodeURIComponent(t.token)}`;
}

export function whatsappLink(phone, text) {
  return `https://wa.me/${normalisePhone(phone)}?text=${encodeURIComponent(text)}`;
}

// South Africa has no daylight saving: SAST is always UTC+2.
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
export function sastDate(d = new Date()) {
  return new Date(d.getTime() + SAST_OFFSET_MS).toISOString().slice(0, 10);
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

export function formatAppointment(a) {
  if (!a?.date) return "";
  let s = formatDate(a.date);
  if (a.time) s += ` at ${a.time}`;
  if (a.window) s += ` (arrival window ${a.window})`;
  return s;
}

export function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "";
  return "R " + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function fullName(c) {
  return [c?.name, c?.surname].filter(Boolean).join(" ");
}

export async function readJson(req, max = 64 * 1024) {
  const text = await req.text();
  if (text.length > max) throw new Error("Request too large");
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new Error("Invalid JSON");
  }
}
