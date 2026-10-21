"use client";

import { useState } from "react";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { TwoFactorPanel } from "@/components/two-factor";
import { patchUser } from "@/lib/bank";

export default function SecurityPage() {
  const { user } = useAccount();
  const { t } = useI18n();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!user) return <div className="app-hold" />;

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (current !== user?.pin) {
      const message = t("Current PIN does not match.");
      toast(message);
      return setError(message);
    }
    if (!/^\d{4}$/.test(next)) return setError(t("New PIN must be 4 digits."));
    if (next !== confirm) return setError(t("PIN entries do not match."));
    patchUser(user!.id, { pin: next });
    setCurrent("");
    setNext("");
    setConfirm("");
    setError("");
    const saved = t("PIN updated.");
    setMessage(saved);
    toast(saved);
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Security")}</p>
        <h1>{t("This browser")}</h1>
        <p className="lede">{t("Change the PIN that authorizes transfers. The PIN stays in this browser.")}</p>
        {user.pin === "2580" ? (
          <p className="lede">{t("This sample account still uses PIN 2580.")}</p>
        ) : null}
      </header>
      <form className="stack" onSubmit={save}>
        <label className="field">
          <span>{t("Current PIN")}</span>
          <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={current} onChange={(event) => setCurrent(event.target.value)} />
        </label>
        <div className="split">
          <label className="field">
            <span>{t("New PIN")}</span>
            <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={next} onChange={(event) => setNext(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("Confirm")}</span>
            <input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </label>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p>{message}</p> : null}
        <button className="btn btn-primary" type="submit">
          {t("Update PIN")}
        </button>
      </form>
      <section className="panel">
        <h2>{t("Sign-in checks")}</h2>
        <label className="choice-line">
            <input
              type="checkbox"
              checked={Boolean(user.twoFactor)}
              onChange={(event) => patchUser(user.id, { twoFactor: event.target.checked })}
            />
          {t("Ask for the transfer PIN when signing in.")}
        </label>
        <p className="muted">{user.twoFactor ? t("Sign-in asks for the 4-digit PIN.") : t("Off. Password length is the only check today.")}</p>
      </section>
      <TwoFactorPanel />
      <section className="panel">
        <h2>{t("Sessions")}</h2>
        <ul className="tx-list">
          <li>
            <div>
              <strong>{t("This browser")}</strong>
              <span className="muted">{t("Current")} · {user.email}</span>
            </div>
            <span className="mono">{t("Active")}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
