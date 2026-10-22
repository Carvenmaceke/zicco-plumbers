// Builds a static preview of public/ for GitHub Pages, which serves the site under /<repo-name>/
// and cannot run the Netlify Functions backend.
//   node dev/build-pages-preview.mjs <out-dir> <base-path>      e.g.  _site /zicco-plumbers/
// - rewrites root-relative links ("/services/", "/styles.css", ...) to the base path
// - adds a banner explaining that the form, tracking and dashboard need the Netlify deployment
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] || "_site");
const base = ("/" + String(process.argv[3] || "/").replace(/^\/+|\/+$/g, "") + "/").replace(/^\/\/$/, "/");

// Top-level paths of the site. Anything else (e.g. /api/) is left alone.
const TOP = ["images", "js", "admin", "styles.css", "favicon.svg", "og.jpg", "services", "areas", "projects", "about", "faq",
  "contact", "quote", "privacy", "thank-you", "track", "doc", "sitemap.xml", "404.html"];
const topRe = new RegExp(`(?<=["'(\\s,=])/(?=(?:${TOP.map((t) => t.replace(".", "\\.")).join("|")})(?:[/"'?#\\s,)]|$))`, "g");
const homeRe = /(?<=["'])\/(?=["'])/g; // a bare "/" link to the home page

const BANNER = `<div class="pages-preview" style="background:#e0a526;color:#2b1d00;font:600 14px/1.4 system-ui,sans-serif;padding:8px 16px;text-align:center;position:relative;z-index:50">Preview on GitHub Pages: the pages are real, but the quote form, request tracking and dashboard only work on the Netlify version.</div>`;
const INTERCEPT = `<script>document.addEventListener("submit",function(e){e.preventDefault();e.stopImmediatePropagation();alert("This is a GitHub Pages preview. Forms, tracking and the dashboard need the Netlify deployment (see README).");},true);</script>`;

function rewrite(text) {
  if (base === "/") return text;
  return text.replace(topRe, base).replace(homeRe, base);
}

async function copy(src, dest) {
  const st = await fs.stat(src);
  if (st.isDirectory()) {
    await fs.mkdir(dest, { recursive: true });
    for (const f of await fs.readdir(src)) await copy(path.join(src, f), path.join(dest, f));
    return;
  }
  const ext = path.extname(src);
  if (![".html", ".js", ".css"].includes(ext)) return fs.copyFile(src, dest);
  let text = rewrite(await fs.readFile(src, "utf8"));
  if (ext === ".html") {
    text = text.replace(/<body([^>]*)>/, `<body$1>\n${BANNER}`).replace("</body>", `${INTERCEPT}\n</body>`);
    if (!/<meta name="robots"/.test(text)) text = text.replace("</head>", `<meta name="robots" content="noindex">\n</head>`);
  }
  await fs.writeFile(dest, text);
}

await fs.rm(out, { recursive: true, force: true });
await copy(path.join(root, "public"), out);
await fs.writeFile(path.join(out, ".nojekyll"), "");
// The preview must not compete with the real site in Google.
await fs.writeFile(path.join(out, "robots.txt"), "User-agent: *\nDisallow: /\n");
console.log(`GitHub Pages preview written to ${out} (base ${base})`);
