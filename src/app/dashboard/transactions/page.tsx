"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CurrencyFlag } from "@/components/currency-flag";
import { CurrencySelect } from "@/components/currency-select";
import { Glyph } from "@/components/glyph";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { OtpDialog } from "@/components/otp-dialog";
import { ReceiptSheet } from "@/components/receipt-sheet";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { downloadCsv } from "@/lib/csv";
import { MONEY, currencyLabel, money, when, type MoneyCode } from "@/lib/bank";

function TransactionsView() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const search = useSearchParams();
  const requested = search.get("tx");
  const [query, setQuery] = useState("");
  const [askExport, setAskExport] = useState(false);
  const [direction, setDirection] = useState<"all" | "in" | "out">("all");
  const [currency, setCurrency] = useState<"all" | MoneyCode>("all");
  const [collapsed, setCollapsed] = useState<Record<string, true>>({});
  const [otp, setOtp] = useState<{ id: string; expiresAt: string } | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const currencyOptions = useMemo(
    () => [
      { code: "all", label: t("All currencies") },
      ...MONEY.map((item) => ({
        code: item.code,
        label: currencyLabel(item.code),
      })),
    ],
    [t],
  );

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

  useEffect(() => {
    if (!requested || !user || !state) return;
    const mine = state.txs.some((tx) => tx.id === requested && tx.userId === user.id);
    if (!mine) return;
    setCollapsed((prev) => {
      if (!prev[requested]) return prev;
      const next = { ...prev };
      delete next[requested];
      return next;
    });
    const timer = window.setTimeout(() => {
      document.getElementById(`tx-${requested}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [requested, state, user]);

  if (!state || !user) return <div className="app-hold" />;

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Activity")}</p>
        <h1>{t("Transactions")}</h1>
        <p className="lede">{t("Transfers, fees, and deposits.")}</p>
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
      <label className="field tx-currency-filter">
        <span>{t("Currency")}</span>
        <CurrencySelect
          label={t("Currency")}
          value={currency}
          options={currencyOptions}
          onChange={(next) => setCurrency(next === "all" ? "all" : (next as MoneyCode))}
        />
      </label>
      <button
        className="btn btn-ghost btn-sm"
        type="button"
        onClick={() => setAskExport(true)}
      >
        {t("Export CSV")}
      </button>
      {rows.length === 0 ? <p className="muted">{t("No transactions found.")}</p> : null}
      <ul className="tx-list">
        {rows.map((tx) => (
          <li key={tx.id} id={`tx-${tx.id}`}>
            <button
              type="button"
              className="tx-button"
              aria-expanded={!collapsed[tx.id]}
              onClick={() =>
                setCollapsed((prev) => {
                  if (prev[tx.id]) {
                    const next = { ...prev };
                    delete next[tx.id];
                    return next;
                  }
                  return { ...prev, [tx.id]: true };
                })
              }
            >
              <span className="tx-main">
                <span className={tx.direction === "in" ? "tx-mark" : "tx-mark is-out"}>
                  <Glyph name={tx.direction === "in" ? "in" : "out"} />
                </span>
                <div>
                  <strong>
                    {t(tx.title)}
                    {tx.status === "pending" ? <span className="tx-pending-tag">{t("Pending")}</span> : null}
                  </strong>
                  <span className="muted">{when(tx.at, locale)}</span>
                </div>
              </span>
              <span className={tx.direction === "in" ? "mono tx-in" : "mono"}>
                <CurrencyFlag code={tx.currency} />
                {tx.direction === "in" ? "+" : "−"}
                {money(tx.amount, tx.currency, locale)}
              </span>
            </button>
            {!collapsed[tx.id] ? (
              <ReceiptSheet
                tx={tx}
                name={user.name}
                email={user.email}
                locale={locale}
                otpExpiresAt={
                  state.approvals.find((item) => item.id === tx.approvalId)?.otpExpiresAt ??
                  tx.otpExpiresAt ??
                  null
                }
                onContinueOtp={
                  tx.status === "pending" && tx.approvalId
                    ? () => {
                        const row = state.approvals.find(
                          (item) => item.id === tx.approvalId && item.status === "pending",
                        );
                        const expiresAt = row?.otpExpiresAt ?? tx.otpExpiresAt;
                        if (!row || !expiresAt) {
                          toast(t("That OTP request is no longer waiting."));
                          return;
                        }
                        setOtp({ id: row.id, expiresAt });
                        setOtpOpen(true);
                      }
                    : undefined
                }
              />
            ) : null}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={askExport}
        title={t("Export this statement?")}
        body={t("A CSV file is saved on this device.")}
        confirmLabel={t("Export")}
        onClose={() => setAskExport(false)}
        onConfirm={() => {
          setAskExport(false);
          downloadCsv("blackworld-activity.csv", [
            ["Date", "Title", "Detail", "Direction", "Currency", "Amount"],
            ...rows.map((tx) => [tx.at, tx.title, tx.detail, tx.direction, tx.currency, String(tx.amount)]),
          ]);
        }}
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
          toast(t("OTP accepted."));
        }}
      />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="app-hold" />}>
      <TransactionsView />
    </Suspense>
  );
}
