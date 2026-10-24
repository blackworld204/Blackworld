import { createHash } from "node:crypto";
import { publicFirebaseConfig } from "@/lib/firebase-public";

const verified = new Map<string, { email: string; exp: number }>();
const rejected = new Map<string, number>();

export function sameOrigin(request: Request) {
  const host = request.headers.get("host")?.split(",")[0]?.trim();
  if (!host) return false;
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  if (request.headers.get("sec-fetch-site") === "same-origin") return true;
  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).host === host;
  } catch {
    return false;
  }
}

/** The signed-in email, "" when Firebase is not configured, or null when the token is missing. */
export async function signedEmail(request: Request) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || publicFirebaseConfig.apiKey;
  if (!apiKey) return "";
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const id = createHash("sha256").update(token).digest("hex");
  const cached = verified.get(id);
  if (cached && cached.exp > Date.now()) return cached.email;
  const deniedUntil = rejected.get(id) ?? 0;
  if (deniedUntil > Date.now()) return null;
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  }).catch(() => null);
  if (!lookup?.ok) {
    rejected.set(id, Date.now() + 15_000);
    return null;
  }
  const data = (await lookup.json().catch(() => null)) as { users?: { email?: string }[] } | null;
  const email = data?.users?.[0]?.email;
  if (typeof email !== "string" || !email.includes("@")) {
    rejected.set(id, Date.now() + 15_000);
    return null;
  }
  verified.set(id, { email, exp: Date.now() + 60_000 });
  if (verified.size > 200) {
    const oldest = verified.keys().next().value;
    if (oldest) verified.delete(oldest);
  }
  return email;
}

export async function signedIn(request: Request) {
  return (await signedEmail(request)) !== null;
}
