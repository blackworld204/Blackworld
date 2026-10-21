"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/provider";
import { CONTACT_EMAIL } from "@/lib/contact";

const SOURCE = `const blackworld = require("@blackworld/node");

blackworld.apiKey = process.env.BLACKWORLD_API_KEY;

const account = await blackworld.accounts.create({
  type: "business",
  company: {
    name: "Acme Fintech Inc",
    ein: "12-3456789",
    industry: "fintech",
  },
  owner: {
    name: "Jordan Lee",
    email: "${CONTACT_EMAIL}",
  },
  currency: "USD",
});

console.log(account.id);
// => acct_1A2B3C4D5E6F7G8H9I`;

export function CodeSample() {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  return (
    <figure className="code-panel">
      <figcaption>
        <span>create-account.js</span>
        <span className="code-meta">
          <span className="status-dot" aria-hidden="true" />
          47 ms
        </span>
      </figcaption>
      <pre>
        <code>{SOURCE}</code>
      </pre>
      <div className="code-actions">
        <button
          type="button"
          className="btn btn-ghost btn-on-dark btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(SOURCE);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? t("Copied") : t("Copy")}
        </button>
        <p role="status" className="sr-only">
          {copied ? t("Sample copied") : ""}
        </p>
      </div>
    </figure>
  );
}
