import { replaceBank } from "@/lib/bank";
import { pullDesk, firebaseBearer } from "@/lib/vault-client";

export type FlowResult<T> = {
  error: string | null;
  status: number;
  body: T | null;
  synced: boolean;
};

const FRIENDLY: Record<string, string> = {
  unauthorized: "Sign in to continue.",
  forbidden: "This account cannot do that.",
  invalid: "That request was not accepted.",
  unavailable: "The desk could not be reached.",
  "The desk is not ready.": "The desk could not be reached.",
};

async function refreshDesk() {
  let remote = await pullDesk();
  if (remote.status === "offline") remote = await pullDesk();
  if (remote.status === "updated") await replaceBank(remote.state);
  return remote.status === "updated" || remote.status === "current";
}

async function postOnce<T>(path: string, body: unknown, token: string): Promise<FlowResult<T> | { retry: true }> {
  const response = await fetch(`/api/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!response) return { error: "The desk could not be reached.", status: 0, body: null, synced: false };
  const data = (await response.json().catch(() => null)) as ({ error?: string } & T) | null;
  if (!response.ok) {
    const raw = data && typeof data.error === "string" ? data.error : "";
    // 503 means the desk read/write failed before a successful commit, so a single retry is safe.
    if (response.status === 503 && (raw === "unavailable" || raw === "The desk is not ready.")) {
      return { retry: true };
    }
    return { error: FRIENDLY[raw] || raw || "The request failed.", status: response.status, body: null, synced: false };
  }
  const synced = await refreshDesk();
  return { error: null, status: response.status, body: (data ?? null) as T | null, synced };
}

/** Calls /api/v1 as the signed-in account, then refreshes this desk from the same record. */
export async function postAccount<T>(path: string, body: unknown): Promise<FlowResult<T>> {
  let token = await firebaseBearer().catch(() => null);
  if (!token) return { error: "Sign in to continue.", status: 401, body: null, synced: false };
  let result = await postOnce<T>(path, body, token);
  if (!("retry" in result)) return result;
  token = await firebaseBearer(true).catch(() => null);
  if (!token) return { error: "Sign in to continue.", status: 401, body: null, synced: false };
  result = await postOnce<T>(path, body, token);
  if ("retry" in result) return { error: "The desk could not be reached.", status: 503, body: null, synced: false };
  return result;
}
