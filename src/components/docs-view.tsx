"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { useI18n } from "@/i18n/provider";

const endpoints = [
  {
    id: "accounts",
    method: "POST",
    path: "/accounts",
    detail: "Open a USD business account with KYC and AML attached.",
  },
  {
    id: "accounts-read",
    method: "GET",
    path: "/accounts/:id",
    detail: "Balance, status, and currency for one account.",
  },
  {
    id: "cards",
    method: "POST",
    path: "/cards",
    detail: "Issue a virtual or physical card and set a spend limit.",
  },
  {
    id: "payments",
    method: "POST",
    path: "/payments",
    detail: "Send a SWIFT, ACH, or wire. Batch with /payments/batch.",
  },
  {
    id: "fx",
    method: "GET",
    path: "/fx/rates",
    detail: "Mid-market rates across 150+ currencies.",
  },
  {
    id: "quote",
    method: "POST",
    path: "/fx/quotes",
    detail: "Price a conversion. The fee is 0.5%.",
  },
  {
    id: "exchange",
    method: "POST",
    path: "/fx/exchanges",
    detail: "Convert a balance at the same rate the desk shows.",
  },
  {
    id: "deposits",
    method: "POST",
    path: "/deposits",
    detail: "Record a wire or card deposit. The fee is 2.5%.",
  },
  {
    id: "approvals",
    method: "POST",
    path: "/approvals/:id",
    detail: "An admin approves or declines a waiting transfer.",
  },
];

export function DocsView() {
  const { t } = useI18n();
  const [base, setBase] = useState("/api/v1");
  useEffect(() => {
    setBase(`${window.location.origin}/api/v1`);
  }, []);
  return (
    <div className="page">
      <div className="wrap">
        <header className="page-intro">
          <h1>{t("API")}</h1>
        </header>
        <div className="docs-meta">
          <code>{base}</code>
          <CopyButton value={base} label="Copy base URL" />
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
          <Link className="btn btn-primary" href="/login">
            {t("Login")}
          </Link>
          <Link className="btn btn-ghost" href="/#developers">
            {t("Accounts, cards, and payments")}
          </Link>
        </div>
      </div>
    </div>
  );
}
