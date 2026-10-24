"use client";

import Link from "next/link";
import { useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { PhoneInput } from "@/components/phone-input";
import { PasswordStrength } from "@/components/password-strength";
import { SecretInput } from "@/components/secret-input";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { authErrorMessage } from "@/components/session";
import { addressSchema, collectErrors, personalSchema, securitySchema } from "@/lib/account-schema";
import { addUser, money, type BankAddress } from "@/lib/bank";
import { createPresentationUser } from "@/lib/firebase";

const empty = {
  first: "",
  last: "",
  email: "",
  password: "",
  confirmPassword: "",
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<{
    email: string;
    last4: string | null;
    balance: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);

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
    setErrors((current) => {
      const related = key === "password" ? "confirmPassword" : key === "pin" ? "confirm" : "";
      if (!current[key] && !(related && current[related])) return current;
      const next = { ...current };
      delete next[key];
      if (related) delete next[related];
      return next;
    });
  }

  function note(key: string) {
    return errors[key] ? (
      <p className="form-error" role="alert">
        {t(errors[key])}
      </p>
    ) : null;
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
    const found = collectErrors(personalSchema, form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStep(1);
  }

  function nextAddress(event: React.FormEvent) {
    event.preventDefault();
    const found = collectErrors(addressSchema, form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setStep(2);
  }

  function finish(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const found = collectErrors(securitySchema, form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    openAccount();
  }

  function openAccount() {
    setBusy(true);
    void createPresentationUser(form.email.trim(), form.password)
      .then(() => {
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
          setErrors({ _form: result.error });
          return;
        }
        setErrors({});
        setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
        setDone({
          email: form.email.trim(),
          last4: result.last4,
          balance: Number.isFinite(balance) ? balance : 0,
        });
      })
      .catch((reason: unknown) => {
        setErrors({ _form: authErrorMessage(reason) });
      })
      .finally(() => setBusy(false));
  }

  if (done) {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{t("Account opened")}</p>
          <h1>{t("Ready.")}</h1>
          <p className="lede">
            {t("{email} can sign in with the password you set.", {
              email: done.email,
            })}
          </p>
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
        {step === 2 ? null : (
          <p className="lede">
            {step === 0
              ? t("Name, email, phone, and the opening USD balance.")
              : t(
                  "Where statements for this account should go. You can skip this.",
                )}
          </p>
        )}
        <div className="progress" style={{ ["--p" as string]: (step + 1) / 3 }}>
          <span />
        </div>
      </header>

      {step === 0 ? (
        <form className="stack" onSubmit={nextPersonal}>
          <div className="split">
            <label className="field">
              <span>{t("First name")}</span>
              <input
                value={form.first}
                autoComplete="given-name"
                aria-invalid={Boolean(errors.first)}
                onChange={(event) => set("first", event.target.value)}
              />
              {note("first")}
            </label>
            <label className="field">
              <span>{t("Last name")}</span>
              <input
                value={form.last}
                autoComplete="family-name"
                aria-invalid={Boolean(errors.last)}
                onChange={(event) => set("last", event.target.value)}
              />
              {note("last")}
            </label>
          </div>
          <label className="field">
            <span>{t("Email")}</span>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              aria-invalid={Boolean(errors.email)}
              onChange={(event) => set("email", event.target.value)}
            />
            {note("email")}
          </label>
          <label className="field">
            <span>{t("Password")}</span>
            <SecretInput
              autoComplete="new-password"
              value={form.password}
              invalid={Boolean(errors.password)}
              showLabel={t("Show password")}
              hideLabel={t("Hide password")}
              onChange={(value) => set("password", value)}
            />
            <PasswordStrength password={form.password} />
            {note("password")}
          </label>
          <label className="field">
            <span>{t("Confirm password")}</span>
            <SecretInput
              autoComplete="new-password"
              value={form.confirmPassword}
              invalid={Boolean(errors.confirmPassword)}
              showLabel={t("Show password")}
              hideLabel={t("Hide password")}
              onChange={(value) => set("confirmPassword", value)}
            />
            {note("confirmPassword")}
          </label>
          <div className="field">
            <PhoneInput
              label={t("Phone")}
              value={form.phone}
              invalid={Boolean(errors.phone)}
              onChange={(value) => set("phone", value)}
            />
            {note("phone")}
          </div>
          <label className="field">
            <span>{t("Opening balance (USD)")}</span>
            <input
              inputMode="decimal"
              value={form.balance}
              aria-invalid={Boolean(errors.balance)}
              onChange={(event) => set("balance", event.target.value)}
            />
            {note("balance")}
          </label>
          {note("_form")}
          <button className="btn btn-primary" type="submit">
            {t("Continue")}
          </button>
        </form>
      ) : null}

      {step === 1 ? (
        <form className="stack" onSubmit={nextAddress}>
          <label className="field">
            <span>{t("Street")}</span>
            <input
              value={form.street}
              autoComplete="street-address"
              aria-invalid={Boolean(errors.street)}
              onChange={(event) => set("street", event.target.value)}
            />
          </label>
          <div className="split">
            <label className="field">
              <span>{t("City")}</span>
              <input
                value={form.city}
                autoComplete="address-level2"
                onChange={(event) => set("city", event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("Postal code")}</span>
              <input
                value={form.zip}
                autoComplete="postal-code"
                onChange={(event) => set("zip", event.target.value)}
              />
            </label>
          </div>
          <label className="field">
            <span>{t("Country")}</span>
            <input
              value={form.country}
              autoComplete="country-name"
              onChange={(event) => set("country", event.target.value)}
            />
          </label>
          {note("_form")}
          <div className="form-row">
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setErrors({});
                setStep(0);
              }}
            >
              {t("Back")}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                set("street", "");
                set("city", "");
                set("zip", "");
                setErrors({});
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
              <dd>
                {money(Number.isFinite(balance) ? balance : 0, "USD", locale)}
              </dd>
            </div>
          </dl>
          <label className="field">
            <span>{t("PIN")}</span>
            <input
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={form.pin}
              aria-invalid={Boolean(errors.pin)}
              onChange={(event) => set("pin", event.target.value)}
            />
            {note("pin")}
          </label>
          <label className="field">
            <span>{t("Confirm PIN")}</span>
            <input
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={form.confirm}
              aria-invalid={Boolean(errors.confirm)}
              onChange={(event) => set("confirm", event.target.value)}
            />
            {note("confirm")}
          </label>
          <label className="choice-line">
            <input
              type="checkbox"
              checked={form.card}
              onChange={(event) => set("card", event.target.checked)}
            />
            {t("Issue a virtual card")}
          </label>
          {note("_form")}
          <div className="form-row">
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setErrors({});
                setStep(1);
              }}
            >
              {t("Back")}
            </button>
            <BusyButton className="btn btn-primary" type="submit" busy={busy}>
              {t("Create account")}
            </BusyButton>
          </div>
        </form>
      ) : null}
    </div>
  );
}
