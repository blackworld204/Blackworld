"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";
import { CurrencySelect } from "@/components/currency-select";
import { Glyph } from "@/components/glyph";
import { ReferralPanel } from "@/components/referral-panel";
import { toast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { MONEY, goalOf, money, patchUser, setGoal, when, type MoneyCode } from "@/lib/bank";
import { cardFaceClass } from "@/lib/card-look";

export default function DashboardPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [code, setCode] = useState<MoneyCode>("USD");
  const figuresLive = useRef(false);
  useEffect(() => {
    if (user?.displayCurrency) setCode(user.displayCurrency);
  }, [user?.displayCurrency]);
  if (!state || !user) return <div className="app-hold" />;

  const txs = state.txs.filter((tx) => tx.userId === user.id).slice(0, 4);
  const card = state.cards.find((item) => item.userId === user.id && item.primary) ?? state.cards.find((item) => item.userId === user.id);
  const income = state.txs
    .filter((tx) => tx.userId === user.id && tx.direction === "in" && tx.currency === code)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const expenses = state.txs
    .filter((tx) => tx.userId === user.id && tx.direction === "out" && tx.currency === code)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthSpend = state.txs
    .filter(
      (tx) =>
        tx.userId === user.id &&
        tx.direction === "out" &&
        tx.currency === code &&
        new Date(tx.at).getTime() >= monthStart.getTime(),
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
  const spendLimit = goalOf(user, code, "monthlyLimit");
  const savingsTarget = goalOf(user, code, "savingsTarget");
  const spendRatio = spendLimit > 0 ? Math.min(100, Math.round((monthSpend / spendLimit) * 100)) : 0;
  const savingsRatio = savingsTarget > 0 ? Math.min(100, Math.round((user.balances[code] / savingsTarget) * 100)) : 0;

  return (
    <div className="app-pad">
      <div className="desk">
        <header className="desk-hello">
          <div>
            <p className="kicker">{t("Welcome back")}</p>
            <h1>{user.name}</h1>
            <p className="desk-role">
              <span className={user.role === "admin" ? "admin-pill is-role" : "admin-pill"}>
                {user.role === "admin" ? t("Admin") : t("Member")}
              </span>
            </p>
          </div>
          {user.role === "admin" || user.canCreate ? (
            <div className="desk-admin">
              {user.role === "admin" ? (
                <Link className="btn btn-primary btn-sm" href="/dashboard/admin">
                  {t("Admin panel")}
                </Link>
              ) : null}
              <Link className="btn btn-sm" href="/dashboard/create">
                {t("Create account")}
              </Link>
            </div>
          ) : null}
        </header>
        <div className="filter-row">
          {(
            [
              ["/dashboard/schedule", "Schedule"],
              ["/dashboard/batch", "Batch"],
              ["/dashboard/approvals", "Approvals"],
              ...(user.role === "admin" ? [["/dashboard/team", "Team"]] : []),
              ["/dashboard/developers", "Developers"],
            ] as const
          ).map(([href, label]) => {
            const pending = state.approvals.filter(
              (item) => item.status === "pending" && (user.role === "admin" || item.userId === user.id),
            ).length;
            return (
              <Link key={href} className="btn btn-ghost btn-sm" href={href}>
                {t(label)}
                {label === "Approvals" && pending > 0 ? ` ${pending}` : ""}
              </Link>
            );
          })}
        </div>

        <div className="desk-stage">
          <section className="desk-balance">
            <div key={code} className={figuresLive.current ? "desk-figures is-live" : "desk-figures"}>
              <div className="desk-balance-top">
                <div>
                  <p className="kicker">{t("{code} balance", { code })}</p>
                  <p className="desk-figure">{money(user.balances[code], code, locale)}</p>
                </div>
                <label className="field desk-currency">
                  <span>{t("Currency")}</span>
                  <CurrencySelect
                    label={t("Currency")}
                    value={code}
                    options={MONEY.map((item) => ({ code: item.code, label: item.code }))}
                    onChange={(next) => {
                      figuresLive.current = true;
                      const picked = next as MoneyCode;
                      setCode(picked);
                      patchUser(user.id, { displayCurrency: picked });
                    }}
                  />
                </label>
              </div>
              <div className="desk-pair">
                <div>
                  <p className="kicker"><CurrencyFlag code={code} />{t("Money in")}</p>
                  <p className="panel-figure">{money(income, code, locale)}</p>
                </div>
                <div>
                  <p className="kicker"><CurrencyFlag code={code} />{t("Money out")}</p>
                  <p className="panel-figure">{money(expenses, code, locale)}</p>
                </div>
              </div>
              <p className="desk-note">{t("All activity in this currency. Money out includes transfer fees.")}</p>
            </div>
            <div className="desk-wallets">
              <p className="kicker">{t("Also held")}</p>
              <div>
                {MONEY.filter((item) => item.code !== code).map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      figuresLive.current = true;
                      setCode(item.code);
                      patchUser(user.id, { displayCurrency: item.code });
                    }}
                  >
                    <CurrencyFlag code={item.code} />
                    <span>{money(user.balances[item.code], item.code, locale)}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {card ? (
            <Link href="/dashboard/cards" className={`${cardFaceClass(card)} desk-card`}>
              <div>
                <p className="kicker">{card.frozen ? t("Frozen") : "Blackworld"}</p>
                <p className="card-number">•••• •••• •••• {card.last4}</p>
                <p className="muted">{card.holder}</p>
              </div>
              <span className="btn">{t("View details")}</span>
            </Link>
          ) : (
            <Link href="/dashboard/cards" className="desk-card desk-card-empty">
              <p className="kicker">{t("Cards")}</p>
              <span className="btn">{t("Issue a virtual card")}</span>
            </Link>
          )}
        </div>

        <nav className="quick" aria-label={t("Quick actions")}>
          <Link href="/dashboard/send">
            <Glyph name="send" />
            <span>{t("Send")}<small>{t("To a bank account")}</small></span>
          </Link>
          <Link href="/dashboard/deposit">
            <Glyph name="deposit" />
            <span>{t("Deposit")}<small>{t("Add funds")}</small></span>
          </Link>
          <Link href="/dashboard/cards">
            <Glyph name="card" />
            <span>{t("Cards")}<small>{t("View or freeze")}</small></span>
          </Link>
          <Link href="/dashboard/exchange">
            <Glyph name="exchange" />
            <span>{t("Exchange")}<small>{t("Convert currency")}</small></span>
          </Link>
          <Link href="/dashboard/support">
            <Glyph name="support" />
            <span>{t("Support")}<small>{t("Ask the desk")}</small></span>
          </Link>
        </nav>

        <div className="desk-lower">
          <section className="panel desk-activity">
            <header className="panel-head">
              <h2>{t("Recent activity")}</h2>
              <Link href="/dashboard/transactions">{t("View all")}</Link>
            </header>
            {txs.length === 0 ? (
              <p className="muted">{t("No activity yet.")}</p>
            ) : (
              <ul className="tx-list">
                {txs.map((tx) => (
                  <li key={tx.id}>
                    <span className="tx-main">
                      <span className={tx.direction === "in" ? "tx-mark" : "tx-mark is-out"}>
                        <Glyph name={tx.direction === "in" ? "in" : "out"} />
                      </span>
                      <div>
                        <strong>{t(tx.title)}</strong>
                        <span className="muted">
                          {tx.detail ? `${t(tx.detail)} · ` : ""}
                          {when(tx.at, locale)}
                        </span>
                      </div>
                    </span>
                    <span className={tx.direction === "in" ? "mono tx-in" : "mono"}>
                      <CurrencyFlag code={tx.currency} />
                      {tx.direction === "in" ? "+" : "−"}
                      {money(tx.amount, tx.currency, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="desk-goals">
            <section className="panel">
              <h2>{t("Savings goal")}</h2>
              <p className="meter-label">
                <span>{user.balances[code] >= savingsTarget && savingsTarget > 0 ? t("Reached") : `${savingsRatio}%`}</span>
                <span className="muted">
                  {t("{current} of {goal}", {
                    current: money(user.balances[code], code, locale),
                    goal: money(savingsTarget, code, locale),
                  })}
                </span>
              </p>
              <div className="meter" role="meter" aria-valuenow={savingsRatio} aria-valuemin={0} aria-valuemax={100} aria-label={t("Savings goal")}>
                <span style={{ width: `${savingsRatio}%` }} />
              </div>
              <GoalField
                key={`${code}-goal`}
                label={t("Target")}
                value={savingsTarget}
                onSave={(amount) => {
                  setGoal(user.id, "savingsTarget", code, amount);
                  toast(t("Savings target saved."));
                }}
              />
            </section>
            <section className="panel">
              <h2>{t("Monthly spending")}</h2>
              <p className="meter-label">
                <span>{spendRatio}%</span>
                <span className="muted">
                  {t("{spent} of {limit}", {
                    spent: money(monthSpend, code, locale),
                    limit: money(spendLimit, code, locale),
                  })}
                </span>
              </p>
              <div className="meter" role="meter" aria-valuenow={spendRatio} aria-valuemin={0} aria-valuemax={100} aria-label={t("Monthly spending")}>
                <span style={{ width: `${spendRatio}%` }} />
              </div>
              <GoalField
                key={`${code}-limit`}
                label={t("Spending limit")}
                value={spendLimit}
                onSave={(amount) => {
                  setGoal(user.id, "monthlyLimit", code, amount);
                  toast(t("Spending limit saved."));
                }}
              />
            </section>
          </div>
        </div>

        <ReferralPanel />

        <nav className="desk-links" aria-label={t("Need help?")}>
          <Link href="/dashboard/support">{t("Support center")}</Link>
          <Link href="/dashboard/statement">{t("Account statement")}</Link>
          <Link href="/dashboard/notifications">{t("Notifications")}</Link>
          <Link href="/dashboard/settings">{t("Settings")}</Link>
          {user.role === "admin" ? <Link href="/dashboard/admin">{t("User management")}</Link> : null}
        </nav>
      </div>
    </div>
  );
}

function GoalField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (amount: number) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState("");
  const [ask, setAsk] = useState(false);

  return (
    <form
      className="goal-row"
      onSubmit={(event) => {
        event.preventDefault();
        const amount = Number(draft);
        if (!Number.isFinite(amount) || amount < 0) {
          setError(t("Enter an amount of zero or more."));
          return;
        }
        setError("");
        setAsk(true);
      }}
    >
      <label className="field">
        <span>{label}</span>
        <input inputMode="decimal" value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
      <button className="btn btn-ghost btn-sm" type="submit">
        {t("Save")}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
      <ConfirmDialog
        open={ask}
        title={t("Save this target?")}
        body={t("The goal is saved on this account.")}
        confirmLabel={t("Save")}
        onClose={() => setAsk(false)}
        onConfirm={() => {
          setAsk(false);
          onSave(Number(draft));
        }}
      />
    </form>
  );
}
