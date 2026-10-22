"use client";

import { useI18n } from "@/i18n/provider";
import { legalPages, type LegalSlug } from "@/lib/legal";

function anchor(heading: string) {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function clausesOf(section: (typeof legalPages)[LegalSlug]["sections"][number]) {
  if ("clauses" in section) return section.clauses;
  return [section.body];
}

export function LegalView({ slug }: { slug: LegalSlug }) {
  const { t } = useI18n();
  const page = legalPages[slug];
  const longForm = page.sections.length > 6;
  return (
    <div className="page">
      <div className="wrap legal-doc">
        <header className="page-intro">
          <p className="kicker">{t("Updated {date}", { date: t(page.updated) })}</p>
          <h1>{t(page.title)}</h1>
        </header>
        {longForm ? (
          <nav className="legal-toc" aria-label={t("Contents")}>
            <h2>{t("Contents")}</h2>
            <ol>
              {page.sections.map((section) => (
                <li key={section.heading}>
                  <a href={`#${anchor(section.heading)}`}>{t(section.heading)}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <div className="legal-articles">
          {page.sections.map((section) => (
            <section key={section.heading} id={anchor(section.heading)}>
              <h2>{t(section.heading)}</h2>
              <ol className="legal-clauses">
                {clausesOf(section).map((clause) => (
                  <li key={clause}>{t(clause)}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
