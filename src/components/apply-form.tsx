"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BusyButton } from "@/components/busy-button";
import { PhoneInput } from "@/components/phone-input";
import { PasswordStrength } from "@/components/password-strength";
import { SecretInput } from "@/components/secret-input";
import { SignOutButton } from "@/components/sign-out-button";
import { authErrorMessage, useSession } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import { applySchema, collectErrors } from "@/lib/account-schema";
import { addUser, linkReferral, loadBank, REFERRAL_CODE, userByEmail } from "@/lib/bank";
import { whenDeskReady } from "@/lib/desk-sync";
import { firebaseAuth } from "@/lib/firebase";

const empty = {
  first: "",
  last: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  pin: "",
  confirm: "",
};

export function ApplyForm() {
  const router = useRouter();
  const { session, signUp, signOut } = useSession();
  const { t } = useI18n();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [referral, setReferral] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase() ?? "";
    if (REFERRAL_CODE.test(code)) setReferral(code);
  }, []);

  function set<K extends keyof typeof empty>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const related = key === "password" ? "confirmPassword" : key === "pin" ? "confirm" : "";
      if (!current[key] && !(related && current[related]) && !current._form) return current;
      const next = { ...current };
      delete next[key];
      delete next._form;
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

  function finish(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const found = collectErrors(applySchema, form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    openAccount();
  }

  async function undoSignIn() {
    const current = firebaseAuth()?.currentUser;
    if (current) await current.delete().catch(() => {});
    signOut();
  }

  function openAccount() {
    if (busy) return;
    setBusy(true);
    const email = form.email.trim();
    const name = `${form.first.trim()} ${form.last.trim()}`.trim();
    void (async () => {
      await signUp(email, form.password);
      await whenDeskReady();
      if (userByEmail(loadBank(), email)) {
        await undoSignIn();
        setErrors({ _form: "That email already has an account." });
        return;
      }
      const result = addUser({
        name,
        email,
        phone: form.phone.trim(),
        pin: form.pin,
        balance: 0,
        issueCard: false,
      });
      if (result.error) {
        await undoSignIn();
        setErrors({ _form: result.error });
        return;
      }
      if (referral) linkReferral(referral, name, email);
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
      router.push("/dashboard");
    })()
      .catch((reason: unknown) => {
        setErrors({ _form: authErrorMessage(reason) });
      })
      .finally(() => setBusy(false));
  }

  if (session) {
    return (
      <div className="page">
        <div className="wrap narrow">
          <header className="page-intro">
            <h1>{t("Signed in")}</h1>
          </header>
          <p>{t("Signed in as {email}.", { email: session.email })}</p>
          <div className="form-row">
            <SignOutButton className="text-button" />
            <Link className="btn btn-primary" href="/dashboard">
              {t("Open dashboard")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="wrap narrow">
        <header className="page-intro">
          <h1>{t("Create account")}</h1>
          {referral ? <p className="lede">{t("Referred with {code}.", { code: referral })}</p> : null}
        </header>
        <form onSubmit={finish}>
          <label className="field">
            <span>{t("First name")}</span>
            <input autoComplete="given-name" value={form.first} aria-invalid={Boolean(errors.first)} onChange={(event) => set("first", event.target.value)} />
            {note("first")}
          </label>
          <label className="field">
            <span>{t("Last name")}</span>
            <input autoComplete="family-name" value={form.last} aria-invalid={Boolean(errors.last)} onChange={(event) => set("last", event.target.value)} />
            {note("last")}
          </label>
          <label className="field">
            <span>{t("Email")}</span>
            <input type="email" autoComplete="email" value={form.email} aria-invalid={Boolean(errors.email)} onChange={(event) => set("email", event.target.value)} />
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
            <PhoneInput label={t("Phone")} value={form.phone} invalid={Boolean(errors.phone)} onChange={(value) => set("phone", value)} />
            {note("phone")}
          </div>
          <label className="field">
            <span>{t("PIN")}</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={form.pin}
              aria-invalid={Boolean(errors.pin)}
              onChange={(event) => set("pin", event.target.value.replace(/\D/g, "").slice(0, 4))}
            />
            {note("pin")}
          </label>
          <label className="field">
            <span>{t("Confirm PIN")}</span>
            <input
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={form.confirm}
              aria-invalid={Boolean(errors.confirm)}
              onChange={(event) => set("confirm", event.target.value.replace(/\D/g, "").slice(0, 4))}
            />
            {note("confirm")}
          </label>
          {note("_form")}
          <div className="form-row">
            <Link href="/" className="text-button">
              {t("Cancel")}
            </Link>
            <BusyButton className="btn btn-primary" type="submit" busy={busy}>
              {t("Create account")}
            </BusyButton>
          </div>
        </form>
        <div className="auth-switch">
          <p>{t("Already registered?")}</p>
          <Link href="/login">{t("Login")}</Link>
        </div>
      </div>
    </div>
  );
}
