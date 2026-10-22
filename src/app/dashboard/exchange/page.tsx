"use client";

import { useMemo, useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { CurrencyFlag } from "@/components/currency-flag";
import { CurrencySelect } from "@/components/currency-select";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useLiveRates } from "@/components/use-live-rates";
import { useI18n } from "@/i18n/provider";
import { MONEY, localeTag, money, settleExchange, type MoneyCode } from "@/lib/bank";
import { formatQuoteTime } from "@/lib/rates";

export default function ExchangePage() {
  const { user } = useAccount();
  const { t, locale } = useI18n();
  const { rates, date, asOf, status } = useLiveRates();
  const [from, setFrom] = useState<MoneyCode>("USD");
  const [to, setTo] = useState<MoneyCode>("EUR");
  const [amount, setAmount] = useState("1000");
  const [review, setReview] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [held, setHeld] = useState<{ fee: number; received: number; rate: number } | null>(null);
  const [busy, setBusy] = useState(false);

  function perUsd(code: MoneyCode) {
    return rates.find((rate) => rate.code === code)?.perUsd ?? 1;
  }

  const value = Number(amount);
  const quote = useMemo(() => {
    if (!Number.isFinite(value) || value <= 0 || from === to) return null;
    const usd = value / perUsd(from);
    const fee = usd * 0.005;
    const received = (usd - fee) * perUsd(to);
    return {
      fee: fee * perUsd(from),
      received,
      rate: perUsd(to) / perUsd(from),
    };
  }, [value, from, to, rates]);

  if (!user) return <div className="app-hold" />;

  function preview(event: React.FormEvent) {
    event.preventDefault();
    if (!quote) return setError(t("Choose two currencies and an amount above zero."));
    if (user && user.balances[from] < value) return setError(t("Not enough balance in that currency."));
    setError("");
    setHeld(quote);
    setReview(true);
  }

  function confirm() {
    if (busy || !held || !user) return;
    setBusy(true);
    const received = Math.round(held.received * 100) / 100;
    const failed = settleExchange(user.id, from, to, value, received, money(held.fee, from, locale));
    if (failed) {
      setBusy(false);
      return setError(t(failed));
    }
    toast(t("Exchange recorded."));
    setDone(money(received, to, locale));
  }

  if (done) {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{t("Exchanged")}</p>
          <h1>{done}</h1>
          <p className="lede">{t("The new balances are on the dashboard.")}</p>
        </header>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            setDone("");
            setReview(false);
            setBusy(false);
            setError("");
          }}
        >
          {t("Another exchange")}
        </button>
      </div>
    );
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Exchange")}</p>
        <h1>{t("Convert")}</h1>
        <p className="lede">
          {status === "live" && asOf
            ? t("Live quotes · {time}. A 0.5% fee is shown before you confirm.", {
                time: formatQuoteTime(asOf, localeTag(locale)),
              })
            : status === "live" && date
              ? t("ECB reference rate · {date}. A 0.5% fee is shown before you confirm.", {
                  date: new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium", timeZone: "UTC" }).format(
                    new Date(`${date}T00:00:00Z`),
                  ),
                })
            : status === "loading"
              ? t("Loading the latest rate. A 0.5% fee is shown before you confirm.")
              : t("Reference rates. A 0.5% fee is shown before you confirm.")}
        </p>
      </header>
      {!review ? (
        <form className="stack" onSubmit={preview}>
          <div className="split">
            <label className="field">
              <span>{t("From · {balance}", { balance: money(user.balances[from], from, locale) })}</span>
              <CurrencySelect
                label={t("From")}
                value={from}
                options={MONEY.map((item) => ({ code: item.code, label: item.code }))}
                onChange={(next) => {
                  const code = next as MoneyCode;
                  setFrom(code);
                  if (code === to) setTo(code === "USD" ? "EUR" : "USD");
                }}
              />
            </label>
            <label className="field">
              <span>{t("To")}</span>
              <CurrencySelect
                label={t("To")}
                value={to}
                options={MONEY.filter((item) => item.code !== from).map((item) => ({
                  code: item.code,
                  label: item.code,
                }))}
                onChange={(next) => setTo(next as MoneyCode)}
              />
            </label>
          </div>
          <label className="field">
            <span>{t("Amount")}</span>
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>
          {status !== "loading" && quote ? (
            <p className="muted rate-line rate-tick" key={asOf ?? "quote"}>
              <span>{t("Rate")} 1</span>
              <CurrencyFlag code={from} />
              <span>
                {from} = {quote.rate.toFixed(4)}
              </span>
              <CurrencyFlag code={to} />
              <span>
                {to} · {t("fee {fee} · you receive {received}", {
                  fee: money(quote.fee, from, locale),
                  received: money(quote.received, to, locale),
                })}
              </span>
            </p>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit">
            {t("Review exchange")}
          </button>
        </form>
      ) : (
        <div className="stack">
          <dl className="sheet">
            <div>
              <dt>{t("Convert")}</dt>
              <dd className="ccy-code">
                <CurrencyFlag code={from} />
                {money(value, from, locale)}
              </dd>
            </div>
            <div>
              <dt>{t("Fee")}</dt>
              <dd className="ccy-code">
                <CurrencyFlag code={from} />
                {held ? money(held.fee, from, locale) : "—"}
              </dd>
            </div>
            <div>
              <dt>{t("You receive")}</dt>
              <dd className="ccy-code">
                <CurrencyFlag code={to} />
                {held ? money(held.received, to, locale) : "—"}
              </dd>
            </div>
          </dl>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-row">
            <button className="text-button" type="button" onClick={() => setReview(false)}>
              {t("Edit")}
            </button>
            <BusyButton className="btn btn-primary" type="button" busy={busy} onClick={confirm}>
              {t("Confirm exchange")}
            </BusyButton>
          </div>
        </div>
      )}
    </div>
  );
}
