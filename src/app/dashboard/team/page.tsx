"use client";

import { useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { PasswordStrength } from "@/components/password-strength";
import { SecretInput } from "@/components/secret-input";
import { PhoneInput } from "@/components/phone-input";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { authErrorMessage } from "@/components/session";
import { inviteMember, removeMember } from "@/lib/bank";
import { createPresentationUser } from "@/lib/firebase";
import { isStrongPassword, strongPasswordMessage } from "@/lib/password-strength";

export default function TeamPage() {
  const { state, user } = useAccount();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [drop, setDrop] = useState<{ id: string; name: string } | null>(null);

  if (!state || !user) return <div className="app-hold" />;
  if (user.role !== "admin") {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{t("Team")}</p>
          <h1>{t("Administrators only")}</h1>
          <p className="lede">{t("Colleagues on this account.")}</p>
        </header>
      </div>
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (user?.role !== "admin") return setError(t("Only an admin can invite."));
    if (name.trim().length < 2) return setError(t("Enter a name."));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t("Enter a work email."));
    if (!isStrongPassword(password)) return setError(t(strongPasswordMessage));
    if (phone.trim().length < 6) return setError(t("Enter a phone number."));
    setError("");
    setAsk(true);
  }

  function invite() {
    setAsk(false);
    const nextPin = String(Math.floor(1000 + Math.random() * 9000));
    setBusy(true);
    void createPresentationUser(email.trim(), password)
      .then(() => {
        const result = inviteMember({ name: name.trim(), email: email.trim(), phone: phone.trim(), pin: nextPin });
        if (result.error) {
          setError(t(result.error));
          return;
        }
        setName("");
        setEmail("");
        setPhone("");
        setPassword("");
        setError("");
        setPin(nextPin);
        toast(t("Invitation ready."));
      })
      .catch((reason: unknown) => {
        setError(t(authErrorMessage(reason)));
      })
      .finally(() => setBusy(false));
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Team")}</p>
        <h1>{t("Colleagues")}</h1>
        <p className="lede">{t("Each colleague has a separate account.")}</p>
      </header>
      <ul className="tx-list">
        {state.users.map((member) => (
          <li key={member.id}>
            <div>
              <strong>{member.name}</strong>
              <span className="muted team-meta">
                <span>{member.email}</span>
                <span className={member.role === "admin" ? "admin-pill is-role" : "admin-pill"}>
                  {member.role === "admin" ? t("Admin") : t("Member")}
                </span>
                <span className={member.status === "active" ? "admin-pill is-on" : "admin-pill is-off"}>
                  {member.status === "active" ? t("Active") : t("Inactive")}
                </span>
              </span>
            </div>
            {user.role === "admin" && member.role === "member" ? (
              <button type="button" className="text-button" onClick={() => setDrop({ id: member.id, name: member.name })}>
                {t("Remove")}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {pin ? (
        <p className="lede">
          {t("Temporary PIN")} <span className="mono">{pin}</span>
        </p>
      ) : null}
      {user.role === "admin" ? (
        <form className="stack" onSubmit={submit}>
          <h2>{t("Invite a colleague")}</h2>
          <label className="field">
            <span>{t("Name")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("Work email")}</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("Password")}</span>
            <SecretInput
              autoComplete="new-password"
              value={password}
              showLabel={t("Show password")}
              hideLabel={t("Hide password")}
              onChange={setPassword}
            />
            <PasswordStrength password={password} />
          </label>
          <div className="field">
            <PhoneInput label={t("Phone number")} value={phone} onChange={setPhone} />
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <BusyButton className="btn btn-primary" type="submit" busy={busy}>
            {t("Invite")}
          </BusyButton>
        </form>
      ) : (
        <p className="muted">{t("Only an admin can invite.")}</p>
      )}
      <ConfirmDialog
        open={drop !== null}
        title={t("Remove this colleague?")}
        body={t("{name} and their balance leave this desk.", { name: drop?.name ?? "" })}
        confirmLabel={t("Remove")}
        onClose={() => setDrop(null)}
        onConfirm={() => {
          if (!drop) return;
          const failed = removeMember(user.id, drop.id);
          setDrop(null);
          if (failed) {
            toast(t(failed));
            return;
          }
          toast(t("Member removed."));
        }}
      />
      <ConfirmDialog
        open={ask}
        title={t("Invite this colleague?")}
        body={t("{email} gets a separate account.", { email: email.trim() })}
        confirmLabel={t("Invite")}
        onClose={() => setAsk(false)}
        onConfirm={invite}
      />
    </div>
  );
}
