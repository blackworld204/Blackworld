import { LOCALES } from "@/i18n/locales";
import { UnsupportedLanguage, loadTranslation } from "@/i18n/translate-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ids = new Set(LOCALES.map((item) => item.id));

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!ids.has(locale)) {
    return Response.json({ error: "unsupported" }, { status: 422 });
  }
  try {
    const table = await loadTranslation(locale);
    return Response.json(table, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    if (error instanceof UnsupportedLanguage) {
      return Response.json({ error: "unsupported" }, { status: 422 });
    }
    return Response.json({ error: "failed" }, { status: 503 });
  }
}
