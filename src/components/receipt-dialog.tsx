"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ReceiptSheet } from "@/components/receipt-sheet";
import { useI18n } from "@/i18n/provider";
import type { BankTx } from "@/lib/bank";

export function ReceiptDialog({
  tx,
  name,
  email,
  onClose,
  onContinueOtp,
  otpExpiresAt,
}: {
  tx: BankTx | null;
  name: string;
  email: string;
  onClose: () => void;
  onContinueOtp?: () => void;
  otpExpiresAt?: string | null;
}) {
  const { t, locale } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!tx) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>("button")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [tx]);

  if (!tx || typeof document === "undefined") return null;

  return createPortal(
    <div className="confirm-layer" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="receipt-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("Receipt")}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="balance-close receipt-dialog-close no-print" aria-label={t("Close")} onClick={onClose}>
          ×
        </button>
        <ReceiptSheet
          tx={tx}
          name={name}
          email={email}
          locale={locale}
          onClose={onClose}
          onContinueOtp={onContinueOtp}
          otpExpiresAt={otpExpiresAt}
        />
      </div>
    </div>,
    document.body,
  );
}
