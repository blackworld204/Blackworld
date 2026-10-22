"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CurrencySelect } from "@/components/currency-select";
import { LanguageSelect } from "@/components/language-select";
import { TwoFactorPanel } from "@/components/two-factor";
import { useAccount } from "@/components/use-account";
import { SignOutButton } from "@/components/sign-out-button";
import { useI18n } from "@/i18n/provider";
import { MONEY, addNote, alertsOf, patchUser, privacyOf, type BankUser, type MoneyCode } from "@/lib/bank";
import { clearPhoto, loadPhoto, savePhoto } from "@/lib/photos";
import { bindFirebasePush, releaseFirebasePush } from "@/lib/firebase-push";
import { disablePush, enablePush, pushStatus, showPush, type PushStatus } from "@/lib/push";

type Section = "profile" | "security" | "notifications" | "privacy";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
];

function splitName(name: string) {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function sectionFromHash(hash: string): Section {
  if (hash === "security") return "security";
  if (hash === "alerts" || hash === "notifications") return "notifications";
  if (hash === "privacy") return "privacy";
  return "profile";
}

export default function SettingsPage() {
  const { user } = useAccount();
  if (!user) return <div className="app-hold" />;
  return <SettingsForm key={user.id} user={user} />;
}

function SettingsForm({ user }: { user: BankUser }) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = splitName(user.name);
  const [section, setSection] = useState<Section>("profile");
  const [first, setFirst] = useState(initial.first);
  const [last, setLast] = useState(initial.last);
  const [phone, setPhone] = useState(user.phone);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pinCurrent, setPinCurrent] = useState("");
  const [pinNext, setPinNext] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [pinError, setPinError] = useState("");
  const [push, setPush] = useState<PushStatus>("off");
  const [askPhoto, setAskPhoto] = useState(false);

  const alerts = alertsOf(user);
  const privacy = privacyOf(user);
  const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "BW";

  useEffect(() => {
    setSection(sectionFromHash(window.location.hash.replace("#", "")));
    setPush(pushStatus());
  }, []);

  useEffect(() => {
    let alive = true;
    let current: string | null = null;
    if (!user.hasPhoto) {
      setPhotoUrl(null);
      return;
    }
    loadPhoto(user.id).then((next) => {
      if (!alive) {
        if (next) URL.revokeObjectURL(next);
        return;
      }
      current = next;
      setPhotoUrl(next);
    });
    return () => {
      alive = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [user.id, user.hasPhoto]);

  function openSection(next: Section) {
    setSection(next);
    const hash = next === "notifications" ? "alerts" : next === "profile" ? "" : next;
    const url = hash ? `#${hash}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!first.trim() || !last.trim()) {
      setSaved("");
      setError(t("Enter a first and last name."));
      return;
    }
    if (phone.trim().length < 7) {
      setSaved("");
      setError(t("Enter a phone number."));
      return;
    }
    patchUser(user.id, { name: `${first.trim()} ${last.trim()}`, phone: phone.trim() });
    setError("");
    setSaved(t("Profile saved."));
  }

  async function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSaved("");
      setError(t("Choose an image."));
      return;
    }
    if (file.size > 1_500_000) {
      setSaved("");
      setError(t("Use an image under 1.5 MB."));
      return;
    }
    await savePhoto(user.id, file);
    patchUser(user.id, { hasPhoto: true });
    setError("");
    setSaved(t("Photo updated."));
  }

  async function removePhoto() {
    await clearPhoto(user.id);
    patchUser(user.id, { hasPhoto: false });
    setSaved(t("Photo removed."));
  }

  function savePin(event: React.FormEvent) {
    event.preventDefault();
    if (pinCurrent !== user.pin) {
      setPinMessage("");
      setPinError(t("Current PIN does not match."));
      return;
    }
    if (!/^\d{4}$/.test(pinNext)) {
      setPinMessage("");
      setPinError(t("New PIN must be 4 digits."));
      return;
    }
    if (pinNext !== pinConfirm) {
      setPinMessage("");
      setPinError(t("PIN entries do not match."));
      return;
    }
    patchUser(user.id, { pin: pinNext });
    if (alerts.security) {
      addNote({
        userId: user.id,
        title: "PIN updated",
        body: "The transfer PIN for this account was changed.",
      });
    }
    setPinCurrent("");
    setPinNext("");
    setPinConfirm("");
    setPinError("");
    setPinMessage(t("PIN updated."));
  }

  function downloadProfile() {
    const copy = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      memberSince: user.memberSince,
    };
    const blob = new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "blackworld-profile.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Settings")}</p>
        <h1>{t("Settings")}</h1>
        <p className="lede">{t("Manage your account preferences")}</p>
      </header>

      <div className="settings-layout">
        <nav className="settings-nav" aria-label={t("Settings")}>
          {SECTIONS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={section === item.id ? "page" : undefined}
              onClick={() => openSection(item.id)}
            >
              {t(item.label)}
            </button>
          ))}
          <SignOutButton className="settings-out" />
        </nav>

        <div className="settings-panel">
          {section === "profile" ? (
            <form onSubmit={saveProfile}>
              <h2>{t("Personal information")}</h2>
              <div className="identity">
                <div className="avatar" aria-hidden="true">
                  {photoUrl ? <img src={photoUrl} alt="" /> : <span>{initials}</span>}
                </div>
                <div className="identity-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                    {t("Change photo")}
                  </button>
                  {user.hasPhoto ? (
                    <button type="button" className="text-button" onClick={() => setAskPhoto(true)}>
                      {t("Remove photo")}
                    </button>
                  ) : null}
                  <input ref={fileRef} className="sr-only" type="file" accept="image/*" onChange={onPhoto} />
                </div>
              </div>
              <div className="split">
                <label className="field">
                  <span>{t("First name")}</span>
                  <input value={first} onChange={(event) => setFirst(event.target.value)} autoComplete="given-name" />
                </label>
                <label className="field">
                  <span>{t("Last name")}</span>
                  <input value={last} onChange={(event) => setLast(event.target.value)} autoComplete="family-name" />
                </label>
              </div>
              <label className="field">
                <span>{t("Email address")}</span>
                <input value={user.email} readOnly />
              </label>
              <label className="field">
                <span>{t("Phone number")}</span>
                <input value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" inputMode="tel" />
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              {saved ? <p>{saved}</p> : null}
              <button className="btn btn-primary" type="submit">
                {t("Save profile")}
              </button>
              <ConfirmDialog
                open={askPhoto}
                title={t("Remove this photo?")}
                body={t("The profile photo will be removed.")}
                confirmLabel={t("Remove photo")}
                onClose={() => setAskPhoto(false)}
                onConfirm={() => {
                  setAskPhoto(false);
                  void removePhoto();
                }}
              />

              <h2>{t("Language")}</h2>
              <LanguageSelect variant="list" />

              <h2>{t("Desk currency")}</h2>
              <p className="muted">{t("Balances and activity open in this currency.")}</p>
              <label className="field desk-currency">
                <span>{t("Currency")}</span>
                <CurrencySelect
                  label={t("Currency")}
                  value={user.displayCurrency ?? "USD"}
                  options={MONEY.map((item) => ({ code: item.code, label: item.code }))}
                  onChange={(next) => patchUser(user.id, { displayCurrency: next as MoneyCode })}
                />
              </label>
            </form>
          ) : null}

          {section === "security" ? (
            <div>
              <h2>{t("Security")}</h2>
              <form className="stack" onSubmit={savePin}>
                <label className="field">
                  <span>{t("Current PIN")}</span>
                  <input type="password" inputMode="numeric" maxLength={4} value={pinCurrent} onChange={(event) => setPinCurrent(event.target.value)} autoComplete="off" />
                </label>
                <div className="split">
                  <label className="field">
                    <span>{t("New PIN")}</span>
                    <input type="password" inputMode="numeric" maxLength={4} value={pinNext} onChange={(event) => setPinNext(event.target.value)} autoComplete="off" />
                  </label>
                  <label className="field">
                    <span>{t("Confirm")}</span>
                    <input type="password" inputMode="numeric" maxLength={4} value={pinConfirm} onChange={(event) => setPinConfirm(event.target.value)} autoComplete="off" />
                  </label>
                </div>
                {pinError ? <p className="form-error">{pinError}</p> : null}
                {pinMessage ? <p>{pinMessage}</p> : null}
                <button className="btn btn-primary" type="submit">
                  {t("Update PIN")}
                </button>
              </form>
              <label className="choice-line">
                <input
                  type="checkbox"
                  checked={Boolean(user.twoFactor)}
                  onChange={(event) => patchUser(user.id, { twoFactor: event.target.checked })}
                />
                {t("PIN at sign-in")}
              </label>
              <TwoFactorPanel />
              <p className="muted">{t("Signed in as")} {user.email}</p>
            </div>
          ) : null}

          {section === "notifications" ? (
            <div id="alerts">
              <h2>{t("Notifications")}</h2>
              <ul className="setting-list">
                <li>
                  <div>
                    <strong>{t("Push")}</strong>
                    <span className="muted">
                      {push === "unsupported"
                        ? t("Push alerts are not available on this device.")
                        : push === "denied"
                          ? t("Alerts are blocked. Allow them in the site settings.")
                          : push === "on"
                            ? t("On. Alerts appear when money moves.")
                            : t("Off. Turn on to receive alerts when money moves.")}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-pressed={push === "on"}
                    disabled={push === "unsupported"}
                    onClick={async () => {
                      if (push === "on") {
                        await releaseFirebasePush(user.id);
                        disablePush();
                        setPush("off");
                        return;
                      }
                      const next = await enablePush();
                      if (next === "on") await bindFirebasePush(user.id).catch(() => undefined);
                      setPush(next);
                      if (next === "on") {
                        await showPush(t("Push is on"), t("Alerts appear when money moves."), "push-on");
                      }
                    }}
                  >
                    {push === "on" ? t("On") : t("Off")}
                  </button>
                </li>
                <li>
                  <div>
                    <strong>{t("Money movement")}</strong>
                    <span className="muted">{t("A notice when money arrives or leaves.")}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-pressed={alerts.transfers}
                    onClick={() => patchUser(user.id, { alerts: { ...alerts, transfers: !alerts.transfers } })}
                  >
                    {alerts.transfers ? t("On") : t("Off")}
                  </button>
                </li>
                <li>
                  <div>
                    <strong>{t("Security")}</strong>
                    <span className="muted">{t("PIN changes and new sign-ins.")}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-pressed={alerts.security}
                    onClick={() => patchUser(user.id, { alerts: { ...alerts, security: !alerts.security } })}
                  >
                    {alerts.security ? t("On") : t("Off")}
                  </button>
                </li>
                <li>
                  <div>
                    <strong>{t("Statements")}</strong>
                    <span className="muted">{t("A notice when a statement is ready.")}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-pressed={alerts.statements}
                    onClick={() => patchUser(user.id, { alerts: { ...alerts, statements: !alerts.statements } })}
                  >
                    {alerts.statements ? t("On") : t("Off")}
                  </button>
                </li>
              </ul>
              <p>
                <Link href="/dashboard/notifications">{t("Open notifications")}</Link>
              </p>
            </div>
          ) : null}

          {section === "privacy" ? (
            <div>
              <h2>{t("Privacy")}</h2>
              <ul className="setting-list">
                <li>
                  <div>
                    <strong>{t("Statements")}</strong>
                    <span className="muted">{t("Print the account email on statements.")}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-pressed={privacy.statementEmail}
                    onClick={() => patchUser(user.id, { privacy: { ...privacy, statementEmail: !privacy.statementEmail } })}
                  >
                    {privacy.statementEmail ? t("On") : t("Off")}
                  </button>
                </li>
                <li>
                  <div>
                    <strong>{t("Product notes")}</strong>
                    <span className="muted">{t("Allow notes about the service on this account.")}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    aria-pressed={privacy.marketing}
                    onClick={() => patchUser(user.id, { privacy: { ...privacy, marketing: !privacy.marketing } })}
                  >
                    {privacy.marketing ? t("On") : t("Off")}
                  </button>
                </li>
              </ul>
              <button type="button" className="btn" onClick={downloadProfile}>
                {t("Download profile")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
