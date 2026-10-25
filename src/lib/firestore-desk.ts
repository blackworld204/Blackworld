import { AsyncLocalStorage } from "node:async_hooks";
import type { BankState } from "@/lib/bank";
import { googleAccessToken } from "@/lib/fcm-send";
import { publicFirebaseConfig } from "@/lib/firebase-public";

export type DeskRecord = { revision: number; state: BankState };

const authStore = new AsyncLocalStorage<string>();

export function withDeskAuth<T>(token: string, run: () => Promise<T>) {
  const jwt = token.split(".").length === 3 ? token : "";
  if (!jwt) return run();
  return authStore.run(jwt, run);
}

export function deskToken() {
  return authStore.getStore() ?? "";
}

function projectId() {
  return publicFirebaseConfig.projectId;
}

function apiKey() {
  return publicFirebaseConfig.apiKey;
}

function docName(kind: "desks" | "photos", id: string) {
  return `projects/${projectId()}/databases/(default)/documents/${kind}/${id}`;
}

const DATASTORE = "https://www.googleapis.com/auth/datastore";

/** Prefers the service account so client rules can deny direct reads. Falls back to the signed-in user. */
async function bearers(userToken: string) {
  const admin = await googleAccessToken(DATASTORE).catch(() => null);
  const list = [admin, userToken].filter((token): token is string => Boolean(token));
  return [...new Set(list)];
}

function toValue(value: unknown): Record<string, unknown> {
  if (value == null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toValue) } };
  if (typeof value === "object") {
    const fields: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) fields[key] = toValue(item);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

function fromValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if ("nullValue" in row) return null;
  if ("stringValue" in row) return row.stringValue;
  if ("booleanValue" in row) return row.booleanValue;
  if ("integerValue" in row) return Number(row.integerValue);
  if ("doubleValue" in row) return Number(row.doubleValue);
  if ("timestampValue" in row) return row.timestampValue;
  if ("arrayValue" in row) {
    const values = (row.arrayValue as { values?: unknown[] } | undefined)?.values ?? [];
    return values.map(fromValue);
  }
  if ("mapValue" in row) {
    const fields = (row.mapValue as { fields?: Record<string, unknown> } | undefined)?.fields ?? {};
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(fields)) out[key] = fromValue(item);
    return out;
  }
  return null;
}

async function authed(path: string, token: string, init?: RequestInit) {
  // A service-account token must not carry the browser API key. Referrer limits on that key reject the server.
  const browser = token.split(".").length === 3;
  const join = path.includes("?") ? "&" : "?";
  const suffix = browser ? `${join}key=${apiKey()}` : "";
  return fetch(`https://firestore.googleapis.com/v1/${path}${suffix}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export async function readFirestoreDesk(token: string): Promise<DeskRecord | null> {
  for (const bearer of await bearers(token)) {
    const response = await authed(docName("desks", "presentation"), bearer).catch(() => null);
    if (!response?.ok) continue;
    const body = (await response.json().catch(() => null)) as { fields?: Record<string, unknown> } | null;
    if (!body?.fields) return null;
    const data = fromValue({ mapValue: { fields: body.fields } }) as (BankState & { bwRevision?: number }) | null;
    if (!data?.users) return null;
    const revision = typeof data.bwRevision === "number" ? data.bwRevision : 0;
    const { bwRevision: _revision, ...state } = data;
    return { revision, state: state as BankState };
  }
  return null;
}

export async function writeFirestoreDesk(token: string, desk: DeskRecord) {
  const body = { ...(desk.state as BankState & { bwRevision?: number }), bwRevision: desk.revision };
  const payload = JSON.stringify({
    writes: [{ update: { name: docName("desks", "presentation"), fields: (toValue(body) as { mapValue: { fields: unknown } }).mapValue.fields } }],
  });
  let last = 0;
  for (const bearer of await bearers(token)) {
    const response = await authed(`projects/${projectId()}/databases/(default)/documents:commit`, bearer, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => null);
    if (response?.ok) return;
    last = response?.status ?? 0;
    if (last !== 401 && last !== 403) break;
  }
  throw new Error("firestore");
}

function photoId(userId: string) {
  return /^usr_[A-Za-z0-9_-]{1,40}$/.test(userId) ? `photo_${userId}` : "";
}

export async function readStoredPhoto(token: string, userId: string) {
  const id = photoId(userId);
  if (!id) return null;
  for (const bearer of await bearers(token)) {
    const response = await authed(docName("desks", id), bearer).catch(() => null);
    if (response?.status === 404) return null;
    if (!response?.ok) continue;
    const body = (await response.json().catch(() => null)) as { fields?: Record<string, unknown> } | null;
    const data = body?.fields ? (fromValue({ mapValue: { fields: body.fields } }) as { image?: unknown }) : null;
    return typeof data?.image === "string" ? data.image : null;
  }
  return null;
}

export async function writeStoredPhoto(token: string, userId: string, image: string) {
  const id = photoId(userId);
  if (!id) throw new Error("photo");
  const fields = (toValue({ image }) as { mapValue: { fields: unknown } }).mapValue.fields;
  const payload = JSON.stringify({
    writes: [{ update: { name: docName("desks", id), fields } }],
  });
  for (const bearer of await bearers(token)) {
    const response = await authed(`projects/${projectId()}/databases/(default)/documents:commit`, bearer, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => null);
    if (response?.ok) return;
    if (response && response.status !== 401 && response.status !== 403) break;
  }
  throw new Error("photo");
}

export async function readFirestoreBox(id: string) {
  const tokens = await bearers(deskToken());
  if (tokens.length === 0) throw new Error("firestore");
  for (const token of tokens) {
    const response = await authed(docName("desks", id), token).catch(() => null);
    if (response?.status === 404) return "";
    if (!response?.ok) continue;
    const body = (await response.json().catch(() => null)) as { fields?: Record<string, unknown> } | null;
    const data = body?.fields ? (fromValue({ mapValue: { fields: body.fields } }) as { box?: unknown }) : null;
    return typeof data?.box === "string" ? data.box : "";
  }
  throw new Error("firestore");
}

export async function writeFirestoreBox(id: string, box: string) {
  const tokens = await bearers(deskToken());
  if (tokens.length === 0) throw new Error("firestore");
  const fields = (toValue({ box }) as { mapValue: { fields: unknown } }).mapValue.fields;
  const payload = JSON.stringify({
    writes: [{ update: { name: docName("desks", id), fields } }],
  });
  let last = 0;
  for (const token of tokens) {
    const response = await authed(`projects/${projectId()}/databases/(default)/documents:commit`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => null);
    if (response?.ok) return;
    last = response?.status ?? 0;
    if (last !== 401 && last !== 403) break;
  }
  throw new Error("firestore");
}

export async function clearStoredPhoto(token: string, userId: string) {
  const id = photoId(userId);
  if (!id) throw new Error("photo");
  const payload = JSON.stringify({ writes: [{ delete: docName("desks", id) }] });
  for (const bearer of await bearers(token)) {
    const response = await authed(`projects/${projectId()}/databases/(default)/documents:commit`, bearer, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => null);
    if (response?.ok || response?.status === 404) return;
    if (response && response.status !== 401 && response.status !== 403) break;
  }
  throw new Error("photo");
}
