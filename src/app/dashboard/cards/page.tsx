"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { addCard, removeCard, setCardFrozen } from "@/lib/bank";
import { cardFaceClass } from "@/lib/card-look";

export default function CardsPage() {
  const { state, user } = useAccount();
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const [holder, setHolder] = useState("");
  const [last4, setLast4] = useState("");
  const [expiry, setExpiry] = useState("");
  const [kind, setKind] = useState<"virtual" | "physical">("virtual");
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<{ id: string; last4: string; frozen: boolean; remove: boolean } | null>(null);

  if (!state || !user) return <div className="app-hold" />;
  const cards = state.cards.filter((card) => card.userId === user.id);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (holder.trim().length < 2) return setError(t("Enter the name on the card."));
    if (!/^\d{4}$/.test(last4)) return setError(t("Enter the last 4 digits."));
    if (!/^\d{2}\/\d{2}$/.test(expiry)) return setError(t("Use expiry as MM/YY."));
    const month = Number(expiry.slice(0, 2));
    if (month < 1 || month > 12) return setError(t("Use expiry as MM/YY."));
    addCard({
      userId: user!.id,
      holder: holder.trim().toUpperCase(),
      last4,
      expiry,
      primary: cards.length === 0,
      kind,
    });
    setHolder("");
    setLast4("");
    setExpiry("");
    setKind("virtual");
    setError("");
    toast(t("Card added."));
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Cards")}</p>
        <h1>{t("Linked cards")}</h1>
        <p className="lede">{t("Cards on this account.")}</p>
      </header>
      {cards.length === 0 ? <p className="muted">{t("No cards yet.")}</p> : null}
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
                <button type="button" className="text-button" onClick={() => setOpen(shown ? null : card.id)}>
                  {shown ? t("Hide") : t("View details")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setAsk({ id: card.id, last4: card.last4, frozen: Boolean(card.frozen), remove: false })}
                >
                  {card.frozen ? t("Unfreeze") : t("Freeze")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setAsk({ id: card.id, last4: card.last4, frozen: Boolean(card.frozen), remove: true })}
                >
                  {t("Remove")}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <form className="stack" onSubmit={submit}>
        <h2>{t("Add a card")}</h2>
        <label className="field">
          <span>{t("Name on card")}</span>
          <input value={holder} onChange={(event) => setHolder(event.target.value)} />
        </label>
        <div className="split">
          <label className="field">
            <span>{t("Last 4")}</span>
            <input inputMode="numeric" maxLength={4} value={last4} onChange={(event) => setLast4(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("Expiry")}</span>
            <input placeholder={t("MM/YY")} value={expiry} onChange={(event) => setExpiry(event.target.value)} />
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
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-primary" type="submit">
          {t("Add card")}
        </button>
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
            ? t("The card ending {last4} leaves this account.", { last4: ask.last4 })
            : ask?.frozen
              ? t("Card deposits can use the card ending {last4} again.", { last4: ask.last4 })
              : t("Card deposits stop until you unfreeze the card ending {last4}.", { last4: ask?.last4 ?? "" })
        }
        confirmLabel={ask?.remove ? t("Remove") : ask?.frozen ? t("Unfreeze") : t("Freeze")}
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
    </div>
  );
}
