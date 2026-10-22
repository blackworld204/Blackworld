"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { REFERRAL_REWARD, addReferral, money, referralCode, when } from "@/lib/bank";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function ReferralPanel() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!state || !user) return null;
  const code = referralCode(user);
  const link = origin ? `${origin}/apply?ref=${code}` : code;
  const rows = state.referrals.filter((item) => item.userId === user.id);
  const earned = rows.reduce((sum, item) => sum + (item.status === "earned" ? item.reward : 0), 0);
  const reward = money(REFERRAL_REWARD, "USD", locale);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (company.trim().length < 2) return setError(t("Enter the company name."));
    if (!validEmail(email)) return setError(t("Enter a work email."));
    const failed = addReferral({ userId: user!.id, company, email });
    if (failed) {
      const message = t(failed);
      toast(message);
      return setError(message);
    }
    setCompany("");
    setEmail("");
    setError("");
    toast(t("Referral saved. You earn when they apply."));
  }

  return (
    <section className="refer" id="referrals" aria-labelledby="referrals-title">
      <div className="refer-top">
        <div>
          <p className="kicker">{t("Refer and earn")}</p>
          <h2 id="referrals-title">{t("Earn {amount}", { amount: reward })}</h2>
          <p>
            {t(
              "Share your code. The credit lands when that company applies.",
            )}
          </p>
          <div className="refer-code">
            <div>
              <p className="kicker">{t("Your code")}</p>
              <strong className="mono">{code}</strong>
            </div>
            <CopyButton value={link} label="Copy link" />
          </div>
          <p className="muted">
            {t("{count} referred", { count: rows.length })} · {t("{amount} earned", { amount: money(earned, "USD", locale) })}
          </p>
        </div>
        <form className="stack" onSubmit={submit}>
          <label className="field">
            <span>{t("Company name")}</span>
            <input value={company} onChange={(event) => setCompany(event.target.value)} />
          </label>
          <label className="field">
            <span>{t("Work email")}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit">
            {t("Refer a company")}
          </button>
        </form>
      </div>
      {rows.length === 0 ? (
        <p className="muted">{t("No referrals yet.")}</p>
      ) : (
        <ul className="refer-list">
          {rows.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.company}</strong>
                <span className="muted">
                  {item.email} · {item.status === "earned" ? t("Earned") : t("Invited")}
                  {item.status === "earned" ? ` · ${money(item.reward, "USD", locale)}` : ""}
                </span>
              </div>
              <span className="mono">{when(item.at, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
