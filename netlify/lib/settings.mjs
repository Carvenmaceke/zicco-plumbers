import { getSettingsRaw, saveSettingsRaw } from "./store.mjs";
import { BUSINESS, clean, cleanText } from "./util.mjs";

// Defaults used on quotes and invoices until they are changed under Settings in the dashboard.
// Prices are SAMPLE prices for the demo only.
export const DEFAULT_SETTINGS = {
  businessName: BUSINESS.name,
  contactPerson: "Ntsikelelo Mpayipeli",
  phone: BUSINESS.phone,
  email: "",
  address: "33 Jorissen Street, Geldenhuys Building\nBraamfontein, Johannesburg, 2001",
  website: "ziccoplumbersgp.co.za",
  registration: "PIRB company no. 72110 · Licensed plumber 8610/19",
  vatNumber: "",
  vatRate: 0,
  bankName: "",
  accountName: "Zicco Plumbers",
  accountNumber: "",
  branchCode: "",
  quoteValidDays: 30,
  invoiceDueDays: 7,
  quoteTerms: "This quote is valid for 30 days. Work starts once the quote is accepted. Any extra work found on site will be quoted separately before it is done.",
  invoiceNotes: "Thank you for your business. Please use the invoice number as your payment reference.",
  notifyEmail: "",
  googleReviewUrl: "",
  priceList: [
    { description: "Call-out fee (Johannesburg)", unitPrice: 450 },
    { description: "Labour (per hour)", unitPrice: 550 },
    { description: "Blocked drain clearing", unitPrice: 850 },
    { description: "High-pressure water jetting (per hour)", unitPrice: 1500 },
    { description: "Drain camera inspection", unitPrice: 1800 },
    { description: "Leak detection", unitPrice: 1500 },
    { description: "Geyser element and thermostat replacement", unitPrice: 1200 },
    { description: "Geyser replacement, 150 L (geyser, valves, drip tray and labour)", unitPrice: 9500 },
    { description: "Heat pump supply and installation", unitPrice: 28000 },
    { description: "Subsoil drainage (per metre)", unitPrice: 650 },
    { description: "Plumbing Certificate of Compliance (COC)", unitPrice: 1200 },
    { description: "Materials and fittings", unitPrice: 0 },
  ],
};

export async function getSettings() {
  const saved = await getSettingsRaw();
  const s = { ...DEFAULT_SETTINGS, ...saved };
  // Environment variables win for the notification address and review link if set.
  if (!s.notifyEmail && process.env.BUSINESS_EMAIL) s.notifyEmail = process.env.BUSINESS_EMAIL;
  if (!s.googleReviewUrl && process.env.GOOGLE_REVIEW_URL) s.googleReviewUrl = process.env.GOOGLE_REVIEW_URL;
  return s;
}

export async function updateSettings(input) {
  const s = await getSettings();
  const textFields = ["businessName", "contactPerson", "phone", "email", "website", "registration", "vatNumber", "bankName", "accountName", "accountNumber", "branchCode", "notifyEmail", "googleReviewUrl"];
  for (const f of textFields) if (f in input) s[f] = clean(input[f], 300);
  for (const f of ["address", "quoteTerms", "invoiceNotes"]) if (f in input) s[f] = cleanText(input[f], 2000);
  if ("vatRate" in input) s.vatRate = Math.min(Math.max(Number(input.vatRate) || 0, 0), 30);
  if ("quoteValidDays" in input) s.quoteValidDays = Math.min(Math.max(parseInt(input.quoteValidDays) || 30, 1), 365);
  if ("invoiceDueDays" in input) s.invoiceDueDays = Math.min(Math.max(parseInt(input.invoiceDueDays) || 0, 0), 365);
  if (Array.isArray(input.priceList)) {
    s.priceList = input.priceList
      .map((p) => ({ description: clean(p.description, 300), unitPrice: Math.max(0, Number(p.unitPrice) || 0) }))
      .filter((p) => p.description)
      .slice(0, 100);
  }
  await saveSettingsRaw(s);
  return s;
}
