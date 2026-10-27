import engineCodes from "@/i18n/engine-codes.json";
import manifest from "@/i18n/cache/manifest.json";
import { fallbackLocale } from "@/i18n/fallbacks";
import { catalog } from "@/i18n/messages";
import writtenAs from "@/i18n/written-as.json";

const written = writtenAs as Record<string, string>;
const ready = new Set((manifest as { locales: string[] }).locales);
const engines = engineCodes as Record<string, { engine: string; code: string }>;

/** Language the screen is actually written in. A variety with no translator uses one. */
export function writtenLocale(locale: string) {
  if (locale === "en") return "en";
  return fallbackLocale[locale] ?? written[locale] ?? locale;
}

/** True when this language can be shown translated (shipped, bundled, or live engine). */
export function rendersTranslation(locale: string) {
  const next = writtenLocale(locale);
  return next === "en" || Boolean(catalog[next]) || ready.has(next) || next in engines;
}
