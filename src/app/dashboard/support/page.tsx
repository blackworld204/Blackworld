"use client";

import { useEffect, useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SupportCenter } from "@/components/support-center";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { when } from "@/lib/bank";
import { CONTACT_EMAIL } from "@/lib/contact";
import { firebaseAuth } from "@/lib/firebase";
import { messageFailure } from "@/lib/message-error";

const TOPICS = ["General", "Technical", "Account", "Transaction", "Security", "Other"];

type InboxRow = { id: string; at: string; name: string; email: string; topic: string; message: string };

function AdminInbox({ locale }: { locale: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<InboxRow[] | null>(null);

  useEffect(() => {
    const auth = firebaseAuth();
    const current = auth?.currentUser;
    if (!current) return;
    const controller = new AbortController();
    void current.getIdToken().then((token) =>
      fetch("/api/messages", { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
    )
      .then(async (response) => {
        if (!response?.ok) return;
        const data = (await response.json()) as { messages?: InboxRow[] };
        if (Array.isArray(data.messages)) setRows(data.messages);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!rows) return null;
  return (
    <section className="stack">
      <h2>{t("Inbox")}</h2>
      {rows.length === 0 ? <p className="muted">{t("No messages yet.")}</p> : null}
      <ul className="tx-list">
        {rows.map((item) => (
          <li key={item.id}>
            <div>
              <strong>
                {item.name} · {t(item.topic)}
              </strong>
              <span className="muted">
                {item.email} · {when(item.at, locale)}
              </span>
              <span>{item.message}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SupportPage() {
  const { user } = useAccount();
  const { t, locale } = useI18n();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);

  if (!user) return <div className="app-hold" />;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !user) return;
    if (message.trim().length < 12) return setError(t("Write a short note, at least a sentence."));
    setError("");
    setAsk(true);
  }

  function send() {
    if (!user) return;
    setAsk(false);
    setBusy(true);
    void fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: user.name,
        email: user.email,
        topic,
        message: message.trim(),
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          setError(t(await messageFailure(response)));
          return;
        }
        setSent(true);
      })
      .catch(() => setError(t("The message could not be reached. Try again.")))
      .finally(() => setBusy(false));
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Support")}</p>
        <h1>{t("We read this desk.")}</h1>
        <p className="lede">
          {t("Messages from {email} go to {contact}.", { email: user.email, contact: CONTACT_EMAIL })}
        </p>
      </header>
      {user.role === "admin" ? <AdminInbox locale={locale} /> : null}
      <SupportCenter desk />
      <section className="support-form">
        <h2>{t("Send a message")}</h2>
        {sent ? (
          <p>{t("Received. A reply goes to {email}.", { email: user.email })}</p>
        ) : (
          <form className="stack" onSubmit={submit}>
            <label className="field">
              <span>{t("Topic")}</span>
              <select value={topic} onChange={(event) => setTopic(event.target.value)}>
                {TOPICS.map((item) => (
                  <option key={item} value={item}>
                    {t(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("Message")}</span>
              <textarea rows={5} value={message} onChange={(event) => setMessage(event.target.value)} />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <BusyButton className="btn btn-primary" type="submit" busy={busy}>
              {t("Send message")}
            </BusyButton>
          </form>
        )}
      </section>
      <ConfirmDialog
        open={ask}
        title={t("Send this message?")}
        body={t("It goes to the desk.")}
        confirmLabel={t("Send message")}
        onClose={() => setAsk(false)}
        onConfirm={send}
      />
    </div>
  );
}
