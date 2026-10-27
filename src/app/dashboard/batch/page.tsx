"use client";

import { useState } from "react";
import { BankFields } from "@/components/bank-fields";
import { BusyButton } from "@/components/busy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CurrencySelect } from "@/components/currency-select";
import { OtpDialog } from "@/components/otp-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { MONEY, money, transferFee, type MoneyCode } from "@/lib/bank";
import { postAccount } from "@/lib/flow-api";
import { swiftOfBank } from "@/lib/banks";
import { currencyLabel, emptyBalances } from "@/lib/currencies";
import { formatAmountInput, parseAmount } from "@/lib/money-input";

type Line = { holder: string; account: string; amount: string; currency: MoneyCode };

const empty = (): Line => ({ holder: "", account: "", amount: "", currency: "USD" });

export default function BatchPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [country, setCountry] = useState("US");
  const [bank, setBank] = useState("");
  const [routing, setRouting] = useState("");
  const [swift, setSwift] = useState("");
  const [lines, setLines] = useState<Line[]>([empty(), empty()]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ held: number } | null>(null);
  const [pending, setPending] = useState<Array<Line & { value: number }> | null>(null);
  const [otpQueue, setOtpQueue] = useState<Array<{ id: string; expiresAt: string }>>([]);
  const [otpOpen, setOtpOpen] = useState(false);

  if (!state || !user) return <div className="app-hold" />;

  const currentOtp = otpQueue[0] ?? null;

  function update(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!bank) return setError(t("Choose a bank"));
    if (routing.trim().length < 4 && swift.trim().length < 6) return setError(t("Enter a US routing number or a SWIFT code."));
    if (pin !== user?.pin) return setError(t("PIN does not match this account."));
    const ready = lines
      .map((line) => ({ ...line, value: parseAmount(line.amount) }))
      .filter((line) => line.holder.trim() || line.account.trim() || line.amount.trim());
    if (ready.length === 0) return setError(t("Enter at least one transfer."));
    for (const line of ready) {
      if (line.holder.trim().length < 2) return setError(t("Enter the account holder."));
      if (line.account.trim().length < 4) return setError(t("Enter the account number."));
      if (!Number.isFinite(line.value) || line.value <= 0) return setError(t("Enter an amount greater than zero."));
    }
    const need = emptyBalances();
    for (const line of ready) {
      need[line.currency] = Math.round((need[line.currency] + line.value + transferFee(line.value)) * 100) / 100;
    }
    for (const code of Object.keys(need) as MoneyCode[]) {
      if (need[code] > user.balances[code] + 0.001) return setError(t("Not enough balance for the amount and fee."));
    }
    setError("");
    setPending(ready);
  }

  function sendPending() {
    if (busy || !pending || !user) return;
    const linesToSend = pending;
    setPending(null);
    setBusy(true);
    const payments = linesToSend.map((line) => ({
      holder: line.holder.trim(),
      bank: bank.trim(),
      routing: routing.trim(),
      swift: swift.trim(),
      account: line.account.trim(),
      note: "",
      amount: line.value,
      currency: line.currency,
    }));
    void postAccount<{ payments?: { status?: string; id?: string; expiresAt?: string }[] }>("payments/batch", {
      payments,
    }).then((result) => {
      setBusy(false);
      if (result.error || !result.body?.payments) {
        setError(t(result.error || "The request failed."));
        return;
      }
      const waiting = result.body.payments
        .filter((item) => item.status === "pending" && item.id && item.expiresAt)
        .map((item) => ({ id: item.id!, expiresAt: item.expiresAt! }));
      setDone({ held: waiting.length });
      setOtpQueue(waiting);
      if (waiting.length > 0) {
        setOtpOpen(true);
        toast(t("For security purposes, get the OTP from an admin."));
      } else {
        toast(t("Batch sent."));
      }
    });
  }

  if (done) {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{t("Batch")}</p>
          <h1>
            {otpQueue.length === 0
              ? t("Batch complete.")
              : t("{count} waiting for OTP.", { count: otpQueue.length })}
          </h1>
          <p className="lede">
            {otpQueue.length > 0
              ? t("For security purposes, get each OTP from an admin. This security check expires in 24 hours.")
              : t("The batch is on the account.")}
          </p>
        </header>
        {currentOtp ? (
          <div className="otp-flow-actions">
            <button className="btn btn-primary" type="button" onClick={() => setOtpOpen(true)}>
              {t("Get OTP from admin")}
            </button>
          </div>
        ) : null}
        <OtpDialog
          open={otpOpen && currentOtp !== null}
          approvalId={currentOtp?.id ?? null}
          expiresAt={currentOtp?.expiresAt ?? null}
          title={t("Get OTP from admin")}
          body={t("For security purposes, get the 6-digit OTP from an admin. This security check expires in 24 hours.")}
          onClose={() => setOtpOpen(false)}
          onVerified={() => {
            setOtpOpen(false);
            setOtpQueue((queue) => {
              const next = queue.slice(1);
              if (next.length > 0) {
                window.setTimeout(() => setOtpOpen(true), 200);
              } else {
                toast(t("OTP accepted."));
              }
              return next;
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Batch")}</p>
        <h1>{t("Batch payments")}</h1>
        <p className="lede">
          {t("Each line is a separate transfer with a 1% fee. After your PIN, an admin OTP is required for security.")}
        </p>
      </header>
      <form className="stack" onSubmit={submit}>
        <BankFields
          country={country}
          bank={bank}
          onCountry={(code) => {
            setCountry(code);
            setBank("");
            setSwift("");
          }}
          onBank={(name) => {
            setBank(name);
            setSwift(swiftOfBank(country, name));
          }}
        />
        <div className="split">
          <label className="field">
            <span>{t("Routing number")}</span>
            <input value={routing} onChange={(event) => setRouting(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("SWIFT")}</span>
            <input value={swift} onChange={(event) => setSwift(event.target.value)} />
          </label>
        </div>
        {lines.map((line, index) => (
          <div className="stack" key={index}>
            <p className="kicker">{t("Line {n}", { n: index + 1 })}</p>
            <label className="field">
              <span>{t("Account holder")}</span>
              <input value={line.holder} onChange={(event) => update(index, { holder: event.target.value })} />
            </label>
            <div className="split">
              <label className="field">
                <span>{t("Account number")}</span>
                <input value={line.account} onChange={(event) => update(index, { account: event.target.value })} />
              </label>
              <label className="field">
                <span>{t("Amount")}</span>
                <input inputMode="decimal" value={line.amount} onChange={(event) => update(index, { amount: formatAmountInput(event.target.value) })} />
              </label>
            </div>
            <label className="field">
              <span>{t("Currency")}</span>
              <CurrencySelect
                label={t("Currency")}
                value={line.currency}
                options={MONEY.map((item) => ({
                  code: item.code,
                  label: currencyLabel(item.code),
                }))}
                onChange={(next) => update(index, { currency: next as MoneyCode })}
              />
            </label>
            <p className="muted">{t("Fee {fee}", { fee: money(transferFee(parseAmount(line.amount) || 0), line.currency, locale) })}</p>
            {lines.length > 1 ? (
              <button type="button" className="text-button" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>
                {t("Remove line")}
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" className="text-button" onClick={() => setLines((current) => [...current, empty()])}>
          {t("Add a line")}
        </button>
        <label className="field">
          <span>{t("PIN")}</span>
          <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <BusyButton className="btn btn-primary" type="submit" busy={busy}>
          {t("Send batch")}
        </BusyButton>
      </form>
      <ConfirmDialog
        open={pending !== null}
        title={t("Send this batch?")}
        body={t("{count} transfers wait for an admin OTP after your PIN.", { count: pending?.length ?? 0 })}
        confirmLabel={t("Send batch")}
        onClose={() => setPending(null)}
        onConfirm={sendPending}
      />
    </div>
  );
}
