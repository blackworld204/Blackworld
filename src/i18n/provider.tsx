"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fallbackLocale } from "@/i18n/fallbacks";
import { LOCALES, localeById, type LocaleId } from "@/i18n/locales";
import { catalog } from "@/i18n/messages";

const KEY = "blackworld-locale";
const PACK = "blackworld-tr-v1:";

function writtenLocale(locale: string) {
  return fallbackLocale[locale] ?? locale;
}

function builtin(locale: string) {
  const written = writtenLocale(locale);
  return written === "en" || Boolean(catalog[written]);
}

type I18nValue = {
  locale: LocaleId;
  setLocale: (locale: LocaleId) => void;
  t: (text: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function applyDocument(locale: LocaleId) {
  const item = localeById(writtenLocale(locale));
  document.documentElement.lang = item.id === "zh" ? "zh-Hans" : item.id;
  document.documentElement.dir = item.dir;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>("en");
  const [pack, setPack] = useState<Record<string, string> | null>(null);
  const [cover, setCover] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved && LOCALES.some((item) => item.id === saved)) {
      setLocaleState(saved as LocaleId);
    }
  }, []);

  useEffect(() => {
    applyDocument(locale);
    if (builtin(locale)) {
      setPack(null);
      setCover(null);
      return;
    }
    const storageKey = PACK + locale;
    const savedPack = localStorage.getItem(storageKey);
    if (savedPack) {
      try {
        const parsed = JSON.parse(savedPack) as Record<string, string>;
        if (parsed && typeof parsed === "object") {
          setPack(parsed);
          setCover(null);
          return;
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    setPack(null);
    setCover(localeById(locale).native);
    const controller = new AbortController();
    fetch(`/api/i18n/${locale}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<Record<string, string>>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        try {
          localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
          /* The table is optional. The page still uses the response. */
        }
        setPack(data);
        setCover(null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCover(null);
      });
    return () => controller.abort();
  }, [locale]);

  const setLocale = useCallback((next: LocaleId) => {
    setLocaleState(next);
    localStorage.setItem(KEY, next);
    if (builtin(next)) {
      setPack(null);
      setCover(null);
      return;
    }
    setPack(null);
    setCover(localeById(next).native);
  }, []);

  const t = useCallback(
    (text: string, vars?: Record<string, string | number>) => {
      const table = catalog[writtenLocale(locale)] ?? pack ?? undefined;
      let value = table?.[text] ?? text;
      if (vars) {
        for (const [key, replacement] of Object.entries(vars)) {
          value = value.replaceAll(`{${key}}`, String(replacement));
        }
      }
      return value;
    },
    [locale, pack],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
      {cover ? (
        <div className="i18n-cover" role="status" aria-live="polite">
          {cover}
        </div>
      ) : null}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
