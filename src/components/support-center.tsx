"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { openLiveChat } from "@/components/live-chat";
import { useSession } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY, CONTACT_WHATSAPP } from "@/lib/contact";

const QUESTIONS = [
  {
    q: "Who can open an account?",
    a: "Businesses, fintechs, and institutions. Retail banking ended in October 2025.",
  },
  {
    q: "How do I reach a person?",
    a: `Open live chat, call or WhatsApp ${CONTACT_PHONE_DISPLAY}, or write to ${CONTACT_EMAIL}. A reply goes to the email you enter.`,
  },
  {
    q: "How soon will you reply?",
    a: "Live chat is open on this site. A reply goes out within one business day.",
  },
  {
    q: "Where is Blackworld licensed?",
    a: "By OCIF in Puerto Rico, at 254 San José Street, San Juan, PR 00901. The bank is full-reserve: deposits are not lent.",
  },
  {
    q: "How do I send or exchange money?",
    a: "Transfers and exchange are on the account. Exchange uses the ECB reference rate and a 0.5% fee.",
  },
  {
    q: "Where is the API?",
    a: "The API covers accounts, cards, payments, and foreign exchange.",
  },
  {
    q: "I cannot sign in.",
    a: "Use the email and password on the account.",
  },
];

export function SupportCenter({ desk = false }: { desk?: boolean }) {
  const { t } = useI18n();
  const { session } = useSession();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(QUESTIONS[0].q);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return QUESTIONS;
    return QUESTIONS.filter((item) => `${item.q} ${item.a}`.toLowerCase().includes(needle));
  }, [query]);

  return (
    <div className="support-center">
      <section>
        <h2>{t("How can we help?")}</h2>
        <p className="lede">
          {t("Start a live chat, or send a note from this page. Replies come from {email}.", { email: CONTACT_EMAIL })}
        </p>
        <dl className="channels">
          <div>
            <dt>{t("Live chat")}</dt>
            <dd>
              <button type="button" className="text-button" onClick={openLiveChat}>
                {t("Start a chat")}
              </button>
              <span className="muted">{t("Opens tawk.to on this page.")}</span>
            </dd>
          </div>
          <div>
            <dt>{t("Email")}</dt>
            <dd>
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              <span className="muted">{t("A reply within one business day.")}</span>
            </dd>
          </div>
          <div>
            <dt>{t("Phone")}</dt>
            <dd>
              <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE_DISPLAY}</a>
              <span className="muted">{t("Call this number for support.")}</span>
            </dd>
          </div>
          <div>
            <dt>{t("WhatsApp")}</dt>
            <dd>
              <a href={CONTACT_WHATSAPP} target="_blank" rel="noopener noreferrer">
                {CONTACT_PHONE_DISPLAY}
              </a>
              <span className="muted">{t("Message this number on WhatsApp.")}</span>
            </dd>
          </div>
          {desk ? null : (
            <div>
              <dt>{t("Signed-in desk")}</dt>
              <dd>
                {session ? (
                  <Link href="/dashboard/support">{t("Open the support desk")}</Link>
                ) : (
                  <Link href="/login">{t("Login")}</Link>
                )}
                <span className="muted">{t("Messages use the email on the account.")}</span>
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section>
        <h2>{t("Common questions")}</h2>
        <label className="field">
          <span>{t("Search questions")}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </label>
        {visible.length === 0 ? (
          <p className="muted">{t("No questions match that search.")}</p>
        ) : (
          <ul className="support-list">
            {visible.map((item) => {
              const expanded = open === item.q;
              return (
                <li key={item.q}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : item.q)}
                  >
                    {t(item.q)}
                    <span aria-hidden="true">{expanded ? "–" : "+"}</span>
                  </button>
                  {expanded ? <p>{t(item.a)}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
