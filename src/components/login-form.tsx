"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/session";
import { BusyButton } from "@/components/busy-button";
import { SignOutButton } from "@/components/sign-out-button";
import { useI18n } from "@/i18n/provider";
import { authErrorMessage } from "@/components/session";
import { consumeRecoveryCode, hydrateBank, loadBank, userByEmail } from "@/lib/bank";
import { CONTACT_EMAIL } from "@/lib/contact";
import { whenDeskReady } from "@/lib/desk-sync";
import { isSealed } from "@/lib/sealed";
import { checkSealedCode, checkSealedPin } from "@/lib/vault-client";
import { verifyTotp } from "@/lib/totp";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-3.4 4" />
      <path d="M6.1 6.7C3.8 8.3 2 12 2 12s3.5 6 10 6c1.5 0 2.9-.3 4.1-.9" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const { session, signIn } = useSession();
  const { t } = useI18n();
  const [email, setEmail] = useState(CONTACT_EMAIL);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [checks, setChecks] = useState<{ pin: boolean; code: boolean } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (session) {
    return (
      <div className="page">
        <div className="wrap narrow">
          <header className="page-intro">
            <h1>{t("Signed in")}</h1>
          </header>
          <p>
            {t("Signed in as {email}.", { email: session.email })}
          </p>
          <div className="form-row">
            <SignOutButton className="text-button" />
            <Link className="btn btn-primary" href="/dashboard">
              {t("Open dashboard")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="wrap narrow">
        <header className="page-intro">
          <h1>{t("Login")}</h1>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            if (!validEmail(email)) {
              setError(t("Enter an email."));
              return;
            }
            if (password.length < 8) {
              setError(t("Password must be at least 8 characters."));
              return;
            }
            setBusy(true);
            void (async () => {
              await hydrateBank();
              const account = userByEmail(loadBank(), email.trim());
              if (!account) {
                setError(t("No account for that email."));
                return;
              }
              if (account.status !== "active") {
                setError(t("This account is inactive."));
                return;
              }
              const wantsPin = Boolean(account.twoFactor);
              const wantsCode = Boolean(account.totpSecret);
              if ((wantsPin || wantsCode) && !checks) {
                setChecks({ pin: wantsPin, code: wantsCode });
                setError("");
                return;
              }
              const pinOk = !wantsPin || (isSealed(account.pin) ? await checkSealedPin(account.pin, pin) : pin === account.pin);
              if (!pinOk) {
                setError(t("PIN does not match this account."));
                return;
              }
              const secret = account.totpSecret;
              const codeOk =
                !wantsCode ||
                !secret ||
                (isSealed(secret)
                  ? await checkSealedCode(secret, code, account.recoveryCodes)
                  : verifyTotp(secret, code) || consumeRecoveryCode(account.id, code));
              if (!codeOk) {
                setError(t("That code is not valid."));
                return;
              }
              await signIn(email.trim(), password);
              await hydrateBank();
              if (isSealed(account.totpSecret)) consumeRecoveryCode(account.id, code);
              await whenDeskReady();
              router.push("/dashboard");
            })().catch((reason: unknown) => {
              setError(t(authErrorMessage(reason)));
            }).finally(() => setBusy(false));
          }}
        >
          <label className="field">
            <span>{t("Email")}</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setChecks(null);
                setPin("");
                setCode("");
                setError("");
              }}
            />
          </label>
          <label className="field">
            <span>{t("Password")}</span>
            <span className="secret">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setChecks(null);
                  setPin("");
                  setCode("");
                  setError("");
                }}
              />
              <button
                type="button"
                className="secret-toggle"
                aria-pressed={showPassword}
                aria-label={showPassword ? t("Hide password") : t("Show password")}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </span>
          </label>
          {checks?.pin ? (
            <label className="field">
              <span>{t("PIN")}</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value);
                  setError("");
                }}
              />
            </label>
          ) : null}
          {checks?.code ? (
            <label className="field">
              <span>{t("Authenticator code")}</span>
              <input
                inputMode="text"
                autoComplete="one-time-code"
                maxLength={9}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError("");
                }}
              />
            </label>
          ) : null}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-row">
            <Link href="/" className="text-button">
              {t("Cancel")}
            </Link>
            <BusyButton className="btn btn-primary" type="submit" busy={busy}>
              {t("Continue")}
            </BusyButton>
          </div>
        </form>
        <div className="auth-switch">
          <p>{t("Need an account?")}</p>
          <Link href="/register">{t("Create account")}</Link>
        </div>
      </div>
    </div>
  );
}
