import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import engineCodes from "@/i18n/engine-codes.json";
import source from "@/i18n/catalogs/id.json";
import extraSource from "@/i18n/extra-source.json";
import { fallbackLocale } from "@/i18n/fallbacks";
import { catalog } from "@/i18n/messages";
import { writtenLocale } from "@/i18n/written";

type Engine = "edge" | "google";

const CACHE_DIR = path.join(process.cwd(), "data", "i18n-cache");
const pending = new Map<string, Promise<Record<string, string>>>();

export class UnsupportedLanguage extends Error {}

const sourceKeys = Object.keys(source);
const extraKeys = extraSource as string[];
const extraPending = new Map<string, Promise<Record<string, string>>>();

function shield(text: string) {
  const tokens: string[] = [];
  const safe = text.replace(/\{[a-zA-Z0-9_]+\}/g, (token) => {
    const mark = `__PH${tokens.length}__`;
    tokens.push(token);
    return mark;
  });
  return { safe, tokens };
}

function restore(text: string, tokens: string[]) {
  let value = text;
  tokens.forEach((token, index) => {
    const mark = new RegExp(`__PH${index}__`, "i");
    if (!mark.test(value)) throw new Error("placeholder");
    value = value.replace(mark, token);
  });
  return value;
}

function chunks(texts: string[], maxCount: number, maxChars: number) {
  const groups: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const text of texts) {
    if (current.length && (current.length >= maxCount || chars + text.length > maxChars)) {
      groups.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += text.length;
  }
  if (current.length) groups.push(current);
  return groups;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function textsFrom(data: unknown, expected: number) {
  if (!Array.isArray(data) || data.length !== expected) throw new Error("shape");
  if (data.every((item) => typeof item === "string")) return data as string[];
  if (data.every((item) => Array.isArray(item) && typeof item[0] === "string")) {
    return data.map((item) => (item as string[])[0]);
  }
  throw new Error("shape");
}

async function request(engine: Engine, code: string, texts: string[], attempt = 0): Promise<string[]> {
  const response =
    engine === "edge"
      ? await fetch(
          `https://edge.microsoft.com/translate/translatetext?from=en&to=${encodeURIComponent(code)}&isEnterpriseClient=false`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify(texts),
          },
        )
      : await fetch(
          `https://clients5.google.com/translate_a/t?${(() => {
            const params = new URLSearchParams({ client: "dict-chrome-ex", sl: "en", tl: code });
            for (const text of texts) params.append("q", text);
            return params.toString();
          })()}`,
          { headers: { "User-Agent": "Mozilla/5.0" } },
        );
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    await sleep(800 * 2 ** attempt);
    return request(engine, code, texts, attempt + 1);
  }
  if (!response.ok) throw new Error(`${engine} ${response.status}`);
  const data: unknown = await response.json();
  if (engine === "edge") {
    if (!Array.isArray(data) || data.length !== texts.length) throw new Error("shape");
    return data.map((item: { translations?: { text?: string }[] }) => {
      const text = item.translations?.[0]?.text;
      if (typeof text !== "string") throw new Error("shape");
      return text;
    });
  }
  return textsFrom(data, texts.length);
}

async function translateGroup(engine: Engine, code: string, locale: string, texts: string[]): Promise<string[]> {
  const other: Engine = engine === "edge" ? "google" : "edge";
  const otherCode = other === "google" ? locale : code;
  try {
    return await request(engine, code, texts);
  } catch {
    try {
      return await request(other, otherCode, texts);
    } catch (error) {
      if (texts.length === 1) return texts;
      const mid = Math.ceil(texts.length / 2);
      const left = await translateGroup(engine, code, locale, texts.slice(0, mid));
      const right = await translateGroup(engine, code, locale, texts.slice(mid));
      if (error instanceof Error && left.length + right.length !== texts.length) throw error;
      return [...left, ...right];
    }
  }
}

