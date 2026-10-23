// Builds the website using site.config.json:
//   appsScriptUrl  the Google Apps Script web app URL (live site). Empty = demo with sample data.
//   customDomain   e.g. "www.ziccoplumbers.co.za" when the site runs on its own domain (served from "/").
//   node dev/build-from-config.mjs [out-dir] [base-path]
//   - GitHub Pages workflow:  node dev/build-from-config.mjs _site /<repo-name>/
//   - any other host:         npm run build   (writes dist/ for the root of your domain)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
const out = path.resolve(process.argv[2] || path.join(root, "dist"));
const base = config.customDomain ? "/" : process.argv[3] || "/";

const args = [path.join(root, "dev/build-site.mjs"), out, base];
if (config.appsScriptUrl) args.push("--api", config.appsScriptUrl.trim());
execFileSync(process.execPath, args, { stdio: "inherit" });
if (config.customDomain) fs.writeFileSync(path.join(out, "CNAME"), config.customDomain.trim() + "\n");
