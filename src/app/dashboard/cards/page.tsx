"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateSelect } from "@/components/date-select";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import {
  addCard,
  cardDraftError,
  removeCard,
  setCardFrozen,
  updateCard,
} from "@/lib/bank";
import { cardFaceClass } from "@/lib/card-look";

export default function CardsPage() {
  const { state, user } = useAccount();
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const [holder, setHolder] = useState("");
  const [last4, setLast4] = useState("");
  const [expiry, setExpiry] = useState("");
  const [kind, setKind] = useState<"virtual" | "physical">("virtual");
  const [primary, setPrimary] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<{
    id: string;
    last4: string;
    frozen: boolean;
    remove: boolean;
  } | null>(null);
  const [askSave, setAskSave] = useState(false);

  if (!state || !user) return <div className="app-hold" />;
  const cards = state.cards.filter((card) => card.userId === user.id);

  function resetForm() {
    setEditId(null);
    setHolder("");
    setLast4("");
    setExpiry("");
    setKind("virtual");
    setPrimary(false);
    setError("");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const failed = cardDraftError({ holder, last4, expiry });
    if (failed) return setError(t(failed));
    setError("");
    setAskSave(true);
  }

  function save() {
    if (!user) return;
    setAskSave(false);
    if (editId) {
      const current = cards.find((card) => card.id === editId);
      const failed = updateCard(user.id, editId, {
        holder,
        last4,
        expiry,
        kind,
        primary,
        spendLimit: current?.spendLimit ?? null,
      });
      if (failed) return toast(t(failed));
      toast(t("Card updated."));
    } else {
      addCard({
        userId: user.id,
        holder: holder.trim().toUpperCase(),
        last4,
        expiry,
        primary: primary || cards.length === 0,
        kind,
      });
      toast(t("Card added."));
    }
    resetForm();
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Cards")}</p>
        <h1>{t("Linked cards")}</h1>
        <p className="lede">{t("Cards on this account.")}</p>
      </header>
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
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-row">
          <button className="btn btn-primary" type="submit">
            {editId ? t("Save card") : t("Add card")}
          </button>
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
          if (ask.remove) {
            removeCard(user.id, ask.id);
            toast(t("Card removed."));
          } else {
            setCardFrozen(user.id, ask.id, !ask.frozen);
            toast(ask.frozen ? t("Card unfrozen.") : t("Card frozen."));
          }
          setAsk(null);
        }}
      />
      <ConfirmDialog
        open={askSave}
        title={editId ? t("Edit this card?") : t("Add this card?")}
        body={
          editId
            ? t("The card ending {last4} is updated.", { last4 })
            : t("The card ending {last4} is added to this account.", { last4 })
        }
        confirmLabel={editId ? t("Save card") : t("Add card")}
        onClose={() => setAskSave(false)}
        onConfirm={save}
      />
    </div>
  );
}
