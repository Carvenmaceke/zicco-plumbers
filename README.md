# Zicco Plumbers: website + ticket, quote and invoice system (demo)

Everything runs on Netlify. There are no other servers or databases to manage.

| Part | What it is |
| --- | --- |
| `public/` | The website: 28 pages, the quote form, customer tracking page, online quote/invoice page and the `/admin/` dashboard |
| `netlify/functions/` | The backend API (Netlify Functions) |
| `netlify/lib/` | Shared backend code: storage, email, PDFs, settings |
| Data | Stored in **Netlify Blobs**, which is built into Netlify, so there's nothing to set up |
| `site-src/` | The generator that builds the public pages (`python3 site-src/build.py <original-site-folder> public`). You only need it to change page content. |
| `dev/server.mjs` | Local test server |

> **Demo security level.** The dashboard has a simple username/password login. Default: **admin / zicco-demo**. Change it with `ADMIN_USERS` and `SESSION_SECRET` before real customers use it.

---

## What it does

### Customers
1. **Request a quote.** They fill in the form on any page: name, surname, email, number, services (checkboxes), where they're situated, an optional message and an optional photo. Large phone photos are shrunk automatically before upload.
2. **Get a ticket number.** The thank-you page shows a number like `ZP-48213` and a tracking link. If they gave an email address, a confirmation email is sent too.
3. **Track the request.** The tracking page at `/track/` shows:
   - a progress bar: Received → Contacted → Quote sent → Visit scheduled → In progress → Completed;
   - the booked visit ("We will come on Monday 26 October at 09:00"), with **Add to calendar** and **Confirm this date** buttons;
   - their quotes and invoices;
   - a message thread where they can **reply** to the business.

   They can also find their request again with the ticket number and phone number.
4. **Get emails for every update.** These include status changes, visit bookings (with a calendar invite attached), messages, quotes and invoices (with a PDF attached), receipts, and a reminder the day before the visit.
5. **Accept or decline a quote online,** or download the PDF and print it.

### Business: dashboard at `/admin/`
- **Dashboard.** Shows new requests, open tickets, visits in the next 7 days, quotes waiting for a reply, unpaid and overdue invoices, and money paid this month.
- **Tickets.** Filter by status, search, see unread customer replies (red dot) and export to CSV. You can also **log phone or WhatsApp jobs** as tickets.
- **Ticket page.** See the customer details and photo. Call, WhatsApp (with the message pre-filled) or email them. The update panel lets you:
  - change the status;
  - book a visit ("we will come on" date, time and arrival window);
  - write a message to the customer, with quick-reply templates;
  - add a **private note** only the team sees;
  - tick **Email the customer** to send everything in one email.

  The full timeline is shown underneath.
- **Quotes and invoices.**
  - **Create from a ticket.** The client details fill in automatically and the lines come from a ready-made template matching the service. You only adjust what's different.
  - **Edit.** Add lines from the price list or a template. VAT is optional. Notes and terms are pre-filled. Totals update as you type.
  - **Send by email.** The client gets the PDF plus an online link, and a copy goes to the business inbox.
  - **Convert a quote to an invoice** in one click. You can also **duplicate** a document, mark it **paid** (with an optional emailed receipt), accepted, declined or cancelled, and send the link on WhatsApp.
  - Numbers run in sequence: `Q-0001` for quotes, `INV-0001` for invoices.
- **Settings.**
  - Business details, VAT number and **banking details**, all printed on invoices.
  - Default quote terms and invoice notes.
  - The **price list**, which is used by the templates.
  - The notification email address and the Google review link (added to the "job completed" email).
  - A test-email button.
- **Daily job at 06:00.** Customers get a reminder the day before their visit. The business gets a summary of today's visits, requests not yet answered, unread replies and overdue invoices.

> The prices in the price list are **sample prices for the demo**. Change them under Settings.

---

## Deploy to Netlify

**Important:** the old drag-and-drop deploy only uploads files. It does **not** deploy the backend. Use one of these two options.

### Option A: Netlify CLI (quickest)
```bash
npm install
npx netlify-cli login
npx netlify-cli link          # pick the existing ziccoplumbersgp.co.za site
npx netlify-cli deploy --prod
```

### Option B: GitHub (automatic deploys)
Push this folder to a GitHub repo. In Netlify, go to **Site configuration → Build & deploy → Link repository**. The settings come from `netlify.toml`.

### Then set environment variables
In Netlify, go to **Site configuration → Environment variables** and add them. See `.env.example` for the full list. The important ones:

| Variable | Why |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Sends email. With Gmail, use `smtp.gmail.com`, port `465` and a Google **App password**. |
| `BUSINESS_EMAIL` | Where new requests, replies and copies of quotes and invoices are sent. Can also be set in Settings. |
| `ADMIN_USERS` | Your own logins, e.g. `Ntsikelelo:pass1,Office:pass2` |
| `SESSION_SECRET` | Any long random text. Required whenever you change the logins. |

Redeploy after adding variables. Then open `/admin/`, go to **Settings**, and click **Send test email**.

**Email without Gmail:** Resend (`RESEND_API_KEY`) also works. Until you verify your domain in Resend, it can only email your own address.

---

## Run it on your computer
```bash
npm install
npm run dev
```
- Website: http://localhost:8888
- Dashboard: http://localhost:8888/admin/ (admin / zicco-demo)

Data is saved in `.data/`. Until email is configured, every email (with its PDF and calendar attachments) is saved to `.data/outbox/` so you can open and check it.

To run the 06:00 daily job by hand, open http://localhost:8888/.netlify/functions/daily-reminders, or use the button in Settings.

---

## API reference
| Method & path | Who | Purpose |
| --- | --- | --- |
| `POST /api/tickets` | Public | Website form → new ticket |
| `GET /api/track?id&k` | Customer | Ticket status, visit, messages, documents |
| `POST /api/track/reply`, `/confirm`, `/lookup` | Customer | Reply, confirm visit, find a ticket by phone number |
| `GET /api/track/ics?id&k` | Customer | Calendar file for the visit |
| `GET /api/doc?n&k`, `/api/doc/pdf` | Customer | View or download a quote or invoice |
| `POST /api/doc/accept`, `/decline` | Customer | Respond to a quote |
| `/api/admin/*` | Logged-in staff | Tickets, documents, settings, CSV export, test email, daily job |
