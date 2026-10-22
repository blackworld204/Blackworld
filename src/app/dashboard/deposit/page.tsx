"use client";

import Link from "next/link";
import { useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { CurrencyFlag } from "@/components/currency-flag";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { money, moveMoney } from "@/lib/bank";

export default function DepositPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [amount, setAmount] = useState("1000");
  const [method, setMethod] = useState<"wire" | "card">("wire");
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);

  if (!state || !user) return <div className="app-hold" />;
  const cards = state.cards.filter((card) => card.userId === user.id);
  const chargeable = cards.filter((card) => !card.frozen);
  const card = chargeable.find((item) => item.primary) ?? chargeable[0];
  const value = Number(amount);
  const fee = Number.isFinite(value) ? Math.round(value * 0.025 * 100) / 100 : 0;
  const credit = Number.isFinite(value) ? Math.round((value - fee) * 100) / 100 : 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!Number.isFinite(value) || value <= 0) return setError(t("Enter an amount greater than zero."));
    if (method === "card" && !card) {
      return setError(
        cards.length ? t("Unfreeze a card before a card deposit.") : t("Add a card before using a card deposit."),
      );
    }
    setError("");
    setAsk(true);
  }

  function record() {
    if (busy || !user) return;
    setAsk(false);
    setBusy(true);
    const failed = moveMoney(user.id, "USD", credit, {
      title: method === "wire" ? "Wire deposit" : "Card deposit",
      detail:
        method === "wire"
          ? `Fee ${money(fee, "USD", locale)}`
          : `Card •••• ${card?.last4 ?? ""} · fee ${money(fee, "USD", locale)}`,
      amount: credit,
      direction: "in",
    });
    if (failed) {
      setBusy(false);
      return setError(failed);
    }
    setError("");
    toast(t("Deposit recorded."));
    setDone(credit);
  }

  if (done !== null) {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{t("Deposit received")}</p>
          <h1>{money(done, "USD", locale)}</h1>
          <p className="lede">{t("The credit is the amount after the 2.5% fee.")}</p>
        </header>
        <Link className="btn btn-primary" href="/dashboard">
          {t("Back to dashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Deposit")}</p>
        <h1>{t("Add funds")}</h1>
        <p className="lede">
          {t("A 2.5% fee is taken before the credit.")}
        </p>
      </header>
      <form className="stack" onSubmit={submit}>
        <fieldset className="choice">
          <legend>{t("Method")}</legend>
          <label>
            <input type="radio" checked={method === "wire"} onChange={() => setMethod("wire")} />
            {t("Bank wire")}
          </label>
          <label>
            <input type="radio" checked={method === "card"} onChange={() => setMethod("card")} />
            {t("Card")}
          </label>
        </fieldset>
        {method === "wire" ? (
          <dl className="sheet">
            <div>
              <dt>{t("Beneficiary")}</dt>
              <dd>{t("Blackworld International")}</dd>
            </div>
            <div>
              <dt>{t("Bank")}</dt>
              <dd>254 San José Street, San Juan, PR 00901</dd>
            </div>
            <div>
              <dt>{t("Routing")}</dt>
              <dd className="sheet-value">
                <span className="mono">021000021</span>
                <CopyButton value="021000021" label="Copy" />
              </dd>
            </div>
            <div>
              <dt>{t("Account")}</dt>
              <dd className="sheet-value">
                <span className="mono">4481902201</span>
                <CopyButton value="4481902201" label="Copy" />
              </dd>
            </div>
            <div>
              <dt>{t("Reference")}</dt>
              <dd className="sheet-value">
                <span className="mono">{user.email}</span>
                <CopyButton value={user.email} label="Copy" />
              </dd>
            </div>
          </dl>
        ) : (
          <p className="muted">
            {card
              ? t("Charging the card ending {last4}.", { last4: card.last4 })
              : cards.length
                ? t("Every card on file is frozen.")
                : t("No card on file yet.")}{" "}
            <Link href="/dashboard/cards">{t("Manage cards")}</Link>
          </p>
        )}
        <label className="field">
          <span>{t("Amount (USD)")}</span>
          <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <p className="muted ccy-code">
          <CurrencyFlag code="USD" />
          {t("Fee {fee} · you receive {credit}", {
            fee: money(fee, "USD", locale),
            credit: money(Math.max(credit, 0), "USD", locale),
          })}
        </p>
        {error ? <p className="form-error">{error}</p> : null}
        <BusyButton className="btn btn-primary" type="submit" busy={busy}>
          {method === "wire" ? t("Record wire") : t("Record card deposit")}
        </BusyButton>
      </form>
      <ConfirmDialog
        open={ask}
        title={t("Record this deposit?")}
        body={t("You receive {credit} after the fee.", {
          credit: money(Math.max(credit, 0), "USD", locale),
        })}
        confirmLabel={t("Record deposit")}
        onClose={() => setAsk(false)}
        onConfirm={record}
      />
    </div>
  );
}
