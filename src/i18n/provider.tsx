"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALES, localeById, type LocaleId } from "@/i18n/locales";
import { catalog } from "@/i18n/messages";
import { writtenLocale } from "@/i18n/written";

const KEY = "blackworld-locale";
const PACK = "blackworld-tr-v3:";

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
  const [translating, setTranslating] = useState(false);
  const [languageFailed, setLanguageFailed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved && LOCALES.some((item) => item.id === saved)) {
      setLocaleState(saved as LocaleId);
    }
  }, []);

  useEffect(() => {
    applyDocument(locale);
    const written = writtenLocale(locale);
    setLanguageFailed(false);
    if (written === "en") {
      setPack(null);
      setTranslating(false);
      return;
    }
    const bundled = catalog[written];
    const storageKey = PACK + (bundled ? `x:${written}` : written);
    const savedPack = localStorage.getItem(storageKey);
    if (savedPack) {
      try {
        const parsed = JSON.parse(savedPack) as Record<string, string>;
        if (parsed && typeof parsed === "object" && (!bundled || parsed["These terms"])) {
          setPack(parsed);
          setTranslating(false);
          return;
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    if (!bundled) setPack(null);
    setTranslating(true);
    const controller = new AbortController();
    const path = bundled ? `/api/i18n/extra/${written}` : `/api/i18n/${written}`;
    fetch(path, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<Record<string, string>>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const entries = data && typeof data === "object" ? Object.keys(data).length : 0;
        if (!bundled && entries === 0) {
          setPack(null);
          setTranslating(false);
          setLanguageFailed(true);
          return;
        }
        try {
          if (entries > 0) localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
          /* The table is optional. The page still uses the response. */
        }
        setPack(data);
        setTranslating(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setTranslating(false);
        if (!bundled) setLanguageFailed(true);
      });
    return () => controller.abort();
  }, [locale]);

  const setLocale = useCallback((next: LocaleId) => {
    setLocaleState(next);
    localStorage.setItem(KEY, next);
    const written = writtenLocale(next);
    if (written === "en" || catalog[written]) return;
    setPack(null);
  }, []);

  const t = useCallback(
    (text: string, vars?: Record<string, string | number>) => {
      const bundled = catalog[writtenLocale(locale)];
      let value = bundled?.[text] ?? pack?.[text] ?? text;
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
      {translating ? (
        <p className="i18n-status" role="status" aria-live="polite">
          {t("Translating")}
        </p>
      ) : null}
      {languageFailed ? (
        <p className="i18n-status" role="alert">
          {t("This language could not be loaded.")}
        </p>
      ) : null}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
