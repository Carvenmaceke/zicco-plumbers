import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SITE_URL, clean, cleanText, formatDate, formatMoney, newToken, now, sastDate } from "./util.mjs";

export const DOC_STATUSES = {
  quote: ["draft", "sent", "accepted", "declined", "cancelled"],
  invoice: ["draft", "sent", "paid", "cancelled"],
};

export const docTitle = (d, s) =>
  d.type === "quote" ? "Quote" : s.vatNumber && Number(d.vatRate) > 0 ? "Tax invoice" : "Invoice";

export const docUrl = (d) => `${SITE_URL}/doc/?n=${encodeURIComponent(d.number)}&k=${encodeURIComponent(d.token)}`;

const round2 = (n) => Math.round(n * 100) / 100;

export function computeTotals(items, vatRate) {
  const subtotal = round2(items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0));
  const vat = round2(subtotal * (Number(vatRate) || 0) / 100);
  return { subtotal, vat, total: round2(subtotal + vat) };
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

const validDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) ? s : null);

// Applies editable fields from the dashboard to a quote or invoice.
export function applyDocInput(d, input, settings) {
  const c = input.client || {};
  d.client = {
    name: clean(c.name ?? d.client?.name, 120),
    company: clean(c.company ?? d.client?.company, 160),
    email: clean(c.email ?? d.client?.email, 200),
    phone: clean(c.phone ?? d.client?.phone, 40),
    address: cleanText(c.address ?? d.client?.address, 500),
  };
  if (Array.isArray(input.items)) {
    d.items = input.items
      .map((i) => ({
        description: cleanText(i.description, 500),
        qty: Math.max(0, Number(i.qty) || 0),
        unitPrice: Number(i.unitPrice) || 0,
      }))
      .filter((i) => i.description)
      .slice(0, 60);
  }
  d.items ||= [];
  if ("vatRate" in input) d.vatRate = Math.min(Math.max(Number(input.vatRate) || 0, 0), 30);
  d.vatRate ??= settings.vatRate || 0;
  d.issueDate = validDate(input.issueDate) || d.issueDate || sastDate();
  const defaultDays = d.type === "quote" ? settings.quoteValidDays : settings.invoiceDueDays;
  d.dueDate = validDate(input.dueDate) || d.dueDate || addDays(d.issueDate, defaultDays);
  if ("notes" in input) d.notes = cleanText(input.notes, 3000);
  d.notes ??= d.type === "quote" ? settings.quoteTerms : settings.invoiceNotes;
  if ("reference" in input) d.reference = clean(input.reference, 120);
  d.totals = computeTotals(d.items, d.vatRate);
  return d;
}

export function newDoc(type, input, settings, by) {
  const d = {
    type,
    number: null,
    token: newToken(),
    status: "draft",
    ticketId: input.ticketId || null,
    createdAt: now(),
    updatedAt: now(),
    history: [{ at: now(), by, text: `${type === "quote" ? "Quote" : "Invoice"} created` }],
  };
  return applyDocInput(d, input, settings);
}

// ---------- PDF ----------
const NAVY = rgb(0x13 / 255, 0x3c / 255, 0x4b / 255);
const TEAL = rgb(0x1d / 255, 0x5c / 255, 0x73 / 255);
const TINT = rgb(0xe8 / 255, 0xef / 255, 0xf1 / 255);
const INK = rgb(0x1f / 255, 0x29 / 255, 0x33 / 255);
const MUTED = rgb(0x5b / 255, 0x66 / 255, 0x72 / 255);
const LINE = rgb(0xdd / 255, 0xe3 / 255, 0xe6 / 255);
const GREEN = rgb(0x18 / 255, 0x79 / 255, 0x4a / 255);

