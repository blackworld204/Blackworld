"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { CopyButton } from "@/components/copy-button";
import { useI18n } from "@/i18n/provider";

export function OtpIssuedDialog({
  open,
  holder,
  code,
  onClose,
}: {
  open: boolean;
  holder: string;
  code: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => {
      const input = inputRef.current;
      if (input) {
        input.focus();
        input.select();
      }
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, code]);

  if (!open || !code || typeof document === "undefined") return null;

  return createPortal(
    <div className="confirm-layer otp-layer" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="confirm-dialog otp-dialog otp-issued-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="otp-dialog-body">
          <p className="kicker">{t("Security check")}</p>
          <h2 id={titleId}>{t("OTP for {holder}", { holder })}</h2>
          <p id={bodyId}>
            {t("Generate complete. Send this 6-digit OTP to the member for the security check.")}
          </p>
          <div className="otp-issued-code-row">
            <input
              ref={inputRef}
              className="otp-input otp-issued-code"
              readOnly
              value={code}
              aria-label={t("6-digit OTP")}
              onFocus={(event) => event.currentTarget.select()}
              onClick={(event) => event.currentTarget.select()}
            />
            <CopyButton value={code} label="Copy OTP" />
          </div>
          <div className="confirm-actions">
            <button type="button" className="btn btn-primary" onClick={onClose}>
              {t("Done")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
