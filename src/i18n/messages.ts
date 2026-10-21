import { ar } from "@/i18n/ar";
import { de } from "@/i18n/de";
import { es } from "@/i18n/es";
import { fr } from "@/i18n/fr";
import { hi } from "@/i18n/hi";
import { ja } from "@/i18n/ja";
import { ko } from "@/i18n/ko";
import { pt } from "@/i18n/pt";
import { rowsAsia } from "@/i18n/rows-asia";
import { rowsEu } from "@/i18n/rows-eu";
import { zh } from "@/i18n/zh";

function fill(base: Record<string, string>, rows: string[][], index: number) {
  const next = { ...base };
  for (const row of rows) {
    const key = row[0];
    const value = row[index];
    if (key && value && !(key in next)) next[key] = value;
  }
  return next;
}

export const catalog: Record<string, Record<string, string>> = {
  es,
  fr: fill(fr, rowsEu, 1),
  de: fill(de, rowsEu, 2),
  pt: fill(pt, rowsEu, 3),
  zh: fill(zh, rowsAsia, 1),
  ja: fill(ja, rowsAsia, 2),
  ko: fill(ko, rowsAsia, 3),
  hi: fill(hi, rowsAsia, 4),
  ar: fill(ar, rowsAsia, 5),
};
