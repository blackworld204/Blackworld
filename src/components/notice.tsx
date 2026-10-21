"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";

const KEY = "blackworld-notice-dismissed";

export function Notice() {
  const [visible, setVisible] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setVisible(localStorage.getItem(KEY) !== "1");
  }, []);

  if (!visible) return null;

  return (
    <div className="notice" role="status">
      <p>
        <strong>{t("Notice.")}</strong>{" "}
        {t("Retail banking ended Oct 2025. Now serving businesses, fintechs and institutions exclusively.")}
      </p>
      <div className="notice-actions">
        <button
          type="button"
          aria-label={t("Dismiss notice")}
          onClick={() => {
            localStorage.setItem(KEY, "1");
            setVisible(false);
          }}
        >
          {t("Close")}
        </button>
        <Link href="/about" className="notice-more">
          {t("Details")}
        </Link>
      </div>
    </div>
  );
}
