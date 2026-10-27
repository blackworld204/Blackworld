"use client";

import { useState } from "react";
import { BankFields } from "@/components/bank-fields";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateSelect } from "@/components/date-select";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { MONEY, addSchedule, cancelSchedule, currencyLabel, money, type MoneyCode } from "@/lib/bank";
import { swiftOfBank } from "@/lib/banks";
import { CurrencySelect } from "@/components/currency-select";
import { formatAmountInput, parseAmount } from "@/lib/money-input";

const statusLabel = {
  scheduled: "Scheduled",
  paid: "Paid",
  failed: "Failed",
  held: "Held for approval",
} as const;

export default function SchedulePage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [holder, setHolder] = useState("");
  const [country, setCountry] = useState("US");
  const [bank, setBank] = useState("");
  const [routing, setRouting] = useState("");
  const [swift, setSwift] = useState("");
  const [account, setAccount] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<MoneyCode>("USD");
  const [runOn, setRunOn] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [drop, setDrop] = useState<{ id: string; holder: string } | null>(null);
  const [ask, setAsk] = useState(false);

  if (!state || !user) return <div className="app-hold" />;
  const rows = state.schedules.filter((item) => item.userId === user.id);
  const today = new Date().toISOString().slice(0, 10);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = parseAmount(amount);
    if (holder.trim().length < 2) return setError(t("Enter the account holder."));
    if (!bank) return setError(t("Choose a bank"));
    if (account.trim().length < 4) return setError(t("Enter the account number."));
    if (routing.trim().length < 4 && swift.trim().length < 6) return setError(t("Enter a US routing number or a SWIFT code."));
    if (!Number.isFinite(value) || value <= 0) return setError(t("Enter an amount greater than zero."));
    if (!runOn || runOn < today) return setError(t("Choose today or a later date."));
    if (pin !== user?.pin) return setError(t("PIN does not match this account."));
    setError("");
    setAsk(true);
  }

  function schedule() {
    if (!user) return;
    setAsk(false);
    const value = parseAmount(amount);
    void addSchedule({
      userId: user!.id,
      holder: holder.trim(),
      bank: bank.trim(),
      routing: routing.trim(),
      swift: swift.trim(),
      account: account.trim(),
      note: note.trim(),
      amount: value,
      currency,
      runOn,
    }).then((status) => {
      setHolder("");
      setBank("");
      setRouting("");
      setSwift("");
      setAccount("");
      setNote("");
      setAmount("");
      setRunOn("");
      setPin("");
      setError("");
      toast(
        t(
          status === "failed"
            ? "Not enough balance."
            : status === "held"
              ? "Waiting for an admin to approve."
              : status === "paid"
                ? "Transfer sent."
                : "Scheduled.",
        ),
      );
    });
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Schedule")}</p>
        <h1>{t("Pay later")}</h1>
        <p className="lede">{t("It runs on or after the date. The 1% fee is taken then.")}</p>
      </header>
      {rows.length === 0 ? <p className="muted">{t("No scheduled transfers.")}</p> : null}
      <ul className="tx-list">
        {rows.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.holder}</strong>
              <span className="muted">
                {item.runOn} · {t(statusLabel[item.status])}
              </span>
            </div>
            <span className="mono">{money(item.amount, item.currency, locale)}</span>
            {item.status === "scheduled" ? (
              <button type="button" className="text-button" onClick={() => setDrop({ id: item.id, holder: item.holder })}>
                {t("Cancel")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <form className="stack" onSubmit={submit}>
        <h2>{t("Schedule a transfer")}</h2>
        <label className="field">
          <span>{t("Account holder")}</span>
          <input value={holder} onChange={(event) => setHolder(event.target.value)} />
        </label>
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
        <label className="field">
          <span>{t("Account number")}</span>
          <input value={account} onChange={(event) => setAccount(event.target.value)} />
        </label>
        <label className="field">
          <span>{t("Description")}</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <div className="split">
          <label className="field">
            <span>{t("Amount")}</span>
            <input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatAmountInput(event.target.value))} />
          </label>
          <label className="field">
            <span>{t("Currency")}</span>
            <CurrencySelect
              label={t("Currency")}
              value={currency}
              options={MONEY.map((item) => ({
                code: item.code,
                label: currencyLabel(item.code),
              }))}
              onChange={(next) => setCurrency(next as MoneyCode)}
            />
          </label>
        </div>
        <label className="field">
          <span>{t("Pay on")}</span>
          <DateSelect min={today} value={runOn} onChange={setRunOn} />
        </label>
        <label className="field">
          <span>{t("PIN")}</span>
          <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-primary" type="submit">
          {t("Schedule transfer")}
        </button>
      </form>
      <ConfirmDialog
        open={drop !== null}
        title={t("Cancel this transfer?")}
        body={t("The payment to {holder} will not run.", { holder: drop?.holder ?? "" })}
        confirmLabel={t("Cancel transfer")}
        onClose={() => setDrop(null)}
        onConfirm={() => {
          if (drop) cancelSchedule(drop.id);
          setDrop(null);
          toast(t("Cancelled."));
        }}
      />
      <ConfirmDialog
        open={ask}
        title={t("Schedule this transfer?")}
        body={t("It runs on {date}.", { date: runOn })}
        confirmLabel={t("Schedule")}
        onClose={() => setAsk(false)}
        onConfirm={schedule}
      />
    </div>
  );
}
