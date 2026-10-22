"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { REFERRAL_REWARD, earnReferral, money } from "@/lib/bank";

const audiences = [
  { id: "fintech", label: "Fintech" },
  { id: "business", label: "Operating company" },
  { id: "institution", label: "Institution" },
];

const products = [
  { id: "accounts", label: "Accounts" },
  { id: "cards", label: "Cards" },
  { id: "payments", label: "Payments" },
  { id: "full", label: "Full stack" },
];

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ApplyForm() {
  const [step, setStep] = useState(0);
  const [audience, setAudience] = useState("fintech");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [product, setProduct] = useState("full");
  const [error, setError] = useState("");
  const [introduced, setIntroduced] = useState("");
  const reference = useMemo(() => `BW-${Math.floor(100000 + Math.random() * 900000)}`, []);
  const { t, locale } = useI18n();

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase() ?? "";
    if (/^BW-[A-Z0-9-]{4,24}$/.test(code)) setIntroduced(code);
  }, []);

  const titles = ["Where should we reply?", "Who should use this?", "Accounts, cards, and payments."];

  if (step === 3) {
    return (
      <div className="page">
        <div className="wrap narrow">
          <p className="success-mark">{t("Received")}</p>
          <header className="page-intro">
            <h1>{reference}</h1>
          </header>
          <p>
            {t("{company} is in review as a {audience}. We'll reply at {email}.", {
              company,
              audience: t(audiences.find((item) => item.id === audience)?.label ?? audience),
              email,
            })}
          </p>
          <p>
            {t("An administrator opens the account after this application.")}
          </p>
          <div className="form-row">
            <Link href="/docs" className="text-button">
              {t("API documentation")}
            </Link>
            <Link href="/" className="btn btn-primary">
              {t("Home")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="wrap narrow">
        <p className="kicker">{t("Step {step} of {total}", { step: step + 1, total: 3 })}</p>
        <div className="progress" aria-hidden="true">
          <span style={{ ["--p" as string]: (step + 1) / 3 }} />
        </div>
        <header className="page-intro">
          <h1>{t(titles[step])}</h1>
          {introduced ? (
            <p className="lede">
              {t("Referred with {code}.", { code: introduced })}{" "}
              {t("The referrer earns {amount} when you submit.", {
                amount: money(REFERRAL_REWARD, "USD", locale),
              })}
            </p>
          ) : null}
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 0) {
              if (company.trim().length < 2) {
                setError(t("Enter the company name."));
                return;
              }
              if (!validEmail(email)) {
                setError(t("Enter a work email."));
                return;
              }
            }
            setError("");
            if (step === 2 && introduced) earnReferral(introduced, company, email);
            setStep((value) => value + 1);
          }}
        >
          {step === 1 ? (
            <fieldset>
              <legend className="sr-only">{t("Audience")}</legend>
              {audiences.map((item) => (
                <label className="choice" key={item.id}>
                  <input
                    type="radio"
                    name="audience"
                    value={item.id}
                    checked={audience === item.id}
                    onChange={() => setAudience(item.id)}
                  />
                  {t(item.label)}
                </label>
              ))}
            </fieldset>
          ) : null}
          {step === 0 ? (
            <>
              <label className="field">
                <span>{t("Company")}</span>
                <input
                  value={company}
                  autoComplete="organization"
                  onChange={(event) => {
                    setCompany(event.target.value);
                    setError("");
                  }}
                />
              </label>
              <label className="field">
                <span>{t("Work email")}</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                />
              </label>
            </>
          ) : null}
          {step === 2 ? (
            <fieldset>
              <legend className="sr-only">{t("Product")}</legend>
              {products.map((item) => (
                <label className="choice" key={item.id}>
                  <input
                    type="radio"
                    name="product"
                    value={item.id}
                    checked={product === item.id}
                    onChange={() => setProduct(item.id)}
                  />
                  {t(item.label)}
                </label>
              ))}
            </fieldset>
          ) : null}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-row">
            {step === 0 ? (
              <Link href="/" className="text-button">
                {t("Cancel")}
              </Link>
            ) : (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setError("");
                  setStep((value) => value - 1);
                }}
              >
                {t("Back")}
              </button>
            )}
            <button className="btn btn-primary" type="submit">
              {step === 2 ? t("Submit application") : t("Continue")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
