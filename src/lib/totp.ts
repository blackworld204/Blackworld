const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const RECOVERY = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function rotl(value: number, shift: number) {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function sha1(message: Uint8Array) {
  const bitLength = message.length * 8;
  const zeroPad = (64 - ((message.length + 9) % 64)) % 64;
  const bytes = new Uint8Array(message.length + 1 + zeroPad + 8);
  bytes.set(message);
  bytes[message.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(bytes.length - 4, bitLength, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const words = new Uint32Array(80);

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 80; index += 1) {
      words[index] = rotl(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 1);
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let index = 0; index < 80; index += 1) {
      let mixed = 0;
      let constant = 0;
      if (index < 20) {
        mixed = ((b & c) | (~b & d)) >>> 0;
        constant = 0x5a827999;
      } else if (index < 40) {
        mixed = (b ^ c ^ d) >>> 0;
        constant = 0x6ed9eba1;
      } else if (index < 60) {
        mixed = ((b & c) | (b & d) | (c & d)) >>> 0;
        constant = 0x8f1bbcdc;
      } else {
        mixed = (b ^ c ^ d) >>> 0;
        constant = 0xca62c1d6;
      }
      const next = (rotl(a, 5) + mixed + e + constant + words[index]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = next;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const digest = new Uint8Array(20);
  const out = new DataView(digest.buffer);
  out.setUint32(0, h0, false);
  out.setUint32(4, h1, false);
  out.setUint32(8, h2, false);
  out.setUint32(12, h3, false);
  out.setUint32(16, h4, false);
  return digest;
}

function hmacSha1(key: Uint8Array, message: Uint8Array) {
  const block = 64;
  let trimmed = key;
  if (trimmed.length > block) trimmed = sha1(trimmed);
  const innerPad = new Uint8Array(block);
  const outerPad = new Uint8Array(block);
  innerPad.set(trimmed);
  outerPad.set(trimmed);
  for (let index = 0; index < block; index += 1) {
    innerPad[index] ^= 0x36;
    outerPad[index] ^= 0x5c;
  }
  const inner = new Uint8Array(block + message.length);
  inner.set(innerPad);
  inner.set(message, block);
  const innerDigest = sha1(inner);
  const outer = new Uint8Array(block + innerDigest.length);
  outer.set(outerPad);
  outer.set(innerDigest, block);
  return sha1(outer);
}

export function base32Encode(bytes: Uint8Array) {
  let buffer = 0;
  let bits = 0;
  let out = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += BASE32[(buffer >>> bits) & 31];
    }
  }
  if (bits > 0) out += BASE32[(buffer << (5 - bits)) & 31];
  return out;
}

export function base32Decode(secret: string) {
  const clean = secret.replace(/\s/g, "").replace(/=+$/, "").toUpperCase();
  if (!clean || !/^[A-Z2-7]+$/.test(clean)) return null;
  let buffer = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    buffer = (buffer << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >>> bits) & 255);
    }
  }
  return new Uint8Array(bytes);
}

export function hotp(key: Uint8Array, counter: number) {
  const message = new Uint8Array(8);
  new DataView(message.buffer).setUint32(4, counter >>> 0, false);
  const mac = hmacSha1(key, message);
  const offset = mac[19] & 15;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(binary % 1_000_000).padStart(6, "0");
}

export function totpAt(secret: string, now: number) {
  const key = base32Decode(secret);
  if (!key) return null;
  const counter = Math.floor(now / 1000 / 30);
  return hotp(key, counter);
}

export function verifyTotp(secret: string, code: string, now = Date.now()) {
  const digits = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) return false;
  const key = base32Decode(secret);
  if (!key) return false;
  const counter = Math.floor(now / 1000 / 30);
  for (const step of [counter - 1, counter, counter + 1]) {
    if (step >= 0 && hotp(key, step) === digits) return true;
  }
  return false;
}

export function createSecret() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

export function groupSecret(secret: string) {
  return secret.replace(/(.{4})/g, "$1 ").trim();
}

export function createRecoveryCodes() {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  const codes: string[] = [];
  for (let index = 0; index < 8; index += 1) {
    let code = "";
    for (let place = 0; place < 8; place += 1) code += RECOVERY[bytes[index * 8 + place] % RECOVERY.length];
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

export function normalizeRecovery(input: string) {
  const raw = input.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(raw)) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}
