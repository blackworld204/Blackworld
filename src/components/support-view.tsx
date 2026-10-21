"use client";

import { ContactForm } from "@/components/contact-form";
import { SupportCenter } from "@/components/support-center";
import { useI18n } from "@/i18n/provider";

export function SupportView() {
  const { t } = useI18n();
  return (
    <div className="page">
      <div className="wrap support-layout">
        <header className="page-intro">
          <p className="kicker">{t("Support")}</p>
          <h1>{t("Support")}</h1>
        </header>
        <SupportCenter />
        <section className="support-form">
          <h2>{t("Send a message")}</h2>
          <ContactForm title="Support" fields="support" embedded />
        </section>
      </div>
    </div>
  );
}
