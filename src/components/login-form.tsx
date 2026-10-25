"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useSession } from "@/components/session";
import { BusyButton } from "@/components/busy-button";
import { SignOutButton } from "@/components/sign-out-button";
import { useI18n } from "@/i18n/provider";
import { authErrorMessage } from "@/components/session";
import { deskTokenForGoogle, deskTokenForPassword, endProbe, signInWithGoogleCredential, type GoogleDeskProof } from "@/lib/auth-mail";
import { firebaseAuth } from "@/lib/firebase";
import { consumeRecoveryCode, loadBank, userByEmail } from "@/lib/bank";
import { adoptDeskToken, claimDeskAccount, expectDeskSync, whenDeskReady } from "@/lib/desk-sync";
import { isSealed } from "@/lib/sealed";
import { checkSealedCode, checkSealedPin } from "@/lib/vault-client";
import { verifyTotp } from "@/lib/totp";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const DESK_OFFLINE = "The desk could not be reached. Showing the copy on this browser.";

/** Firebase Authentication already accepted this email. Open or create its Firestore profile. */
async function accountFromToken(mail: string, token: string) {
  const loaded = await adoptDeskToken(token);
  const found = userByEmail(loadBank(), mail);
  if (found) return found;
  if (loaded === "offline") throw new Error(DESK_OFFLINE);
  const claimed = await claimDeskAccount(token);
  if (!claimed) throw new Error(DESK_OFFLINE);
  const account = userByEmail(loadBank(), mail);
  if (!account) throw new Error(DESK_OFFLINE);
  return account;
}

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
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
  const { session, signIn, signOut } = useSession();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [checks, setChecks] = useState<{ pin: boolean; code: boolean } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleFinish, setGoogleFinish] = useState(false);
  const googleProof = useRef<GoogleDeskProof | null>(null);

  async function enterWithGoogle(proof: GoogleDeskProof | null, mail: string) {
    const credential = proof && proof.email.toLowerCase() === mail.toLowerCase() ? proof.credential : null;
    expectDeskSync();
    await signInWithGoogleCredential(credential);
  }

  async function continueWithGoogle() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const proof = await deskTokenForGoogle(true);
      googleProof.current = proof;
      const mail = proof.email;
      let account: ReturnType<typeof userByEmail> = null;
      try {
        account = mail && proof.token ? await accountFromToken(mail, proof.token) : null;
      } finally {
        await endProbe();
      }
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
      if (wantsPin || wantsCode) {
        setEmail(mail);
        setEmailOpen(true);
        setChecks({ pin: wantsPin, code: wantsCode });
        setGoogleFinish(true);
        return;
      }
      await enterWithGoogle(proof, mail);
      await whenDeskReady();
      router.push("/dashboard");
    } catch (reason) {
      signOut();
      setError(t(authErrorMessage(reason)));
    } finally {
      setBusy(false);
    }
  }

  if (session && !busy) {
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
          autoComplete="off"
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            if (!validEmail(email)) {
              setError(t("Enter an email."));
              return;
            }
            if (!googleFinish && password.length < 8) {
              setError(t("Password must be at least 8 characters."));
              return;
            }
            setBusy(true);
            void (async () => {
              const mail = email.trim();
              let account: ReturnType<typeof userByEmail> = null;
              try {
                if (googleFinish) {
                  const proof = await deskTokenForGoogle(false);
                  if (proof.email.toLowerCase() !== mail.toLowerCase()) {
                    setError(t("No account for that email."));
                    return;
                  }
                  googleProof.current = proof;
                  account = proof.token ? await accountFromToken(mail, proof.token) : null;
                } else {
                  const token = await deskTokenForPassword(mail, password);
                  account = await accountFromToken(mail, token);
                }
              } finally {
                await endProbe();
              }
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
              if (googleFinish) {
                await enterWithGoogle(googleProof.current, mail);
                const current = firebaseAuth()?.currentUser?.email ?? "";
                if (current.toLowerCase() !== mail.toLowerCase()) {
                  signOut();
                  setError(t("No account for that email."));
                  return;
                }
              } else {
                await signIn(mail, password);
              }
              if (isSealed(account.totpSecret)) consumeRecoveryCode(account.id, code);
              await whenDeskReady();
              router.push("/dashboard");
            })().catch((reason: unknown) => {
              if (googleFinish) signOut();
              setError(t(authErrorMessage(reason)));
            }).finally(() => setBusy(false));
          }}
        >
          <label className="field">
            <span>{t("Email")}</span>
            <input
              type="email"
              name="login-email"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              readOnly={!emailOpen}
              value={email}
              onFocus={(event) => {
                event.currentTarget.readOnly = false;
                setEmailOpen(true);
              }}
              onChange={(event) => {
                setEmail(event.target.value);
                googleProof.current = null;
                setGoogleFinish(false);
                setChecks(null);
                setPin("");
                setCode("");
                setError("");
              }}
            />
          </label>
          {googleFinish ? (
            <p className="muted">{t("Confirm Google once more after the PIN or code to finish sign-in.")}</p>
          ) : (
          <label className="field">
            <span>{t("Password")}</span>
            <span className="secret">
              <input
                type={showPassword ? "text" : "password"}
                name="login-secret"
                autoComplete="off"
                readOnly={!passwordOpen}
                value={password}
                onFocus={(event) => {
                  event.currentTarget.readOnly = false;
                  setPasswordOpen(true);
                }}
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
          )}
          {!googleFinish ? (
            <Link
              className="text-button auth-forgot"
              href={validEmail(email) ? `/forgot?email=${encodeURIComponent(email.trim())}` : "/forgot"}
            >
              {t("Forgot password?")}
            </Link>
          ) : null}
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
        {googleFinish ? null : (
          <>
            <p className="auth-divider">{t("or")}</p>
            <BusyButton type="button" className="btn btn-ghost auth-google" busy={busy} onClick={() => void continueWithGoogle()}>
              <GoogleMark />
              {t("Continue with Google")}
            </BusyButton>
          </>
        )}
        <div className="auth-switch">
          <p>{t("Need an account?")}</p>
          <Link href="/register">{t("Create account")}</Link>
        </div>
      </div>
    </div>
  );
}
