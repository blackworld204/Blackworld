"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { OtpDialog } from "@/components/otp-dialog";
import { OtpIssuedDialog } from "@/components/otp-issued-dialog";
import { ReceiptDialog } from "@/components/receipt-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import {
  formatOtpCountdown,
  money,
  otpRemainingMs,
  when,
  type BankApproval,
  type BankTx,
} from "@/lib/bank";
import { postAccount } from "@/lib/flow-api";

function RowTimer({ expiresAt }: { expiresAt: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [expiresAt]);
  const remaining = otpRemainingMs(expiresAt, now);
  if (remaining <= 0) return <span className="form-error">{t("Expired")}</span>;
  return <span className="mono">{t("OTP {time}", { time: formatOtpCountdown(expiresAt, now) })}</span>;
}

export default function ApprovalsPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [ask, setAsk] = useState<{ id: string; holder: string } | null>(null);
  const [issued, setIssued] = useState<{ code: string; holder: string } | null>(null);
  const [otp, setOtp] = useState<{ id: string; expiresAt: string } | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [receipt, setReceipt] = useState<BankTx | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!state || !user) return <div className="app-hold" />;
  const mine = user.role === "admin" ? state.approvals : state.approvals.filter((item) => item.userId === user.id);
  const waiting = mine.filter((item) => item.status === "pending");

  function totalOf(item: BankApproval) {
    if (item.kind === "card") return money(0, item.currency, locale);
    if (item.kind === "deposit") return money(Math.max(0, item.amount - item.fee), item.currency, locale);
    return money(item.amount + item.fee, item.currency, locale);
  }

  function txFor(item: BankApproval) {
    const desk = state;
    if (!desk) return null;
    if (item.txId) {
      const exact = desk.txs.find((tx) => tx.id === item.txId);
      if (exact) return exact;
    }
    return (
      desk.txs.find(
        (tx) => tx.approvalId === item.id && tx.userId === item.userId,
      ) ?? null
    );
  }

  function openItem(item: BankApproval) {
    if (item.status !== "pending") {
      const linked = txFor(item);
      if (linked) setReceipt(linked);
      return;
    }
    const expiresAt = item.otpExpiresAt ?? txFor(item)?.otpExpiresAt;
    const linked = txFor(item);
    if (linked) {
      setReceipt(linked);
      return;
    }
    if (expiresAt) {
      setOtp({ id: item.id, expiresAt });
      setOtpOpen(true);
      return;
    }
    toast(t("That OTP request is no longer waiting."));
  }

  function openOtpFor(item: BankApproval) {
    const expiresAt = item.otpExpiresAt ?? txFor(item)?.otpExpiresAt;
    if (!expiresAt) {
      toast(t("That OTP request is no longer waiting."));
      return;
    }
    setReceipt(null);
    setOtp({ id: item.id, expiresAt });
    setOtpOpen(true);
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Approvals")}</p>
        <h1>{t("Waiting for OTP")}</h1>
        <p className="lede">
          {t("Every transaction waits here for security. Tap a pending item to open its receipt, then continue with the admin OTP.")}
        </p>
      </header>
      {waiting.length === 0 ? <p className="muted">{t("No transfers waiting.")}</p> : null}
      <ul className="tx-list approval-list">
        {mine.map((item) => (
          <li key={item.id} className="approval-row">
            <button type="button" className="tx-button approval-row-main" onClick={() => openItem(item)}>
              <span className="tx-main">
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
                    {item.kind === "card"
                      ? ` · ${t("Card")}`
                      : item.kind === "deposit"
                        ? ` · ${t("Deposit")}`
                        : item.kind === "exchange"
                          ? ` · ${t("Exchange")}`
                          : ""}
                  </span>
                  {item.status === "pending" && item.otpExpiresAt ? (
                    <span className="approval-row-timer muted">
                      <RowTimer expiresAt={item.otpExpiresAt} />
                    </span>
                  ) : null}
                </div>
              </span>
              <span className="mono approval-row-amount">{totalOf(item)}</span>
            </button>
            {item.otpCode && user.role === "admin" ? (
              <div className="approval-otp-chip">
                <span className="muted">{t("OTP")}</span>
                <span className="mono approval-otp-value">{item.otpCode}</span>
                <CopyButton value={item.otpCode} label="Copy" />
              </div>
            ) : null}
            {item.status === "pending" ? (
              <div className="user-actions approval-row-actions">
                {user.role === "admin" ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busyId === item.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        setBusyId(item.id);
                        void postAccount<{ code?: string; error?: string }>(`approvals/${item.id}/otp`, {}).then(
                          (result) => {
                            setBusyId(null);
                            if (result.error) {
                              toast(t(result.error));
                              return;
                            }
                            const code = result.body?.code;
                            if (!code) {
                              toast(t(result.body?.error || "The request failed."));
                              return;
                            }
                            setIssued({ code, holder: item.holder });
                            toast(t("OTP created."));
                          },
                        );
                      }}
                    >
                      {item.otpCode ? t("New OTP") : t("Create OTP")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        setAsk({ id: item.id, holder: item.holder });
                      }}
                    >
                      {t("Decline")}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      openOtpFor(item);
                    }}
                  >
                    {t("Get OTP from admin")}
                  </button>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={ask !== null}
        title={t("Decline this transfer?")}
        body={t("The transfer to {holder} stays off the balance.", { holder: ask?.holder ?? "" })}
        confirmLabel={t("Decline")}
        onClose={() => setAsk(null)}
        onConfirm={() => {
          if (!ask) return;
          const choice = ask;
          setAsk(null);
          void postAccount("approvals/" + choice.id, { approve: false }).then((result) => {
            if (result.error) {
              toast(t(result.error));
              return;
            }
            toast(t("Declined."));
          });
        }}
      />
      <OtpIssuedDialog
        open={issued !== null}
        holder={issued?.holder ?? ""}
        code={issued?.code ?? ""}
        onClose={() => setIssued(null)}
      />
      <ReceiptDialog
        tx={receipt}
        name={user.name}
        email={user.email}
        onClose={() => setReceipt(null)}
        otpExpiresAt={
          receipt
            ? state.approvals.find((item) => item.id === receipt.approvalId)?.otpExpiresAt ??
              receipt.otpExpiresAt ??
              null
            : null
        }
        onContinueOtp={
          receipt?.status === "pending" && receipt.approvalId
            ? () => {
                const row = state.approvals.find(
                  (item) => item.id === receipt.approvalId && item.status === "pending",
                );
                const expiresAt = row?.otpExpiresAt ?? receipt.otpExpiresAt;
                if (!row || !expiresAt) {
                  toast(t("That OTP request is no longer waiting."));
                  return;
                }
                setReceipt(null);
                setOtp({ id: row.id, expiresAt });
                setOtpOpen(true);
              }
            : undefined
        }
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
