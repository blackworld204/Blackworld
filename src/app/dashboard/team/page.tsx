"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { inviteMember, removeMember } from "@/lib/bank";

export default function TeamPage() {
  const { state, user } = useAccount();
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");
  const [drop, setDrop] = useState<{ id: string; name: string } | null>(null);

  if (!state || !user) return <div className="app-hold" />;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (user?.role !== "admin") return setError(t("Only an admin can invite."));
    if (name.trim().length < 2) return setError(t("Enter a name."));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t("Enter a work email."));
    if (phone.trim().length < 6) return setError(t("Enter a phone number."));
    const nextPin = String(Math.floor(1000 + Math.random() * 9000));
    const result = inviteMember({ name: name.trim(), email: email.trim(), phone: phone.trim(), pin: nextPin });
    if (result.error) return setError(t(result.error));
    setName("");
    setEmail("");
    setPhone("");
    setError("");
    setPin(nextPin);
    toast(t("Invitation ready."));
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Team")}</p>
        <h1>{t("Colleagues")}</h1>
        <p className="lede">{t("A colleague gets a separate balance, starting at zero. Share the PIN once. Sign-in still checks password length in this browser.")}</p>
      </header>
      <ul className="tx-list">
        {state.users.map((member) => (
          <li key={member.id}>
            <div>
              <strong>{member.name}</strong>
              <span className="muted">
                {member.email} · {member.role === "admin" ? t("Admin") : t("Member")} ·{" "}
                {member.status === "active" ? t("Active") : t("Inactive")}
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
            <span>{t("Phone number")}</span>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit">
            {t("Invite")}
          </button>
        </form>
      ) : (
        <p className="muted">{t("Only an admin can invite.")}</p>
      )}
      <ConfirmDialog
        open={drop !== null}
        title={t("Remove this colleague?")}
        body={t("{name} and their balance leave this browser.", { name: drop?.name ?? "" })}
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
    </div>
  );
}
