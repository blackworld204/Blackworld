"use client";

import Link from "next/link";
import { useState } from "react";
import { BankFields } from "@/components/bank-fields";
import { BusyButton } from "@/components/busy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CurrencyFlag } from "@/components/currency-flag";
import { CurrencySelect } from "@/components/currency-select";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { MONEY, addApproval, addPayee, money, needsApproval, payTransfer, removePayee, type MoneyCode } from "@/lib/bank";
import { countryOfBank, swiftOfBank } from "@/lib/banks";

type Draft = {
  holder: string;
  country: string;
  bank: string;
  routing: string;
  swift: string;
  account: string;
  note: string;
  amount: string;
  currency: MoneyCode;
};

const blank: Draft = {
  holder: "",
  country: "US",
  bank: "",
  routing: "",
  swift: "",
  account: "",
  note: "",
  amount: "",
  currency: "USD",
};

export default function SendPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(blank);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [ref, setRef] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState(false);
  const [dropPayee, setDropPayee] = useState<string | null>(null);

  if (!state || !user) return <div className="app-hold" />;
  const payees = state.payees.filter((payee) => payee.userId === user.id);
  const savedAlready = payees.some((payee) => payee.holder === draft.holder && payee.account === draft.account);

  const amount = Number(draft.amount);
  const fee = Number.isFinite(amount) ? Math.round(amount * 0.01 * 100) / 100 : 0;
  const total = Number.isFinite(amount) ? amount + fee : 0;

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function review(event: React.FormEvent) {
    event.preventDefault();
    if (draft.holder.trim().length < 2) return setError(t("Enter the account holder."));
    if (!draft.bank) return setError(t("Choose a bank"));
    if (draft.account.trim().length < 4) return setError(t("Enter the account number."));
    if (draft.routing.trim().length < 4 && draft.swift.trim().length < 6) {
      return setError(t("Enter a US routing number or a SWIFT code."));
    }
    if (!Number.isFinite(amount) || amount <= 0) return setError(t("Enter an amount greater than zero."));
    if (user && user.balances[draft.currency] < total) return setError(t("Not enough balance for the amount and fee."));
    setError("");
    setStep(1);
  }

  function confirm(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (pin !== user?.pin) {
      const message = t("PIN does not match this account.");
      toast(message);
      return setError(message);
    }
    setBusy(true);
    const payment = {
      holder: draft.holder.trim(),
      bank: draft.bank.trim(),
      routing: draft.routing.trim(),
      swift: draft.swift.trim(),
      account: draft.account.trim(),
      note: draft.note.trim(),
      amount,
      currency: draft.currency,
    };
    if (needsApproval(user!, total)) {
      addApproval({ ...payment, userId: user!.id });
      toast(t("Waiting for an admin to approve."));
      setHeld(true);
      setStep(2);
      return;
    }
    const failed = payTransfer(user!.id, payment);
    if (failed) {
      setBusy(false);
      return setError(t(failed));
    }
    toast(t("Transfer sent."));
    setRef(`BW-${Math.floor(100000 + Math.random() * 900000)}`);
    setStep(2);
  }

  if (step === 2) {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{t("Sent")}</p>
          <h1>{held ? t("Waiting for approval") : t("On its way.")}</h1>
          <p className="lede">
            {held
              ? t("Held for approval. An admin releases it from Approvals. Nothing has moved yet.")
              : t("{amount} to {holder}.", { amount: money(amount, draft.currency, locale), holder: draft.holder })}
            {held ? null : (
              <>
                {" "}
                {t("Reference")} <span className="mono">{ref}</span>.
              </>
            )}
          </p>
        </header>
        <div className="form-row">
          <Link className="btn btn-primary" href="/dashboard">
            {t("Back to dashboard")}
          </Link>
          {savedAlready || saved ? (
            <p className="muted">{t("Saved to recipients.")}</p>
          ) : (
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                addPayee({
                  userId: user.id,
                  holder: draft.holder.trim(),
                  bank: draft.bank.trim(),
                  routing: draft.routing.trim(),
                  swift: draft.swift.trim(),
                  account: draft.account.trim(),
                  currency: draft.currency,
                });
                setSaved(true);
              }}
            >
              {t("Save recipient")}
            </button>
          )}
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setDraft(blank);
              setPin("");
              setSaved(false);
              setHeld(false);
              setBusy(false);
              setRef("");
              setError("");
              setStep(0);
            }}
          >
            {t("New transfer")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Send")}</p>
        <h1>{step === 0 ? t("Recipient") : t("Confirm")}</h1>
        <p className="lede">
          {step === 0
            ? t("US routing number or SWIFT. The 1% fee is included before you confirm.")
            : t("Authorize with your PIN.")}
        </p>
      </header>

      {step === 0 ? (
        <form className="stack" onSubmit={review}>
          <div>
            <p className="kicker">{t("Saved recipients")}</p>
            {payees.length === 0 ? (
              <p className="muted">{t("Save a recipient after the first transfer.")}</p>
            ) : (
              <ul className="payee-list">
                {payees.map((payee) => {
                  const picked = draft.holder === payee.holder && draft.account === payee.account;
                  return (
                    <li key={payee.id}>
                      <button
                        type="button"
                        className="payee-pick"
                        aria-pressed={picked}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            holder: payee.holder,
                            country: countryOfBank(payee.bank),
                            bank: payee.bank,
                            routing: payee.routing,
                            swift: payee.swift,
                            account: payee.account,
                            currency: payee.currency,
                          }))
                        }
                      >
                        <strong>{payee.holder}</strong>
                        <span className="muted">
                          {payee.bank} · {payee.currency}
                        </span>
                      </button>
                      <button type="button" className="text-button" onClick={() => setDropPayee(payee.id)}>
                        {t("Remove")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <label className="field">
            <span>{t("Account holder")}</span>
            <input value={draft.holder} onChange={(event) => set("holder", event.target.value)} />
          </label>
          <BankFields
            country={draft.country}
            bank={draft.bank}
            onCountry={(code) => setDraft((current) => ({ ...current, country: code, bank: "", swift: "" }))}
            onBank={(name) =>
              setDraft((current) => ({ ...current, bank: name, swift: swiftOfBank(current.country, name) }))
            }
          />
          <div className="split">
            <label className="field">
              <span>{t("Routing number")}</span>
              <input value={draft.routing} onChange={(event) => set("routing", event.target.value)} />
              <p className="muted">{t("United States. 9 digits. Optional if you enter SWIFT.")}</p>
            </label>
            <label className="field">
              <span>{t("SWIFT")}</span>
              <input value={draft.swift} onChange={(event) => set("swift", event.target.value)} />
              <p className="muted">{t("International. Optional if you enter a routing number.")}</p>
            </label>
          </div>
          <label className="field">
            <span>{t("Account number")}</span>
            <input value={draft.account} onChange={(event) => set("account", event.target.value)} />
          </label>
          <label className="field">
            <span>{t("Description")}</span>
            <input value={draft.note} onChange={(event) => set("note", event.target.value)} />
          </label>
          <div className="split">
            <label className="field">
              <span>{t("Amount")}</span>
              <input inputMode="decimal" value={draft.amount} onChange={(event) => set("amount", event.target.value)} />
            </label>
            <label className="field">
              <span>{t("Currency")}</span>
              <CurrencySelect
                label={t("Currency")}
                value={draft.currency}
                options={MONEY.map((item) => ({
                  code: item.code,
                  label: t("{code} · available {amount}", {
                    code: item.code,
                    amount: money(user.balances[item.code], item.code, locale),
                  }),
                }))}
                onChange={(next) => set("currency", next as MoneyCode)}
              />
            </label>
          </div>
          <p className="muted ccy-code">
            <CurrencyFlag code={draft.currency} />
            {t("Fee {fee} · total debit {total}", {
              fee: money(fee, draft.currency, locale),
              total: money(Math.max(total, 0), draft.currency, locale),
            })}
          </p>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit">
            {t("Review transfer")}
          </button>
        </form>
      ) : (
        <form className="stack" onSubmit={confirm}>
          <dl className="sheet">
            <div>
              <dt>{t("Recipient")}</dt>
              <dd>{draft.holder}</dd>
            </div>
            <div>
              <dt>{t("Bank")}</dt>
              <dd>
                {draft.bank}
                {draft.swift ? ` · ${draft.swift}` : ""}
              </dd>
            </div>
            <div>
              <dt>{t("Account")}</dt>
              <dd className="mono">{draft.account}</dd>
            </div>
            <div>
              <dt>{t("Amount")}</dt>
              <dd>{money(amount, draft.currency, locale)}</dd>
            </div>
            <div>
              <dt>{t("Fee (1%)")}</dt>
              <dd>{money(fee, draft.currency, locale)}</dd>
            </div>
            <div>
              <dt>{t("Total debit")}</dt>
              <dd>{money(total, draft.currency, locale)}</dd>
            </div>
          </dl>
          <p className="muted">{t("PIN")}</p>
          <label className="field">
            <span>{t("PIN")}</span>
            <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value)} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-row">
            <button className="text-button" type="button" onClick={() => setStep(0)}>
              {t("Edit details")}
            </button>
            <BusyButton className="btn btn-primary" type="submit" busy={busy}>
              {t("Confirm transfer")}
            </BusyButton>
          </div>
        </form>
      )}
      <ConfirmDialog
        open={dropPayee !== null}
        title={t("Remove this recipient?")}
        body={t("{name} leaves the saved recipients.", {
          name: payees.find((item) => item.id === dropPayee)?.holder ?? "",
        })}
        confirmLabel={t("Remove")}
        onClose={() => setDropPayee(null)}
        onConfirm={() => {
          if (dropPayee) removePayee(dropPayee);
          setDropPayee(null);
        }}
      />
    </div>
  );
}
