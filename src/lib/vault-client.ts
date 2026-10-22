import type { BankState } from "@/lib/bank";
import { firebaseAuth } from "@/lib/firebase";
import { isSealed } from "@/lib/sealed";

export function stateNeedsOpen(state: BankState) {
  return state.users.some(
    (user) =>
      isSealed(user.pin) ||
      isSealed(user.totpSecret) ||
      isSealed(user.apiKey) ||
      isSealed(user.webhookUrl) ||
      user.recoveryCodes?.some(isSealed) ||
      user.pushTokens?.some(isSealed),
  );
}

async function vault(op: "seal" | "open", state: BankState) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const user = firebaseAuth()?.currentUser;
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  const response = await fetch("/api/vault", {
    method: "POST",
    headers,
    body: JSON.stringify({ op, state }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { state?: BankState };
  return data.state ?? null;
}

export function sealRemote(state: BankState) {
  return vault("seal", state);
}

export function openRemote(state: BankState) {
  return vault("open", state);
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
