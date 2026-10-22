"use client";

import Link from "next/link";
import { Converter } from "@/components/converter";
import { CurrencyFlag } from "@/components/currency-flag";
import { useI18n } from "@/i18n/provider";

const products = [
  {
    index: "01",
    title: "Account infrastructure",
    body: "USD business accounts, multi-currency wallets, and full-reserve protection.",
    points: ["Instant account opening API", "KYC/AML built in", "Real-time balance webhooks"],
    href: "/docs#accounts",
    image: "/photos/accounts.jpg",
  },
  {
    index: "02",
    title: "Card issuance",
    body: "Virtual and physical cards with real-time controls and global acceptance.",
    points: ["Custom card designs", "Instant virtual cards", "Spending controls API"],
    href: "/docs#cards",
    image: "/photos/cards.jpg",
  },
  {
    index: "03",
    title: "Global payments",
    body: "SWIFT, ACH, wires, and multi-currency settlement in 150+ countries.",
    points: ["Real-time FX rates", "Low-cost transfers", "Batch payment API"],
    href: "/docs#payments",
    image: "/photos/payments.jpg",
  },
];

const capabilities = [
  ["REST API", "99.99% uptime"],
  ["SDKs", "Node, Python, Ruby, PHP"],
  ["Webhooks", "Every account event"],
  ["API keys", "Issued for each account"],
  ["API", "Accounts, cards, payments, and exchange"],
  ["Support", "A person on the account"],
];

export default function HomePage() {
  const { t } = useI18n();
  return (
    <>
      <div className="wrap hero-block">
        <section className="hero">
          <div>
            <h1>{t("Accounts, cards, and payments.")}</h1>
            <p className="lede">
              {t(
                "USD accounts, cards, and global payments for businesses, fintechs, and institutions.",
              )}
            </p>
            <div className="actions">
              <Link className="btn btn-primary" href="/apply">
                {t("Apply for partnership")}
              </Link>
              <Link className="btn btn-ghost" href="/docs">
                {t("API documentation")}
              </Link>
            </div>
          </div>
          <aside className="ledger" aria-label={t("Operating account")}>
            <div className="ledger-top">
            <span>{t("Operating account")}</span>
              <span className="ccy-code">
                <CurrencyFlag code="USD" /> USD
              </span>
            </div>
            <p className="balance">12,480,220.18</p>
            <p>{t("Available")}</p>
            <ul className="ledger-list">
              <li className="ledger-row">
                <span>{t("Wire · Singapore")}</span>
                <b className="num">−240,000.00</b>
              </li>
              <li className="ledger-row">
                <span>{t("ACH · Payroll")}</span>
                <b className="num">−18,440.12</b>
              </li>
              <li className="ledger-row">
                <span className="ccy-code">
                  <CurrencyFlag code="EUR" /> {t("FX · EUR")}
                </span>
                <b className="num">+920,000.00</b>
              </li>
            </ul>
            <div className="ledger-foot">
              <span>
                <span className="status-dot" aria-hidden="true" /> {t("Operational")}
              </span>
            </div>
          </aside>
        </section>
      </div>

      <section className="section" id="platform">
        <div className="wrap">
          <h2>{t("Accounts, cards, and payments.")}</h2>
          <div className="stack">
            {products.map((product) => (
              <article key={product.index}>
                <img className="offer-photo" src={product.image} alt="" />
                <p className="idx">{product.index}</p>
                <h3>{t(product.title)}</h3>
                <p>{t(product.body)}</p>
                <ul>
                  {product.points.map((point) => (
                    <li key={point}>{t(point)}</li>
                  ))}
                </ul>
                <p className="more">
                  <Link href={product.href}>{t("Learn more")}</Link>
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-follow" id="developers">
        <div className="wrap dev-grid">
          <div>
            <h2>{t("The API")}</h2>
            <p className="lede lede-flat">
              {t("Open accounts, issue cards, and send payments.")}
            </p>
            <ul className="dev-list">
              {capabilities.map(([label, value]) => (
                <li key={label}>
                  <span>{t(label)}</span>
                  <span className="muted">{t(value)}</span>
                </li>
              ))}
            </ul>
            <div className="actions">
              <Link className="btn btn-primary" href="/docs">
                {t("View API documentation")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-follow" id="exchange">
        <div className="wrap">
          <h2>{t("Real-time currency exchange.")}</h2>
          <Converter />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>{t("Talk with us.")}</h2>
          <p>{t("Accounts, cards, and payments for institutions.")}</p>
          <div className="actions">
            <Link className="btn btn-primary" href="/apply">
              {t("Apply for partnership")}
            </Link>
            <Link className="btn btn-ghost" href="/sales">
              {t("Talk to sales")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
