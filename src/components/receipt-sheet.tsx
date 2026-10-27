"use client";

import { useEffect, useState } from "react";
import { CurrencyFlag } from "@/components/currency-flag";
import { Mark } from "@/components/mark";
import { useI18n } from "@/i18n/provider";
import {
  formatOtpCountdown,
  localeTag,
  money,
  otpRemainingMs,
  type BankTx,
} from "@/lib/bank";
import { downloadReceipt, printReceipt } from "@/lib/receipt";

function issuedAt(iso: string, locale: string) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function ReceiptBars({ id }: { id: string }) {
  return (
    <div className="receipt-barcode" aria-hidden="true">
      {Array.from(id).map((ch, index) => {
        const n = ch.charCodeAt(0);
        return <span key={`${ch}-${index}`} style={{ flex: `${1 + (n % 3)} 1 0` }} />;
      })}
    </div>
  );
}

function PendingOtpTimer({ expiresAt }: { expiresAt: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [expiresAt]);
  const remaining = otpRemainingMs(expiresAt, now);
  const expired = remaining <= 0;
  return (
    <p className={`receipt-otp-timer mono ${expired ? "form-error" : ""}`} aria-live="polite">
      {expired
        ? t("This OTP request expired.")
        : t("OTP expires in {time}", { time: formatOtpCountdown(expiresAt, now) })}
    </p>
  );
}

export function ReceiptSheet({
  tx,
  name,
  email,
  locale,
  onClose,
  onContinueOtp,
  otpExpiresAt,
}: {
  tx: BankTx;
  name: string;
  email: string;
  locale: string;
  onClose?: () => void;
  /** Opens the OTP screen for this pending receipt. */
  onContinueOtp?: () => void;
  /** Prefer the live approval expiry when available. */
  otpExpiresAt?: string | null;
}) {
  const { t } = useI18n();
  const amount = money(tx.amount, tx.currency, locale);
  const pending = tx.status === "pending";
  const expiresAt = otpExpiresAt || tx.otpExpiresAt || null;
  const canContinue = pending && Boolean(onContinueOtp) && Boolean(expiresAt);

  return (
    <article className="tx-detail receipt-sheet">
      <header className="receipt-brand">
        <Mark size={20} />
        <div>
          <strong>Blackworld</strong>
          <span>{t("Transaction receipt")}</span>
        </div>
      </header>
      <div className="receipt-rule" aria-hidden="true" />
      <h2>{t(tx.title)}</h2>
      {tx.detail ? <p className="receipt-detail">{t(tx.detail)}</p> : null}
      <p className={tx.direction === "in" ? "mono receipt-amount tx-in" : "mono receipt-amount"}>
        <CurrencyFlag code={tx.currency} />
        <span>
          {tx.direction === "in" ? "+" : "−"}
          {amount}
        </span>
      </p>
      <div className="receipt-rule receipt-rule-dash" aria-hidden="true" />
      <dl className="receipt-lines">
        <dt>{t("Reference")}</dt>
        <dd className="mono">{tx.id}</dd>
        <dt>{t("Date")}</dt>
        <dd>{issuedAt(tx.at, locale)}</dd>
        <dt>{t("Currency")}</dt>
        <dd>{tx.currency}</dd>
        <dt>{t("Direction")}</dt>
        <dd>{tx.direction === "in" ? t("Money in") : t("Money out")}</dd>
        <dt>{t("Issued to")}</dt>
        <dd>
          {name}
          <span className="muted"> · {email}</span>
        </dd>
        <dt>{t("Status")}</dt>
        <dd>
          {tx.status === "pending"
            ? t("Pending")
            : tx.status === "expired"
              ? t("Expired")
              : t("Posted")}
        </dd>
      </dl>
      {pending && expiresAt ? <PendingOtpTimer expiresAt={expiresAt} /> : null}
      {canContinue ? (
        <div className="receipt-otp-action no-print">
          <button type="button" className="btn btn-primary" onClick={onContinueOtp}>
            {t("Continue with OTP")}
          </button>
          <p className="muted">
            {t("Open this security check to enter the OTP an admin created for this transfer.")}
          </p>
        </div>
      ) : null}
      <div className="receipt-rule receipt-rule-dash" aria-hidden="true" />
      <ReceiptBars id={tx.id} />
      <p className="receipt-footer mono">{tx.id}</p>
      <div className="receipt-actions no-print">
        <button type="button" className="btn btn-ghost btn-sm" onClick={printReceipt}>
          {t("Print receipt")}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() =>
            downloadReceipt({
              tx,
              name,
              email,
              locale,
              labels: {
                receipt: t("Receipt"),
                title: t(tx.title),
                detail: t(tx.detail),
                reference: t("Reference"),
                date: t("Date"),
                direction: t("Direction"),
                moneyIn: t("Money in"),
                moneyOut: t("Money out"),
                issuedTo: t("Issued to"),
              },
            })
          }
        >
          {t("Download receipt")}
        </button>
        {onClose ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t("Close")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
