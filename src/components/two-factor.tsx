"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import {
  addNote,
  alertsOf,
  consumeRecoveryCode,
  disableTotp,
  enableTotp,
} from "@/lib/bank";
import {
  createRecoveryCodes,
  createSecret,
  groupSecret,
  verifyTotp,
} from "@/lib/totp";

export function TwoFactorPanel() {
  const { user } = useAccount();
  const { t } = useI18n();
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [turningOff, setTurningOff] = useState(false);

  if (!user) return null;
  const enabled = Boolean(user.totpSecret);

  function start() {
    setSecret(createSecret());
    setCode("");
    setError("");
    setCodes(null);
    setTurningOff(false);
  }

  function confirmSetup(event: React.FormEvent) {
    event.preventDefault();
    if (!secret || !verifyTotp(secret, code)) {
      setError(t("That code does not match."));
      return;
    }
    const next = createRecoveryCodes();
    enableTotp(user!.id, secret, next);
    if (alertsOf(user!).security) {
      addNote({
        title: "Authenticator on",
        body: "Sign-in now asks for a code from an authenticator app.",
      });
    }
    setCodes(next);
    setSecret("");
    setCode("");
    setError("");
    toast(t("Authenticator is on."));
  }

  function confirmOff(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.totpSecret) return;
    const ok =
      verifyTotp(user.totpSecret, code) || consumeRecoveryCode(user.id, code);
    if (!ok) {
      setError(t("That code is not valid."));
      return;
    }
    disableTotp(user.id);
    if (alertsOf(user).security) {
      addNote({
        title: "Authenticator off",
        body: "Sign-in no longer asks for an authenticator code.",
      });
    }
    setTurningOff(false);
    setCode("");
    setError("");
    toast(t("Authenticator is off."));
  }

  function renew(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.totpSecret) return;
    if (!verifyTotp(user.totpSecret, code)) {
      setError(t("That code does not match."));
      return;
    }
    const next = createRecoveryCodes();
    enableTotp(user.id, user.totpSecret, next);
    setCodes(next);
    setCode("");
    setError("");
  }

  return (
    <section className="panel">
      <h2>{t("Two-factor authentication")}</h2>
      <p className="muted">
        {enabled
          ? t(
              "On. Sign-in asks for a 6-digit code from your authenticator app.",
            )
          : t("Off. Sign-in does not ask for an authenticator code.")}
      </p>

      {codes ? (
        <div className="stack">
          <h3>{t("Recovery codes")}</h3>
          <p className="muted">
            {t(
              "Each code works once if you cannot open the app. They stay in this browser.",
            )}
          </p>
          <ul className="recovery-grid">
            {codes.map((item) => (
              <li key={item} className="mono">
                {item}
              </li>
            ))}
          </ul>
          <div className="form-row">
            <CopyButton value={codes.join("\n")} label="Copy codes" />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setCodes(null);
                setSecret("");
              }}
            >
              {t("Continue")}
            </button>
          </div>
        </div>
      ) : secret ? (
        <form className="stack" onSubmit={confirmSetup}>
          <p>
            {t(
              "Add this key in an authenticator app, then enter the 6-digit code.",
            )}
          </p>
          <p className="muted">
            {t(
              "The key stays in this browser. Codes are checked here, not by a bank.",
            )}
          </p>
          <p className="kicker">{t("Setup key")}</p>
          <p className="mono totp-key">{groupSecret(secret)}</p>
          <CopyButton value={secret} label="Copy" />
          <label className="field">
            <span>{t("6-digit code")}</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-row">
            <button
              type="button"
              className="text-button"
              onClick={() => setSecret("")}
            >
              {t("Cancel")}
            </button>
            <button className="btn btn-primary" type="submit">
              {t("Confirm")}
            </button>
          </div>
        </form>
      ) : enabled && turningOff ? (
        <form className="stack" onSubmit={confirmOff}>
          <p className="muted">
            {t("Enter a current 6-digit code or a recovery code.")}
          </p>
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
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-row">
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setTurningOff(false);
                setError("");
                setCode("");
              }}
            >
              {t("Cancel")}
            </button>
            <button className="btn btn-primary" type="submit">
              {t("Turn off authenticator")}
            </button>
          </div>
        </form>
      ) : enabled ? (
        <div className="stack">
          <p className="muted">
            {t("{count} recovery codes left.", {
              count: user.recoveryCodes?.length ?? 0,
            })}
          </p>
          <form className="stack" onSubmit={renew}>
            <label className="field">
              <span>{t("6-digit code")}</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
              />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="form-row">
              <button className="btn btn-ghost" type="submit">
                {t("New recovery codes")}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setTurningOff(true);
                  setCode("");
                  setError("");
                }}
              >
                {t("Turn off authenticator")}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button type="button" className="btn btn-primary" onClick={start}>
          {t("Set up authenticator")}
        </button>
      )}
    </section>
  );
}
