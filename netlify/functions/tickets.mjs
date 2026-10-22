// POST /api/tickets: quote request from the website form.
import { createTicket, saveFile, saveTicket } from "../lib/store.mjs";
import { getSettings } from "../lib/settings.mjs";
import { businessNewTicketEmail, customerReceivedEmail, sendEmail } from "../lib/email.mjs";
import {
  SERVICES, SITE_URL, clean, cleanText, error, json, now, newToken, trackUrl, validEmail, validPhone,
} from "../lib/util.mjs";

const MAX_PHOTO = 5 * 1024 * 1024;

export default async (req) => {
  if (req.method !== "POST") return error("Method not allowed", 405);
  const wantsJson = (req.headers.get("accept") || "").includes("application/json");
  const fail = (msg) => (wantsJson ? error(msg) : new Response(`${msg}\n\nPlease go back and try again.`, { status: 400 }));

  let form;
  try {
    form = await req.formData();
  } catch {
    return fail("Could not read the form.");
  }

  // Honeypot: real people never fill this hidden field.
  if (form.get("company_website")) return wantsJson ? json({ ok: true }) : Response.redirect(new URL("/thank-you/", req.url), 303);

  const customer = {
    name: clean(form.get("name"), 80),
    surname: clean(form.get("surname"), 80),
    email: clean(form.get("email"), 200).toLowerCase(),
    phone: clean(form.get("phone"), 40),
    location: clean(form.get("location"), 200),
  };
  const services = form.getAll("services[]").map(String).filter((s) => SERVICES.includes(s));
  const message = cleanText(form.get("message"), 3000);

  if (!customer.name || !customer.surname) return fail("Please enter your name and surname.");
  if (!validPhone(customer.phone)) return fail("Please enter a valid contact number.");
  if (!validEmail(customer.email)) return fail("Please enter a valid email address.");
  if (!customer.location) return fail("Please tell us where you are situated.");
  if (!services.length) return fail("Please choose at least one service.");

  const ticket = {
    id: null,
    token: newToken(),
    status: "new",
    priority: "normal",
    source: "website",
    customer,
    services,
    message,
    photo: null,
    appointment: null,
    docs: [],
    unread: false,
    page: clean(form.get("page"), 200),
    createdAt: now(),
    updatedAt: now(),
    events: [{ at: now(), type: "created", public: true, by: "customer", text: "Request received" }],
  };

  const photo = form.get("photo");
  let photoData = null;
  if (photo && typeof photo === "object" && photo.size > 0) {
    if (photo.size > MAX_PHOTO) return fail("The photo is too large (max 5 MB).");
    if (!String(photo.type).startsWith("image/")) return fail("Please attach an image file.");
    photoData = { buffer: Buffer.from(await photo.arrayBuffer()), type: photo.type, name: clean(photo.name, 120) };
  }

  await createTicket(ticket);
  if (photoData) {
    const key = `photos/${ticket.id}`;
    await saveFile(key, photoData.buffer, photoData.type);
    ticket.photo = { key, type: photoData.type, name: photoData.name, size: photoData.buffer.length };
    await saveTicket(ticket);
  }

  const s = await getSettings();
  await Promise.all([
    customer.email ? sendEmail(customerReceivedEmail(ticket, s)) : null,
    s.notifyEmail ? sendEmail(businessNewTicketEmail(ticket, s)) : null,
  ]);

  // Relative to SITE_URL so it also works when the site lives under a sub-path.
  const thanks = `${new URL(SITE_URL).pathname.replace(/\/$/, "")}/thank-you/?id=${encodeURIComponent(ticket.id)}&k=${encodeURIComponent(ticket.token)}`;
  if (wantsJson) return json({ ok: true, id: ticket.id, trackUrl: trackUrl(ticket), redirect: thanks }, 201);
  return new Response(null, { status: 303, headers: { location: thanks } });
};

export const config = { path: "/api/tickets" };
