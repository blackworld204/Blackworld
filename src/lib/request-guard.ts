import { createHash, createPublicKey, createVerify } from "node:crypto";
import { publicFirebaseConfig } from "@/lib/firebase-public";

const verified = new Map<string, { email: string; exp: number }>();
const rejected = new Map<string, number>();
let certs: { keys: Record<string, string>; exp: number } | null = null;

async function firebaseCerts() {
  const now = Date.now();
  if (certs && certs.exp > now) return certs.keys;
  const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!response.ok) throw new Error("certs");
  const keys = (await response.json()) as Record<string, string>;
  const maxAge = Number(response.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 3600);
  certs = { keys, exp: now + maxAge * 1000 };
  return keys;
}

/** Reads the email from a Firebase ID token without the browser API key. */
async function emailFromIdToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  let header: { alg?: string; kid?: string };
  let payload: { aud?: string; iss?: string; exp?: number; email?: string };
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as { alg?: string; kid?: string };
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as {
      aud?: string;
      iss?: string;
      exp?: number;
      email?: string;
    };
  } catch {
    return null;
  }
  const projectId = publicFirebaseConfig.projectId;
  if (header.alg !== "RS256" || !header.kid) return null;
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now() - 60_000) return null;
  if (typeof payload.email !== "string" || !payload.email.includes("@")) return null;
  const pem = (await firebaseCerts())[header.kid];
  if (!pem) return null;
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  if (!verifier.verify(createPublicKey(pem), parts[2], "base64url")) return null;
  return payload.email;
}

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
  try {
    const local = await emailFromIdToken(token);
    if (local) {
      verified.set(id, { email: local, exp: Date.now() + 60_000 });
      return local;
    }
  } catch {
    /* The public certificates were unreachable. Fall through to the token lookup. */
  }
  const deniedUntil = rejected.get(id) ?? 0;
  if (deniedUntil > Date.now()) return null;
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  }).catch(() => null);
  if (!lookup?.ok) {
    if (lookup && lookup.status !== 403) rejected.set(id, Date.now() + 15_000);
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
