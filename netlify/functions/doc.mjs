// Customer-facing quote / invoice access (secret key from the emailed link).
//   GET  /api/doc?n=&k=         document data for the online view
//   GET  /api/doc/pdf?n=&k=     PDF download
//   POST /api/doc/accept         { n, k, name }  accept a quote
//   POST /api/doc/decline        { n, k, reason }
import { getDoc, saveDoc, getTicket, saveTicket } from "../lib/store.mjs";
import { getSettings } from "../lib/settings.mjs";
import { docTitle, renderPdf } from "../lib/docs.mjs";
import { businessActivityEmail, docAdminLink, sendEmail } from "../lib/email.mjs";
import { clean, cleanText, error, json, now, readJson, safeEqual, trackUrl } from "../lib/util.mjs";

async function load(n, k) {
  const d = await getDoc(n);
  return d && k && safeEqual(k, d.token) && d.status !== "draft" ? d : null;
}

async function view(d, s) {
  const t = d.ticketId ? await getTicket(d.ticketId) : null;
  return {
    number: d.number, type: d.type, title: docTitle(d, s), status: d.status,
    client: d.client, issueDate: d.issueDate, dueDate: d.dueDate, reference: d.reference || d.ticketId || "",
    items: d.items, vatRate: d.vatRate, totals: d.totals, notes: d.notes,
    acceptedAt: d.acceptedAt || null, acceptedBy: d.acceptedBy || null, paidAt: d.paidAt || null,
    trackUrl: t ? trackUrl(t) : null,
    business: {
      name: s.businessName, registration: s.registration, vatNumber: s.vatNumber, address: s.address, phone: s.phone, email: s.email, website: s.website,
      bank: d.type === "invoice" && s.accountNumber ? { bankName: s.bankName, accountName: s.accountName, accountNumber: s.accountNumber, branchCode: s.branchCode } : null,
    },
  };
}

export default async (req) => {
  const url = new URL(req.url);
  const action = url.pathname.replace(/^\/api\/doc\/?/, "");
  const s = await getSettings();

  if (req.method === "GET") {
    const d = await load(url.searchParams.get("n"), url.searchParams.get("k"));
    if (!d) return error("Document not found. Please check the link in your email.", 404);
    if (action === "pdf") {
      return new Response(await renderPdf(d, s), {
        headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${d.number}.pdf"`, "cache-control": "no-store" },
      });
    }
    return json(await view(d, s));
  }

  if (req.method !== "POST") return error("Method not allowed", 405);
  let body;
  try { body = await readJson(req); } catch (e) { return error(e.message); }
  const d = await load(body.n, body.k);
  if (!d) return error("Document not found.", 404);
  if (d.type !== "quote") return error("Only quotes can be accepted or declined.");
  if (!["sent", "accepted", "declined"].includes(d.status)) return error("This quote can no longer be changed.");

  let subject, title, note;
  if (action === "accept") {
    d.status = "accepted";
    d.acceptedAt = now();
    d.acceptedBy = clean(body.name, 120) || d.client.name;
    d.history.push({ at: now(), by: "client", text: `Quote accepted online by ${d.acceptedBy}` });
    subject = `Quote ${d.number} accepted by ${d.acceptedBy}`;
    title = `${d.acceptedBy} accepted quote ${d.number} online.`;
  } else if (action === "decline") {
    d.status = "declined";
    note = cleanText(body.reason, 1000);
    d.history.push({ at: now(), by: "client", text: `Quote declined online${note ? `: ${note}` : ""}` });
    subject = `Quote ${d.number} declined by ${d.client.name}`;
    title = `${d.client.name} declined quote ${d.number}.`;
  } else return error("Not found", 404);
  await saveDoc(d);

  // Show it on the linked ticket's timeline too.
  if (d.ticketId) {
    const t = await getTicket(d.ticketId);
    if (t) {
      t.events.push({ at: now(), type: "message", public: true, by: "customer", text: `${action === "accept" ? "Accepted" : "Declined"} quote ${d.number}${note ? `: ${note}` : ""}` });
      t.unread = true;
      await saveTicket(t);
    }
  }
  if (s.notifyEmail) await sendEmail(businessActivityEmail(s, { subject, title, body: note, link: docAdminLink(d), replyTo: d.client.email || undefined }));
  return json(await view(d, s));
};

export const config = { path: ["/api/doc", "/api/doc/*"] };
