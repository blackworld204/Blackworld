"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { catalog } from "@/i18n/messages";
import { LOCALES, localeById, type LocaleId } from "@/i18n/locales";

const KEY = "blackworld-locale";

type I18nValue = {
  locale: LocaleId;
  setLocale: (locale: LocaleId) => void;
  t: (text: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function applyDocument(locale: LocaleId) {
  const item = localeById(locale);
  document.documentElement.lang = item.id === "zh" ? "zh-Hans" : item.id;
  document.documentElement.dir = item.dir;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleId>("en");

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved && LOCALES.some((item) => item.id === saved)) {
      setLocaleState(saved as LocaleId);
    }
  }, []);

  useEffect(() => {
    applyDocument(locale);
  }, [locale]);

  const setLocale = useCallback((next: LocaleId) => {
    setLocaleState(next);
    localStorage.setItem(KEY, next);
  }, []);

  const t = useCallback(
    (text: string, vars?: Record<string, string | number>) => {
      const table = catalog[locale];
      let value = table?.[text] ?? text;
      if (vars) {
        for (const [key, replacement] of Object.entries(vars)) {
          value = value.replaceAll(`{${key}}`, String(replacement));
        }
      }
      return value;
    },
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used within I18nProvider");
  return value;
}
