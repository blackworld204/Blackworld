"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PasswordStrength } from "@/components/password-strength";
import { authErrorMessage } from "@/components/session";
import { BusyButton } from "@/components/busy-button";
import { useI18n } from "@/i18n/provider";
import { finishAuthAction, finishPasswordReset, readPasswordReset } from "@/lib/auth-mail";
import { isStrongPassword } from "@/lib/password-strength";

const doneCopy = {
  verified: "Email address verified.",
  changed: "The email address on this account was changed.",
  recovered: "The previous email address was restored. A password reset link is on its way.",
  "factor-removed": "The extra sign-in factor was removed.",
} as const;

export function AuthAction() {
  const params = useSearchParams();
  const { t } = useI18n();
  const started = useRef(false);
  const [mode, setMode] = useState("");
  const [resetFor, setResetFor] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const nextMode = params.get("mode") ?? "";
    const actionCode = params.get("oobCode") ?? "";
    setMode(nextMode);
    setCode(actionCode);
    if (!nextMode || !actionCode) {
      setWaiting(false);
      setError(t("This link is missing a code."));
      return;
    }
    if (nextMode === "resetPassword") {
      void readPasswordReset(actionCode)
        .then((email) => setResetFor(email))
        .catch((reason: unknown) => setError(t(authErrorMessage(reason))))
        .finally(() => setWaiting(false));
      return;
    }
    void finishAuthAction(nextMode, actionCode)
      .then((result) => setMessage(t(doneCopy[result])))
      .catch((reason: unknown) => setError(t(authErrorMessage(reason))))
      .finally(() => setWaiting(false));
  }, [params, t]);

  const title =
    mode === "resetPassword"
      ? t("Password reset")
      : mode === "verifyEmail"
        ? t("Email address verification")
        : mode === "verifyAndChangeEmail" || mode === "recoverEmail"
          ? t("Email address change")
          : mode === "revertSecondFactorAddition"
            ? t("Multi-factor enrollment")
            : t("Sign-in");

  return (
    <div className="page">
      <div className="wrap narrow">
        <header className="page-intro">
          <h1>{title}</h1>
        </header>
        {mode === "resetPassword" && resetFor && !message ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (busy) return;
              if (!isStrongPassword(password)) {
                setError(t("Use 8 characters with upper and lower case, a number, and a symbol."));
                return;
              }
              if (password !== confirm) {
                setError(t("Passwords do not match."));
                return;
              }
              setBusy(true);
              setError("");
              void finishPasswordReset(code, password)
                .then(() => setMessage(t("Password updated. You can sign in.")))
                .catch((reason: unknown) => setError(t(authErrorMessage(reason))))
                .finally(() => setBusy(false));
            }}
          >
            <p className="muted">{t("Choose a new password for {email}.", { email: resetFor })}</p>
            <label className="field">
              <span>{t("New password")}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError("");
                }}
              />
            </label>
            <PasswordStrength password={password} />
            <label className="field">
              <span>{t("Confirm password")}</span>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => {
                  setConfirm(event.target.value);
                  setError("");
                }}
              />
            </label>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <BusyButton className="btn btn-primary" type="submit" busy={busy}>
              {t("Update password")}
            </BusyButton>
          </form>
        ) : null}
        {waiting && !resetFor ? <p className="muted">{t("Checking this link.")}</p> : null}
        {message ? <p role="status">{message}</p> : null}
        {error && mode !== "resetPassword" ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        {mode === "resetPassword" && error && !resetFor ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-row">
          <Link className="btn btn-primary" href="/login">
            {t("Login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
