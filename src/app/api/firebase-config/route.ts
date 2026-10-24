export const dynamic = "force-dynamic";

function runtimeEnv(suffix: string) {
  const names = [`NEXT_PUBLIC_${suffix}`, suffix];
  for (const name of names) {
    const value = process.env[name];
    if (typeof value !== "string") continue;
    const cleaned = value.trim().replace(/^["']|["']$/g, "");
    if (cleaned) return cleaned;
  }
  return "";
}

export function GET() {
  const apiKey = runtimeEnv("FIREBASE_API_KEY");
  const authDomain = runtimeEnv("FIREBASE_AUTH_DOMAIN");
  const projectId = runtimeEnv("FIREBASE_PROJECT_ID");
  const appId = runtimeEnv("FIREBASE_APP_ID");
  const config =
    apiKey && authDomain && projectId && appId
      ? {
          apiKey,
          authDomain,
          projectId,
          appId,
          storageBucket: runtimeEnv("FIREBASE_STORAGE_BUCKET") || undefined,
          messagingSenderId: runtimeEnv("FIREBASE_MESSAGING_SENDER_ID") || undefined,
          measurementId: runtimeEnv("FIREBASE_MEASUREMENT_ID") || undefined,
        }
      : null;
  const body = `self.FIREBASE_WEB_CONFIG=${JSON.stringify(config)};`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
