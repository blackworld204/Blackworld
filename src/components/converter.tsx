"use client";

import { useMemo, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";
import { CurrencySelect } from "@/components/currency-select";
import { useLiveRates } from "@/components/use-live-rates";
import { useI18n } from "@/i18n/provider";
import { FEE_RATE, PREVIEW_CODES, convert, formatAmount, formatQuoteTime, formatRate } from "@/lib/rates";
import { localeTag } from "@/lib/bank";

export function Converter() {
  const { rates, date, asOf, status } = useLiveRates();
  const [amount, setAmount] = useState("1000");
  const [fromCode, setFromCode] = useState("USD");
  const [toCode, setToCode] = useState("EUR");
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState("");
  const { t, locale } = useI18n();

  const rateNote =
    status === "live" && asOf
      ? t("Live quotes · {time}", { time: formatQuoteTime(asOf, localeTag(locale)) })
      : status === "live" && date
        ? `${t("ECB mid-market")} · ${new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))}`
        : status === "loading"
          ? t("Loading rates")
          : t("Reference rates");

  const from = rates.find((item) => item.code === fromCode) ?? rates[0];
  const to = rates.find((item) => item.code === toCode) ?? rates[1];
  const parsed = Number(amount.replace(/,/g, ""));
  const invalid = amount.trim() !== "" && (!Number.isFinite(parsed) || parsed < 0);
  const net = invalid || amount.trim() === "" ? Number.NaN : parsed * (1 - FEE_RATE);
  const received = Number.isFinite(net) ? convert(net, from, to) : Number.NaN;
  const pair = from.perUsd === 0 ? Number.NaN : to.perUsd / from.perUsd;
  const fee = Number.isFinite(parsed) && parsed >= 0 ? parsed * FEE_RATE : Number.NaN;

  const visible = useMemo(
    () => (showAll ? rates : rates.filter((item) => PREVIEW_CODES.includes(item.code))),
    [rates, showAll],
  );

  return (
    <div className="exchange-grid">
      <form
        className="converter"
        onSubmit={(event) => {
          event.preventDefault();
          if (amount.trim() === "") {
            setError(t("Enter an amount."));
            return;
          }
          if (invalid || parsed > 1_000_000_000_000) {
            setError(t("Enter a valid amount."));
            return;
          }
          setError("");
        }}
      >
        <div className="converter-head">
          <h3>{t("Currency converter")}</h3>
          <p className="muted">{rateNote}</p>
        </div>
        <label className="field">
          <span>{t("You send")}</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setAmount(event.target.value);
              setError("");
            }}
          />
        </label>
        <div className="field">
          <CurrencySelect
            label={t("Source currency")}
            value={fromCode}
            options={rates.map((currency) => ({
              code: currency.code,
              label: `${currency.code} · ${t(currency.name)}`,
            }))}
            onChange={setFromCode}
          />
        </div>
        <button
          type="button"
          className="text-button swap"
          onClick={() => {
            setFromCode(toCode);
            setToCode(fromCode);
          }}
        >
          {t("Swap currencies")}
        </button>
        <p className="receive-label">{t("You receive")}</p>
        <p className="receive-value rate-tick" key={asOf ?? "receive"}>
          {status === "loading" || !Number.isFinite(received) ? "—" : formatAmount(to.code, received)}
          <span>
            <CurrencyFlag code={to.code} /> {to.code}
          </span>
        </p>
        <div className="field">
          <CurrencySelect
            label={t("Destination currency")}
            value={toCode}
            options={rates.map((currency) => ({
              code: currency.code,
              label: `${currency.code} · ${t(currency.name)}`,
            }))}
            onChange={setToCode}
          />
        </div>
        {status === "loading" ? null : (
          <p className="rate-line">
            {Number.isFinite(pair) ? (
              <>
                <span>1</span>
                <CurrencyFlag code={from.code} />
                <span>{from.code}</span>
                <span>= {formatRate(pair)}</span>
                <CurrencyFlag code={to.code} />
                <span>{to.code}</span>
              </>
            ) : (
              t("Rate unavailable")
            )}
          </p>
        )}
        <p className="muted rate-line">
          <span>
            {t("Fee")} {Number.isFinite(fee) ? formatAmount(from.code, fee) : "—"}
          </span>
          <CurrencyFlag code={from.code} />
          <span>{from.code} · 0.5%</span>
        </p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </form>
      <div className="rate-board">
        <div className="converter-head">
          <h3>{t("Live exchange rates")}</h3>
          <p className="muted">{rateNote}</p>
        </div>
        <ul className="rate-list">
          {status === "loading"
            ? null
            : visible.map((currency) => (
            <li key={currency.code}>
              <span className="ccy-code">
                <CurrencyFlag code={currency.code} />
                <span className="mono">{currency.code}</span>
              </span>
              <span>{t(currency.name)}</span>
              <span className="num rate-tick" key={asOf ?? currency.code}>
                {formatRate(currency.perUsd)}
              </span>
            </li>
          ))}
        </ul>
        <button type="button" className="text-button" onClick={() => setShowAll((value) => !value)}>
          {showAll ? t("Show fewer rates") : t("View all rates")}
        </button>
      </div>
    </div>
  );
}
