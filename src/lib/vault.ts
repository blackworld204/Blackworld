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

function sealValue(value: string) {
  return value ? sealText(value) : value;
}

function openValue(value: string) {
  return value ? openText(value) : value;
}

function sealEmail(value: string) {
  if (!value || value.startsWith(SEAL_PREFIX)) return value;
  return sealText(value.trim().toLowerCase());
}

function sealAddress(address: BankUser["address"]) {
  if (!address) return address;
  return {
    street: sealValue(address.street),
    city: sealValue(address.city),
    zip: sealValue(address.zip),
    country: sealValue(address.country),
  };
}

function openAddress(address: BankUser["address"]) {
  if (!address) return address;
  return {
    street: openValue(address.street),
    city: openValue(address.city),
    zip: openValue(address.zip),
    country: openValue(address.country),
  };
}

function sealWire<T extends { routing: string; swift: string; account: string }>(row: T): T {
  return { ...row, routing: sealValue(row.routing), swift: sealValue(row.swift), account: sealValue(row.account) };
}

function openWire<T extends { routing: string; swift: string; account: string }>(row: T): T {
  return { ...row, routing: openValue(row.routing), swift: openValue(row.swift), account: openValue(row.account) };
}

function sealUser(user: BankUser): BankUser {
  return {
    ...user,
    email: sealEmail(user.email),
    phone: sealValue(user.phone),
    pin: user.pin ? sealText(user.pin) : user.pin,
    totpSecret: user.totpSecret ? sealText(user.totpSecret) : undefined,
    apiKey: user.apiKey ? sealText(user.apiKey) : undefined,
    webhookUrl: user.webhookUrl ? sealText(user.webhookUrl) : undefined,
    referralId: user.referralId ? sealText(user.referralId) : undefined,
    recoveryCodes: user.recoveryCodes?.map((code) => sealText(code)),
    pushTokens: user.pushTokens?.map((token) => sealText(token)),
    address: sealAddress(user.address),
  };
}

function openUser(user: BankUser): BankUser {
  return {
    ...user,
    email: openValue(user.email),
    phone: openValue(user.phone),
    pin: user.pin ? openText(user.pin) : user.pin,
    totpSecret: user.totpSecret ? openText(user.totpSecret) : undefined,
    apiKey: user.apiKey ? openText(user.apiKey) : undefined,
    webhookUrl: user.webhookUrl ? openText(user.webhookUrl) : undefined,
    referralId: user.referralId ? openText(user.referralId) : undefined,
    recoveryCodes: user.recoveryCodes?.map((code) => openText(code)),
    pushTokens: user.pushTokens?.map((token) => openText(token)),
    address: openAddress(user.address),
  };
}

export function sealState(state: BankState): BankState {
  return {
    ...state,
    users: state.users.map(sealUser),
    payees: (state.payees ?? []).map(sealWire),
    referrals: (state.referrals ?? []).map((row) => ({ ...row, email: sealEmail(row.email) })),
    schedules: (state.schedules ?? []).map(sealWire),
    approvals: (state.approvals ?? []).map(sealWire),
  };
}

export function openState(state: BankState): BankState {
  return {
    ...state,
    users: state.users.map(openUser),
    payees: (state.payees ?? []).map(openWire),
    referrals: (state.referrals ?? []).map((row) => ({ ...row, email: openValue(row.email) })),
    schedules: (state.schedules ?? []).map(openWire),
    approvals: (state.approvals ?? []).map(openWire),
  };
}
