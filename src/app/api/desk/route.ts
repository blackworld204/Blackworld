import { scopeDesk } from "@/lib/desk-scope";
import { readDesk } from "@/lib/desk-store";
import { withDeskAuth } from "@/lib/firestore-desk";
import { sameOrigin, signedEmail, signedIn } from "@/lib/request-guard";
import { openState, sealState } from "@/lib/vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await signedIn(request))) return Response.json({ error: "forbidden" }, { status: 403 });
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const desk = await withDeskAuth(token, () => readDesk());
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
    return Response.json({ error: "missing" }, { status: 404 });
  }
  let view = scopeDesk(plain, email);
  try {
    view = sealState(view);
  } catch {
    /* Without an encryption key the desk stays readable only to this signed-in response. */
  }
  return Response.json({ revision: desk.revision, state: view }, { headers: { "Cache-Control": "no-store" } });
}
