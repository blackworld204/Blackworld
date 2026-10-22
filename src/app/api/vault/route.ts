import { timingSafeEqual } from "node:crypto";
import type { BankState } from "@/lib/bank";
import { isSealed } from "@/lib/sealed";
import { verifyTotp } from "@/lib/totp";
import { openState, openText, sealState, vaultReady } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function allowedPace(request: Request, limit: number, windowMs: number) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function sameText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function signedIn(request: Request) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return true;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: token }),
  }).catch(() => null);
  if (!lookup?.ok) return false;
  const data = (await lookup.json().catch(() => null)) as { users?: unknown[] } | null;
  return Array.isArray(data?.users) && data.users.length > 0;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!vaultReady()) return Response.json({ error: "unavailable" }, { status: 503 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 900_000) return Response.json({ error: "invalid" }, { status: 413 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return Response.json({ error: "invalid" }, { status: 400 });
  const record = body as { op?: unknown; state?: BankState; sealed?: unknown; pin?: unknown; code?: unknown; codes?: unknown };
  if (record.op === "check-pin" || record.op === "check-code") {
    if (!allowedPace(request, 5, 15 * 60_000)) return Response.json({ error: "forbidden" }, { status: 429 });
    try {
      if (record.op === "check-pin") {
        const pin = typeof record.pin === "string" ? record.pin : "";
        const sealed = typeof record.sealed === "string" ? record.sealed : "";
        if (!/^\d{4}$/.test(pin) || !isSealed(sealed)) return Response.json({ ok: false });
        return Response.json({ ok: sameText(pin, openText(sealed)) });
      }
      const code = typeof record.code === "string" ? record.code : "";
      const sealed = typeof record.sealed === "string" ? record.sealed : "";
      const codes = Array.isArray(record.codes) ? record.codes.filter(isSealed) : [];
      const secretOk = isSealed(sealed) && verifyTotp(openText(sealed), code);
      const normalized = code.replace(/[\s-]/g, "").toUpperCase();
      const formatted = /^[A-Z0-9]{8}$/.test(normalized) ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : "";
      const recoveryOk = Boolean(formatted) && codes.some((item) => sameText(formatted, openText(item)));
      return Response.json({ ok: secretOk || recoveryOk });
    } catch {
      return Response.json({ ok: false });
    }
  }
  if (!allowedPace(request, 40, 60_000)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await signedIn(request))) return Response.json({ error: "forbidden" }, { status: 403 });
  if ((record.op !== "seal" && record.op !== "open") || !record.state || !Array.isArray(record.state.users)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const state = record.op === "seal" ? sealState(record.state) : openState(record.state);
    return Response.json({ state }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "failed" }, { status: 400 });
  }
}
