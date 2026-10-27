import { scopeDesk } from "@/lib/desk-scope";
import { ensureDeskUser, readDesk } from "@/lib/desk-store";
import { deskUnavailable, withDeskAuth } from "@/lib/firestore-desk";
import { sameOrigin, signedEmail, signedIn } from "@/lib/request-guard";
import { openState } from "@/lib/vault";

function unavailable() {
  return Response.json({ error: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await signedIn(request))) return Response.json({ error: "forbidden" }, { status: 403 });
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  let desk;
  try {
    desk = await withDeskAuth(token, () => readDesk());
  } catch (error) {
    if (deskUnavailable(error)) return unavailable();
    throw error;
  }
  if (!desk) return Response.json({ error: "missing" }, { status: 404 });
  const known = Number(new URL(request.url).searchParams.get("revision"));
  if (Number.isInteger(known) && known === desk.revision) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
  const email = await signedEmail(request);
  let plain = desk.state;
  try {
    plain = openState(desk.state);
  } catch {
    plain = desk.state;
  }
  const view = scopeDesk(plain, email);
  return Response.json({ revision: desk.revision, state: view }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await signedIn(request))) return Response.json({ error: "forbidden" }, { status: 403 });
  const email = await signedEmail(request);
  if (!email) return Response.json({ error: "forbidden" }, { status: 403 });
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  let desk;
  try {
    desk = await withDeskAuth(token, () => ensureDeskUser(email));
  } catch (error) {
    if (deskUnavailable(error)) return unavailable();
    throw error;
  }
  if (!desk) return Response.json({ error: "missing" }, { status: 404 });
  return Response.json({ revision: desk.revision, state: desk.state }, { headers: { "Cache-Control": "no-store" } });
}
