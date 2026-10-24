import { readDesk } from "@/lib/desk-store";
import { sameOrigin, signedIn } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!(await signedIn(request))) return Response.json({ error: "forbidden" }, { status: 403 });
  const desk = await readDesk();
  if (!desk) return Response.json({ error: "missing" }, { status: 404 });
  const known = Number(new URL(request.url).searchParams.get("revision"));
  if (Number.isInteger(known) && known === desk.revision) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ revision: desk.revision, state: desk.state }, { headers: { "Cache-Control": "no-store" } });
}
