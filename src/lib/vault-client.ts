import { onAuthStateChanged, type User } from "firebase/auth";
import type { BankState } from "@/lib/bank";
import { publicFirebaseConfig } from "@/lib/firebase-public";
import { deskFromDocument } from "@/lib/firestore-value";
import { firebaseAuth, firebaseWebConfig } from "@/lib/firebase";
import { isSealed } from "@/lib/sealed";

function containsSeal(value: unknown): boolean {
  if (isSealed(value)) return true;
  if (Array.isArray(value)) return value.some(containsSeal);
  if (value && typeof value === "object") return Object.values(value).some(containsSeal);
  return false;
}

export function stateNeedsOpen(state: BankState) {
  return containsSeal(state);
}

let revision: number | null = null;

export function currentRevision() {
  return revision;
}

export function rememberRevision(next: number) {
  if (revision == null || next > revision) revision = next;
}

export async function firebaseBearer(force = false) {
  const auth = firebaseAuth();
  if (!auth || !firebaseWebConfig()) return "";
  const user =
    auth.currentUser ??
    (await new Promise<User | null>((resolve) => {
      const stop = onAuthStateChanged(auth, (next) => {
        stop();
        resolve(next);
      });
    }));
  if (!user) return null;
  return user.getIdToken(force);
}

async function authHeaders(bearer?: string) {
  const token = bearer !== undefined ? bearer || null : await firebaseBearer();
  if (token == null) return null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export type SealResult =
  | { kind: "saved"; state: BankState; revision: number }
  | { kind: "conflict"; state: BankState; revision: number };

export async function sealRemote(state: BankState): Promise<SealResult | null> {
  const headers = await authHeaders();
  if (!headers) return null;
  const known = currentRevision();
  const response = await fetch("/api/vault", {
    method: "POST",
    headers,
    body: JSON.stringify({ op: "seal", state, revision: known ?? undefined }),
  }).catch(() => null);
  if (!response) return null;
  const data = (await response.json().catch(() => null)) as { state?: BankState; revision?: number } | null;
  if (!data?.state || typeof data.revision !== "number") return null;
  rememberRevision(data.revision);
  if (response.status === 409) return { kind: "conflict", state: data.state, revision: data.revision };
  if (!response.ok) return null;
  return { kind: "saved", state: data.state, revision: data.revision };
}

export async function openRemote(state: BankState, bearer?: string) {
  const headers = await authHeaders(bearer);
  if (!headers) return null;
  const response = await fetch("/api/vault", {
    method: "POST",
    headers,
    body: JSON.stringify({ op: "open", state }),
  }).catch(() => null);
  if (!response?.ok) return null;
  const data = (await response.json().catch(() => null)) as { state?: BankState } | null;
  return data?.state ?? null;
}

export type DeskPull =
  | { status: "current" }
  | { status: "updated"; revision: number; state: BankState }
  | { status: "missing" }
  | { status: "offline" };

async function readDeskResponse(token: string | null): Promise<DeskPull> {
  if (!token) return { status: "offline" };
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  const known = currentRevision();
  const path = known == null ? "/api/desk" : `/api/desk?revision=${known}`;
  const response = await fetch(path, { headers, cache: "no-store" }).catch(() => null);
  if (!response) return { status: "offline" };
  if (response.status === 204) return { status: "current" };
  if (response.status === 404) return { status: "missing" };
  if (!response.ok) return { status: "offline" };
  const data = (await response.json().catch(() => null)) as { revision?: number; state?: BankState } | null;
  if (!data?.state || typeof data.revision !== "number") return { status: "offline" };
  return { status: "updated", revision: data.revision, state: data.state };
}

/** The browser reads the desk itself when the server cannot. Rules still require this signed-in token. */
async function readBrowserDesk(token: string): Promise<DeskPull> {
  const url = `https://firestore.googleapis.com/v1/projects/${publicFirebaseConfig.projectId}/databases/(default)/documents/desks/presentation?key=${publicFirebaseConfig.apiKey}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (response?.status === 404) return { status: "missing" };
  if (!response?.ok) return { status: "offline" };
  const body = (await response.json().catch(() => null)) as { fields?: Record<string, unknown> } | null;
  const desk = deskFromDocument(body);
  if (!desk) return { status: "missing" };
  return { status: "updated", revision: desk.revision, state: desk.state };
}

async function readDesk(token: string | null): Promise<DeskPull> {
  const remote = await readDeskResponse(token);
  if (remote.status === "updated" || remote.status === "current" || !token) return remote;
  const direct = await readBrowserDesk(token);
  if (direct.status === "updated") return direct;
  return remote.status === "missing" ? remote : direct.status === "missing" ? direct : remote;
}

export async function pullDesk(bearer?: string): Promise<DeskPull> {
  if (bearer !== undefined) return readDesk(bearer || null);
  const first = await readDesk(await firebaseBearer());
  if (first.status !== "offline") return first;
  return readDesk(await firebaseBearer(true).catch(() => null));
}

async function check(body: Record<string, unknown>) {
  const response = await fetch("/api/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) return false;
  const data = (await response.json()) as { ok?: boolean };
  return data.ok === true;
}

export function checkSealedPin(sealed: string, pin: string) {
  return check({ op: "check-pin", sealed, pin });
}

export function checkSealedCode(sealed: string, code: string, codes: string[] | undefined) {
  return check({ op: "check-code", sealed, code, codes: codes ?? [] });
}
