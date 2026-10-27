"use client";

import { useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateSelect } from "@/components/date-select";
import { OtpDialog } from "@/components/otp-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import {
  cardDraftError,
  removeCard,
  setCardFrozen,
  updateCard,
} from "@/lib/bank";
import { cardFaceClass } from "@/lib/card-look";
import { postAccount } from "@/lib/flow-api";

export default function CardsPage() {
  const { state, user } = useAccount();
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const [holder, setHolder] = useState("");
  const [last4, setLast4] = useState("");
  const [expiry, setExpiry] = useState("");
  const [kind, setKind] = useState<"virtual" | "physical">("virtual");
  const [primary, setPrimary] = useState(false);
  const [pin, setPin] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<{
    id: string;
    last4: string;
    frozen: boolean;
    remove: boolean;
  } | null>(null);
  const [askSave, setAskSave] = useState(false);
  const [otp, setOtp] = useState<{ id: string; expiresAt: string } | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);

  if (!state || !user) return <div className="app-hold" />;
  const cards = state.cards.filter((card) => card.userId === user.id);
  const pendingCard = state.approvals.find(
    (item) => item.userId === user.id && item.kind === "card" && item.status === "pending" && item.otpExpiresAt,
  );

  function resetForm() {
    setEditId(null);
    setHolder("");
    setLast4("");
    setExpiry("");
    setKind("virtual");
    setPrimary(false);
    setPin("");
    setError("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const failed = cardDraftError({ holder, last4, expiry });
    if (failed) return setError(t(failed));
    if (!editId && pin !== user?.pin) {
      const message = t("PIN does not match this account.");
      toast(message);
      return setError(message);
    }
    setError("");
    setAskSave(true);
  }

  function save() {
    if (!user) return;
    setAskSave(false);
    if (editId) {
      void updateCard(user.id, editId, {
        holder,
        last4,
        expiry,
        kind,
        primary,
        spendLimit: cards.find((card) => card.id === editId)?.spendLimit ?? null,
      }).then((failed) => {
        if (failed) {
          toast(t(failed));
          return;
        }
        toast(t("Card updated."));
        resetForm();
      });
      return;
    }
    if (busy) return;
    setBusy(true);
    void postAccount<{ status?: string; id?: string; expiresAt?: string }>("cards", {
      holder: holder.trim().toUpperCase(),
      last4,
      expiry,
      kind,
      primary: primary || cards.length === 0,
    }).then((result) => {
      setBusy(false);
      if (result.error) {
        toast(t(result.error));
        setError(t(result.error));
        return;
      }
      if (result.body?.status === "pending" && result.body.id && result.body.expiresAt) {
        toast(t("For security purposes, get the OTP from an admin."));
        setOtp({ id: result.body.id, expiresAt: result.body.expiresAt });
        setOtpOpen(true);
        resetForm();
        return;
      }
      toast(t("Card added."));
      resetForm();
    });
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Cards")}</p>
        <h1>{t("Linked cards")}</h1>
        <p className="lede">{t("Cards on this account. Adding a card needs your PIN and an admin OTP.")}</p>
      </header>
      {pendingCard ? (
        <div className="otp-flow-actions" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setOtp({ id: pendingCard.id, expiresAt: pendingCard.otpExpiresAt! });
              setOtpOpen(true);
            }}
          >
            {t("Get OTP from admin")}
          </button>
          <p className="muted" style={{ flex: "1 1 100%", margin: 0 }}>
            {t("For security purposes, get the OTP from an admin to finish adding this card.")}
          </p>
        </div>
      ) : null}
      {cards.length === 0 ? (
        <p className="muted">{t("No cards yet.")}</p>
      ) : null}
      <div className="card-grid">
        {cards.map((card) => {
          const shown = open === card.id;
          return (
            <article key={card.id} className={cardFaceClass(card)}>
              <div>
                <p className="kicker">
                  {card.kind === "physical" ? t("Physical") : t("Virtual")}
                  {card.primary ? ` · ${t("Primary")}` : ""}
                  {card.frozen ? ` · ${t("Frozen")}` : ""}
                </p>
                <p className="card-number">•••• •••• •••• {card.last4}</p>
                <p className="muted">
                  {card.holder} · {shown ? card.expiry : "••/••"}
                </p>
              </div>
              <div className="user-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setOpen(shown ? null : card.id)}
                >
                  {shown ? t("Hide") : t("View details")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setEditId(card.id);
                    setHolder(card.holder);
                    setLast4(card.last4);
                    setExpiry(card.expiry);
                    setKind(card.kind === "physical" ? "physical" : "virtual");
                    setPrimary(card.primary);
                    setPin("");
                    setError("");
                  }}
                >
                  {t("Edit")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setAsk({
                      id: card.id,
                      last4: card.last4,
                      frozen: Boolean(card.frozen),
                      remove: false,
                    })
                  }
                >
                  {card.frozen ? t("Unfreeze") : t("Freeze")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setAsk({
                      id: card.id,
                      last4: card.last4,
                      frozen: Boolean(card.frozen),
                      remove: true,
                    })
                  }
                >
                  {t("Remove")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <form className="stack" onSubmit={submit}>
        <h2>{editId ? t("Edit card") : t("Add a card")}</h2>
        <label className="field">
          <span>{t("Name on card")}</span>
          <input
            value={holder}
            onChange={(event) => setHolder(event.target.value)}
          />
        </label>
        <div className="split">
          <label className="field">
            <span>{t("Last 4")}</span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={last4}
              onChange={(event) => setLast4(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("Expiry")}</span>
            <DateSelect kind="month" value={expiry} onChange={setExpiry} />
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
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {t(label)}
            </button>
          ))}
        </div>
        <label className="choice-line">
          <input
            type="checkbox"
            checked={primary || (!editId && cards.length === 0)}
            onChange={(event) => setPrimary(event.target.checked)}
          />
          <span>{t("Primary")}</span>
        </label>
        {!editId ? (
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
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-row">
          <BusyButton className="btn btn-primary" type="submit" busy={busy}>
            {editId ? t("Save card") : t("Add card")}
          </BusyButton>
          {editId ? (
            <button className="btn btn-ghost" type="button" onClick={resetForm}>
              {t("Cancel")}
            </button>
          ) : null}
        </div>
      </form>
      <ConfirmDialog
        open={ask !== null}
        title={
          ask?.remove
            ? t("Remove this card?")
            : ask?.frozen
              ? t("Unfreeze this card?")
              : t("Freeze this card?")
        }
        body={
          ask?.remove
            ? t("The card ending {last4} leaves this account.", {
                last4: ask.last4,
              })
            : ask?.frozen
              ? t("Card deposits can use the card ending {last4} again.", {
                  last4: ask.last4,
                })
              : t(
                  "Card deposits stop until you unfreeze the card ending {last4}.",
                  { last4: ask?.last4 ?? "" },
                )
        }
        confirmLabel={
          ask?.remove ? t("Remove") : ask?.frozen ? t("Unfreeze") : t("Freeze")
        }
        onClose={() => setAsk(null)}
        onConfirm={() => {
          if (!ask) return;
          const choice = ask;
          setAsk(null);
          const run = choice.remove
            ? removeCard(user.id, choice.id)
            : setCardFrozen(user.id, choice.id, !choice.frozen);
          void run.then((failed) => {
            if (failed) {
              toast(t(failed));
              return;
            }
            toast(
              choice.remove
                ? t("Card removed.")
                : choice.frozen
                  ? t("Card unfrozen.")
                  : t("Card frozen."),
            );
          });
        }}
      />
      <ConfirmDialog
        open={askSave}
        title={editId ? t("Edit this card?") : t("Add this card?")}
        body={
          editId
            ? t("The card ending {last4} is updated.", { last4 })
            : t("The card ending {last4} waits for an admin OTP.", { last4 })
        }
        confirmLabel={editId ? t("Save card") : t("Add card")}
        onClose={() => setAskSave(false)}
        onConfirm={save}
      />
      <OtpDialog
        open={otpOpen && otp !== null}
        approvalId={otp?.id ?? null}
        expiresAt={otp?.expiresAt ?? null}
        title={t("Get OTP from admin")}
        body={t("For security purposes, get the 6-digit OTP from an admin. This security check expires in 24 hours.")}
        onClose={() => setOtpOpen(false)}
        onVerified={() => {
          setOtpOpen(false);
          setOtp(null);
          toast(t("Card added."));
        }}
      />
    </div>
  );
}
