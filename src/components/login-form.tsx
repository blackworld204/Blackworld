"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import { consumeRecoveryCode, loadBank, userByEmail } from "@/lib/bank";
import { verifyTotp } from "@/lib/totp";

const DEMO_EMAIL = "johnsmith@gmail.com";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginForm() {
  const router = useRouter();
  const { session, signIn, signOut } = useSession();
  const { t } = useI18n();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [checks, setChecks] = useState<{ pin: boolean; code: boolean } | null>(null);
  const [error, setError] = useState("");

  if (session) {
    return (
      <div className="page">
        <div className="wrap narrow">
          <header className="page-intro">
            <h1>{t("Signed in")}</h1>
          </header>
          <p>
            {t("This browser is signed in as {email}.", { email: session.email })}
          </p>
          <div className="form-row">
            <button type="button" className="text-button" onClick={signOut}>
              {t("Sign out")}
            </button>
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
          <p className="lede">
            {t("Sign-in stays in this browser and checks that the password is at least 8 characters. It does not store the password. Transfers use a 4-digit PIN from Security.")}
          </p>
          <p className="lede">
            {t("Sample desk: johnsmith@gmail.com uses PIN 2580 until you change it under Security.")}
          </p>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!validEmail(email)) {
              setError(t("Enter a work email."));
              return;
            }
            if (password.length < 8) {
              setError(t("Password must be at least 8 characters."));
              return;
            }
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
            if (wantsPin && pin !== account.pin) {
              setError(t("PIN does not match this account. The 4-digit PIN is under Security."));
              return;
            }
            if (wantsCode && account.totpSecret && !verifyTotp(account.totpSecret, code) && !consumeRecoveryCode(account.id, code)) {
              setError(t("That code is not valid."));
              return;
            }
            signIn(email.trim());
            router.push("/dashboard");
          }}
        >
          <label className="field">
            <span>{t("Work email")}</span>
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
            <input
              type="password"
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
          </label>
          {checks?.pin ? (
            <label className="field">
              <span>{t("4-digit PIN")}</span>
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
            <button className="btn btn-primary" type="submit">
              {t("Continue")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
