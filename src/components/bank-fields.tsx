"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";
import { useI18n } from "@/i18n/provider";
import { BANK_COUNTRIES, banksIn, loadBanksForCountry, type BankOption } from "@/lib/banks";

const FULL_LIST_LIMIT = 300;
const PREVIEW_LIMIT = 150;
const SEARCH_LIMIT = 500;

function useDismissibleMenu(
  open: boolean,
  root: React.RefObject<HTMLDivElement | null>,
  searchRef: React.RefObject<HTMLInputElement | null>,
  onClose: () => void,
) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) closeRef.current();
    };
    // Defer so the opening tap does not immediately close the menu.
    const timer = window.setTimeout(() => {
      window.addEventListener("pointerdown", onPointer);
    }, 0);
    window.addEventListener("keydown", onKey);
    queueMicrotask(() => searchRef.current?.focus());
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open, root, searchRef]);
}

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
  const [banks, setBanks] = useState<BankOption[]>(() => banksIn(country));
  const [banksLoading, setBanksLoading] = useState(false);
  const known = banks.some((item) => item.name === bank);
  const [countryOpen, setCountryOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [manual, setManual] = useState(() => Boolean(bank) && !banksIn(country).some((item) => item.name === bank));
  const [countryQuery, setCountryQuery] = useState("");
  const [bankQuery, setBankQuery] = useState("");
  const countryRoot = useRef<HTMLDivElement>(null);
  const bankRoot = useRef<HTMLDivElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);
  const bankSearchRef = useRef<HTMLInputElement>(null);
  const manualRef = useRef<HTMLInputElement>(null);
  const countryListId = useId();
  const bankListId = useId();
  const current = BANK_COUNTRIES.find((item) => item.code === country) ?? BANK_COUNTRIES[0];

  useEffect(() => {
    let cancelled = false;
    setBanks(banksIn(country));
    setBanksLoading(true);
    loadBanksForCountry(country).then((list) => {
      if (cancelled) return;
      setBanks(list);
      setBanksLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [country]);

  const filteredCountries = useMemo(() => {
    const folded = countryQuery.trim().toLowerCase();
    if (!folded) return BANK_COUNTRIES;
    return BANK_COUNTRIES.filter(
      (item) =>
        item.name.toLowerCase().includes(folded) ||
        item.code.toLowerCase().includes(folded) ||
        t(item.name).toLowerCase().includes(folded),
    );
  }, [countryQuery, t]);

  const matchedBanks = useMemo(() => {
    const folded = bankQuery.trim().toLowerCase();
    if (!folded) return banks;
    return banks.filter((item) => item.name.toLowerCase().includes(folded));
  }, [bankQuery, banks]);

  const visibleBanks = useMemo(() => {
    if (bankQuery.trim()) return matchedBanks.slice(0, SEARCH_LIMIT);
    if (matchedBanks.length <= FULL_LIST_LIMIT) return matchedBanks;
    return matchedBanks.slice(0, PREVIEW_LIMIT);
  }, [matchedBanks, bankQuery]);

  const hiddenCount = matchedBanks.length - visibleBanks.length;

  const customBank = bankQuery.trim();
  const canUseCustom =
    customBank.length > 0 &&
    !banks.some((item) => item.name.toLowerCase() === customBank.toLowerCase()) &&
    customBank.toLowerCase() !== bank.trim().toLowerCase();

  function pickBank(name: string) {
    onBank(name);
    setManual(false);
    setBankOpen(false);
    setBankQuery("");
  }

  function toggleManual() {
    setCountryOpen(false);
    setBankOpen(false);
    setBankQuery("");
    if (manual) {
      setManual(false);
      return;
    }
    setManual(true);
  }

  useEffect(() => {
    if (!countryOpen) setCountryQuery("");
    else setBankOpen(false);
  }, [countryOpen]);

  useEffect(() => {
    if (!bankOpen) setBankQuery("");
    else setCountryOpen(false);
  }, [bankOpen]);

  useEffect(() => {
    setBankOpen(false);
    setBankQuery("");
    setManual(false);
  }, [country]);

  useEffect(() => {
    if (!manual) return;
    queueMicrotask(() => manualRef.current?.focus());
  }, [manual]);

  useDismissibleMenu(countryOpen, countryRoot, countrySearchRef, () => setCountryOpen(false));
  useDismissibleMenu(bankOpen, bankRoot, bankSearchRef, () => setBankOpen(false));

  return (
    <div className="split">
      <div className="field">
        <span>{t("Country")}</span>
        <div className={`ccy${countryOpen ? " is-open" : ""}`} ref={countryRoot}>
          <button
            type="button"
            className="ccy-button"
            aria-haspopup="listbox"
            aria-expanded={countryOpen}
            aria-controls={countryListId}
            aria-label={t("Country")}
            onClick={() => setCountryOpen((next) => !next)}
          >
            <CurrencyFlag code={current.code} />
            <span>{t(current.name)}</span>
          </button>
          {countryOpen ? (
            <div className="ccy-menu-panel">
              <div className="ccy-search">
                <span className="sr-only">{t("Search countries")}</span>
                <input
                  ref={countrySearchRef}
                  value={countryQuery}
                  onChange={(event) => setCountryQuery(event.target.value)}
                  placeholder={t("Search countries")}
                  autoComplete="off"
                />
              </div>
              <ul className="ccy-menu" id={countryListId} role="listbox" aria-label={t("Country")}>
                {filteredCountries.map((item) => (
                  <li key={item.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={item.code === country}
                      onClick={() => {
                        onCountry(item.code);
                        setCountryOpen(false);
                      }}
                    >
                      <CurrencyFlag code={item.code} />
                      <span>{t(item.name)}</span>
                    </button>
                  </li>
                ))}
                {filteredCountries.length === 0 ? (
                  <li className="ccy-empty" role="presentation">
                    {t("No country found.")}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <div className="field">
        <span>{t("Bank name")}</span>
        <div className="bank-pick">
          {manual ? (
            <input
              ref={manualRef}
              aria-label={t("Bank name")}
              value={bank}
              autoComplete="organization"
              onChange={(event) => onBank(event.target.value)}
              placeholder={t("Bank name")}
            />
          ) : (
            <div className={`ccy${bankOpen ? " is-open" : ""}`} ref={bankRoot}>
              <button
                type="button"
                className="ccy-button"
                aria-haspopup="listbox"
                aria-expanded={bankOpen}
                aria-controls={bankListId}
                aria-label={t("Bank name")}
                data-empty={!bank ? "true" : undefined}
                onClick={() => setBankOpen((next) => !next)}
              >
                <span>{bank || t("Choose a bank")}</span>
              </button>
              {bankOpen ? (
                <div className="ccy-menu-panel bank-menu-panel">
                  <div className="ccy-search">
                    <span className="sr-only">{t("Search banks")}</span>
                    <input
                      ref={bankSearchRef}
                      value={bankQuery}
                      onChange={(event) => setBankQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && customBank) {
                          event.preventDefault();
                          pickBank(customBank);
                        }
                      }}
                      placeholder={t("Search banks")}
                      autoComplete="off"
                    />
                  </div>
                  <ul className="ccy-menu" id={bankListId} role="listbox" aria-label={t("Bank name")}>
                    {banksLoading && banks.length === 0 ? (
                      <li className="ccy-empty" role="presentation">
                        {t("Loading banks…")}
                      </li>
                    ) : null}
                    {bank && !known ? (
                      <li>
                        <button type="button" role="option" aria-selected onClick={() => pickBank(bank)}>
                          <span>{bank}</span>
                        </button>
                      </li>
                    ) : null}
                    {canUseCustom ? (
                      <li>
                        <button
                          type="button"
                          role="option"
                          aria-selected={false}
                          onClick={() => pickBank(customBank)}
                        >
                          <span>
                            {t("Other")}: {customBank}
                          </span>
                        </button>
                      </li>
                    ) : null}
                    {visibleBanks.map((item) => (
                      <li key={`${item.swift ?? ""}:${item.name}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={item.name === bank}
                          onClick={() => pickBank(item.name)}
                        >
                          <span>{item.name}</span>
                        </button>
                      </li>
                    ))}
                    {hiddenCount > 0 ? (
                      <li className="ccy-empty" role="presentation">
                        {t("Showing {shown} of {total}. Type to find a bank.", {
                          shown: String(visibleBanks.length),
                          total: String(matchedBanks.length),
                        })}
                      </li>
                    ) : !banksLoading && banks.length > 0 ? (
                      <li className="ccy-empty bank-menu-count" role="presentation">
                        {t("{count} banks in this country.", { count: String(banks.length) })}
                      </li>
                    ) : null}
                    {filteredBanksEmpty(visibleBanks, canUseCustom, bank, known, banksLoading) ? (
                      <li className="ccy-empty" role="presentation">
                        {t("No bank found.")}
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
          <button
            type="button"
            className="bank-add"
            aria-label={manual ? t("Choose a bank") : t("Other")}
            aria-pressed={manual}
            title={manual ? t("Choose a bank") : t("Other")}
            onClick={toggleManual}
          >
            {manual ? "×" : "+"}
          </button>
        </div>
      </div>
    </div>
  );
}

function filteredBanksEmpty(
  visibleBanks: BankOption[],
  canUseCustom: boolean,
  bank: string,
  known: boolean,
  banksLoading: boolean,
) {
  return visibleBanks.length === 0 && !canUseCustom && !(bank && !known) && !banksLoading;
}
