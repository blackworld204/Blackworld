"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";

const frames = [
  {
    label: "Account",
    kicker: "POST /v1/accounts",
    title: "Business account",
    detail: "USD · Active",
  },
  {
    label: "Card",
    kicker: "POST /v1/cards",
    title: "Virtual · 4412",
    detail: "Spend limit 25,000 USD · Active",
  },
  {
    label: "Payment",
    kicker: "POST /v1/payments",
    title: "240,000.00 USD",
    detail: "Wire · Settled",
  },
];

export function DemoPlayer() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const frame = frames[index];
  const { t } = useI18n();

  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % frames.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <div className="page">
      <div className="wrap wide">
        <header className="page-intro">
          <h1>{t("Accounts, cards, and payments")}</h1>
        </header>
        <div className="demo-stage" aria-live="polite">
          <p className="kicker kicker-light">
            {frame.kicker}
          </p>
          <div>
            <strong>{t(frame.title)}</strong>
            <p className="stage-detail">{t(frame.detail)}</p>
          </div>
        </div>
        <div className="demo-tabs" role="tablist" aria-label={t("Steps")}>
          {frames.map((item, itemIndex) => (
            <button
              key={item.label}
              type="button"
              role="tab"
              aria-current={itemIndex === index ? "step" : undefined}
              aria-selected={itemIndex === index}
              onClick={() => setIndex(itemIndex)}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
        <div className="form-row">
          <button
            type="button"
            className="text-button"
            aria-pressed={!playing}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? t("Pause") : t("Play")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIndex((value) => (value + 1) % frames.length)}
          >
            {t("Next")}
          </button>
        </div>
      </div>
    </div>
  );
}
