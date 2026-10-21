"use client";

import { useMemo, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";
import { Glyph } from "@/components/glyph";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { downloadCsv } from "@/lib/csv";
import { MONEY, localeTag, money, when, type BankTx, type MoneyCode } from "@/lib/bank";

export default function TransactionsPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<"all" | "in" | "out">("all");
  const [currency, setCurrency] = useState<"all" | MoneyCode>("all");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!state || !user) return [];
    const q = query.trim().toLowerCase();
    return state.txs.filter(
      (tx) =>
        tx.userId === user.id &&
        (direction === "all" || tx.direction === direction) &&
        (currency === "all" || tx.currency === currency) &&
        (!q || tx.title.toLowerCase().includes(q) || tx.detail.toLowerCase().includes(q)),
    );
  }, [state, user, query, direction, currency]);

  if (!state || !user) return <div className="app-hold" />;

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Activity")}</p>
        <h1>{t("Transactions")}</h1>
        <p className="lede">{t("Search by title or note. Transfer fees appear on their own line. Everything here stays in this browser.")}</p>
      </header>
      <label className="field">
        <span>{t("Search")}</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="filter-row" role="group" aria-label={t("Direction")}>
        {(
          [
            ["all", "All"],
            ["in", "Money in"],
            ["out", "Money out"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className="btn btn-ghost btn-sm"
            aria-pressed={direction === value}
            onClick={() => setDirection(value)}
          >
            {t(label)}
          </button>
        ))}
      </div>
      <div className="filter-row tx-currencies" role="group" aria-label={t("Currency")}>
        <button type="button" className="btn btn-ghost btn-sm" aria-pressed={currency === "all"} onClick={() => setCurrency("all")}>
          {t("All")}
        </button>
        {MONEY.map((item) => (
          <button
            key={item.code}
            type="button"
            className="btn btn-ghost btn-sm"
            aria-pressed={currency === item.code}
            onClick={() => setCurrency(item.code)}
          >
            {item.code}
          </button>
        ))}
      </div>
      <button
        className="btn btn-ghost btn-sm"
        type="button"
        onClick={() =>
          downloadCsv("blackworld-activity.csv", [
            ["Date", "Title", "Detail", "Direction", "Currency", "Amount"],
            ...rows.map((tx) => [tx.at, tx.title, tx.detail, tx.direction, tx.currency, String(tx.amount)]),
          ])
        }
      >
        {t("Export CSV")}
      </button>
      {rows.length === 0 ? <p className="muted">{t("No transactions found.")}</p> : null}
      <ul className="tx-list">
        {rows.map((tx) => (
          <li key={tx.id}>
            <button
              type="button"
              className="tx-button"
              aria-expanded={open === tx.id}
              onClick={() => setOpen(open === tx.id ? null : tx.id)}
            >
              <span className="tx-main">
                <span className={tx.direction === "in" ? "tx-mark" : "tx-mark is-out"}>
                  <Glyph name={tx.direction === "in" ? "in" : "out"} />
                </span>
                <div>
                  <strong>{t(tx.title)}</strong>
                  <span className="muted">{when(tx.at, locale)}</span>
                </div>
              </span>
              <span className={tx.direction === "in" ? "mono tx-in" : "mono"}>
                <CurrencyFlag code={tx.currency} />
                {tx.direction === "in" ? "+" : "−"}
                {money(tx.amount, tx.currency, locale)}
              </span>
            </button>
            {open === tx.id ? (
              <Receipt tx={tx} name={user.name} email={user.email} locale={locale} />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function issuedAt(iso: string, locale: string) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function printReceipt() {
  document.documentElement.classList.add("print-receipt");
  const done = () => {
    document.documentElement.classList.remove("print-receipt");
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}

function Receipt({ tx, name, email, locale }: { tx: BankTx; name: string; email: string; locale: string }) {
  const { t } = useI18n();
  return (
    <article className="tx-detail receipt-sheet">
      <p className="kicker">{t("Receipt")}</p>
      <h2>{t(tx.title)}</h2>
      <p className="muted">{t(tx.detail)}</p>
      <p className={tx.direction === "in" ? "mono receipt-amount tx-in" : "mono receipt-amount"}>
        <CurrencyFlag code={tx.currency} />
        {tx.direction === "in" ? "+" : "−"}
        {money(tx.amount, tx.currency, locale)}
      </p>
      <dl className="receipt-lines">
        <dt>{t("Reference")}</dt>
        <dd className="mono">{tx.id}</dd>
        <dt>{t("Date")}</dt>
        <dd>{issuedAt(tx.at, locale)}</dd>
        <dt>{t("Direction")}</dt>
        <dd>{tx.direction === "in" ? t("Money in") : t("Money out")}</dd>
        <dt>{t("Issued to")}</dt>
        <dd>
          {name}
          <span className="muted"> · {email}</span>
        </dd>
      </dl>
      <div className="receipt-actions no-print">
        <button type="button" className="btn btn-ghost btn-sm" onClick={printReceipt}>
          {t("Print receipt")}
        </button>
      </div>
    </article>
  );
}
