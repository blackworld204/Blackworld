import engineCodes from "@/i18n/engine-codes.json";
import { fallbackLocale } from "@/i18n/fallbacks";
import { catalog } from "@/i18n/messages";
import writtenAs from "@/i18n/written-as.json";

const written = writtenAs as Record<string, string>;

/** Language the screen is actually written in. A variety with no translator uses one. */
export function writtenLocale(locale: string) {
  if (locale === "en") return "en";
  return fallbackLocale[locale] ?? written[locale] ?? locale;
}

export function rendersTranslation(locale: string) {
  const next = writtenLocale(locale);
  return next === "en" || Boolean(catalog[next]) || next in engineCodes;
}
