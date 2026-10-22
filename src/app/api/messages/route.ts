import { CONTACT_EMAIL } from "@/lib/contact";

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

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((at) => now - at < 60_000);
  if (recent.length >= 5) return Response.json({ error: "forbidden" }, { status: 429 });
  recent.push(now);
  hits.set(ip, recent);
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

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const response = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Origin: origin,
      Referer: request.headers.get("referer") || `${origin}/support`,
    },
    body: JSON.stringify({
      name,
      email,
      topic,
      company,
      message: message || company,
      _subject: `Blackworld · ${topic}`,
      _replyto: email,
      _template: "table",
      _captcha: "false",
    }),
  }).catch(() => null);

  const data = await response?.json().catch(() => null);
  const accepted = Boolean(response?.ok && data && data.success !== false && data.success !== "false");
  if (!accepted) return Response.json({ error: "failed" }, { status: 502 });
  return Response.json({ ok: true });
}
