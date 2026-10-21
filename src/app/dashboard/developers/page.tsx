"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { issueApiKey, patchUser, when } from "@/lib/bank";

export default function DevelopersPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [askRotate, setAskRotate] = useState(false);

  if (!state || !user) return <div className="app-hold" />;
  const events = state.events.filter((item) => item.userId === user.id);

  async function copyKey() {
    if (!user?.apiKey) return;
    try {
      await navigator.clipboard.writeText(user.apiKey);
      toast(t("Key copied."));
    } catch {
      toast(t("Select the key and copy it."));
    }
  }

  function saveUrl(event: React.FormEvent) {
    event.preventDefault();
    const next = url.trim();
    if (next && !/^https:\/\/.+/i.test(next)) return setError(t("Enter an https URL."));
    patchUser(user!.id, { webhookUrl: next });
    setUrl("");
    setError("");
    toast(t("URL saved."));
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Developers")}</p>
        <h1>{t("Sandbox")}</h1>
        <p className="lede">{t("The key and the event list stay in this browser. A saved webhook URL is not called.")}</p>
      </header>
      <section className="stack">
        <h2>{t("Sandbox key")}</h2>
        <p className="mono">{user.apiKey ?? t("No key yet.")}</p>
        <div className="form-row">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              if (user.apiKey) {
                setAskRotate(true);
                return;
              }
              issueApiKey(user.id);
              toast(t("Key created."));
            }}
          >
            {user.apiKey ? t("Rotate key") : t("Create key")}
          </button>
          {user.apiKey ? (
            <button type="button" className="btn btn-ghost" onClick={() => void copyKey()}>
              {t("Copy key")}
            </button>
          ) : null}
        </div>
      </section>
      <form className="stack" onSubmit={saveUrl}>
        <h2>{t("Webhook URL")}</h2>
        <p className="muted">{user.webhookUrl || t("None saved.")}</p>
        <label className="field">
          <span>{t("Webhook URL")}</span>
          <input value={url} placeholder="https://" onChange={(event) => setUrl(event.target.value)} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-ghost" type="submit">
          {t("Save URL")}
        </button>
      </form>
      <h2>{t("Events")}</h2>
      {events.length === 0 ? <p className="muted">{t("No events yet. A transfer, deposit, or exchange writes one here.")}</p> : null}
      <ul className="tx-list">
        {events.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{t(item.title)}</strong>
              <span className="muted">
                {item.body} · {when(item.at, locale)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={askRotate}
        title={t("Rotate the sandbox key?")}
        body={t("The current key stops working in this browser.")}
        confirmLabel={t("Rotate key")}
        onClose={() => setAskRotate(false)}
        onConfirm={() => {
          issueApiKey(user.id);
          setAskRotate(false);
          toast(t("Key rotated."));
        }}
      />
    </div>
  );
}
