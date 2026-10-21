"use client";

import Link from "next/link";
import { CodeSample } from "@/components/code-sample";
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

const supporters = ["Google", "Facebook", "Netflix", "Amazon", "Apple", "Microsoft", "Spotify", "Samsung"];

const capabilities = [
  ["REST API", "99.99% uptime"],
  ["SDKs", "Node, Python, Ruby, PHP"],
  ["Webhooks", "Every account event"],
  ["Sandbox", "Test before you go live"],
  ["Docs", "Reference and guides"],
  ["Support", "A developer on the account"],
];

export default function HomePage() {
  const { t } = useI18n();
  return (
    <>
      <div className="wrap hero-block">
        <section className="hero">
          <div>
            <h1>{t("The bank behind the product.")}</h1>
            <p className="lede">
              {t(
                "Launch compliant U.S. banking products in days, not months. Full-reserve, Puerto Rico licensed, API-first.",
              )}
            </p>
            <div className="actions">
              <Link className="btn btn-primary" href="/apply">
                {t("Apply for partnership")}
              </Link>
              <Link className="btn btn-ghost" href="/docs">
                {t("Explore API docs")}
              </Link>
              <Link className="text-button" href="/demo">
                {t("Watch demo")}
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
              <span className="num">47 ms</span>
            </div>
          </aside>
        </section>
        <p className="kicker stats-label">{t("Illustrative targets")}</p>
        <dl className="stats">
          <div className="stat">
            <dt>$10B+</dt>
            <dd>{t("Transaction volume")}</dd>
          </div>
          <div className="stat">
            <dt>150+</dt>
            <dd>{t("Fintech partners")}</dd>
          </div>
          <div className="stat">
            <dt>99.99%</dt>
            <dd>{t("API uptime")}</dd>
          </div>
          <div className="stat">
            <dt>&lt; 100ms</dt>
            <dd>{t("Response time")}</dd>
          </div>
        </dl>
      </div>

      <section className="supported" aria-label={t("Built for teams like")}>
        <div className="wrap">
          <p className="kicker">{t("Built for teams like")}</p>
          <ul className="supported-list">
            {supporters.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" id="platform">
        <div className="wrap">
          <h2>{t("Everything you need to launch.")}</h2>
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
            <h2>{t("Built for speed and scale.")}</h2>
            <p className="lede lede-flat">
              {t("Deploy accounts, cards, and payments against a REST API, four SDKs, and webhooks.")}
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
          <CodeSample />
        </div>
      </section>

      <section className="section section-follow" id="exchange">
        <div className="wrap">
          <h2>{t("Real-time currency exchange.")}</h2>
          <Converter />
        </div>
      </section>

      <section className="wrap quote">
        <figure>
            <blockquote>
              {t(
                "“We opened USD accounts for customers in 40 countries in a quarter. The API held, and the full-reserve model was the first thing our treasury team asked about.”",
              )}
            </blockquote>
            <figcaption>{t("Alex Rivera, PayFlow Global, Singapore")}</figcaption>
        </figure>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>{t("Ready to build?")}</h2>
          <p>{t("Launch compliant banking products on a full-reserve bank.")}</p>
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
