import { attachReferral, normalizeBank } from "@/lib/bank";
import { CONTACT_EMAIL } from "@/lib/contact";
import { readDesk, withDeskLock } from "@/lib/desk-store";
import { withDeskAuth } from "@/lib/firestore-desk";
import { listInbox, markInboxMailed, saveInboxMessage } from "@/lib/inbox";
import { sameOrigin, signedEmail } from "@/lib/request-guard";
import { openState, sealState } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOPICS = new Set([
  "Accounts",
  "Cards",
  "Payments",
  "API",
  "Something else",
  "General",
  "Technical",
  "Account",
  "Transaction",
  "Security",
  "Other",
  "Sales",
]);

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function validEmail(value: string) {
  return value.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const hits = new Map<string, number[]>();

function pace(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

async function callerIsAdmin(email: string) {
  if (!email) return false;
  const desk = await readDesk();
  if (!desk) return false;
  try {
    const plain = normalizeBank(openState(desk.state));
    const user = plain.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    return Boolean(user && user.role === "admin" && user.status === "active");
  } catch {
    return false;
  }
}

async function tryMail(input: { name: string; email: string; topic: string; company: string; message: string }, origin: string, referer: string) {
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`, {
    method: "POST",
    signal: AbortSignal.timeout(6000),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: origin,
      Referer: referer,
    },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      topic: input.topic,
      company: input.company,
      message: input.message || input.company,
      _subject: `Blackworld · ${input.topic}`,
      _replyto: input.email,
      _template: "table",
      _captcha: "false",
    }),
  }).catch(() => null);
  const data = await response?.json().catch(() => null);
  return Boolean(response?.ok && data && data.success !== false && data.success !== "false");
}

export async function GET(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const email = await signedEmail(request);
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (email == null || !(await withDeskAuth(token, () => callerIsAdmin(email)))) return Response.json({ error: "forbidden" }, { status: 403 });
  const messages = await withDeskAuth(token, () => listInbox());
  return Response.json({ messages }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 20_000) return Response.json({ error: "invalid" }, { status: 413 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return Response.json({ error: "invalid" }, { status: 400 });
  const record = body as Record<string, unknown>;
  const name = text(record.name, 80);
  const email = text(record.email, 120);
  const topic = text(record.topic, 40) || "Accounts";
  const message = text(record.message, 4000);
  const company = text(record.company, 80);
  if (name.length < 2) return Response.json({ error: "name" }, { status: 422 });
  if (!validEmail(email)) return Response.json({ error: "email" }, { status: 422 });
  if (!TOPICS.has(topic)) return Response.json({ error: "topic" }, { status: 422 });
  if (topic === "Sales" && company.length < 2) return Response.json({ error: "company" }, { status: 422 });
  if (topic !== "Sales" && message.length < 8) return Response.json({ error: "message" }, { status: 422 });
  if (!pace("messages", 30, 60_000) || !pace(`mail:${email.toLowerCase()}`, 3, 10 * 60_000)) {
    return Response.json({ error: "forbidden" }, { status: 429 });
  }

  let saved: Awaited<ReturnType<typeof saveInboxMessage>> | null = null;
  try {
    saved = await saveInboxMessage({ name, email, topic, company, message });
  } catch {
    saved = null;
  }
  const referral = text(record.referral, 40).toUpperCase();
  if (/^BW-[A-F0-9]{32}$/.test(referral)) {
    const header = request.headers.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    await withDeskAuth(token, () => withDeskLock(async (current) => {
      if (!current) return { file: null, value: null };
      try {
        const plain = normalizeBank(openState(current.state));
        const next = attachReferral(plain, referral, company, email);
        if (!next) return { file: null, value: null };
        return {
          file: { revision: current.revision + 1, state: sealState(next) },
          value: null,
        };
      } catch {
        return { file: null, value: null };
      }
    })).catch(() => null);
  }
  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const mailed = await tryMail({ name, email, topic, company, message }, origin, request.headers.get("referer") || `${origin}/support`);
  if (saved && mailed) await markInboxMailed(saved.id).catch(() => undefined);
  if (!saved && !mailed) return Response.json({ error: "failed" }, { status: 502 });
  return Response.json({ ok: true });
}
