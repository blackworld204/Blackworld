import { AsyncLocalStorage } from "node:async_hooks";
import type { BankState } from "@/lib/bank";
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

function docName() {
  return `projects/${projectId()}/databases/(default)/documents/desks/presentation`;
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

export async function readFirestoreDesk(token: string): Promise<DeskRecord | null> {
  const response = await fetch(`https://firestore.googleapis.com/v1/${docName()}?key=${apiKey()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) return null;
  const body = (await response.json().catch(() => null)) as { fields?: Record<string, unknown> } | null;
  if (!body?.fields) return null;
  const data = fromValue({ mapValue: { fields: body.fields } }) as (BankState & { bwRevision?: number }) | null;
  if (!data?.users) return null;
  const revision = typeof data.bwRevision === "number" ? data.bwRevision : 0;
  const { bwRevision: _revision, ...state } = data;
  return { revision, state: state as BankState };
}

export async function writeFirestoreDesk(token: string, desk: DeskRecord) {
  const body = { ...(desk.state as BankState & { bwRevision?: number }), bwRevision: desk.revision };
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents:commit?key=${apiKey()}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      writes: [{ update: { name: docName(), fields: (toValue(body) as { mapValue: { fields: unknown } }).mapValue.fields } }],
    }),
  });
  if (!response.ok) throw new Error("firestore");
}
