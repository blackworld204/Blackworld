"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { addUser, money, type BankAddress } from "@/lib/bank";

const empty = {
  first: "",
  last: "",
  email: "",
  password: "",
  phone: "",
  balance: "10000",
  street: "",
  city: "",
  zip: "",
  country: "United States",
  pin: "",
  confirm: "",
  card: true,
};

type FormState = typeof empty;

export default function CreateAccountPage() {
  const { user } = useAccount();
  const { t, locale } = useI18n();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ email: string; last4: string | null; balance: number } | null>(null);

  if (!user) return <div className="app-hold" />;
  if (user.role !== "admin" && !user.canCreate) {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{t("Create account")}</p>
          <h1>{t("Not available")}</h1>
          <p className="lede">{t("This account cannot open new accounts.")}</p>
        </header>
        <Link className="btn" href="/dashboard">
          {t("Dashboard")}
        </Link>
      </div>
    );
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const name = `${form.first.trim()} ${form.last.trim()}`.trim();
  const balance = Number(form.balance);
  const address: BankAddress | undefined =
    form.street.trim() || form.city.trim() || form.zip.trim()
      ? {
          street: form.street.trim(),
          city: form.city.trim(),
          zip: form.zip.trim(),
          country: form.country.trim() || "United States",
        }
      : undefined;

  function nextPersonal(event: React.FormEvent) {
    event.preventDefault();
    if (form.first.trim().length < 1 || form.last.trim().length < 1) {
      setError(t("Enter a first and last name."));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError(t("Enter a valid email."));
      return;
    }
    if (form.password.length < 8) {
      setError(t("Password must be at least 8 characters."));
      return;
    }
    if (!/^[0-9+\-\s()]{7,}$/.test(form.phone)) {
      setError(t("Enter a valid phone number."));
      return;
    }
    if (!Number.isFinite(balance) || balance < 0) {
      setError(t("Enter an opening balance of zero or more."));
      return;
    }
    setError("");
    setStep(1);
  }

  function nextAddress(event: React.FormEvent) {
    event.preventDefault();
    const started = form.street.trim() || form.city.trim() || form.zip.trim();
    if (started && (!form.street.trim() || !form.city.trim() || !form.zip.trim())) {
      setError(t("Enter the street, city, and postal code, or skip the address."));
      return;
    }
    setError("");
    setStep(2);
  }

  function finish(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{4}$/.test(form.pin)) {
      setError(t("PIN must be 4 digits."));
      return;
    }
    if (form.pin !== form.confirm) {
      setError(t("PIN entries do not match."));
      return;
    }
    const result = addUser({
      name,
      email: form.email.trim(),
      phone: form.phone.trim(),
      pin: form.pin,
      balance: Number.isFinite(balance) ? balance : 0,
      address,
      issueCard: form.card,
    });
    if (result.error) {
      setError(t(result.error));
      return;
    }
    setError("");
    setDone({ email: form.email.trim(), last4: result.last4, balance: Number.isFinite(balance) ? balance : 0 });
  }

  if (done) {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{t("Account opened")}</p>
          <h1>{t("Ready.")}</h1>
          <p className="lede">{t("{email} can sign in on this browser.", { email: done.email })}</p>
        </header>
        <dl className="review">
          <div>
            <dt>{t("Email")}</dt>
            <dd className="mono">{done.email}</dd>
          </div>
          <div>
            <dt>{t("Opening balance")}</dt>
            <dd>{money(done.balance, "USD", locale)}</dd>
          </div>
          <div>
            <dt>{t("Card")}</dt>
            <dd>{done.last4 ? `•••• ${done.last4}` : t("No card")}</dd>
          </div>
        </dl>
        {done.last4 ? (
          <section className="card-face look-linear">
            <div>
              <p className="kicker">Blackworld</p>
              <p className="card-number">•••• •••• •••• {done.last4}</p>
              <p className="muted">{name}</p>
            </div>
          </section>
        ) : null}
        <div className="form-row">
          <button
            className="btn"
            type="button"
            onClick={() => {
              setDone(null);
              setForm(empty);
              setStep(0);
            }}
          >
            {t("Open another")}
          </button>
          <Link className="btn btn-primary" href="/dashboard/admin">
            {t("Back to admin")}
          </Link>
        </div>
      </div>
    );
  }

  const titles = [t("Personal details"), t("Address"), t("Open the account")];

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">
          <Link href="/dashboard/admin">{t("Admin")}</Link>
          {" · "}
          {t("Step {current} of {total}", { current: step + 1, total: 3 })}
        </p>
        <h1>{titles[step]}</h1>
        <p className="lede">
          {step === 0
            ? t("Name, email, phone, and the opening USD balance.")
            : step === 1
              ? t("Where statements for this account should go. You can skip this.")
              : t("A 4-digit PIN authorizes transfers. A virtual card is issued unless you turn it off.")}
        </p>
        <div className="progress" style={{ ["--p" as string]: (step + 1) / 3 }}>
          <span />
        </div>
      </header>

      {step === 0 ? (
        <form className="stack" onSubmit={nextPersonal}>
          <div className="split">
            <label className="field">
              <span>{t("First name")}</span>
              <input value={form.first} autoComplete="given-name" onChange={(event) => set("first", event.target.value)} />
            </label>
            <label className="field">
              <span>{t("Last name")}</span>
              <input value={form.last} autoComplete="family-name" onChange={(event) => set("last", event.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>{t("Email")}</span>
            <input type="email" autoComplete="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
          </label>
          <label className="field">
            <span>{t("Password")}</span>
            <input type="password" autoComplete="new-password" value={form.password} onChange={(event) => set("password", event.target.value)} />
          </label>
          <p className="muted">{t("At least 8 characters. Sign-in checks the length, then discards it.")}</p>
          <label className="field">
            <span>{t("Phone")}</span>
            <input value={form.phone} autoComplete="tel" inputMode="tel" placeholder="+1 555 010 2400" onChange={(event) => set("phone", event.target.value)} />
          </label>
          <label className="field">
            <span>{t("Opening balance (USD)")}</span>
            <input inputMode="decimal" value={form.balance} onChange={(event) => set("balance", event.target.value)} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit">
            {t("Continue")}
          </button>
        </form>
      ) : null}

      {step === 1 ? (
        <form className="stack" onSubmit={nextAddress}>
          <label className="field">
            <span>{t("Street")}</span>
            <input value={form.street} autoComplete="street-address" onChange={(event) => set("street", event.target.value)} />
          </label>
          <div className="split">
            <label className="field">
              <span>{t("City")}</span>
              <input value={form.city} autoComplete="address-level2" onChange={(event) => set("city", event.target.value)} />
            </label>
            <label className="field">
              <span>{t("Postal code")}</span>
              <input value={form.zip} autoComplete="postal-code" onChange={(event) => set("zip", event.target.value)} />
            </label>
          </div>
          <label className="field">
            <span>{t("Country")}</span>
            <input value={form.country} autoComplete="country-name" onChange={(event) => set("country", event.target.value)} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-row">
            <button className="text-button" type="button" onClick={() => { setError(""); setStep(0); }}>
              {t("Back")}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                set("street", "");
                set("city", "");
                set("zip", "");
                setError("");
                setStep(2);
              }}
            >
              {t("Skip for now")}
            </button>
            <button className="btn btn-primary" type="submit">
              {t("Continue")}
            </button>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form className="stack" onSubmit={finish}>
          <dl className="review">
            <div>
              <dt>{t("Name")}</dt>
              <dd>{name}</dd>
            </div>
            <div>
              <dt>{t("Email")}</dt>
              <dd>{form.email.trim()}</dd>
            </div>
            <div>
              <dt>{t("Phone")}</dt>
              <dd>{form.phone.trim()}</dd>
            </div>
            <div>
              <dt>{t("Address")}</dt>
              <dd>
                {address
                  ? `${address.street}, ${address.city} ${address.zip}, ${address.country}`
                  : t("No address")}
              </dd>
            </div>
            <div>
              <dt>{t("Opening balance")}</dt>
              <dd>{money(Number.isFinite(balance) ? balance : 0, "USD", locale)}</dd>
            </div>
          </dl>
          <label className="field">
            <span>{t("4-digit PIN")}</span>
            <input inputMode="numeric" maxLength={4} autoComplete="off" value={form.pin} onChange={(event) => set("pin", event.target.value)} />
          </label>
          <label className="field">
            <span>{t("Confirm PIN")}</span>
            <input inputMode="numeric" maxLength={4} autoComplete="off" value={form.confirm} onChange={(event) => set("confirm", event.target.value)} />
          </label>
          <label className="choice-line">
            <input type="checkbox" checked={form.card} onChange={(event) => set("card", event.target.checked)} />
            {t("Issue a virtual card")}
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-row">
            <button className="text-button" type="button" onClick={() => { setError(""); setStep(1); }}>
              {t("Back")}
            </button>
            <button className="btn btn-primary" type="submit">
              {t("Create account")}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
