"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/provider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="page">
      <div className="wrap narrow">
        <header className="page-intro">
          <h1>{t("Missing page")}</h1>
        </header>
        <Link className="btn btn-primary" href="/">
          {t("Back home")}
        </Link>
      </div>
    </div>
  );
}
