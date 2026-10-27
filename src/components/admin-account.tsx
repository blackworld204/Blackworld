"use client";

import { useEffect, useRef, useState } from "react";
import { AccountPhoto } from "@/components/account-photo";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { CurrencyFlag } from "@/components/currency-flag";
import { DateSelect } from "@/components/date-select";
import { OtpIssuedDialog } from "@/components/otp-issued-dialog";
import { ReceiptDialog } from "@/components/receipt-dialog";
import { toast } from "@/components/toast";
import { useI18n } from "@/i18n/provider";
import {
  addCard,
  cancelSchedule,
  cardDraftError,
  cardSpendAmount,
  currencyLabel,
  decideApproval,
  money,
  removeCard,
  removePayee,
  setApprovalLimit,
  setCardFrozen,
  updateCard,
  when,
  type BankState,
  type BankTx,
  type BankUser,
} from "@/lib/bank";
import { cardFaceClass } from "@/lib/card-look";
import { listedCurrencies } from "@/lib/currencies";
import { postAccount } from "@/lib/flow-api";
import { formatAmountInput, parseAmount } from "@/lib/money-input";
import { findTxForNote } from "@/lib/receipt";

type Ask =
  | { kind: "freeze"; id: string; last4: string; frozen: boolean }
  | { kind: "card"; id: string; last4: string }
  | { kind: "add" }
  | { kind: "edit"; id: string; last4: string }
  | { kind: "schedule"; id: string; holder: string }
  | { kind: "payee"; id: string; holder: string }
  | { kind: "approval"; id: string; approve: boolean; holder: string; total: string }
  | { kind: "otp"; id: string; holder: string; code: string }
  | { kind: "limit"; amount: string };

const blankCard: {
  id: string;
  holder: string;
  last4: string;
  expiry: string;
  kind: "virtual" | "physical";
  primary: boolean;
  spend: string;
} = { id: "", holder: "", last4: "", expiry: "", kind: "virtual", primary: false, spend: "" };

