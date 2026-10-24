import { pushDeliveryConfigured, sendPush, type PushDelivery } from "@/lib/fcm-send";
import { sameOrigin, signedIn } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();

function allowedPace(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((at) => now - at < 60_000);
  if (recent.length >= 20) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function deliveries(value: unknown): PushDelivery[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 40) return null;
  const messages: PushDelivery[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const title = text(record.title, 80);
    const body = text(record.body, 400);
    const tag = text(record.tag, 80);
    if (title.length < 2 || body.length < 2 || tag.length < 2) return null;
    if (!Array.isArray(record.tokens)) return null;
    const tokens = record.tokens.filter((token): token is string => typeof token === "string" && token.length >= 20 && token.length <= 4096).slice(0, 8);
    messages.push({ title, body, tag, tokens });
  }
  return messages;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!allowedPace(request)) return Response.json({ error: "forbidden" }, { status: 429 });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 40_000) return Response.json({ error: "invalid" }, { status: 413 });
  if (!(await signedIn(request))) return Response.json({ error: "forbidden" }, { status: 403 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const messages = body && typeof body === "object" ? deliveries((body as { messages?: unknown }).messages) : null;
  if (!messages) return Response.json({ error: "invalid" }, { status: 400 });
  if (!pushDeliveryConfigured()) {
    return Response.json({ sent: 0, stale: [], configured: false }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await sendPush(messages);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "failed" }, { status: 502 });
  }
}
