import { firebaseWebConfig } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export function GET() {
  const config = firebaseWebConfig();
  const body = `self.FIREBASE_WEB_CONFIG=${JSON.stringify(config)};`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
