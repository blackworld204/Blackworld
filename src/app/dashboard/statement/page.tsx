"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateSelect } from "@/components/date-select";
import { CurrencyFlag } from "@/components/currency-flag";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { downloadCsv } from "@/lib/csv";
import { localeTag, money, privacyOf, when } from "@/lib/bank";

function dayKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function labelDay(value: string, locale: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

export default function StatementPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [askExport, setAskExport] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (!state || !user || seeded.current) return;
    seeded.current = true;
    const days = state.txs
      .filter((tx) => tx.userId === user.id)
      .map((tx) => dayKey(tx.at))
      .sort();
    setFrom(days[0] ?? dayKey(new Date()));
    setTo(dayKey(new Date()));
  }, [state, user]);

  const ordered = useMemo(() => {
    if (!state || !user) return [];
    return state.txs.filter((tx) => tx.userId === user.id);
  }, [state, user]);

  const invalid = Boolean(from && to && from > to);
  const txs = ordered.filter((tx) => {
    if (invalid) return false;
    const day = dayKey(tx.at);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  });

  if (!state || !user) return <div className="app-hold" />;
  const privacy = privacyOf(user);
  const address = user.address;
  const period = from && to ? `${labelDay(from, locale)} – ${labelDay(to, locale)}` : "";

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
      <div className="statement-range no-print">
        <label className="field">
          <span>{t("From date")}</span>
          <DateSelect value={from} max={to || undefined} onChange={setFrom} />
        </label>
        <label className="field">
          <span>{t("To date")}</span>
          <DateSelect value={to} min={from || undefined} onChange={setTo} />
        </label>
      </div>
      {period ? <p className="statement-period">{period}</p> : null}
      {invalid ? <p className="form-error">{t("The start date is after the end date.")}</p> : null}
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
        <p className="muted">{ordered.length === 0 ? t("No activity yet.") : t("No activity in this range.")}</p>
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
          disabled={invalid}
          onClick={() => setAskExport(true)}
        >
          {t("Export CSV")}
        </button>
      </div>
      <ConfirmDialog
        open={askExport}
        title={t("Export this statement?")}
        body={t("A CSV file is saved on this device.")}
        confirmLabel={t("Export")}
        onClose={() => setAskExport(false)}
        onConfirm={() => {
          setAskExport(false);
          downloadCsv("blackworld-statement.csv", [
            ["From", "To"],
            [from, to],
            [],
            ["Date", "Title", "Detail", "Direction", "Currency", "Amount"],
            ...txs.map((tx) => [tx.at, tx.title, tx.detail, tx.direction, tx.currency, String(tx.amount)]),
          ]);
        }}
      />
    </div>
  );
}
