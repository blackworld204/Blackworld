"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
  const [ask, setAsk] = useState<null | "on" | "off" | "codes">(null);

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
    setError("");
    setAsk("on");
  }

  function commitSetup() {
    const next = createRecoveryCodes();
    enableTotp(user!.id, secret, next);
    addNote({
      userId: user!.id,
      title: "Multi-factor enrollment",
      body: "An authenticator was added to this account. Sign-in now asks for a code from that app.",
      channel: "security",
    });
    setCodes(next);
    setSecret("");
    setCode("");
    setError("");
    toast(t("Authenticator is on."));
  }

  function confirmOff(event: React.FormEvent) {
    event.preventDefault();
    if (!user?.totpSecret) return;
    const normalized = code.replace(/[\s-]/g, "").toUpperCase();
    const formatted = normalized.length === 8 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : "";
    const ok = verifyTotp(user.totpSecret, code) || Boolean(formatted && user.recoveryCodes?.includes(formatted));
    if (!ok) {
      setError(t("That code is not valid."));
      return;
    }
    setError("");
    setAsk("off");
  }

  function commitOff() {
    if (!user?.totpSecret) return;
    if (!verifyTotp(user.totpSecret, code)) consumeRecoveryCode(user.id, code);
    disableTotp(user.id);
    if (alertsOf(user).security) {
      addNote({
        userId: user.id,
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
    setError("");
    setAsk("codes");
  }

  function commitCodes() {
    if (!user?.totpSecret) return;
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
              "Each code works once if you cannot open the app.",
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
              "Codes from this key are checked at sign-in.",
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
      <ConfirmDialog
        open={ask !== null}
        title={
          ask === "off"
            ? t("Turn off the authenticator?")
            : ask === "codes"
              ? t("Replace the recovery codes?")
              : t("Turn on the authenticator?")
        }
        body={
          ask === "off"
            ? t("Sign-in will no longer ask for a code.")
            : ask === "codes"
              ? t("The current codes stop working.")
              : t("Sign-in will ask for a code.")
        }
        confirmLabel={ask === "off" ? t("Turn off") : ask === "codes" ? t("Replace codes") : t("Turn on")}
        onClose={() => setAsk(null)}
        onConfirm={() => {
          const choice = ask;
          setAsk(null);
          if (choice === "on") commitSetup();
          if (choice === "off") commitOff();
          if (choice === "codes") commitCodes();
        }}
      />
    </section>
  );
}
