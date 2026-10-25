import type { BankState } from "@/lib/bank";

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

export function deskFromDocument(body: { fields?: Record<string, unknown> } | null) {
  if (!body?.fields) return null;
  const data = fromValue({ mapValue: { fields: body.fields } }) as (BankState & { bwRevision?: number }) | null;
  if (!data?.users) return null;
  const revision = typeof data.bwRevision === "number" ? data.bwRevision : 0;
  const { bwRevision: _revision, ...state } = data;
  return { revision, state: state as BankState };
}
