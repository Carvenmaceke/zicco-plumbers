// Just enough of node:crypto for the backend code in the browser demo.
const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
const b64url = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export function randomInt(min, max) { return min + Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * (max - min)); }
export function randomBytes(n) { const u8 = rand(n); return { toString: (enc) => (enc === "hex" ? [...u8].map((b) => b.toString(16).padStart(2, "0")).join("") : b64url(u8)) }; }
export function timingSafeEqual(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
export default { randomInt, randomBytes, timingSafeEqual };
