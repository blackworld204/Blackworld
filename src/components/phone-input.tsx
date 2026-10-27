"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";
import { useI18n } from "@/i18n/provider";
import { countryByIso, joinPhone, listDialCountries, splitPhone } from "@/lib/dial-codes";

function Chevron() {
  return (
    <svg className="phone-chevron" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function PhoneInput({
  label,
  value,
  onChange,
  invalid,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const { t } = useI18n();
  const labelId = useId();
  const parsed = splitPhone(value);
  const [iso, setIso] = useState(parsed.iso);
  const [national, setNational] = useState(parsed.national);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropUp, setDropUp] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const emitted = useRef(value);
  const listId = useId();
  const country = countryByIso(iso);
  const items = listDialCountries(query);

  useEffect(() => {
    if (value === emitted.current) return;
    const next = splitPhone(value);
    setIso(next.iso);
    setNational(next.national);
    emitted.current = value;
  }, [value]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const rect = root.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setDropUp(below < 240 && rect.top > below);
    }
    const frame = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
      const list = listRef.current;
      const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
      if (list && selected) list.scrollTop = Math.max(0, selected.offsetTop - 8);
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  function emit(nextIso: string, nextNational: string) {
    const joined = joinPhone(nextIso, nextNational);
    emitted.current = joined;
    onChange(joined);
  }

  return (
    <>
    <span id={labelId}>{label}</span>
    <div className="phone" data-invalid={invalid ? "true" : undefined}>
      <div className="phone-code" ref={root}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${t("Country code")}, ${country.name}, +${country.dial}`}
          onClick={() => setOpen((current) => !current)}
        >
          <CurrencyFlag code={country.iso} />
          <span>+{country.dial}</span>
          <Chevron />
        </button>
        {open ? (
          <div className={dropUp ? "phone-menu is-up" : "phone-menu"}>
            <div className="lang-search">
              <input
                ref={searchRef}
                type="search"
                value={query}
                aria-label={t("Search countries")}
                placeholder={t("Search countries")}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
              />
            </div>
            {items.length === 0 ? (
              <p className="lang-empty">{t("No country found.")}</p>
            ) : (
              <ul id={listId} role="listbox" aria-label={t("Country code")} ref={listRef}>
                {items.map((item) => (
                  <li key={item.iso}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={item.iso === iso}
                      onClick={() => {
                        setIso(item.iso);
                        emit(item.iso, national);
                        setOpen(false);
                      }}
                    >
                      <CurrencyFlag code={item.iso} />
                      <span className="phone-name">{item.name}</span>
                      <span className="phone-dial">+{item.dial}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      <input
        autoComplete="tel-national"
        inputMode="tel"
        value={national}
        aria-labelledby={labelId}
        aria-invalid={invalid || undefined}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d\s()-]/g, "");
          setNational(next);
          emit(iso, next);
        }}
      />
    </div>
    </>
  );
}
