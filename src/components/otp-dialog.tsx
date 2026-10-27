"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BusyButton } from "@/components/busy-button";
import { toast } from "@/components/toast";
import { useI18n } from "@/i18n/provider";
import { formatOtpCountdown, otpRemainingMs } from "@/lib/bank";
import { postAccount } from "@/lib/flow-api";

export function OtpDialog({
  open,
  approvalId,
  expiresAt,
  title,
  body,
  onClose,
  onVerified,
}: {
  open: boolean;
  approvalId: string | null;
  expiresAt: string | null;
  title: string;
  body: string;
  onClose: () => void;
  onVerified: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    setCode("");
    setError("");
    setBusy(false);
    setNow(Date.now());
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLInputElement>("input")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        closeRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.clearInterval(tick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, approvalId, busy]);

  if (!open || !approvalId || !expiresAt || typeof document === "undefined") return null;

  const remaining = otpRemainingMs(expiresAt, now);
  const expired = remaining <= 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !approvalId || expired) return;
    const digits = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(digits)) {
      const message = t("Enter the 6-digit OTP from an admin.");
      setError(message);
      toast(message);
      return;
    }
    setBusy(true);
    setError("");
    void postAccount<{ status?: string; error?: string }>(`approvals/${approvalId}/verify`, {
      code: digits,
    }).then((result) => {
      setBusy(false);
      if (result.error) {
        setError(t(result.error));
        toast(t(result.error));
        return;
      }
      const failed = result.body && typeof result.body.error === "string" ? result.body.error : null;
      if (failed) {
        setError(t(failed));
        toast(t(failed));
        return;
      }
      toast(t("OTP accepted."));
      onVerified();
    });
  }

  return createPortal(
    <div className="confirm-layer otp-layer" onMouseDown={() => { if (!busy) onClose(); }}>
      <div
        ref={dialogRef}
        className="confirm-dialog otp-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="otp-dialog-body">
          <p className="kicker">{t("Security check")}</p>
          <h2 id={titleId}>{title}</h2>
          <p id={bodyId}>{body}</p>
          <p className="muted otp-dialog-note">
            {t("Nothing moves until you enter the 6-digit OTP an admin creates and sends you. Balances stay unchanged until that OTP is verified.")}
          </p>
          <p className={`otp-timer mono ${expired ? "form-error" : ""}`} aria-live="polite">
            {expired
              ? t("This OTP request expired.")
              : t("Expires in {time}", { time: formatOtpCountdown(expiresAt, now) })}
          </p>
          <form className="otp-form" onSubmit={submit}>
            <label className="field otp-field">
              <span>{t("6-digit OTP")}</span>
              <input
                className="otp-input"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                disabled={expired || busy}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="confirm-actions">
              <button type="button" className="text-button" disabled={busy} onClick={onClose}>
                {t("Close")}
              </button>
              <BusyButton className="btn btn-primary" type="submit" busy={busy} disabled={expired}>
                {t("Submit OTP")}
              </BusyButton>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}