export function AdminAccount({
  admin,
  subject,
  state,
  focusNoteId = null,
  focusApprovalId = null,
  onFocusHandled,
  onBack,
  onCredit,
  onNotice,
  onStatus,
  onAccess,
  onRole,
  onRemove,
}: {
  admin: BankUser;
  subject: BankUser;
  state: BankState;
  focusNoteId?: string | null;
  focusApprovalId?: string | null;
  onFocusHandled?: () => void;
  onBack: () => void;
  onCredit: () => void;
  onNotice: () => void;
  onStatus: () => void;
  onAccess: () => void;
  onRole: () => void;
  onRemove: () => void;
}) {
  const { t, locale } = useI18n();
  const [ask, setAsk] = useState<Ask | null>(null);
  const [receipt, setReceipt] = useState<BankTx | null>(null);
  const [cardForm, setCardForm] = useState(blankCard);
  const [cardError, setCardError] = useState("");
  const [limit, setLimit] = useState(String(subject.approvalLimit ?? 10000));
  const [highlightNoteId, setHighlightNoteId] = useState<string | null>(null);
  const [highlightApprovalId, setHighlightApprovalId] = useState<string | null>(null);
  useEffect(() => {
    setLimit(formatAmountInput(String(subject.approvalLimit ?? 10000)));
  }, [subject.id, subject.approvalLimit]);

  const focusHandledRef = useRef(onFocusHandled);
  focusHandledRef.current = onFocusHandled;

  useEffect(() => {
    if (!focusNoteId && !focusApprovalId) return;
    const noteId = focusNoteId;
    const approvalId = focusApprovalId;
    const timer = window.setTimeout(() => {
      const noteEl = noteId ? document.getElementById(`admin-note-${noteId}`) : null;
      const approvalEl = approvalId ? document.getElementById(`admin-approval-${approvalId}`) : null;
      const target = noteEl ?? approvalEl;
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        if (noteId) setHighlightNoteId(noteId);
        if (approvalId) setHighlightApprovalId(approvalId);
      }
      focusHandledRef.current?.();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [subject.id, focusNoteId, focusApprovalId]);

  useEffect(() => {
    if (!highlightNoteId && !highlightApprovalId) return;
    const timer = window.setTimeout(() => {
      setHighlightNoteId(null);
      setHighlightApprovalId(null);
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [highlightNoteId, highlightApprovalId]);
  const cards = state.cards.filter((item) => item.userId === subject.id);
  const txs = state.txs.filter((item) => item.userId === subject.id);
  const schedules = state.schedules.filter((item) => item.userId === subject.id);
  const approvals = state.approvals.filter((item) => item.userId === subject.id);
  const payees = state.payees.filter((item) => item.userId === subject.id);
  const referrals = state.referrals.filter((item) => item.userId === subject.id);
  const notes = state.notes.filter((item) => item.userId === subject.id);
  const self = admin.id === subject.id;
  const address = subject.address
    ? [subject.address.street, subject.address.city, subject.address.zip, subject.address.country].filter(Boolean).join(", ")
    : "";

  function submitCard(event: React.FormEvent) {
    event.preventDefault();
    const failed = cardDraftError(cardForm);
    if (failed) return setCardError(t(failed));
    const spend = cardSpendAmount(cardForm.spend);
    if ("error" in spend) return setCardError(t(spend.error));
    setCardError("");
    if (cardForm.id) setAsk({ kind: "edit", id: cardForm.id, last4: cardForm.last4 });
    else setAsk({ kind: "add" });
  }

  function apply() {
    if (!ask) return;
    const choice = ask;
    setAsk(null);
    if (choice.kind === "add") {
      const spend = cardSpendAmount(cardForm.spend);
      if ("error" in spend) {
        toast(t(spend.error));
        return;
      }
      void addCard({
        userId: subject.id,
        holder: cardForm.holder.trim().toUpperCase(),
        last4: cardForm.last4,
        expiry: cardForm.expiry,
        primary: cardForm.primary || cards.length === 0,
        kind: cardForm.kind,
        spendLimit: spend.amount ?? undefined,
      }).then((failed) => {
        if (failed) {
          toast(t(failed));
          return;
        }
        setCardForm(blankCard);
        setCardError("");
        toast(t("Card added."));
      });
      return;
    }
    if (choice.kind === "edit") {
      const spend = cardSpendAmount(cardForm.spend);
      if ("error" in spend) {
        toast(t(spend.error));
        return;
      }
      void updateCard(subject.id, choice.id, {
        holder: cardForm.holder,
        last4: cardForm.last4,
        expiry: cardForm.expiry,
        kind: cardForm.kind,
        primary: cardForm.primary,
        spendLimit: spend.amount,
      }).then((failed) => {
        if (failed) {
          toast(t(failed));
          return;
        }
        setCardForm(blankCard);
        setCardError("");
        toast(t("Card updated."));
      });
      return;
    }
    if (choice.kind === "freeze") {
      void setCardFrozen(subject.id, choice.id, !choice.frozen).then((failed) => {
        if (failed) {
          toast(t(failed));
          return;
        }
        toast(choice.frozen ? t("Card unfrozen.") : t("Card frozen."));
      });
      return;
    }
    if (choice.kind === "card") {
      void removeCard(subject.id, choice.id).then((failed) => {
        if (failed) {
          toast(t(failed));
          return;
        }
        toast(t("Card removed."));
      });
      return;
    }
    if (choice.kind === "schedule") {
      cancelSchedule(choice.id);
      toast(t("Cancelled."));
      return;
    }
    if (choice.kind === "payee") {
      removePayee(choice.id);
      return;
    }
    if (choice.kind === "limit") {
      const failed = setApprovalLimit(subject.id, parseAmount(choice.amount));
      if (failed) {
        toast(t(failed));
        return;
      }
      toast(t("Approval limit saved."));
      return;
    }
    if (choice.kind === "otp") return;
    void postAccount("approvals/" + choice.id, { approve: choice.approve }).then((result) => {
      if (result.status === 404) {
        const failed = decideApproval(choice.id, admin.id, choice.approve);
        if (failed) {
          toast(t(failed));
          return;
        }
      } else if (result.error) {
        toast(t(result.error));
        return;
      }
      toast(choice.approve ? t("Approved.") : t("Declined."));
    });
  }

  return (
    <div className="admin-file">
      <button type="button" className="admin-back" onClick={onBack}>
        {t("User management")}
      </button>
      <header className="admin-file-head">
        <div className="admin-file-person">
          <AccountPhoto
            userId={subject.id}
            name={subject.name}
            photo={subject.photo}
            hasPhoto={subject.hasPhoto}
            viewable
          />
          <div>
            <h2>{subject.name}</h2>
            <p className="admin-file-meta">
              {subject.email}
              {subject.phone ? ` · ${subject.phone}` : ""}
              {" · "}
              {t("Member since {date}.", { date: subject.memberSince })}
            </p>
            <div className="admin-pills">
              <span className={subject.status === "active" ? "admin-pill is-on" : "admin-pill is-off"}>
                {subject.status === "active" ? t("Active") : t("Inactive")}
              </span>
              <span className={subject.role === "admin" ? "admin-pill is-role" : "admin-pill"}>
                {subject.role === "admin" ? t("Admin") : t("Member")}
              </span>
              <span className={subject.canCreate ? "admin-permit is-yes" : "admin-permit"}>
                {subject.canCreate ? t("Can create") : t("No access")}
              </span>
            </div>
          </div>
        </div>
        <div className="admin-file-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={onCredit}>
            {t("Edit balance")}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onNotice}>
            {t("Send notice")}
          </button>
          {self ? null : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onStatus}>
              {subject.status === "active" ? t("Set inactive") : t("Set active")}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onAccess}>
            {subject.canCreate ? t("Remove create") : t("Allow create")}
          </button>
          {self ? null : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRole}>
              {subject.role === "admin" ? t("Make member") : t("Make admin")}
            </button>
          )}
          {self || subject.role !== "member" ? null : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove}>
              {t("Remove")}
            </button>
          )}
        </div>
      </header>

      <section className="admin-section">
        <h3>{t("Account")}</h3>
        <dl className="admin-facts">
          {listedCurrencies(subject.balances).map((item) => (
            <div key={item.code}>
              <dt>{currencyLabel(item.code)}</dt>
              <dd className="mono">{money(subject.balances[item.code], item.code, locale)}</dd>
            </div>
          ))}
          <div>
            <dt>{t("Approval limit")}</dt>
            <dd className="mono">{money(subject.approvalLimit ?? 10000, "USD", locale)}</dd>
          </div>
          {address ? (
            <div>
              <dt>{t("Address")}</dt>
              <dd>{address}</dd>
            </div>
          ) : null}
        </dl>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const value = parseAmount(limit);
            if (!Number.isFinite(value) || value < 0) {
              toast(t("Enter an amount of zero or more."));
              return;
            }
            setAsk({ kind: "limit", amount: limit });
          }}
        >
          <label className="field">
            <span>{t("Approval limit")}</span>
            <input inputMode="decimal" value={limit} onChange={(event) => setLimit(formatAmountInput(event.target.value))} />
          </label>
          <button className="btn btn-ghost btn-sm" type="submit">
            {t("Save limit")}
          </button>
        </form>
      </section>

      <section className="admin-section">
        <h3>{t("Cards")}</h3>
        {cards.length === 0 ? <p className="muted">{t("No cards yet.")}</p> : null}
        <div className="card-grid">
          {cards.map((card) => (
            <article key={card.id} className={cardFaceClass(card)}>
              <div>
                <p className="kicker">
                  {card.kind === "physical" ? t("Physical") : t("Virtual")}
                  {card.primary ? ` · ${t("Primary")}` : ""}
                  {card.frozen ? ` · ${t("Frozen")}` : ""}
                </p>
                <p className="card-number">•••• •••• •••• {card.last4}</p>
                <p className="muted">
                  {card.holder} · {card.expiry}
                  {typeof card.spendLimit === "number" ? ` · ${t("Spend limit {amount}", { amount: money(card.spendLimit, "USD", locale) })}` : ""}
                </p>
              </div>
              <div className="user-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setCardError("");
                    setCardForm({
                      id: card.id,
                      holder: card.holder,
                      last4: card.last4,
                      expiry: card.expiry,
                      kind: card.kind === "physical" ? "physical" : "virtual",
                      primary: card.primary,
                      spend: typeof card.spendLimit === "number" ? String(card.spendLimit) : "",
                    });
                  }}
                >
                  {t("Edit")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setAsk({ kind: "freeze", id: card.id, last4: card.last4, frozen: Boolean(card.frozen) })}
                >
                  {card.frozen ? t("Unfreeze") : t("Freeze")}
                </button>
                <button type="button" className="text-button" onClick={() => setAsk({ kind: "card", id: card.id, last4: card.last4 })}>
                  {t("Remove")}
                </button>
              </div>
            </article>
          ))}
        </div>
        <form className="stack" onSubmit={submitCard}>
          <h2>{cardForm.id ? t("Edit card") : t("Add a card")}</h2>
          <label className="field">
            <span>{t("Name on card")}</span>
            <input value={cardForm.holder} onChange={(event) => setCardForm({ ...cardForm, holder: event.target.value })} />
          </label>
          <div className="split">
            <label className="field">
              <span>{t("Last 4")}</span>
              <input
                inputMode="numeric"
                maxLength={4}
                value={cardForm.last4}
                onChange={(event) => setCardForm({ ...cardForm, last4: event.target.value })}
              />
            </label>
            <label className="field">
              <span>{t("Expiry")}</span>
              <DateSelect kind="month" value={cardForm.expiry} onChange={(expiry) => setCardForm({ ...cardForm, expiry })} />
            </label>
          </div>
          <div className="filter-row" role="group" aria-label={t("Card type")}>
            {(
              [
                ["virtual", "Virtual"],
                ["physical", "Physical"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className="btn btn-ghost btn-sm"
                aria-pressed={cardForm.kind === value}
                onClick={() => setCardForm({ ...cardForm, kind: value })}
              >
                {t(label)}
              </button>
            ))}
          </div>
          <label className="field">
            <span>{t("Spend limit")}</span>
            <input
              inputMode="decimal"
              value={cardForm.spend}
              placeholder={t("No limit")}
              onChange={(event) => setCardForm({ ...cardForm, spend: formatAmountInput(event.target.value) })}
            />
          </label>
          <label className="choice-line">
            <input
              type="checkbox"
              checked={cardForm.primary || (!cardForm.id && cards.length === 0)}
              onChange={(event) => setCardForm({ ...cardForm, primary: event.target.checked })}
            />
            <span>{t("Primary")}</span>
          </label>
          {cardError ? <p className="form-error">{cardError}</p> : null}
          <div className="form-row">
            <button className="btn btn-primary" type="submit">
              {cardForm.id ? t("Save card") : t("Add card")}
            </button>
            {cardForm.id ? (
              <button className="btn btn-ghost" type="button" onClick={() => { setCardForm(blankCard); setCardError(""); }}>
                {t("Cancel")}
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="admin-section">
        <h3>{t("Transactions")}</h3>
        {txs.length === 0 ? <p className="muted">{t("No transactions found.")}</p> : null}
        <ul className="tx-list">
          {txs.map((tx) => (
            <li key={tx.id}>
              <button type="button" className="tx-button" onClick={() => setReceipt(tx)}>
                <span className="tx-main">
                  <div>
                    <strong>{t(tx.title)}</strong>
                    <span className="muted">
                      {tx.detail} · {when(tx.at, locale)}
                    </span>
                  </div>
                </span>
                <span className={tx.direction === "in" ? "mono tx-in" : "mono"}>
                  <CurrencyFlag code={tx.currency} />
                  {tx.direction === "in" ? "+" : "−"}
                  {money(tx.amount, tx.currency, locale)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-section">
        <h3>{t("Schedule")}</h3>
        {schedules.length === 0 ? <p className="muted">{t("No scheduled transfers.")}</p> : null}
        <ul className="tx-list">
          {schedules.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.holder}</strong>
                <span className="muted">
                  {item.runOn} · {t(item.status === "scheduled" ? "Scheduled" : item.status === "paid" ? "Paid" : item.status === "failed" ? "Failed" : "Held for approval")}
                </span>
              </div>
              <span className="mono">{money(item.amount, item.currency, locale)}</span>
              {item.status === "scheduled" ? (
                <button type="button" className="text-button" onClick={() => setAsk({ kind: "schedule", id: item.id, holder: item.holder })}>
                  {t("Cancel")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-section">
        <h3>{t("Approvals")}</h3>
        {approvals.length === 0 ? <p className="muted">{t("Nothing is waiting.")}</p> : null}
        <ul className="tx-list">
          {approvals.map((item) => (
            <li
              key={item.id}
              id={`admin-approval-${item.id}`}
              className={highlightApprovalId === item.id ? "admin-focus-target is-focused" : undefined}
            >
              <div>
                <strong>{item.holder}</strong>
                <span className="muted">
                  {t(
                    item.status === "pending"
                      ? "Pending"
                      : item.status === "approved"
                        ? "Approved"
                        : item.status === "expired"
                          ? "Expired"
                          : "Declined",
                  )}{" "}
                  · {when(item.at, locale)}
                </span>
                {item.otpCode ? (
                  <span className="approval-otp-chip">
                    <span className="muted">{t("OTP")}</span>
                    <span className="mono approval-otp-value">{item.otpCode}</span>
                    <CopyButton value={item.otpCode} label="Copy" />
                  </span>
                ) : null}
              </div>
              <span className="mono">
                {money(
                  item.kind === "card"
                    ? 0
                    : item.kind === "deposit"
                      ? Math.max(0, item.amount - item.fee)
                      : item.amount + item.fee,
                  item.currency,
                  locale,
                )}
              </span>
              {item.status === "pending" ? (
                <div className="user-actions">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      void postAccount<{ code?: string; error?: string }>(`approvals/${item.id}/otp`, {}).then(
                        (result) => {
                          if (result.error) {
                            toast(t(result.error));
                            return;
                          }
                          const code = result.body?.code;
                          if (!code) {
                            toast(t(result.body?.error || "The request failed."));
                            return;
                          }
                          setAsk({ kind: "otp", id: item.id, holder: item.holder, code });
                          toast(t("OTP created."));
                        },
                      );
                    }}
                  >
                    {item.otpCode ? t("New OTP") : t("Create OTP")}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setAsk({
                        kind: "approval",
                        id: item.id,
                        approve: false,
                        holder: item.holder,
                        total: money(
                          item.kind === "deposit" ? Math.max(0, item.amount - item.fee) : item.amount + item.fee,
                          item.currency,
                          locale,
                        ),
                      })
                    }
                  >
                    {t("Decline")}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-section">
        <h3>{t("Saved recipients")}</h3>
        {payees.length === 0 ? <p className="muted">{t("Save a recipient after the first transfer.")}</p> : null}
        <ul className="tx-list">
          {payees.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.holder}</strong>
                <span className="muted">
                  {item.bank} · {item.account}
                  {item.routing ? ` · ${item.routing}` : ""}
                  {item.swift ? ` · ${item.swift}` : ""}
                </span>
              </div>
              <button type="button" className="text-button" onClick={() => setAsk({ kind: "payee", id: item.id, holder: item.holder })}>
                {t("Remove")}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-section">
        <h3>{t("Refer and earn")}</h3>
        {referrals.length === 0 ? <p className="muted">{t("No referrals yet.")}</p> : null}
        <ul className="tx-list">
          {referrals.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.company}</strong>
                <span className="muted">
                  {item.email} · {t(item.status === "earned" ? "Earned" : "Invited")}
                </span>
              </div>
              <span className="mono">{money(item.reward, "USD", locale)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-section">
        <h3>{t("Notifications")}</h3>
        {notes.length === 0 ? <p className="muted">{t("No notifications.")}</p> : null}
        <ul className="tx-list">
          {notes.map((item) => {
            const linked = findTxForNote(state, item);
            const focused = highlightNoteId === item.id;
            return (
              <li
                key={item.id}
                id={`admin-note-${item.id}`}
                className={focused ? "admin-focus-target is-focused" : undefined}
              >
                {linked ? (
                  <button type="button" className="tx-button" onClick={() => setReceipt(linked)}>
                    <span className="tx-main">
                      <div>
                        <strong>{item.title}</strong>
                        <span className="muted">
                          {item.body} · {when(item.at, locale)}
                        </span>
                      </div>
                    </span>
                  </button>
                ) : (
                  <div>
                    <strong>{item.title}</strong>
                    <span className="muted">
                      {item.body} · {when(item.at, locale)}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <OtpIssuedDialog
        open={ask?.kind === "otp"}
        holder={ask?.kind === "otp" ? ask.holder : ""}
        code={ask?.kind === "otp" ? ask.code : ""}
        onClose={() => setAsk(null)}
      />
      <ConfirmDialog
        open={ask !== null && ask.kind !== "otp"}
        title={
          ask?.kind === "freeze"
            ? ask.frozen
              ? t("Unfreeze this card?")
              : t("Freeze this card?")
            : ask?.kind === "add"
              ? t("Add this card?")
              : ask?.kind === "edit"
                ? t("Edit this card?")
            : ask?.kind === "card"
              ? t("Remove this card?")
              : ask?.kind === "schedule"
                ? t("Cancel this transfer?")
                : ask?.kind === "payee"
                  ? t("Remove this recipient?")
                  : ask?.kind === "approval"
                    ? ask.approve
                      ? t("Approve this transfer?")
                      : t("Decline this transfer?")
                    : ask?.kind === "limit"
                      ? t("Save this account’s approval limit?")
                      : ""
        }
        body={
          ask?.kind === "freeze"
            ? ask.frozen
              ? t("Card deposits can use the card ending {last4} again.", { last4: ask.last4 })
              : t("Card deposits stop until you unfreeze the card ending {last4}.", { last4: ask.last4 })
            : ask?.kind === "add"
              ? t("The card ending {last4} is added to this account.", { last4: cardForm.last4 })
              : ask?.kind === "edit"
                ? t("The card ending {last4} is updated.", { last4: ask.last4 })
            : ask?.kind === "card"
              ? t("The card ending {last4} leaves this account.", { last4: ask.last4 })
              : ask?.kind === "schedule"
                ? t("The payment to {holder} will not run.", { holder: ask.holder })
                : ask?.kind === "payee"
                  ? ask.holder
                  : ask?.kind === "approval"
                    ? ask.approve
                      ? t("{amount} to {holder} will be sent.", { amount: ask.total, holder: ask.holder })
                      : t("The transfer to {holder} stays off the balance.", { holder: ask.holder })
                    : ask?.kind === "limit"
                      ? t("Transfers above this amount wait for approval.")
                      : ""
        }
        confirmLabel={
          ask?.kind === "freeze"
            ? ask.frozen
              ? t("Unfreeze")
              : t("Freeze")
            : ask?.kind === "add"
              ? t("Add card")
              : ask?.kind === "edit"
                ? t("Save card")
            : ask?.kind === "card" || ask?.kind === "payee"
              ? t("Remove")
              : ask?.kind === "schedule"
                ? t("Cancel transfer")
                : ask?.kind === "approval"
                  ? ask.approve
                    ? t("Approve")
                    : t("Decline")
                  : ask?.kind === "limit"
                    ? t("Save limit")
                    : t("Confirm")
        }
        onClose={() => setAsk(null)}
        onConfirm={apply}
      />
      <ReceiptDialog
        tx={receipt}
        name={subject.name}
        email={subject.email}
        onClose={() => setReceipt(null)}
      />
    </div>
  );
}
