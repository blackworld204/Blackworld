"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { authErrorMessage } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import { sendPasswordReset } from "@/lib/auth-mail";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ForgotForm() {
  const params = useSearchParams();
  const seeded = params.get("email") ?? "";
  const { t } = useI18n();
  const [address, setAddress] = useState(() => (validEmail(seeded) ? seeded.trim() : ""));
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="page">
      <div className="wrap narrow">
        <header className="page-intro">
          <h1>{t("Forgot password")}</h1>
        </header>
        <form
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            if (!validEmail(address)) {
              setMessage("");
              setError(t("Enter the address for the reset link."));
              return;
            }
            setBusy(true);
            setError("");
            void sendPasswordReset(address)
              .then(() => setMessage(t("A reset link is on its way to that address.")))
              .catch((reason: unknown) => setError(t(authErrorMessage(reason))))
              .finally(() => setBusy(false));
          }}
        >
          <label className="field">
            <span>{t("Password reset address")}</span>
            <input
              type="email"
              name="reset-address"
              autoComplete="email"
              autoCapitalize="off"
              spellCheck={false}
              readOnly={!open}
              value={address}
              onFocus={(event) => {
                event.currentTarget.readOnly = false;
                setOpen(true);
              }}
              onChange={(event) => {
                setAddress(event.target.value);
                setError("");
                setMessage("");
              }}
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p role="status">{message}</p> : null}
          <div className="form-row">
            <Link href="/login" className="text-button">
              {t("Cancel")}
            </Link>
            <BusyButton className="btn btn-primary" type="submit" busy={busy}>
              {t("Send reset link")}
            </BusyButton>
          </div>
        </form>
      </div>
    </div>
  );
}
