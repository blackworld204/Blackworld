import { runAccountCall } from "@/lib/account-api";
import { ensureDeskUser } from "@/lib/desk-store";
import { withDeskAuth } from "@/lib/firestore-desk";
import { sameOrigin, signedEmail } from "@/lib/request-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cors(request: Request) {
  const headers = new Headers();
  const origin = request.headers.get("origin");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Cache-Control", "no-store");
  return headers;
}

function json(request: Request, status: number, body: unknown) {
  const headers = cors(request);
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { status, headers });
}

function bearerToken(header: string | null) {
  if (!header?.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}

function sessionToken(token: string) {
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

async function handle(request: Request, method: string, path: string[]) {
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 40_000) return json(request, 413, { error: "invalid" });
  let body: unknown = null;
  if (method !== "GET" && method !== "HEAD") {
    body = await request.json().catch(() => null);
    if (body === null && Number(request.headers.get("content-length") ?? 0) > 0) return json(request, 400, { error: "invalid" });
  }
  const token = bearerToken(request.headers.get("authorization"));
  let sessionEmail: string | null = null;
  let authorization = request.headers.get("authorization");
  if (sessionToken(token)) {
    if (!sameOrigin(request)) return json(request, 401, { error: "unauthorized" });
    const email = await signedEmail(request);
    if (!email) return json(request, 401, { error: "unauthorized" });
    sessionEmail = email;
    authorization = null;
    await withDeskAuth(token, () => ensureDeskUser(email));
  }
  const result = await withDeskAuth(token, () =>
    runAccountCall({
      method,
      path,
      authorization,
      body,
      sessionEmail,
    }),
  );
  return json(request, result.status, result.body);
}

export async function GET(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return handle(request, "GET", path);
}

export async function POST(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  return handle(request, "POST", path);
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: cors(request) });
}
