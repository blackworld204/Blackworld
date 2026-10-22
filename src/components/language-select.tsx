"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";
import { foldLanguage, LOCALES, localeById, type Locale, type LocaleId } from "@/i18n/locales";
import { useI18n } from "@/i18n/provider";
import { rendersTranslation } from "@/i18n/written";

const ROW = 44;

function useLanguageQuery() {
  const [query, setQuery] = useState("");
  const folded = foldLanguage(query.trim());
  const items = LOCALES.filter((item) => {
    if (!folded) return true;
    return [item.native, item.name, item.code, item.id, item.also].some((part) => foldLanguage(part).includes(folded));
  });
  return { query, setQuery, items };
}

function LanguageOptions({
  items,
  locale,
  listId,
  label,
  maxHeight,
  englishNote,
  onPick,
}: {
  items: readonly Locale[];
  locale: string;
  listId?: string;
  label: string;
  maxHeight: number;
  englishNote: string;
  onPick: (id: LocaleId) => void;
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const start = Math.max(0, Math.floor(scrollTop / ROW) - 3);
  const visible = Math.ceil(maxHeight / ROW) + 8;
  const slice = items.slice(start, start + visible);

  return (
    <div
      className="lang-scroll"
      style={{ maxHeight }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <ul id={listId} role="listbox" aria-label={label} style={{ height: Math.max(items.length, 1) * ROW }}>
        {slice.map((item, index) => (
          <li key={item.id} style={{ position: "absolute", top: (start + index) * ROW, left: 0, right: 0, height: ROW }}>
            <button type="button" role="option" aria-selected={item.id === locale} onClick={() => onPick(item.id)}>
              <CurrencyFlag code={item.id} />
              <span>{item.native}</span>
              {rendersTranslation(item.id) ? null : (
                <small className="lang-note">{englishNote}</small>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
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
  const englishNote = t("English text");

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const place = () => {
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const top = rect.bottom + 4;
      const view = document.documentElement.clientWidth;
      const width = Math.min(280, view - 16);
      const left = Math.min(Math.max(8, rect.right - width), view - width - 8);
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

  const pick = (id: LocaleId) => {
    setLocale(id);
    setOpen(false);
  };

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

  const empty = items.length === 0 ? <p className="lang-empty">{t("No language found.")}</p> : null;

  if (variant === "list") {
    return (
      <div className="lang-list">
        <p className="kicker">{t("Language")}</p>
        {search}
        <LanguageOptions
          key={query}
          items={items}
          locale={locale}
          label={t("Language")}
          maxHeight={448}
          englishNote={englishNote}
          onPick={pick}
        />
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
          style={{ top: box.top, left: box.end, width: "min(280px, calc(100% - 16px))", maxHeight: box.maxHeight }}
        >
          {search}
          <LanguageOptions
            key={query}
            items={items}
            locale={locale}
            listId={listId}
            label={t("Language")}
            maxHeight={Math.max(120, box.maxHeight - 68)}
            englishNote={englishNote}
            onPick={pick}
          />
          {empty}
        </div>
      ) : null}
    </div>
  );
}
