"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { authErrorMessage } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import { requestEmailChange, sendAddressVerification, sendPasswordReset } from "@/lib/auth-mail";
import { clearStagedEmail, stageEmailChange } from "@/lib/bank";
import { ensureFirebaseAuth } from "@/lib/firebase";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function EmailVerify({ email }: { email: string }) {
  const { t } = useI18n();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stop = false;
    let unsub = () => {};
    void ensureFirebaseAuth().then((auth) => {
      if (stop || !auth) return;
      const read = () => {
        if (!stop) setVerified(auth.currentUser ? auth.currentUser.emailVerified : null);
      };
      unsub = onAuthStateChanged(auth, read);
      void auth.currentUser?.reload().then(read);
    });
    return () => {
      stop = true;
      unsub();
    };
  }, [email]);

  return (
    <div className="email-verify">
      <span className={verified ? "email-verify-mark is-on" : verified === false ? "email-verify-mark is-off" : "email-verify-mark"}>
        {verified === null ? t("Checking") : verified ? t("Verified") : t("Not verified")}
      </span>
      {verified === false ? (
        <button
          type="button"
          className="text-button email-verify-link"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setMessage("");
            setError("");
            void sendAddressVerification()
              .then(() => setMessage(t("A verification link is on its way.")))
              .catch((reason: unknown) => setError(t(authErrorMessage(reason))))
              .finally(() => setBusy(false));
          }}
        >
          {t("Request verification")}
        </button>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}

export function AccountAccess({ userId, email }: { userId: string; email: string }) {
  const { t } = useI18n();
  const [nextEmail, setNextEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"change" | "reset" | null>(null);

  async function run(kind: "change" | "reset", task: () => Promise<void>) {
    setBusy(kind);
    setMessage("");
    setError("");
    try {
      await task();
    } catch (reason) {
      setError(t(authErrorMessage(reason)));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="stack account-access">
      <h2>{t("Sign-in")}</h2>
      <EmailVerify email={email} />
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (!validEmail(nextEmail)) {
            setMessage("");
            setError(t("Enter an email."));
            return;
          }
          void run("change", async () => {
            const staged = stageEmailChange(userId, nextEmail);
            if (staged) throw new Error(staged);
            try {
              await requestEmailChange(nextEmail);
            } catch (reason) {
              clearStagedEmail(userId);
              throw reason;
            }
            setNextEmail("");
            setMessage(t("A confirmation link is on its way to the new address. This account keeps the current address until that link is opened."));
          });
        }}
      >
        <p className="kicker">{t("Email address change")}</p>
        <label className="field">
          <span>{t("New email address")}</span>
          <input
            type="email"
            autoComplete="email"
            value={nextEmail}
            onChange={(event) => {
              setNextEmail(event.target.value);
              setError("");
            }}
          />
        </label>
        <BusyButton className="btn btn-primary" type="submit" busy={busy === "change"}>
          {t("Send change link")}
        </BusyButton>
      </form>
      <div>
        <p className="kicker">{t("Password reset address")}</p>
        <p className="muted">{t("This address receives the password reset link.")}</p>
        <p>{email}</p>
        <BusyButton
          type="button"
          className="btn btn-ghost btn-sm"
          busy={busy === "reset"}
          onClick={() =>
            void run("reset", async () => {
              await sendPasswordReset(email);
              setMessage(t("A reset link is on its way to that address."));
            })
          }
        >
          {t("Send reset link")}
        </BusyButton>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
