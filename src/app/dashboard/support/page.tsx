"use client";

import { useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { SupportCenter } from "@/components/support-center";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY, CONTACT_WHATSAPP } from "@/lib/contact";

const TOPICS = ["General", "Technical", "Account", "Transaction", "Security", "Other"];

export default function SupportPage() {
  const { user } = useAccount();
  const { t } = useI18n();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return <div className="app-hold" />;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !user) return;
    if (message.trim().length < 12) return setError(t("Write a short note, at least a sentence."));
    setBusy(true);
    setError("");
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
      .then((response) => {
        if (!response.ok) {
          setError(t("The message did not send. Try again."));
          return;
        }
        setSent(true);
      })
      .catch(() => setError(t("The message did not send. Try again.")))
      .finally(() => setBusy(false));
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Support")}</p>
        <h1>{t("We read this desk.")}</h1>
        <p className="lede">
          {t("Messages from {email} go to {contact}.", { email: user.email, contact: CONTACT_EMAIL })}{" "}
          <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE_DISPLAY}</a>
          {" · "}
          <a href={CONTACT_WHATSAPP} target="_blank" rel="noopener noreferrer">
            {t("WhatsApp")}
          </a>
        </p>
      </header>
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
    </div>
  );
}
