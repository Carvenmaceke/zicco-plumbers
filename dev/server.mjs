// Local development server: serves /public, runs the Netlify Functions, and stores data in a local
// Netlify Blobs server under .data/. Emails are saved to .data/outbox/ unless SMTP or Resend is configured.
//   npm install && npm run dev   ->  http://localhost:8888  (dashboard: /admin/, login admin / zicco-demo)
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BlobsServer } from "@netlify/blobs/server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8888);
const BLOBS_PORT = PORT + 1;

// Load .env if present
try {
  for (const line of (await fs.readFile(path.join(root, ".env"), "utf8")).split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const token = "local-dev";
const blobs = new BlobsServer({ directory: path.join(root, ".data/blobs"), port: BLOBS_PORT, token });
await blobs.start();
const edge = `http://localhost:${BLOBS_PORT}`;
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ edgeURL: edge, uncachedEdgeURL: edge, token, siteID: "local" })).toString("base64");
process.env.SITE_URL ||= `http://localhost:${PORT}`;
process.env.EMAIL_OUTBOX_DIR ||= path.join(root, ".data/outbox");

// Load functions and their routes
const fnDir = path.join(root, "netlify/functions");
const routes = [];
let daily;
for (const f of await fs.readdir(fnDir)) {
  if (!f.endsWith(".mjs")) continue;
  const mod = await import(pathToFileURL(path.join(fnDir, f)).href);
  if (mod.config?.schedule) { daily = mod; continue; }
  for (const p of [].concat(mod.config?.path || [])) {
    const re = new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    routes.push({ re, handler: mod.default });
  }
}

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".webp": "image/webp", ".png": "image/png", ".xml": "application/xml", ".txt": "text/plain", ".json": "application/json" };

async function serveStatic(pathname, res) {
  let file = path.join(root, "public", decodeURIComponent(pathname));
  if (!file.startsWith(path.join(root, "public"))) { res.writeHead(403).end(); return; }
  try {
    const st = await fs.stat(file);
    if (st.isDirectory()) {
      if (!pathname.endsWith("/")) { res.writeHead(301, { location: pathname + "/" }).end(); return; }
      file = path.join(file, "index.html");
    }
    const data = await fs.readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" }).end(data);
  } catch {
    const nf = await fs.readFile(path.join(root, "public/404.html")).catch(() => "Not found");
    res.writeHead(404, { "content-type": "text/html; charset=utf-8" }).end(nf);
  }
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname === "/.netlify/functions/daily-reminders" && daily) {
    const { runDaily } = await import(pathToFileURL(path.join(root, "netlify/lib/daily.mjs")).href);
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(await runDaily()));
    return;
  }
  const route = routes.find((r) => r.re.test(url.pathname));
  if (!route) return serveStatic(url.pathname, res);

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
  });
  try {
    const response = await route.handler(request, { ip: req.socket.remoteAddress });
    const headers = {};
    response.headers.forEach((v, k) => { headers[k] = v; });
    res.writeHead(response.status, headers).end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error(e);
    res.writeHead(500, { "content-type": "text/plain" }).end("Function error: " + e.message);
  }
}).listen(PORT, () => console.log(`Zicco Plumbers dev server: http://localhost:${PORT}  (admin: /admin/)`));
