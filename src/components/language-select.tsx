"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";
import { foldLanguage, LOCALES, localeById, type LocaleId } from "@/i18n/locales";
import { catalog } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";

function useLanguageQuery() {
  const [query, setQuery] = useState("");
  const folded = foldLanguage(query.trim());
  const items = LOCALES.filter((item) => {
    if (!folded) return true;
    return [item.native, item.name, item.code, item.id].some((part) => foldLanguage(part).includes(folded));
  });
  return { query, setQuery, items };
}

export function LanguageSelect({ variant = "menu" }: { variant?: "menu" | "list" }) {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ top: 0, end: 0, maxHeight: 360 });
  const root = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const current = localeById(locale);
  const { query, setQuery, items } = useLanguageQuery();

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const place = () => {
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const top = rect.bottom + 4;
      const width = Math.min(280, window.innerWidth - 16);
      const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
      setBox({
        top,
        end: left,
        maxHeight: Math.max(180, Math.min(420, window.innerHeight - top - 12)),
      });
    };
    place();
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, setQuery]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const search = (
    <label className="lang-search">
      <span className="sr-only">{t("Search languages")}</span>
      <input
        ref={variant === "menu" ? searchRef : undefined}
        type="search"
        value={query}
        placeholder={t("Search languages")}
        onChange={(event) => setQuery(event.target.value)}
      />
    </label>
  );

  const options = items.map((item) => (
    <button
      key={item.id}
      type="button"
      role="option"
      aria-selected={item.id === locale}
      onClick={() => {
        setLocale(item.id as LocaleId);
        setOpen(false);
      }}
    >
      <CurrencyFlag code={item.id} />
      <span>{item.native}</span>
      {item.id === "en" || catalog[item.id] ? null : <small className="lang-note">{t("English text")}</small>}
    </button>
  ));

  const empty = items.length === 0 ? <p className="lang-empty">{t("No language found.")}</p> : null;

  if (variant === "list") {
    return (
      <div className="lang-list">
        <p className="kicker">{t("Language")}</p>
        {search}
        <div role="listbox" aria-label={t("Language")}>
          {options}
        </div>
        {empty}
      </div>
    );
  }

  return (
    <div className="lang" ref={root}>
      <button
        type="button"
        className="text-button lang-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">{t("Language")}</span>
        <CurrencyFlag code={current.id} />
        {current.code}
      </button>
      {open ? (
        <div
          className="lang-menu"
          style={{ top: box.top, left: box.end, width: "min(280px, calc(100vw - 16px))", maxHeight: box.maxHeight }}
        >
          {search}
          <ul id={listId} role="listbox" aria-label={t("Language")}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.id === locale}
                  onClick={() => {
                    setLocale(item.id as LocaleId);
                    setOpen(false);
                  }}
                >
                  <CurrencyFlag code={item.id} />
                  <span>{item.native}</span>
                  {item.id === "en" || catalog[item.id] ? null : <small className="lang-note">{t("English text")}</small>}
                </button>
              </li>
            ))}
          </ul>
          {empty}
        </div>
      ) : null}
    </div>
  );
}
