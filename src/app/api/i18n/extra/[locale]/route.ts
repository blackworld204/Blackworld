import { catalog } from "@/i18n/messages";
import engineCodes from "@/i18n/engine-codes.json";
import { translateExtras } from "@/i18n/translate-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!(locale in catalog) && !(locale in engineCodes)) {
    return Response.json({ error: "unsupported" }, { status: 422 });
  }
  try {
    const table = await translateExtras(locale);
    return Response.json(table, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return Response.json({ error: "failed" }, { status: 503 });
  }
}
