"use client";

import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { useI18n } from "@/i18n/provider";

const endpoints = [
  {
    id: "accounts",
    method: "POST",
    path: "/v1/accounts",
    detail: "Open a USD business account with KYC and AML attached.",
  },
  {
    id: "accounts-read",
    method: "GET",
    path: "/v1/accounts/:id",
    detail: "Balance, status, and currency for one account.",
  },
  {
    id: "cards",
    method: "POST",
    path: "/v1/cards",
    detail: "Issue a virtual or physical card and set a spend limit.",
  },
  {
    id: "payments",
    method: "POST",
    path: "/v1/payments",
    detail: "Send a SWIFT, ACH, or wire. Batch with /v1/payments/batch.",
  },
  {
    id: "fx",
    method: "GET",
    path: "/v1/fx/rates",
    detail: "Mid-market rates across 150+ currencies.",
  },
  {
    id: "quote",
    method: "POST",
    path: "/v1/fx/quotes",
    detail: "Lock a conversion. Average fee 0.5%.",
  },
];

export function DocsView() {
  const { t } = useI18n();
  return (
    <div className="page">
      <div className="wrap">
        <header className="page-intro">
          <h1>{t("API")}</h1>
        </header>
        <div className="docs-meta">
          <code>https://api.blackworld.com</code>
          <CopyButton value="https://api.blackworld.com" label="Copy base URL" />
          <code>Authorization: Bearer</code>
        </div>
        <div className="prose docs-intro">
          <p>
            {t("SDKs ship for Node.js, Python, Ruby, and PHP. Webhooks cover account, card, and payment events.")}
          </p>
        </div>
        <div>
          {endpoints.map((endpoint) => (
            <article className="endpoint" id={endpoint.id} key={endpoint.path}>
              <span className="method">{endpoint.method}</span>
              <div>
                <h2 className="path">{endpoint.path}</h2>
                <p className="muted">{t(endpoint.detail)}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="actions">
          <Link className="btn btn-primary" href="/apply">
            {t("Apply for partnership")}
          </Link>
          <Link className="btn btn-ghost" href="/#developers">
            {t("Accounts, cards, and payments")}
          </Link>
        </div>
      </div>
    </div>
  );
}
