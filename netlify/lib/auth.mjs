import crypto from "node:crypto";
import { safeEqual } from "./util.mjs";

// Demo-level login. Set ADMIN_USERS and SESSION_SECRET in Netlify to replace the defaults.
const COOKIE = "zp_admin";
const SESSION_HOURS = 24;
const DEMO_USERS = "admin:zicco-demo";
const DEMO_SECRET = "zicco-demo-session-secret-change-me-please-0001";

// ADMIN_USERS="Ntsikelelo:password1,Office:password2"
export function users() {
  const list = [];
  for (const pair of String(process.env.ADMIN_USERS || DEMO_USERS).split(",")) {
    const i = pair.indexOf(":");
    if (i > 0) list.push({ name: pair.slice(0, i).trim(), password: pair.slice(i + 1) });
  }
  return list;
}

export const usingDemoLogin = () => !process.env.ADMIN_USERS;
const secret = () => process.env.SESSION_SECRET || DEMO_SECRET;

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

function verify(token) {
  const [body, mac] = String(token || "").split(".");
  if (!body || !mac) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  if (!safeEqual(mac, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

export function checkLogin(name, password) {
  const u = users().find((x) => x.name.toLowerCase() === String(name || "").trim().toLowerCase());
  return u && safeEqual(String(password || ""), u.password) ? u.name : null;
}

const secureFlag = (req) => (new URL(req.url).protocol === "https:" ? "; Secure" : "");

export function sessionCookie(req, name) {
  const token = sign({ u: name, exp: Date.now() + SESSION_HOURS * 3600 * 1000 });
  return `${COOKIE}=${token}; Path=/api/admin; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${secureFlag(req)}`;
}

export function clearCookie(req) {
  return `${COOKIE}=; Path=/api/admin; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag(req)}`;
}

export function currentUser(req) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  const data = m && verify(m[1]);
  return data ? data.u : null;
}
