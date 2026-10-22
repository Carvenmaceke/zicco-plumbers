// Browser stand-in for @netlify/blobs, backed by localStorage (falls back to memory if storage is full or blocked).
const mem = new Map();
const PREFIX = "zpdemo:";

function read(k) {
  let raw = mem.get(k);
  if (raw === undefined) { try { raw = localStorage.getItem(k); } catch { raw = null; } }
  return raw == null ? null : JSON.parse(raw);
}
function write(k, v) {
  const raw = JSON.stringify(v);
  try { localStorage.setItem(k, raw); mem.delete(k); } catch { mem.set(k, raw); }
}
function remove(k) {
  mem.delete(k);
  try { localStorage.removeItem(k); } catch {}
}
const toB64 = (u8) => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (b) => { const s = atob(b); const u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return u8.buffer; };

function decode(entry, type) {
  if (type === "json") return JSON.parse(entry.data);
  if (type === "arrayBuffer") return entry.bin ? fromB64(entry.data) : new TextEncoder().encode(entry.data).buffer;
  return entry.data;
}

export function getStore(opts) {
  const name = typeof opts === "string" ? opts : opts.name;
  const key = (k) => `${PREFIX}${name}:${k}`;
  const put = (k, data, bin, options = {}) => {
    const cur = read(key(k));
    if (options.onlyIfNew && cur) return { modified: false };
    if (options.onlyIfMatch && (!cur || cur.etag !== options.onlyIfMatch)) return { modified: false };
    const etag = Date.now().toString(36) + Math.random().toString(36).slice(2);
    write(key(k), { data, bin, etag, metadata: options.metadata || {} });
    return { modified: true, etag };
  };
  return {
    async get(k, { type } = {}) { const e = read(key(k)); return e ? decode(e, type) : null; },
    async getWithMetadata(k, { type } = {}) { const e = read(key(k)); return e ? { data: decode(e, type), etag: e.etag, metadata: e.metadata } : null; },
    async setJSON(k, data, options) { return put(k, JSON.stringify(data), false, options); },
    async set(k, data, options) {
      if (typeof data === "string") return put(k, data, false, options);
      const u8 = data instanceof Uint8Array ? data : new Uint8Array(data);
      return put(k, toB64(u8), true, options);
    },
    async delete(k) { remove(key(k)); },
    async list({ prefix = "" } = {}) {
      const keys = new Set([...mem.keys()]);
      try { for (let i = 0; i < localStorage.length; i++) keys.add(localStorage.key(i)); } catch {}
      const p = key(prefix);
      return { blobs: [...keys].filter((k) => k && k.startsWith(p)).map((k) => ({ key: k.slice(key("").length), etag: "" })), directories: [] };
    },
  };
}

export function resetDemo() {
  mem.clear();
  try { Object.keys(localStorage).filter((k) => k.startsWith(PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch {}
}
