// The real backend handlers, bundled to run inside the browser for the GitHub Pages demo.
import tickets from "../../netlify/functions/tickets.mjs";
import track from "../../netlify/functions/track.mjs";
import doc from "../../netlify/functions/doc.mjs";
import admin from "../../netlify/functions/admin.mjs";
import { resetDemo } from "./blobs.mjs";

export { resetDemo };

function route(pathname) {
  if (pathname === "/api/tickets") return tickets;
  if (pathname === "/api/track" || pathname.startsWith("/api/track/")) return track;
  if (pathname === "/api/doc" || pathname.startsWith("/api/doc/")) return doc;
  if (pathname.startsWith("/api/admin/")) return admin;
  return null;
}

// A minimal Request-like object. A real Request would drop the body type information we need.
function makeRequest(url, init = {}) {
  const body = init.body;
  return {
    url,
    method: (init.method || "GET").toUpperCase(),
    headers: new Headers(init.headers || {}),
    async text() { return typeof body === "string" ? body : body == null ? "" : String(body); },
    async formData() { return body instanceof FormData ? body : new FormData(); },
    async json() { return JSON.parse(await this.text()); },
  };
}

export async function handle(url, init) {
  await seed();
  const h = route(new URL(url).pathname);
  if (!h) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "content-type": "application/json" } });
  return h(makeRequest(url, init), {});
}

// ---------- sample data ----------
const SEEDED = "zpdemo-seeded-v2";
let seeding = null;

async function call(path, method = "GET", body) {
  const url = location.origin + path;
  const init = { method, headers: {} };
  if (body instanceof FormData) init.body = body;
  else if (body) { init.body = JSON.stringify(body); init.headers["content-type"] = "application/json"; }
  init.headers.accept = "application/json";
  const res = await route(path.split("?")[0])(makeRequest(url, init), {});
  return res.json();
}

function form(fields, services) {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.append(k, v));
  services.forEach((s) => f.append("services[]", s));
  return f;
}

const day = (n) => { const d = new Date(Date.now() + 2 * 3600e3 + n * 864e5); return d.toISOString().slice(0, 10); };

export function seed() {
  try { if (localStorage.getItem(SEEDED)) return Promise.resolve(); } catch { return Promise.resolve(); }
  seeding ||= (async () => {
    // Visitors with sample data from an older version of the demo start fresh.
    try { if (localStorage.getItem("zpdemo-seeded-v1")) { resetDemo(); localStorage.removeItem("zpdemo-seeded-v1"); } } catch {}
    try { localStorage.setItem(SEEDED, "1"); } catch {}
    const a = await call("/api/tickets", "POST", form({ name: "Sipho", surname: "Mokoena", email: "sipho@example.com", phone: "082 111 2233", location: "Bryanston, Sandton", message: "Geyser is leaking from the bottom and there's no hot water." }, ["Heat pumps / Geysers"]));
    const b = await call("/api/tickets", "POST", form({ name: "Naledi", surname: "Khumalo", email: "naledi@example.com", phone: "071 444 5566", location: "Ferndale, Randburg", message: "Outside drain keeps blocking. Big tree near the drain." }, ["Drains (blocked drain, drain cleaning)", "Drain camera"]));
    const c = await call("/api/tickets", "POST", form({ name: "Pieter", surname: "van Wyk", email: "pieter@example.com", phone: "083 777 8899", location: "Halfway House, Midrand", message: "Water bill doubled this month." }, ["Leak detection"]));
    await call("/api/tickets", "POST", form({ name: "Thandi", surname: "Ndlovu", email: "", phone: "072 000 1122", location: "Braamfontein", message: "Need metered showers for a 40-room student residence." }, ["Metered showers"]));

    const was = localStorage.getItem("zpdemo-session");
    localStorage.setItem("zpdemo-session", "admin");
    await call(`/api/admin/tickets/${a.id}`, "POST", { appointment: { date: day(1), time: "09:00", window: "08:00-10:00" }, message: "We will come tomorrow morning to replace the geyser.", note: "150 L geyser in stock.", notify: true });
    const q = await call("/api/admin/docs", "POST", { type: "quote", ticketId: b.id, items: [
      { description: "Call-out fee (Johannesburg)", qty: 1, unitPrice: 450 },
      { description: "High-pressure water jetting (per hour)", qty: 2, unitPrice: 1500 },
      { description: "Drain camera inspection", qty: 1, unitPrice: 1800 },
    ] });
    await call(`/api/admin/docs/${q.doc.number}/send`, "POST", { message: "Thanks for having us. Here is the quote we discussed." });
    await call(`/api/admin/tickets/${c.id}`, "POST", { status: "completed", message: "Leak found and repaired under the driveway.", notify: true });
    const inv = await call("/api/admin/docs", "POST", { type: "invoice", ticketId: c.id, items: [
      { description: "Call-out fee (Johannesburg)", qty: 1, unitPrice: 450 },
      { description: "Leak detection", qty: 1, unitPrice: 1500 },
      { description: "Materials and fittings", qty: 1, unitPrice: 380 },
    ] });
    await call(`/api/admin/docs/${inv.doc.number}/send`, "POST", {});
    if (was) localStorage.setItem("zpdemo-session", was); else localStorage.removeItem("zpdemo-session");
  })();
  return seeding;
}
