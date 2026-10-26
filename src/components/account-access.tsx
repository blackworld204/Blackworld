"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PasswordStrength } from "@/components/password-strength";
import { SecretInput } from "@/components/secret-input";
import { authErrorMessage } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import { changeSignedInPassword, requestEmailChange, sendAddressVerification, sendPasswordReset } from "@/lib/auth-mail";
import { addNote, alertsOf, clearStagedEmail, loadBank, stageEmailChange } from "@/lib/bank";
import { ensureFirebaseAuth } from "@/lib/firebase";
import { isStrongPassword } from "@/lib/password-strength";

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
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"change" | "password" | "reset" | null>(null);
  const [ask, setAsk] = useState<"change" | "password" | null>(null);

  async function run(kind: "change" | "password" | "reset", task: () => Promise<void>) {
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

  function noteSecurity(title: string, body: string) {
    const owner = loadBank().users.find((user) => user.id === userId);
    if (!owner || !alertsOf(owner).security) return;
    addNote({ userId, title, body, channel: "security" });
  }

  return (
    <section className="stack account-access" id="signin">
      <h2>{t("Sign-in")}</h2>
      <p className="muted">{t("This address is used to sign in.")}</p>
      <p>{email}</p>
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
          if (!emailPassword) {
            setMessage("");
            setError(t("Enter your current password."));
            return;
          }
          setError("");
          setAsk("change");
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
        <label className="field">
          <span>{t("Current password")}</span>
          <SecretInput
            autoComplete="current-password"
            value={emailPassword}
            showLabel={t("Show password")}
            hideLabel={t("Hide password")}
            onChange={(value) => {
              setEmailPassword(value);
              setError("");
            }}
          />
        </label>
        <BusyButton className="btn btn-primary" type="submit" busy={busy === "change"}>
          {t("Send change link")}
        </BusyButton>
      </form>
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (!currentPassword) {
            setMessage("");
            setError(t("Enter your current password."));
            return;
          }
          if (!isStrongPassword(nextPassword)) {
            setMessage("");
            setError(t("Use 8 characters with upper and lower case, a number, and a symbol."));
            return;
          }
          if (nextPassword !== confirmPassword) {
            setMessage("");
            setError(t("Passwords do not match."));
            return;
          }
          setError("");
          setAsk("password");
        }}
      >
        <p className="kicker">{t("Password")}</p>
        <label className="field">
          <span>{t("Current password")}</span>
          <SecretInput
            autoComplete="current-password"
            value={currentPassword}
            showLabel={t("Show password")}
            hideLabel={t("Hide password")}
            onChange={(value) => {
              setCurrentPassword(value);
              setError("");
            }}
          />
        </label>
        <label className="field">
          <span>{t("New password")}</span>
          <SecretInput
            autoComplete="new-password"
            value={nextPassword}
            showLabel={t("Show password")}
            hideLabel={t("Hide password")}
            onChange={(value) => {
              setNextPassword(value);
              setError("");
            }}
          />
        </label>
        <PasswordStrength password={nextPassword} />
        <label className="field">
          <span>{t("Confirm password")}</span>
          <SecretInput
            autoComplete="new-password"
            value={confirmPassword}
            showLabel={t("Show password")}
            hideLabel={t("Hide password")}
            onChange={(value) => {
              setConfirmPassword(value);
              setError("");
            }}
          />
        </label>
        <BusyButton className="btn btn-primary" type="submit" busy={busy === "password"}>
          {t("Update password")}
        </BusyButton>
      </form>
      <div>
        <p className="muted">{t("A reset link can be sent to the current address.")}</p>
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
      <ConfirmDialog
        open={ask !== null}
        title={ask === "change" ? t("Send this change link?") : t("Change this password?")}
        body={
          ask === "change"
            ? t("The new address receives a link. This account keeps {email} until that link is opened.", { email })
            : t("The next sign-in uses the new password.")
        }
        confirmLabel={ask === "change" ? t("Send change link") : t("Update password")}
        onClose={() => setAsk(null)}
        onConfirm={() => {
          const choice = ask;
          setAsk(null);
          if (choice === "change") {
            void run("change", async () => {
              const staged = stageEmailChange(userId, nextEmail);
              if (staged) throw new Error(staged);
              try {
                await requestEmailChange(nextEmail, emailPassword);
              } catch (reason) {
                clearStagedEmail(userId);
                throw reason;
              }
              setNextEmail("");
              setEmailPassword("");
              noteSecurity("Email change requested", "A confirmation link was sent to a new sign-in address.");
              setMessage(t("A confirmation link is on its way to the new address. This account keeps the current address until that link is opened."));
            });
            return;
          }
          if (choice === "password") {
            void run("password", async () => {
              await changeSignedInPassword(currentPassword, nextPassword);
              setCurrentPassword("");
              setNextPassword("");
              setConfirmPassword("");
              noteSecurity("Password updated", "The sign-in password for this account was changed.");
              setMessage(t("Password updated."));
            });
          }
        }}
      />
    </section>
  );
}
