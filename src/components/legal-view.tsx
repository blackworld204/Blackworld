"use client";

import { useI18n } from "@/i18n/provider";
import { legalPages, type LegalSlug } from "@/lib/legal";

export function LegalView({ slug }: { slug: LegalSlug }) {
  const { t } = useI18n();
  const page = legalPages[slug];
  return (
    <div className="page">
      <div className="wrap prose">
        <header className="page-intro">
          <p className="kicker">{t("Updated {date}", { date: t(page.updated) })}</p>
          <h1>{t(page.title)}</h1>
        </header>
        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2>{t(section.heading)}</h2>
            <p>{t(section.body)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
