"use client";

import { useState } from "react";
import { SupportCenter } from "@/components/support-center";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY } from "@/lib/contact";

const TOPICS = ["General", "Technical", "Account", "Transaction", "Security", "Other"];

export default function SupportPage() {
  const { user } = useAccount();
  const { t } = useI18n();
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (!user) return <div className="app-hold" />;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (message.trim().length < 12) return setError(t("Write a short note, at least a sentence."));
    setError("");
    setSent(true);
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Support")}</p>
        <h1>{t("We read this desk.")}</h1>
        <p className="lede">
          {t("Messages from {email} go to {contact}.", { email: user.email, contact: CONTACT_EMAIL })}{" "}
          <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE_DISPLAY}</a>
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
            <button className="btn btn-primary" type="submit">
              {t("Send message")}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
