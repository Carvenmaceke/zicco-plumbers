// Builds the website as plain files you can host anywhere (GitHub Pages, cPanel, any web host).
//   node dev/build-site.mjs <out-dir> <base-path> [--api <Apps Script web app URL>]
//   e.g.  node dev/build-site.mjs _site /zicco-plumbers/ --api https://script.google.com/macros/s/XXXX/exec
// - rewrites root-relative links ("/services/", "/styles.css", ...) to the base path ("/" on your own domain)
// - adds js/demo-shim.js, which sends the site's /api/* calls to the backend:
//     with --api: the Google Apps Script backend (Google Sheets + Gmail), see apps-script/README.md
//     without:    a demo backend running in the visitor's browser with sample data, plus a demo banner
import fs from "node:fs/promises";
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.resolve(process.argv[2] || "_site");
// Changes on every publish so browsers fetch fresh demo scripts instead of cached ones.
const VERSION = (process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 10);
const apiIdx = process.argv.indexOf("--api");
const API = apiIdx > 0 ? String(process.argv[apiIdx + 1] || "").trim() : "";
if (API && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(API)) {
  console.error("The --api address should look like https://script.google.com/macros/s/.../exec");
  process.exit(1);
}
const base = ("/" + String(process.argv[3] || "/").replace(/^\/+|\/+$/g, "") + "/").replace(/^\/\/$/, "/");

// Top-level paths of the site. Anything else (e.g. /api/) is left alone.
const TOP = ["images", "js", "admin", "plumber", "styles.css", "favicon.svg", "og.jpg", "services", "areas", "projects", "about", "faq",
  "contact", "quote", "privacy", "thank-you", "track", "doc", "sitemap.xml", "404.html"];
const topRe = new RegExp(`(?<=["'(\\s,=])/(?=(?:${TOP.map((t) => t.replace(".", "\\.")).join("|")})(?:[/"'?#\\s,)]|$))`, "g");
const homeRe = /(?<=href=["'])\/(?=["'])/g; // href="/" links to the home page (HTML only)

const BANNER = (base) => `<div class="pages-preview" style="background:#08222c;color:#e8f1f4;font:500 13.5px/1.5 Inter,system-ui,sans-serif;padding:9px 16px;text-align:center;position:relative;z-index:50">Demo version: everything works, using sample data saved only in your browser. No emails are sent. <a href="${base}admin/" style="color:#f2a93b;font-weight:600">Manager dashboard</a> (admin / zicco-demo) &middot; <a href="#" onclick="zpResetDemo();return false" style="color:#f2a93b;font-weight:600">Reset demo</a></div>`;

function rewrite(text, html) {
  if (base === "/") return text;
  text = text.replace(topRe, base);
  return html ? text.replace(homeRe, base) : text;
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
  let text = rewrite(await fs.readFile(src, "utf8"), ext === ".html");
  if (ext === ".html") {
    const apiAttr = API ? ` data-api="${API}"` : "";
    text = text.replace("<head>", `<head>\n<script src="${base}js/demo-shim.js?v=${VERSION}" data-v="${VERSION}"${apiAttr}></script>`);
    if (!API) {
      text = text.replace(/<body([^>]*)>/, `<body$1>\n${BANNER(base)}`);
      if (!/<meta name="robots"/.test(text)) text = text.replace("</head>", `<meta name="robots" content="noindex">\n</head>`);
    }
  }
  await fs.writeFile(dest, text);
}

await fs.rm(out, { recursive: true, force: true });
await copy(path.join(root, "public"), out);
await fs.writeFile(path.join(out, ".nojekyll"), "");
await fs.copyFile(path.join(root, "dev/demo/shim.js"), path.join(out, "js/demo-shim.js"));

// Demo only: bundle the backend for the browser, swapping server-only modules for browser versions.
const demo = (f) => path.join(root, "dev/demo", f);
if (!API) await esbuild.build({
  entryPoints: [demo("backend.mjs")],
  outfile: path.join(out, "js/demo-backend.js"),
  bundle: true, format: "esm", platform: "browser", target: "es2020", minify: true, legalComments: "none",
  define: { "process.env": "globalThis.__ZP_ENV" },
  inject: [demo("buffer.mjs")],
  logLevel: "warning",
  plugins: [{
    name: "browser-demo",
    setup(b) {
      b.onResolve({ filter: /^@netlify\/blobs$/ }, () => ({ path: demo("blobs.mjs") }));
      b.onResolve({ filter: /^node:crypto$/ }, () => ({ path: demo("crypto.mjs") }));
      b.onResolve({ filter: /^(node:fs\/promises|node:path|nodemailer)$/ }, () => ({ path: demo("empty.mjs") }));
      b.onResolve({ filter: /\/lib\/auth\.mjs$/ }, () => ({ path: demo("auth.mjs") }));
    },
  }],
});
// A demo must not compete with the real site in Google.
if (!API) await fs.writeFile(path.join(out, "robots.txt"), "User-agent: *\nDisallow: /\n");
console.log(`${API ? "Live website (Google Sheets backend)" : "Demo website"} written to ${out} (base ${base})`);
