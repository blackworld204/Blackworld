"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY } from "@/lib/contact";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ContactForm({
  title,
  fields,
  embedded = false,
}: {
  title: string;
  fields: "sales" | "support";
  embedded?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(CONTACT_EMAIL);
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState("Accounts");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const { t } = useI18n();

  if (done) {
    const success = (
      <>
        <p className="success-mark">{t("Sent")}</p>
        <header className="page-intro">
          <h1>{t("We'll reply at {email}", { email })}</h1>
        </header>
        <Link href="/" className="btn btn-primary">
          {t("Back home")}
        </Link>
      </>
    );
    if (embedded) return <div className="support-sent">{success}</div>;
    return (
      <div className="page">
        <div className="wrap narrow">{success}</div>
      </div>
    );
  }

  const form = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (name.trim().length < 2) {
          setError(t("Enter your name."));
          return;
        }
        if (!validEmail(email)) {
          setError(t("Enter a work email."));
          return;
        }
        if (fields === "sales" && company.trim().length < 2) {
          setError(t("Enter the company name."));
          return;
        }
        if (fields === "support" && message.trim().length < 8) {
          setError(t("Add a short message."));
          return;
        }
        setError("");
        setDone(true);
      }}
    >
          <label className="field">
            <span>{t("Name")}</span>
            <input
              autoComplete="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
            />
          </label>
          <label className="field">
            <span>{t("Work email")}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
            />
          </label>
          {fields === "sales" ? (
            <label className="field">
              <span>{t("Company")}</span>
              <input
                autoComplete="organization"
                value={company}
                onChange={(event) => {
                  setCompany(event.target.value);
                  setError("");
                }}
              />
            </label>
          ) : (
            <label className="field">
              <span>{t("Topic")}</span>
              <select value={topic} onChange={(event) => setTopic(event.target.value)}>
                {["Accounts", "Cards", "Payments", "API", "Something else"].map((item) => (
                  <option key={item} value={item}>
                    {t(item)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>{fields === "sales" ? t("What do you want to launch?") : t("Message")}</span>
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setError("");
              }}
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-row">
            <Link href="/" className="text-button">
              {t("Cancel")}
            </Link>
            <button className="btn btn-primary" type="submit">
              {fields === "sales" ? t("Talk to sales") : t("Send")}
            </button>
          </div>
        </form>
  );

  if (embedded) return form;

  return (
    <div className="page">
      <div className="wrap narrow">
        <header className="page-intro">
          <h1>{t(title)}</h1>
          <p className="lede">
            <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE_DISPLAY}</a>
            {" · "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </header>
        {form}
      </div>
    </div>
  );
}
