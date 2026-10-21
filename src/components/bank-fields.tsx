"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";
import { useI18n } from "@/i18n/provider";
import { BANK_COUNTRIES, banksIn } from "@/lib/banks";

export function BankFields({
  country,
  bank,
  onCountry,
  onBank,
}: {
  country: string;
  bank: string;
  onCountry: (code: string) => void;
  onBank: (name: string) => void;
}) {
  const { t } = useI18n();
  const banks = banksIn(country);
  const known = banks.some((item) => item.name === bank);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = BANK_COUNTRIES.find((item) => item.code === country) ?? BANK_COUNTRIES[0];

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

  return (
    <div className="split">
      <label className="field">
        <span>{t("Country")}</span>
        <div className="ccy" ref={root}>
          <button
            type="button"
            className="ccy-button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-label={t("Country")}
            onClick={() => setOpen((next) => !next)}
          >
            <CurrencyFlag code={current.code} />
            <span>{t(current.name)}</span>
          </button>
          {open ? (
            <ul className="ccy-menu" id={listId} role="listbox" aria-label={t("Country")}>
              {BANK_COUNTRIES.map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={item.code === country}
                    onClick={() => {
                      onCountry(item.code);
                      setOpen(false);
                    }}
                  >
                    <CurrencyFlag code={item.code} />
                    <span>{t(item.name)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </label>
      <label className="field">
        <span>{t("Bank name")}</span>
        <select aria-label={t("Bank name")} value={bank} onChange={(event) => onBank(event.target.value)}>
          <option value="">{t("Choose a bank")}</option>
          {bank && !known ? <option value={bank}>{bank}</option> : null}
          {banks.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
