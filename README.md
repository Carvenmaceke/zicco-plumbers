# Zicco Plumbers: website, requests, quotes and invoices

The website is plain files you can host anywhere: GitHub Pages, cPanel or any web host.

Everything behind it runs on **free Google tools**:
- **Google Sheets:** requests, quotes and invoices;
- **Gmail:** all notifications and customer emails;
- **Google Drive:** customer photos;
- **Google Apps Script:** the backend that connects them.

There's no server to pay for and nothing on Netlify.

| Part | What it is |
| --- | --- |
| `site-src/` | Generator for the website pages (`python3 site-src/build.py <original-site-folder> public`) |
| `public/` | The generated website, including the `/admin/` dashboard |
| `apps-script/` | The Google Sheets backend. **Set-up guide: [`apps-script/README.md`](apps-script/README.md)** |
| `site.config.json` | Your Apps Script web app URL and (optionally) your own domain |
| `dev/` | Build scripts, plus the in-browser demo backend |
| `netlify/lib/` | Shared code: email templates, quote/invoice maths, validation. Used by the Apps Script build. |
| `netlify/functions/` | The original Netlify version of the backend. Not needed any more; kept because the demo uses it. |

## Going live

1. **Set up the Google Sheets backend.** Follow [`apps-script/README.md`](apps-script/README.md); it takes about 10 minutes.
2. **Put the web app URL in `site.config.json`:**
   ```json
   { "appsScriptUrl": "https://script.google.com/macros/s/XXXXXXXX/exec", "customDomain": "" }
   ```
3. **Host the website.** Pick one:
   - **GitHub Pages:** commit `site.config.json`. The workflow in `.github/workflows/pages.yml` publishes the live site on every push. For your own domain, set `customDomain` (e.g. `"www.ziccoplumbers.co.za"`) and point the domain's DNS at GitHub Pages.
   - **Any other host (cPanel, shared hosting…):** run `npm install && npm run build`, then upload everything in the `dist/` folder to your site's root (`public_html`).

While `appsScriptUrl` is empty, the build is a **demo**. It has sample data, a demo banner and a backend that runs in each visitor's browser (dashboard login `admin` / `zicco-demo`), and nothing is saved online or emailed.

## What it does

**Customers**
- Request a quote: from any service page (the form is locked to that service) or the general quote form, with an optional photo.
- Get a ticket number and a tracking link: the tracking page shows progress, the booked visit (add to calendar or confirm), quotes and invoices, and a message thread.
- Get emails for every update, plus a reminder the day before the visit.
- Accept or decline a quote online, or download the PDF.

**The business (`/admin/`)**
- **Dashboard:** new requests, open jobs, upcoming visits, quotes waiting and money owed or paid.
- **Tickets:** status, visit booking ("we will come on…"), messages to the customer with quick replies, private notes, photo, WhatsApp/call/email shortcuts, CSV export, and logging phone or WhatsApp jobs.
- **Quotes and invoices:** made from ready templates, with the client details filled in from the ticket. They're emailed as PDF (with a copy to you), and you can convert a quote to an invoice, mark it paid and email a receipt.
- **Settings:** business details, banking details, VAT, terms, price list and notification email.
- **Daily at 06:00:** visit reminders to customers and a summary email to you.

Everything is also visible in the Google Sheet: the **Requests** and **Quotes & Invoices** tabs.

## Updating

| Change | Command |
| --- | --- |
| Page content or design | Edit `site-src/`, then `python3 site-src/build.py <original-site-folder> public` |
| Backend | Edit `apps-script/src/` (or the shared `netlify/lib/`), run `npm run build:backend`, then paste `apps-script/Code.gs` into Apps Script and deploy a new version |
| Website for a non-GitHub host | `npm run build`, then upload `dist/` |
