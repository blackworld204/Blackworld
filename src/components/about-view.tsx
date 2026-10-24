"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_DISPLAY,
  CONTACT_WHATSAPP,
} from "@/lib/contact";

export function AboutView() {
  const { t } = useI18n();
  return (
    <div className="page">
      <div className="wrap prose">
        <header className="page-intro">
          <h1>Blackworld</h1>
        </header>
        <p>
          {t(
            "Blackworld is banking infrastructure for businesses, fintechs, and institutions. The stack covers USD accounts, card issuance, and global payments behind one API.",
          )}
        </p>
        <p>
          {t(
            "Retail banking ended in October 2025. New relationships are institutional only. The bank is full-reserve and licensed by OCIF in Puerto Rico.",
          )}
        </p>
        <p>254 San José Street, San Juan, PR 00901.</p>
        <p>
          <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE_DISPLAY}</a>
          {" · "}
          <a href={CONTACT_WHATSAPP} target="_blank" rel="noopener noreferrer">
            {t("WhatsApp")}
          </a>
          {" · "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
        <div className="actions">
          <Link className="btn btn-primary" href="/register">
            {t("Create account")}
          </Link>
          <Link className="btn btn-ghost" href="/legal/compliance">
            {t("Compliance")}
          </Link>
        </div>
      </div>
    </div>
  );
}
