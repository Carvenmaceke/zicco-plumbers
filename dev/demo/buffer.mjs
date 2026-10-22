// Minimal Buffer for the browser demo (the backend only uses Buffer.from and .length).
const B = {
  from(x) {
    if (typeof x === "string") return new TextEncoder().encode(x);
    if (x instanceof ArrayBuffer) return new Uint8Array(x);
    return new Uint8Array(x);
  },
};
export { B as Buffer };
