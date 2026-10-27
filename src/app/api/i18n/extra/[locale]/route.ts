import { LOCALES } from "@/i18n/locales";
import { translateExtras } from "@/i18n/translate-catalog";
import { writtenLocale } from "@/i18n/written";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ids = new Set(LOCALES.map((item) => item.id));

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!ids.has(locale) && !ids.has(writtenLocale(locale))) {
    return Response.json({ error: "unsupported" }, { status: 422 });
  }
  try {
    const table = await translateExtras(writtenLocale(locale));
    return Response.json(table, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (error) {
    console.error(`[i18n/extra] ${locale}`, error);
    return Response.json({}, { headers: { "Cache-Control": "no-store" } });
  }
}
