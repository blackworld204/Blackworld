"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CurrencyFlag } from "@/components/currency-flag";
import { CurrencySelect } from "@/components/currency-select";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { MONEY, adjustBalance, money, patchUser, type MoneyCode } from "@/lib/bank";

export default function AdminPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [code, setCode] = useState<MoneyCode>("USD");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<
    | { type: "status"; id: string; name: string; next: "active" | "inactive" }
    | { type: "access"; id: string; name: string; canCreate: boolean }
    | { type: "balance"; id: string; name: string; code: MoneyCode; value: number }
    | null
  >(null);

  const rows = useMemo(() => {
    if (!state) return [];
    const q = query.trim().toLowerCase();
    return state.users.filter(
      (item) => !q || item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q),
    );
  }, [state, query]);

  if (!state || !user) return <div className="app-hold" />;
  if (user.role !== "admin") {
    return (
      <div className="app-pad">
        <h1>{t("Admin")}</h1>
        <p>{t("This desk is limited to administrators.")}</p>
        <Link href="/dashboard">{t("Back to dashboard")}</Link>
      </div>
    );
  }

  const active = state.users.filter((item) => item.status === "active").length;
  const creators = state.users.filter((item) => item.canCreate).length;
  const blocked = state.users.filter((item) => item.status === "inactive").length;

  function saveBalance(userId: string) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) {
      setError(t("Enter a balance of zero or more."));
      return;
    }
    setError("");
    const name = state?.users.find((item) => item.id === userId)?.name ?? "";
    setAsk({ type: "balance", id: userId, name, code, value });
  }

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">
          <Link href="/dashboard">{t("Dashboard")}</Link>
        </p>
        <h1>{t("Admin panel")}</h1>
        <p className="lede">{t("Accounts, balances, and permissions stored in this browser.")}</p>
      </header>
      <div className="form-row">
        <Link className="btn btn-primary" href="/dashboard/create">
          {t("Create account")}
        </Link>
      </div>

      <dl className="stats admin-stats">
        <div className="stat">
          <dt>{state.users.length}</dt>
          <dd>{t("Total users")}</dd>
        </div>
        <div className="stat">
          <dt>{active}</dt>
          <dd>{t("Active users")}</dd>
        </div>
        <div className="stat">
          <dt>{creators}</dt>
          <dd>{t("Can create")}</dd>
        </div>
        <div className="stat">
          <dt>{blocked}</dt>
          <dd>{t("Inactive")}</dd>
        </div>
      </dl>

      <section className="panel">
        <header className="panel-head">
          <h2>{t("User management")}</h2>
        </header>
        <label className="field">
          <span>{t("Search")}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Name or email")}
          />
        </label>
        {rows.length === 0 ? <p className="muted">{t("No users found.")}</p> : null}
        <div className="user-grid">
          {rows.map((item) => (
            <article key={item.id} className="user-card">
              <header>
                <h3>{item.name}</h3>
                <p className="mono">{item.email}</p>
              </header>
              <dl className="balance-lines">
                {MONEY.map((currency) => (
                  <div key={currency.code}>
                    <dt className="ccy-code">
                      <CurrencyFlag code={currency.code} />
                      {currency.code}
                    </dt>
                    <dd className="mono">{money(item.balances[currency.code], currency.code, locale)}</dd>
                  </div>
                ))}
              </dl>
              <p className="tag-row">
                <span>{item.status === "active" ? t("Active") : t("Inactive")}</span>
                <span>{item.role === "admin" ? t("Admin") : t("Member")}</span>
                <span>{item.canCreate ? t("Can create") : t("No access")}</span>
              </p>
              <div className="user-actions">
                {item.id === user.id ? null : (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setAsk({
                        type: "status",
                        id: item.id,
                        name: item.name,
                        next: item.status === "active" ? "inactive" : "active",
                      })
                    }
                  >
                    {item.status === "active" ? t("Set inactive") : t("Set active")}
                  </button>
                )}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setAsk({ type: "access", id: item.id, name: item.name, canCreate: !item.canCreate })}
                >
                  {item.canCreate ? t("Remove create") : t("Allow create")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setEditing(editing === item.id ? null : item.id);
                    setAmount(String(item.balances.USD));
                    setCode("USD");
                    setError("");
                  }}
                >
                  {t("Edit balance")}
                </button>
              </div>
              {editing === item.id ? (
                <form
                  className="stack"
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveBalance(item.id);
                  }}
                >
                  <div className="split">
                    <label className="field">
                      <span>{t("Currency")}</span>
                      <CurrencySelect
                        label={t("Currency")}
                        value={code}
                        options={MONEY.map((currency) => ({ code: currency.code, label: t(currency.name) }))}
                        onChange={(next) => {
                          const picked = next as MoneyCode;
                          setCode(picked);
                          setAmount(String(item.balances[picked]));
                        }}
                      />
                    </label>
                    <label className="field">
                      <span>{t("New balance")}</span>
                      <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
                    </label>
                  </div>
                  {error ? <p className="form-error">{error}</p> : null}
                  <button className="btn btn-primary" type="submit">
                    {t("Save balance")}
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      <ConfirmDialog
        open={ask !== null}
        title={
          ask?.type === "status"
            ? ask.next === "inactive"
              ? t("Set this account inactive?")
              : t("Set this account active?")
            : ask?.type === "access"
              ? ask.canCreate
                ? t("Allow create access?")
                : t("Remove create access?")
              : t("Change this balance?")
        }
        body={
          ask?.type === "status"
            ? ask.next === "inactive"
              ? t("{name} cannot use this desk until the account is active again.", { name: ask.name })
              : t("{name} can use this desk again.", { name: ask.name })
            : ask?.type === "access"
              ? ask.canCreate
                ? t("{name} will be able to open accounts.", { name: ask.name })
                : t("{name} will not be able to open accounts.", { name: ask.name })
              : t("{name} will hold {amount}.", {
                  name: ask?.name ?? "",
                  amount: money(ask?.type === "balance" ? ask.value : 0, ask?.type === "balance" ? ask.code : "USD", locale),
                })
        }
        confirmLabel={
          ask?.type === "status"
            ? ask.next === "inactive"
              ? t("Set inactive")
              : t("Set active")
            : ask?.type === "access"
              ? ask.canCreate
                ? t("Allow create")
                : t("Remove create")
              : t("Save balance")
        }
        onClose={() => setAsk(null)}
        onConfirm={() => {
          if (!ask) return;
          if (ask.type === "status") patchUser(ask.id, { status: ask.next });
          else if (ask.type === "access") patchUser(ask.id, { canCreate: ask.canCreate });
          else {
            adjustBalance(ask.id, ask.code, ask.value);
            setEditing(null);
            setAmount("");
          }
          setAsk(null);
        }}
      />
    </div>
  );
}
