"use client";

import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_PHONE, CONTACT_PHONE_DISPLAY, CONTACT_WHATSAPP } from "@/lib/contact";
import { useI18n } from "@/i18n/provider";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="site-footer">
      <div className="wrap footer-grid">
        <div>
          <p className="footer-name">Blackworld</p>
          <p className="muted">{t("Banking infrastructure for fintechs and institutions.")}</p>
          <p className="badges">
            <span>{t("OCIF licensed")}</span>
            <span>{t("SOC 2 Type II")}</span>
            <span>{t("Full-reserve bank")}</span>
          </p>
        </div>
        <div>
          <h2>{t("Platform")}</h2>
          <Link href="/docs">{t("API documentation")}</Link>
          <Link href="/support">{t("Support")}</Link>
          <Link href="/register">{t("Create account")}</Link>
          <Link href="/#exchange">{t("Exchange")}</Link>
        </div>
        <div>
          <h2>{t("Legal")}</h2>
          <Link href="/legal/terms">{t("Terms of service")}</Link>
          <Link href="/legal/privacy">{t("Privacy")}</Link>
          <Link href="/legal/compliance">{t("Compliance")}</Link>
          <Link href="/about">{t("About")}</Link>
        </div>
        <div>
          <h2>{t("Contact")}</h2>
          <p>254 San José Street</p>
          <p>San Juan, PR 00901</p>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          <a href={`tel:${CONTACT_PHONE}`}>{CONTACT_PHONE_DISPLAY}</a>
          <a href={CONTACT_WHATSAPP} target="_blank" rel="noopener noreferrer">
            {t("WhatsApp")}
          </a>
          <Link href="/support">{t("Contact support")}</Link>
        </div>
      </div>
      <div className="wrap footer-base">
        <p>{t("© 2026 Blackworld. Licensed by OCIF in Puerto Rico.")}</p>
      </div>
    </footer>
  );
}
