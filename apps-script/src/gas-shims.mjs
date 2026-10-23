/* global Utilities */
// Small stand-ins for Node built-ins used by the shared code, for the Apps Script runtime.
function randomHex(chars) {
  let hex = "";
  while (hex.length < chars) hex += Utilities.getUuid().replace(/-/g, "");
  return hex.slice(0, chars);
}

export function randomInt(min, max) {
  return min + (parseInt(randomHex(8), 16) % (max - min));
}

export function randomBytes(n) {
  const hex = randomHex(n * 2);
  return {
    toString(enc) {
      if (enc === "hex") return hex;
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) { const b = parseInt(hex.slice(i, i + 2), 16); bytes.push(b > 127 ? b - 256 : b); }
      return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, "");
    },
  };
}

export function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export default { randomInt, randomBytes, timingSafeEqual };

// Only Buffer.from(...) and .length are used (for comparing strings).
export const Buffer = {
  from(x) {
    if (typeof x === "string") return Array.prototype.map.call(x, (c) => c.charCodeAt(0));
    return x;
  },
};
