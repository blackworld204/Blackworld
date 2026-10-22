import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { isSealed, SEAL_PREFIX } from "@/lib/sealed";
import type { BankState, BankUser } from "@/lib/bank";

function keyBytes() {
  const raw = process.env.BANK_ENCRYPTION_KEY ?? "";
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) return null;
  return key;
}

export function vaultReady() {
  return keyBytes() !== null;
}

export function sealText(plain: string) {
  const key = keyBytes();
  if (!key) throw new Error("missing-key");
  if (isSealed(plain)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [SEAL_PREFIX.slice(0, -1), iv.toString("base64url"), tag.toString("base64url"), body.toString("base64url")].join(".");
}

export function openText(sealed: string) {
  const key = keyBytes();
  if (!key) throw new Error("missing-key");
  if (!isSealed(sealed)) return sealed;
  const [version, iv, tag, body] = sealed.split(".");
  if (version !== "bw1" || !iv || !tag || !body) throw new Error("sealed");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}

function sealUser(user: BankUser): BankUser {
  return {
    ...user,
    pin: user.pin ? sealText(user.pin) : user.pin,
    totpSecret: user.totpSecret ? sealText(user.totpSecret) : undefined,
    apiKey: user.apiKey ? sealText(user.apiKey) : undefined,
    webhookUrl: user.webhookUrl ? sealText(user.webhookUrl) : undefined,
    recoveryCodes: user.recoveryCodes?.map((code) => sealText(code)),
    pushTokens: user.pushTokens?.map((token) => sealText(token)),
  };
}

function openUser(user: BankUser): BankUser {
  return {
    ...user,
    pin: user.pin ? openText(user.pin) : user.pin,
    totpSecret: user.totpSecret ? openText(user.totpSecret) : undefined,
    apiKey: user.apiKey ? openText(user.apiKey) : undefined,
    webhookUrl: user.webhookUrl ? openText(user.webhookUrl) : undefined,
    recoveryCodes: user.recoveryCodes?.map((code) => openText(code)),
    pushTokens: user.pushTokens?.map((token) => openText(token)),
  };
}

export function sealState(state: BankState): BankState {
  return { ...state, users: state.users.map(sealUser) };
}

export function openState(state: BankState): BankState {
  return { ...state, users: state.users.map(openUser) };
}
