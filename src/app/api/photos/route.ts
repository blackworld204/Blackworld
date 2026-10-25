import { normalizeBank } from "@/lib/bank";
import { readDesk } from "@/lib/desk-store";
import { clearStoredPhoto, readStoredPhoto, withDeskAuth, writeStoredPhoto } from "@/lib/firestore-desk";
import { sameOrigin, signedEmail } from "@/lib/request-guard";
import { openState } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function actor(request: Request) {
  if (!sameOrigin(request)) return null;
  const email = await signedEmail(request);
  if (!email) return null;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const desk = await withDeskAuth(token, () => readDesk());
  if (!desk) return null;
  let plain;
  try {
    plain = normalizeBank(openState(desk.state));
  } catch {
    return null;
  }
  const user = plain.users.find(
    (item) => item.status === "active" && !item.email.startsWith("bw1.") && item.email.toLowerCase() === email.toLowerCase(),
  );
  if (!user) return null;
  return { token, user, plain };
}

export async function GET(request: Request) {
  const who = await actor(request);
  if (!who) return Response.json({ error: "forbidden" }, { status: 403 });
  const requested = new URL(request.url).searchParams.get("userId") ?? who.user.id;
  if (who.user.role !== "admin" && requested !== who.user.id) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const stored = await readStoredPhoto(who.token, requested).catch(() => null);
  const carried = who.plain.users.find((item) => item.id === requested)?.photo;
  const image = stored || (typeof carried === "string" ? carried : null);
  if (!image || !image.startsWith("data:image/jpeg") || image.length > 180_000) {
    return Response.json({ error: "missing" }, { status: 404 });
  }
  return Response.json({ image }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 200_000) return Response.json({ error: "invalid" }, { status: 413 });
  const who = await actor(request);
  if (!who) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as { image?: unknown } | null;
  const image = typeof body?.image === "string" ? body.image : "";
  if (!image.startsWith("data:image/jpeg") || image.length > 180_000) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  try {
    await writeStoredPhoto(who.token, who.user.id, image);
  } catch {
    return Response.json({ error: "failed" }, { status: 503 });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const who = await actor(request);
  if (!who) return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    await clearStoredPhoto(who.token, who.user.id);
  } catch {
    return Response.json({ error: "failed" }, { status: 503 });
  }
  return Response.json({ ok: true });
}
