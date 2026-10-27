"use client";

import { useMemo, useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CurrencyFlag } from "@/components/currency-flag";
import { CurrencySelect } from "@/components/currency-select";
import { OtpDialog } from "@/components/otp-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useLiveRates } from "@/components/use-live-rates";
import { useI18n } from "@/i18n/provider";
import { MONEY, currencyLabel, localeTag, money, type MoneyCode } from "@/lib/bank";
import { postAccount } from "@/lib/flow-api";
import { formatAmountInput, parseAmount } from "@/lib/money-input";
import { formatQuoteTime, quoteConversion } from "@/lib/rates";

export default function ExchangePage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const { rates, date, asOf, status } = useLiveRates();
  const [from, setFrom] = useState<MoneyCode>("USD");
  const [to, setTo] = useState<MoneyCode>("EUR");
  const [amount, setAmount] = useState("1,000");
  const [pin, setPin] = useState("");
  const [review, setReview] = useState(false);
  const [done, setDone] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const [held, setHeld] = useState<{ fee: number; received: number; rate: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const [otp, setOtp] = useState<{ id: string; expiresAt: string } | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpFirst, setOtpFirst] = useState(false);

  const value = parseAmount(amount);
  const quote = useMemo(() => {
    if (!Number.isFinite(value) || value <= 0 || from === to) return null;
    const source = rates.find((rate) => rate.code === from);
    const target = rates.find((rate) => rate.code === to);
    if (!source || !target) return null;
    const quoted = quoteConversion(value, source, target);
    if (!Number.isFinite(quoted.converted) || !Number.isFinite(quoted.rate)) return null;
    return { fee: quoted.fee, received: quoted.converted, rate: quoted.rate };
  }, [value, from, to, rates]);

  if (!state || !user) return <div className="app-hold" />;

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
    if (pin !== user.pin) {
      const message = t("PIN does not match this account.");
      toast(message);
      return setError(message);
    }
    setError("");
    setAsk(true);
  }

  function settle() {
    if (busy || !held || !user) return;
    setAsk(false);
    setBusy(true);
    void postAccount<{
      converted?: number;
      status?: string;
      id?: string;
      expiresAt?: string;
    }>("fx/exchanges", { from, to, amount: value }).then((result) => {
      setBusy(false);
      if (result.error) {
        setError(t(result.error || "Rates are not available."));
        return;
      }
      if (result.body?.status === "pending" && result.body.id && result.body.expiresAt) {
        toast(t("For security purposes, get the OTP from an admin."));
        setOtp({ id: result.body.id, expiresAt: result.body.expiresAt });
        setWaiting(true);
        setDone(money(held.received, to, locale));
        setOtpFirst(true);
        setOtpOpen(true);
        return;
      }
      if (typeof result.body?.converted !== "number") {
        setError(t("Rates are not available."));
        return;
      }
      toast(t("Exchange recorded."));
      setDone(money(result.body.converted, to, locale));
    });
  }

  function finishOtp(verified: boolean) {
    setOtpOpen(false);
    setOtpFirst(false);
    if (verified) {
      setOtp(null);
      setWaiting(false);
      toast(t("Exchange recorded."));
    }
  }

  if (done && !otpFirst) {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{waiting ? t("Exchange requested") : t("Exchanged")}</p>
          <h1>{done}</h1>
          <p className="lede">
            {waiting
              ? t("For security purposes, get the OTP from an admin to finish this security check. Nothing has moved yet.")
              : t("The new balances are on the dashboard.")}
          </p>
        </header>
        <div className="otp-flow-actions">
          {waiting && otp ? (
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                const row = state.approvals.find((item) => item.id === otp.id && item.status === "pending");
                if (row?.otpExpiresAt) setOtp({ id: row.id, expiresAt: row.otpExpiresAt });
                setOtpOpen(true);
              }}
            >
              {t("Get OTP from admin")}
            </button>
          ) : null}
          <button
            className={waiting ? "btn btn-ghost" : "btn btn-primary"}
            type="button"
            onClick={() => {
              setDone("");
              setWaiting(false);
              setOtp(null);
              setOtpOpen(false);
              setReview(false);
              setBusy(false);
              setPin("");
              setError("");
            }}
          >
            {t("Another exchange")}
          </button>
        </div>
        <OtpDialog
          open={otpOpen && otp !== null}
          approvalId={otp?.id ?? null}
          expiresAt={otp?.expiresAt ?? null}
          title={t("Get OTP from admin")}
          body={t("For security purposes, get the 6-digit OTP from an admin. This security check expires in 24 hours.")}
          onClose={() => setOtpOpen(false)}
          onVerified={() => finishOtp(true)}
        />
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
            ? t("Live quotes · {time}. A 0.5% fee is shown before you confirm. An admin OTP is required for security.", {
                time: formatQuoteTime(asOf, localeTag(locale)),
              })
            : status === "live" && date
              ? t("ECB reference rate · {date}. A 0.5% fee is shown before you confirm. An admin OTP is required for security.", {
                  date: new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium", timeZone: "UTC" }).format(
                    new Date(`${date}T00:00:00Z`),
                  ),
                })
            : status === "loading"
              ? t("Loading the latest rate. A 0.5% fee is shown before you confirm. An admin OTP is required for security.")
              : t("Reference rates. A 0.5% fee is shown before you confirm. An admin OTP is required for security.")}
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
                options={MONEY.map((item) => ({
                  code: item.code,
                  label: currencyLabel(item.code),
                }))}
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
                  label: currencyLabel(item.code),
                }))}
                onChange={(next) => setTo(next as MoneyCode)}
              />
            </label>
          </div>
          <label className="field">
            <span>{t("Amount")}</span>
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatAmountInput(event.target.value))} />
          </label>
          {status !== "loading" && quote ? (
            <p className="muted rate-line rate-tick" key={asOf ?? "quote"}>
              <span>{t("Rate")} 1</span>
              <CurrencyFlag code={from} />
              <span>
                {currencyLabel(from)} = {quote.rate.toFixed(4)}
              </span>
              <CurrencyFlag code={to} />
              <span>
                {currencyLabel(to)} · {t("fee {fee} · you receive {received}", {
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
          <label className="field">
            <span>{t("PIN")}</span>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-row">
            <button className="text-button" type="button" onClick={() => setReview(false)}>
              {t("Edit")}
            </button>
            <BusyButton className="btn btn-primary" type="button" busy={busy} onClick={confirm}>
              {t("Confirm exchange")}
            </BusyButton>
            <ConfirmDialog
              open={ask}
              title={t("Exchange these currencies?")}
              body={t("For security purposes, an admin OTP is required after your PIN.")}
              confirmLabel={t("Confirm exchange")}
              onClose={() => setAsk(false)}
              onConfirm={settle}
            />
          </div>
        </div>
      )}
      <OtpDialog
        open={otpOpen && otp !== null && otpFirst}
        approvalId={otp?.id ?? null}
        expiresAt={otp?.expiresAt ?? null}
        title={t("Get OTP from admin")}
        body={t("For security purposes, get the 6-digit OTP from an admin. This security check expires in 24 hours.")}
        onClose={() => finishOtp(false)}
        onVerified={() => finishOtp(true)}
      />
    </div>
  );
}