export async function renderPdf(d, s) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${docTitle(d, s)} ${d.number}`);
  pdf.setAuthor(s.businessName);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 42;

  // Standard PDF fonts only cover Windows-1252; replace anything else.
  const safe = (str) => {
    let out = "";
    for (const ch of String(str ?? "")) {
      if (ch === "\n") { out += ch; continue; }
      try { font.encodeText(ch); out += ch; } catch { out += "?"; }
    }
    return out;
  };
  const width = (t, size, f = font) => f.widthOfTextAtSize(safe(t), size);
  const wrap = (text, size, maxW, f = font) => {
    const lines = [];
    for (const para of safe(text).split("\n")) {
      let line = "";
      for (const word of para.split(" ")) {
        const test = line ? line + " " + word : word;
        if (width(test, size, f) > maxW && line) { lines.push(line); line = word; } else line = test;
      }
      lines.push(line);
    }
    return lines;
  };

  let page, y;
  const pages = [];
  const text = (t, x, yy, size = 10, f = font, color = INK) => page.drawText(safe(t), { x, y: yy, size, font: f, color });
  const textRight = (t, xRight, yy, size = 10, f = font, color = INK) => text(t, xRight - width(t, size, f), yy, size, f, color);

  const title = docTitle(d, s).toUpperCase();
  const newPage = (first) => {
    page = pdf.addPage([W, H]);
    pages.push(page);
    if (first) {
      page.drawRectangle({ x: 0, y: H - 112, width: W, height: 112, color: NAVY });
      page.drawRectangle({ x: 0, y: H - 118, width: W, height: 6, color: TEAL });
      text(s.businessName, M, H - 52, 22, bold, rgb(1, 1, 1));
      text(s.registration, M, H - 70, 9, font, rgb(0.85, 0.9, 0.92));
      if (s.vatNumber) text(`VAT no. ${s.vatNumber}`, M, H - 84, 9, font, rgb(0.85, 0.9, 0.92));
      textRight(title, W - M, H - 52, 22, bold, rgb(1, 1, 1));
      textRight(d.number, W - M, H - 72, 12, font, rgb(0.85, 0.9, 0.92));
      y = H - 150;
    } else {
      page.drawRectangle({ x: 0, y: H - 40, width: W, height: 40, color: NAVY });
      text(`${s.businessName} · ${title} ${d.number} (continued)`, M, H - 25, 10, bold, rgb(1, 1, 1));
      y = H - 70;
    }
  };
  newPage(true);

  // From / to blocks
  const colW = (W - 2 * M - 30) / 2;
  const block = (label, lines, x) => {
    let yy = y;
    text(label.toUpperCase(), x, yy, 8, bold, MUTED);
    yy -= 15;
    lines.filter(Boolean).forEach((l, i) => {
      for (const w of wrap(l, i === 0 ? 11 : 9.5, colW, i === 0 ? bold : font)) {
        text(w, x, yy, i === 0 ? 11 : 9.5, i === 0 ? bold : font, i === 0 ? INK : MUTED);
        yy -= i === 0 ? 15 : 12.5;
      }
    });
    return yy;
  };
  const fromEnd = block("From", [s.businessName, s.address, s.phone, s.email, s.website], M);
  const toEnd = block(d.type === "quote" ? "Quote for" : "Bill to",
    [d.client.name || "Client", d.client.company, d.client.address, d.client.phone, d.client.email], M + colW + 30);
  y = Math.min(fromEnd, toEnd) - 12;

  // Meta row
  page.drawRectangle({ x: M, y: y - 40, width: W - 2 * M, height: 46, color: TINT });
  const meta = [
    [d.type === "quote" ? "Quote no." : "Invoice no.", d.number],
    ["Date", formatDate(d.issueDate)],
    [d.type === "quote" ? "Valid until" : "Due date", formatDate(d.dueDate)],
    ["Reference", d.reference || d.ticketId || "-"],
  ];
  const mw = (W - 2 * M) / meta.length;
  meta.forEach(([k, v], i) => {
    text(k.toUpperCase(), M + 12 + i * mw, y - 10, 7.5, bold, MUTED);
    text(v.replace(/^\w+day, /, ""), M + 12 + i * mw, y - 27, 10, bold, INK);
  });
  y -= 66;

  // Items table
  const cols = { desc: M + 10, qty: W - M - 200, unit: W - M - 95, amt: W - M - 10 };
  const descW = cols.qty - cols.desc - 40;
  const tableHeader = () => {
    page.drawRectangle({ x: M, y: y - 8, width: W - 2 * M, height: 24, color: TEAL });
    text("DESCRIPTION", cols.desc, y, 8.5, bold, rgb(1, 1, 1));
    textRight("QTY", cols.qty, y, 8.5, bold, rgb(1, 1, 1));
    textRight("UNIT PRICE", cols.unit, y, 8.5, bold, rgb(1, 1, 1));
    textRight("AMOUNT", cols.amt, y, 8.5, bold, rgb(1, 1, 1));
    y -= 26;
  };
  tableHeader();
  d.items.forEach((item, idx) => {
    const lines = wrap(item.description, 10, descW);
    const rowH = lines.length * 13 + 10;
    if (y - rowH < 150) { newPage(false); tableHeader(); }
    if (idx % 2 === 1) page.drawRectangle({ x: M, y: y - rowH + 13, width: W - 2 * M, height: rowH, color: rgb(0.975, 0.98, 0.985) });
    lines.forEach((l, i) => text(l, cols.desc, y - i * 13, 10));
    textRight(String(item.qty), cols.qty, y, 10);
    textRight(formatMoney(item.unitPrice), cols.unit, y, 10);
    textRight(formatMoney(item.qty * item.unitPrice), cols.amt, y, 10, bold);
    y -= rowH;
    page.drawLine({ start: { x: M, y: y + 12 }, end: { x: W - M, y: y + 12 }, thickness: 0.6, color: LINE });
  });
  if (!d.items.length) { text("No items", cols.desc, y, 10, font, MUTED); y -= 22; }

  // Totals
  if (y < 220) newPage(false);
  y -= 6;
  const tx = W - M - 220;
  const totalRow = (label, value, strong) => {
    if (strong) {
      page.drawRectangle({ x: tx - 10, y: y - 10, width: 230, height: 28, color: NAVY });
      text(label, tx, y, 12, bold, rgb(1, 1, 1));
      textRight(value, W - M - 10, y, 12, bold, rgb(1, 1, 1));
      y -= 34;
    } else {
      text(label, tx, y, 10, font, MUTED);
      textRight(value, W - M - 10, y, 10, font, INK);
      y -= 18;
    }
  };
  totalRow("Subtotal", formatMoney(d.totals.subtotal));
  if (Number(d.vatRate) > 0) totalRow(`VAT (${d.vatRate}%)`, formatMoney(d.totals.vat));
  y -= 4;
  totalRow(d.type === "quote" ? "Total" : d.status === "paid" ? "Total (paid)" : "Total due", formatMoney(d.totals.total), true);

  // Paid / accepted stamp
  const stamp = d.status === "paid" ? "PAID" : d.status === "accepted" ? "ACCEPTED" : null;
  if (stamp) {
    page.drawRectangle({ x: M, y: y + 18, width: width(stamp, 20, bold) + 28, height: 34, borderColor: GREEN, borderWidth: 2.5, color: rgb(1, 1, 1) });
    text(stamp, M + 14, y + 29, 20, bold, GREEN);
  }

  // Banking details (invoices) and notes
  const section = (label, body) => {
    const lines = wrap(body, 9.5, W - 2 * M);
    if (y - lines.length * 13 - 30 < 60) newPage(false);
    y -= 10;
    text(label.toUpperCase(), M, y, 8, bold, TEAL);
    y -= 15;
    for (const l of lines) { text(l, M, y, 9.5, font, MUTED); y -= 13; }
  };
  if (d.type === "invoice" && d.status !== "paid") {
    const bank = [
      s.bankName && `Bank: ${s.bankName}`,
      s.accountName && `Account name: ${s.accountName}`,
      s.accountNumber && `Account number: ${s.accountNumber}`,
      s.branchCode && `Branch code: ${s.branchCode}`,
      `Payment reference: ${d.number}`,
    ].filter(Boolean).join("\n");
    section("Payment details", s.accountNumber ? bank : `Banking details: add them under Settings in the dashboard.\nPayment reference: ${d.number}`);
  }
  if (d.notes) section(d.type === "quote" ? "Terms" : "Notes", d.notes);
  if (d.type === "quote" && d.status !== "accepted") section("Accept this quote", `Accept online at ${docUrl(d)} or reply to the email this quote came with.`);

  // Footer on every page
  pages.forEach((pg, i) => {
    pg.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.6, color: LINE });
    pg.drawText(safe(`${s.businessName} · ${s.phone} · ${s.website}`), { x: M, y: 26, size: 8, font, color: MUTED });
    const pn = `Page ${i + 1} of ${pages.length}`;
    pg.drawText(pn, { x: W - M - font.widthOfTextAtSize(pn, 8), y: 26, size: 8, font, color: MUTED });
  });

  return Buffer.from(await pdf.save());
}
