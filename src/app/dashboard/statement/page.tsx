"use client";

import { CurrencyFlag } from "@/components/currency-flag";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { downloadCsv } from "@/lib/csv";
import { money, privacyOf, when } from "@/lib/bank";

export default function StatementPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  if (!state || !user) return <div className="app-hold" />;
  const txs = state.txs.filter((tx) => tx.userId === user.id);
  const privacy = privacyOf(user);
  const address = user.address;

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Statement")}</p>
        <h1>{user.name}</h1>
        <p className="lede">
          {privacy.statementEmail ? user.email : t("Email hidden on this statement.")}
          {" · "}
          {t("Member since {date}.", { date: user.memberSince })}
        </p>
        {address ? (
          <p className="muted">
            {address.street}, {address.city} {address.zip}, {address.country}
          </p>
        ) : null}
      </header>
      <dl className="sheet">
        {(["USD", "EUR", "GBP"] as const).map((code) => (
          <div key={code}>
            <dt className="ccy-code">
              <CurrencyFlag code={code} /> {code}
            </dt>
            <dd>{money(user.balances[code], code, locale)}</dd>
          </div>
        ))}
      </dl>
      {txs.length === 0 ? (
        <p className="muted">{t("No activity yet.")}</p>
      ) : (
        <ul className="tx-list">
          {txs.map((tx) => (
            <li key={tx.id}>
              <div>
                <strong>{t(tx.title)}</strong>
                <span className="muted">
                  {t(tx.detail)} · {when(tx.at, locale)}
                </span>
              </div>
              <span className="mono">
                {tx.direction === "in" ? "+" : "−"}
                {money(tx.amount, tx.currency, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="form-row no-print">
        <button className="btn btn-ghost" type="button" onClick={() => window.print()}>
          {t("Print")}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() =>
            downloadCsv("blackworld-statement.csv", [
              ["Date", "Title", "Detail", "Direction", "Currency", "Amount"],
              ...txs.map((tx) => [tx.at, tx.title, tx.detail, tx.direction, tx.currency, String(tx.amount)]),
            ])
          }
        >
          {t("Export CSV")}
        </button>
      </div>
    </div>
  );
}
