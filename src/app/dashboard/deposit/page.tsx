"use client";

import Link from "next/link";
import { useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { CurrencyFlag } from "@/components/currency-flag";
import { OtpDialog } from "@/components/otp-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { depositBreakdown, money } from "@/lib/bank";
import { postAccount } from "@/lib/flow-api";
import { formatAmountInput, parseAmount } from "@/lib/money-input";

export default function DepositPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [amount, setAmount] = useState("1,000");
  const [method, setMethod] = useState<"wire" | "card">("wire");
  const [pin, setPin] = useState("");
  const [done, setDone] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const [otp, setOtp] = useState<{ id: string; expiresAt: string } | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  /** True while the first OTP popup is shown over the form (before the waiting screen). */
  const [otpFirst, setOtpFirst] = useState(false);

  if (!state || !user) return <div className="app-hold" />;
  const cards = state.cards.filter((card) => card.userId === user.id);
  const chargeable = cards.filter((card) => !card.frozen);
  const card = chargeable.find((item) => item.primary) ?? chargeable[0];
  const value = parseAmount(amount);
  const breakdown = Number.isFinite(value) && value > 0 ? depositBreakdown(value) : null;
  const fee = breakdown?.fee ?? 0;
  const credit = breakdown?.credit ?? 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!Number.isFinite(value) || value <= 0) return setError(t("Enter an amount greater than zero."));
    if (method === "card" && !card) {
      return setError(
        cards.length ? t("Unfreeze a card before a card deposit.") : t("Add a card before using a card deposit."),
      );
    }
    if (pin !== user?.pin) {
      const message = t("PIN does not match this account.");
      toast(message);
      return setError(message);
    }
    setError("");
    setAsk(true);
  }

  function record() {
    if (busy || !user) return;
    setAsk(false);
    setBusy(true);
    void postAccount<{ amount?: number; status?: string; id?: string; expiresAt?: string }>("deposits", {
      amount: value,
      method,
    }).then((result) => {
      setBusy(false);
      if (result.error || typeof result.body?.amount !== "number") {
        setError(t(result.error || "The request failed."));
        return;
      }
      setError("");
      if (result.body.status === "pending" && result.body.id && result.body.expiresAt) {
        toast(t("For security purposes, get the OTP from an admin."));
        setOtp({ id: result.body.id, expiresAt: result.body.expiresAt });
        setDone(result.body.amount);
        setOtpFirst(true);
        setOtpOpen(true);
        return;
      }
      toast(t("Deposit requested."));
      setDone(result.body.amount);
    });
  }

  function finishOtp(verified: boolean) {
    setOtpOpen(false);
    setOtpFirst(false);
    if (verified) {
      setOtp(null);
      setConfirmed(true);
      toast(t("Deposit confirmed."));
    }
  }

  if (done !== null && !otpFirst) {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{confirmed ? t("Deposit") : t("Security check")}</p>
          <h1>{money(done, "USD", locale)}</h1>
          <p className="lede">
            {confirmed
              ? t("The funds are on the balance.")
              : t("For security purposes, get the 6-digit OTP from an admin. Nothing has moved yet.")}
          </p>
        </header>
        <div className="otp-flow-actions">
          {!confirmed && otp ? (
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
          <Link className={!confirmed && otp ? "btn btn-ghost" : "btn btn-primary"} href="/dashboard">
            {t("Back to dashboard")}
          </Link>
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
        <p className="kicker">{t("Deposit")}</p>
        <h1>{t("Add funds")}</h1>
        <p className="lede">
          {t("A 2.5% fee is taken before the credit. Authorize with your PIN, then an admin OTP.")}
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
              <dt>{t("Reference")}</dt>
              <dd className="sheet-value">
                <span className="mono">{user.email}</span>
                <CopyButton value={user.email} label="Copy" />
              </dd>
            </div>
            <div>
              <dt>{t("What happens")}</dt>
              <dd>{t("Send the wire from your bank, then request it here. Nothing is credited until the admin OTP is entered.")}</dd>
            </div>
          </dl>
        ) : (
          <p className="muted">
            {card
              ? t("This does not charge the card ending {last4}. An admin OTP confirms it first.", { last4: card.last4 })
              : cards.length
                ? t("Every card on file is frozen.")
                : t("No card on file yet.")}{" "}
            <Link href="/dashboard/cards">{t("Manage cards")}</Link>
          </p>
        )}
        <label className="field">
          <span>{t("Amount (USD)")}</span>
          <input inputMode="decimal" value={amount} onChange={(event) => setAmount(formatAmountInput(event.target.value))} />
        </label>
        <p className="muted ccy-code">
          <CurrencyFlag code="USD" />
          {t("Fee {fee} · you receive {credit}", {
            fee: money(fee, "USD", locale),
            credit: money(Math.max(credit, 0), "USD", locale),
          })}
        </p>
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
        <BusyButton className="btn btn-primary" type="submit" busy={busy}>
          {method === "wire" ? t("Request wire") : t("Request card deposit")}
        </BusyButton>
      </form>
      <ConfirmDialog
        open={ask}
        title={t("Request this deposit?")}
        body={t("You receive {credit} after the fee, once the admin OTP is entered.", {
          credit: money(Math.max(credit, 0), "USD", locale),
        })}
        confirmLabel={t("Request deposit")}
        onClose={() => setAsk(false)}
        onConfirm={record}
      />
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