async function translateAll(engine: Engine, code: string, locale: string, texts: string[]) {
  const limits = engine === "edge" ? { count: 40, chars: 24000 } : { count: 16, chars: 3500 };
  const out: string[] = [];
  for (const group of chunks(texts, limits.count, limits.chars)) {
    out.push(...(await translateGroup(engine, code, locale, group)));
  }
  return out;
}

async function readCache(locale: string) {
  try {
    const parsed = JSON.parse(await readFile(path.join(CACHE_DIR, `${locale}.json`), "utf8")) as Record<string, string>;
    if (sourceKeys.every((key) => typeof parsed[key] === "string")) return parsed;
  } catch {
    return null;
  }
  return null;
}

async function writeCache(locale: string, table: Record<string, string>) {
  await mkdir(CACHE_DIR, { recursive: true });
  const file = path.join(CACHE_DIR, `${locale}.json`);
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(table));
  await rename(temp, file);
}

async function probe(locale: string) {
  try {
    const [text] = await request("google", locale, ["The bank behind the product."]);
    return text.trim().toLowerCase() !== "the bank behind the product.";
  } catch {
    return false;
  }
}

async function translateLocale(locale: string) {
  const cached = await readCache(locale);
  if (cached) return cached;
  const spec = (engineCodes as Record<string, { engine: Engine; code: string }>)[locale];
  let engine: Engine = spec?.engine ?? "google";
  let code = spec?.code ?? locale;
  if (!spec && !(await probe(locale))) throw new UnsupportedLanguage(locale);
  const shielded = sourceKeys.map(shield);
  const translated = await translateAll(
    engine,
    code,
    locale,
    shielded.map((item) => item.safe),
  );
  const table: Record<string, string> = {};
  sourceKeys.forEach((key, index) => {
    try {
      table[key] = restore(translated[index] ?? key, shielded[index].tokens);
    } catch {
      table[key] = key;
    }
  });
  await writeCache(locale, table);
  return table;
}

function googleCode(locale: string) {
  if (locale === "zh") return "zh-CN";
  if (locale === "tl") return "fil";
  return locale;
}

async function readExtra(locale: string) {
  try {
    const parsed = JSON.parse(await readFile(path.join(CACHE_DIR, `extra-${locale}.json`), "utf8")) as Record<string, string>;
    if (extraKeys.every((key) => typeof parsed[key] === "string")) return parsed;
  } catch {
    return null;
  }
  return null;
}

export function translateExtras(locale: string) {
  const running = extraPending.get(locale);
  if (running) return running;
  const job = (async () => {
    const cached = await readExtra(locale);
    if (cached) return cached;
    const spec = (engineCodes as Record<string, { engine: Engine; code: string }>)[locale];
    const engine: Engine = spec?.engine ?? "google";
    const code = spec?.code ?? googleCode(locale);
    const shielded = extraKeys.map(shield);
    const translated = await translateAll(
      engine,
      code,
      locale,
      shielded.map((item) => item.safe),
    );
    const table: Record<string, string> = {};
    extraKeys.forEach((key, index) => {
      try {
        table[key] = restore(translated[index] ?? key, shielded[index].tokens);
      } catch {
        table[key] = key;
      }
    });
    await mkdir(CACHE_DIR, { recursive: true });
    const file = path.join(CACHE_DIR, `extra-${locale}.json`);
    const temp = `${file}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(table));
    await rename(temp, file);
    return table;
  })().finally(() => extraPending.delete(locale));
  extraPending.set(locale, job);
  return job;
}

export function loadTranslation(locale: string) {
  const written = writtenLocale(locale);
  if (written !== locale) return loadTranslation(written);
  if (locale === "en") return Promise.resolve({});
  const via = fallbackLocale[locale];
  if (via && catalog[via]) return Promise.resolve(catalog[via]);
  const builtin = catalog[locale];
  if (builtin) return Promise.resolve(builtin);
  const running = pending.get(locale);
  if (running) return running;
  const job = translateLocale(locale)
    .then(async (table) => {
      try {
        return { ...table, ...(await translateExtras(locale)) };
      } catch {
        return table;
      }
    })
    .finally(() => pending.delete(locale));
  pending.set(locale, job);
  return job;
}
