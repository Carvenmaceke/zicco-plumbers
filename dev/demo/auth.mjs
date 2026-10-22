// Browser demo login: remembered in localStorage instead of a cookie.
const KEY = "zpdemo-session";
export const users = () => [{ name: "admin", password: "zicco-demo" }];
export const usingDemoLogin = () => true;
export function checkLogin(name, password) {
  return String(name || "").trim().toLowerCase() === "admin" && password === "zicco-demo" ? "admin" : null;
}
export function sessionCookie(req, name) { try { localStorage.setItem(KEY, name); } catch {} return "zp_demo=1"; }
export function clearCookie() { try { localStorage.removeItem(KEY); } catch {} return "zp_demo=0"; }
export function currentUser() { try { return localStorage.getItem(KEY); } catch { return null; } }
