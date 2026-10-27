"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";
import { useI18n } from "@/i18n/provider";

export type CurrencyOption = {
  code: string;
  label: string;
};

export function CurrencySelect({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: CurrencyOption[];
  onChange: (code: string) => void;
  label: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const current = options.find((item) => item.code === value) ?? options[0];
  const searchable = options.length > 12;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (item) => item.code.toLowerCase().includes(q) || item.label.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    queueMicrotask(() => searchRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="ccy" ref={root}>
      <button
        type="button"
        className="ccy-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => setOpen((next) => !next)}
      >
        {current ? <CurrencyFlag code={current.code} /> : null}
        <span>{current?.label ?? value}</span>
      </button>
      {open ? (
        <div className="ccy-menu-panel">
          {searchable ? (
            <label className="ccy-search">
              <span className="sr-only">{t("Search")}</span>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("Search")}
                autoComplete="off"
              />
            </label>
          ) : null}
          <ul className="ccy-menu" id={listId} role="listbox" aria-label={label}>
            {filtered.map((item) => (
              <li key={item.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.code === value}
                  onClick={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                >
                  <CurrencyFlag code={item.code} />
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="ccy-empty" role="presentation">
                {t("No currency found.")}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
