import { normalizeBank } from "@/lib/bank";
import { withDeskLock } from "@/lib/desk-store";
import { withDeskAuth } from "@/lib/firestore-desk";
import { sameOrigin, signedIn } from "@/lib/request-guard";
import { deliverEvents } from "@/lib/send-hook";
import { openState } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hits = new Map<string, number[]>();

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await signedIn(request))) return Response.json({ error: "forbidden" }, { status: 403 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((at) => now - at < 60_000);
  if (recent.length >= 30) return Response.json({ error: "forbidden" }, { status: 429 });
  recent.push(now);
  hits.set(ip, recent);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const raw = body && typeof body === "object" && Array.isArray((body as { eventIds?: unknown }).eventIds) ? (body as { eventIds: unknown[] }).eventIds : null;
  const eventIds = raw?.filter((id): id is string => typeof id === "string" && /^[a-z0-9_]{4,80}$/i.test(id)).slice(0, 20) ?? [];
  if (eventIds.length === 0) return Response.json({ error: "invalid" }, { status: 400 });
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const sent = await withDeskAuth(token, () => withDeskLock(async (current) => {
    if (!current) return { file: null, value: 0 };
    try {
      const plain = normalizeBank(openState(current.state));
      return { file: null, value: await deliverEvents(plain, eventIds) };
    } catch {
      return { file: null, value: 0 };
    }
  }));
  return Response.json({ sent }, { headers: { "Cache-Control": "no-store" } });
}
