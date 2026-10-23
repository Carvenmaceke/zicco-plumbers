# Google Sheets backend: set-up

One free Google Sheet and Apps Script run everything behind the website:

- **Requests:** every quote request from the website becomes a row in the **Requests** tab. Customer photos are saved in a Google Drive folder.
- **Quotes & invoices:** each one is a row in the **Quotes & Invoices** tab. PDFs are made by Google and emailed with the quote or invoice.
- **Emails from your Gmail:**
  - Customers get confirmations, updates, visit bookings with a calendar invite, quotes, invoices and reminders.
  - You get new requests, customer replies, accepted quotes and a daily summary.
- **Dashboard:** the website's `/admin/` page reads and updates the sheet.

Setting it up takes about 10 minutes.

## 1. Create the sheet and script

1. Sign in to the Gmail account the emails should come from (the business account).
2. Go to [sheets.new](https://sheets.new) to create a Google Sheet. Name it **Zicco Plumbers**.
3. In the sheet, open **Extensions → Apps Script**.
4. Delete everything in the editor, then paste the full contents of [`apps-script/Code.gs`](Code.gs).
5. Near the top, paste your website's address between the quotes, for example:
   `var WEBSITE_URL = "https://www.ziccoplumbersgp.co.za";`
   (Links in emails point here. If you leave it empty, the script learns it from the first visit.)
6. Click **Save** (the disk icon).

## 2. Run the setup once

1. In the toolbar's function menu, choose **setup**, then click **Run**.
2. Google asks for permission. Click **Review permissions**, choose your account, then **Advanced → Go to project (unsafe) → Allow**.
   Google shows this warning for any script you write yourself. The script uses only this sheet, a "Zicco Plumbers - customer photos" folder it creates in your Drive, and your Gmail for sending.
3. Open **Execution log** at the bottom. Copy your **dashboard login**, which looks like `admin / 3b6497f96e3e`.

Setup creates the two tabs, the photo folder, your login and a daily job at 06:00. The daily job emails customers the day before their visit and sends you a summary.

## 3. Publish it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.

## 4. Connect the website

1. Open `site.config.json` in this repository.
2. Paste the Web app URL into `appsScriptUrl`:
   ```json
   { "appsScriptUrl": "https://script.google.com/macros/s/XXXXXXXX/exec", "customDomain": "" }
   ```
3. Commit the change. GitHub publishes the live site within a minute. If you host somewhere else, run `npm run build` and upload the `dist/` folder.

Test it:
1. Send a request through the website's quote form. It should appear in the **Requests** tab, and you should get an email.
2. Open `/admin/` on the website and log in with the details from step 2.
3. In **Settings**, click **Send test email**.

## Changing things later

| What | Where |
| --- | --- |
| Dashboard logins | Apps Script → **Project Settings → Script properties → `ADMIN_USERS`**, e.g. `admin:a-strong-password,Office:another-one` |
| Who gets notifications | The dashboard's **Settings**, or the `BUSINESS_EMAIL` script property |
| Prices, banking details, VAT, terms | The dashboard's **Settings** |
| Update the script after a website update | Paste the new `Code.gs`, then **Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy**. The web app URL stays the same. |

## Good to know

- **Gmail limit:** a normal Gmail account can send to about 100 recipients a day from a script. A Google Workspace account can send to about 1,500. That's plenty for a plumbing business.
- **Sheet editing:** you can read and sort the tabs freely. Don't edit or delete the hidden last column; it holds the full record the website uses. To remove a request, use **Delete ticket** in the dashboard.
- **Rebuilding `Code.gs`:** the file is generated with `npm run build:backend`, from `apps-script/src/` plus the shared email templates and quote/invoice logic in `netlify/lib/`.
