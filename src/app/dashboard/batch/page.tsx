"use client";

import { useState } from "react";
import { BankFields } from "@/components/bank-fields";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CurrencySelect } from "@/components/currency-select";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { MONEY, addApproval, money, needsApproval, payTransfer, transferFee, type MoneyCode } from "@/lib/bank";
import { swiftOfBank } from "@/lib/banks";
import { emptyBalances } from "@/lib/currencies";

type Line = { holder: string; account: string; amount: string; currency: MoneyCode };

const empty = (): Line => ({ holder: "", account: "", amount: "", currency: "USD" });

export default function BatchPage() {
  const { user } = useAccount();
  const { t, locale } = useI18n();
  const [country, setCountry] = useState("US");
  const [bank, setBank] = useState("");
  const [routing, setRouting] = useState("");
  const [swift, setSwift] = useState("");
  const [lines, setLines] = useState<Line[]>([empty(), empty()]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ paid: number; held: number } | null>(null);
  const [pending, setPending] = useState<Array<Line & { value: number }> | null>(null);

  if (!user) return <div className="app-hold" />;

  function update(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!bank) return setError(t("Choose a bank"));
    if (routing.trim().length < 4 && swift.trim().length < 6) return setError(t("Enter a US routing number or a SWIFT code."));
    if (pin !== user?.pin) return setError(t("PIN does not match this account. The 4-digit PIN is under Security."));
    const ready = lines
      .map((line) => ({ ...line, value: Number(line.amount) }))
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
    let paid = 0;
    let held = 0;
    for (const line of linesToSend) {
      const payment = {
        holder: line.holder.trim(),
        bank: bank.trim(),
        routing: routing.trim(),
        swift: swift.trim(),
        account: line.account.trim(),
        note: "",
        amount: line.value,
        currency: line.currency,
      };
      const total = line.value + transferFee(line.value);
      if (needsApproval(user, total)) {
        addApproval({ ...payment, userId: user.id });
        held += 1;
        continue;
      }
      const failed = payTransfer(user.id, payment);
      if (failed) {
        setBusy(false);
        setError(t(failed));
        return;
      }
      paid += 1;
    }
    setDone({ paid, held });
    toast(t("Batch recorded in this browser."));
  }

  if (done) {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{t("Batch")}</p>
          <h1>{t("{count} transfers recorded.", { count: done.paid })}</h1>
          <p className="lede">
            {done.held > 0
              ? t("{count} waiting for approval.", { count: done.held })
              : t("Recorded in this browser. Not a live bank transfer.")}
          </p>
        </header>
      </div>
    );
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Batch")}</p>
        <h1>{t("Batch payments")}</h1>
        <p className="lede">{t("Each line is a separate transfer with a 1% fee. Members above the approval limit wait for an admin.")}</p>
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
                <input inputMode="decimal" value={line.amount} onChange={(event) => update(index, { amount: event.target.value })} />
              </label>
            </div>
            <label className="field">
              <span>{t("Currency")}</span>
              <CurrencySelect
                label={t("Currency")}
                value={line.currency}
                options={MONEY.map((item) => ({ code: item.code, label: item.code }))}
                onChange={(next) => update(index, { currency: next as MoneyCode })}
              />
            </label>
            <p className="muted">{t("Fee {fee}", { fee: money(transferFee(Number(line.amount) || 0), line.currency, locale) })}</p>
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
          <span>{t("4-digit PIN")}</span>
          <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {t("Send batch")}
        </button>
      </form>
      <ConfirmDialog
        open={pending !== null}
        title={t("Send this batch?")}
        body={t("{count} transfers are recorded in this browser.", { count: pending?.length ?? 0 })}
        confirmLabel={t("Send batch")}
        onClose={() => setPending(null)}
        onConfirm={sendPending}
      />
    </div>
  );
}
