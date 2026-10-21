"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { MONEY, adjustBalance, money, patchUser, removeMember, type BankUser, type MoneyCode } from "@/lib/bank";

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

function tone(name: string) {
  const tones = ["#17382c", "#2f6a52", "#6b5a1e", "#3e4d44", "#7a2824"];
  const sum = [...name].reduce((total, char) => total + char.charCodeAt(0), 0);
  return tones[sum % tones.length];
}

function visibleBalances(user: BankUser) {
  return MONEY.filter((item) => item.code === "USD" || item.code === "EUR" || user.balances[item.code] > 0);
}

function Mark({ name }: { name: "balance" | "block" | "allow" | "remove" | "shield" | "users" | "active" }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (name === "balance") {
    return (
      <svg {...common}>
        <path d="M4 20h4l10-10-4-4L4 16z" />
        <path d="M12 6l4 4" />
      </svg>
    );
  }
  if (name === "block") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M7 17L17 7" />
      </svg>
    );
  }
  if (name === "allow") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M17 11v6" />
        <path d="M14 14h6" />
      </svg>
    );
  }
  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <circle cx="17" cy="9" r="2" />
        <path d="M16 19a4 4 0 0 1 4-3" />
      </svg>
    );
  }
  if (name === "active") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M8.5 12.5l2.5 2.5 4.5-5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 7l1 12h6l1-12" />
    </svg>
  );
}

export default function AdminPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [code, setCode] = useState<MoneyCode>("USD");
  const [amount, setAmount] = useState("0.00");
  const [mode, setMode] = useState<"add" | "deduct">("add");
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<
    | { type: "status"; id: string; name: string; next: "active" | "inactive" }
    | { type: "access"; id: string; name: string; canCreate: boolean }
    | { type: "remove"; id: string; name: string }
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

  function openBalance(item: BankUser) {
    setEditing(item.id);
    setCode("USD");
    setAmount("0.00");
    setMode("add");
    setError("");
  }

  function saveBalance(subject: BankUser) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError(t("Enter an amount."));
      return;
    }
    const current = subject.balances[code];
    if (mode === "deduct" && value > current) {
      setError(t("That is more than the current balance."));
      return;
    }
    const digits = code === "JPY" ? 0 : 2;
    const factor = 10 ** digits;
    const next = Math.round((mode === "add" ? current + value : current - value) * factor) / factor;
    adjustBalance(subject.id, code, next);
    setEditing(null);
    setError("");
    toast(t("Balance updated."));
  }

  return (
    <div className="app-pad">
      <header className="admin-top">
        <Link className="admin-back" href="/dashboard">
          {t("Back to dashboard")}
        </Link>
        <div className="admin-title">
          <span className="admin-mark" aria-hidden="true">
            <Mark name="shield" />
          </span>
          <div>
            <h1>{t("Admin panel")}</h1>
            <p>{t("Accounts, balances, and permissions stored in this browser.")}</p>
          </div>
          <Link className="btn btn-primary admin-create" href="/dashboard/create">
            + {t("Create account")}
          </Link>
        </div>
      </header>

      <dl className="admin-metrics">
        <div>
          <span className="admin-metric-icon" data-tone="users" aria-hidden="true"><Mark name="users" /></span>
          <div>
            <dd>{t("Total users")}</dd>
            <dt>{state.users.length}</dt>
          </div>
        </div>
        <div>
          <span className="admin-metric-icon" data-tone="active" aria-hidden="true"><Mark name="active" /></span>
          <div>
            <dd>{t("Active users")}</dd>
            <dt>{active}</dt>
          </div>
        </div>
        <div>
          <span className="admin-metric-icon" data-tone="create" aria-hidden="true"><Mark name="allow" /></span>
          <div>
            <dd>{t("Can create")}</dd>
            <dt>{creators}</dt>
          </div>
        </div>
        <div>
          <span className="admin-metric-icon" data-tone="blocked" aria-hidden="true"><Mark name="block" /></span>
          <div>
            <dd>{t("Inactive")}</dd>
            <dt>{blocked}</dt>
          </div>
        </div>
      </dl>

      <section className="admin-board">
        <header className="admin-board-head">
          <h2>{t("User management")}</h2>
          <label className="field admin-search">
            <span className="sr-only">{t("Search")}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Search users")}
            />
          </label>
        </header>
        {rows.length === 0 ? <p className="muted admin-empty">{t("No users found.")}</p> : null}
        <div className="admin-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("User")}</th>
                <th>{t("Balance")}</th>
                <th>{t("Status")}</th>
                <th>{t("Permissions")}</th>
                <th>{t("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="admin-user">
                        <span className="admin-avatar" style={{ background: tone(item.name) }} aria-hidden="true">
                          {initials(item.name)}
                        </span>
                        <span>
                          <strong>{item.name}</strong>
                          <span>{item.email}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-balances">
                        {visibleBalances(item).map((currency) => (
                          <span key={currency.code} className="admin-money">
                            <small>{currency.code}</small>
                            {money(item.balances[currency.code], currency.code, locale)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="admin-pills">
                        <span className={item.status === "active" ? "admin-pill is-on" : "admin-pill is-off"}>
                          {item.status === "active" ? t("Active") : t("Inactive")}
                        </span>
                        {item.role === "admin" ? <span className="admin-pill is-role">{t("Admin")}</span> : null}
                      </div>
                    </td>
                    <td>
                      <span className={item.canCreate ? "admin-permit is-yes" : "admin-permit"}>
                        {item.canCreate ? t("Can create") : t("No access")}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-icon is-money"
                          data-label={t("Edit balance")}
                          aria-label={t("Edit balance")}
                          aria-expanded={editing === item.id}
                          aria-haspopup="dialog"
                          onClick={() => openBalance(item)}
                        >
                          <Mark name="balance" />
                        </button>
                        {item.id === user.id ? null : (
                          <button
                            type="button"
                            className="admin-icon is-block"
                            data-label={item.status === "active" ? t("Set inactive") : t("Set active")}
                            aria-label={item.status === "active" ? t("Set inactive") : t("Set active")}
                            onClick={() =>
                              setAsk({
                                type: "status",
                                id: item.id,
                                name: item.name,
                                next: item.status === "active" ? "inactive" : "active",
                              })
                            }
                          >
                            <Mark name="block" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-icon is-allow"
                          data-label={item.canCreate ? t("Remove create") : t("Allow create")}
                          aria-label={item.canCreate ? t("Remove create") : t("Allow create")}
                          onClick={() =>
                            setAsk({ type: "access", id: item.id, name: item.name, canCreate: !item.canCreate })
                          }
                        >
                          <Mark name="allow" />
                        </button>
                        {item.id !== user.id && item.role === "member" ? (
                          <button
                            type="button"
                            className="admin-icon is-danger"
                            data-label={t("Remove")}
                            aria-label={t("Remove")}
                            onClick={() => setAsk({ type: "remove", id: item.id, name: item.name })}
                          >
                            <Mark name="remove" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <BalanceDialog
        subject={state.users.find((item) => item.id === editing) ?? null}
        code={code}
        amount={amount}
        mode={mode}
        error={error}
        locale={locale}
        onCode={setCode}
        onAmount={setAmount}
        onMode={setMode}
        onClose={() => {
          setEditing(null);
          setError("");
        }}
        onSave={saveBalance}
      />
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
              : t("Remove this colleague?")
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
              : t("{name} and their balance leave this browser.", { name: ask?.name ?? "" })
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
              : t("Remove")
        }
        onClose={() => setAsk(null)}
        onConfirm={() => {
          if (!ask) return;
          if (ask.type === "status") patchUser(ask.id, { status: ask.next });
          else if (ask.type === "access") patchUser(ask.id, { canCreate: ask.canCreate });
          else {
            const failed = removeMember(user.id, ask.id);
            if (failed) toast(t(failed));
            else toast(t("Member removed."));
          }
          setAsk(null);
        }}
      />
    </div>
  );
}

function BalanceDialog({
  subject,
  code,
  amount,
  mode,
  error,
  locale,
  onCode,
  onAmount,
  onMode,
  onClose,
  onSave,
}: {
  subject: BankUser | null;
  code: MoneyCode;
  amount: string;
  mode: "add" | "deduct";
  error: string;
  locale: string;
  onCode: (code: MoneyCode) => void;
  onAmount: (amount: string) => void;
  onMode: (mode: "add" | "deduct") => void;
  onClose: () => void;
  onSave: (subject: BankUser) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!subject) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLInputElement>("input")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>("button, input, select")];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [subject]);

  if (!subject || typeof document === "undefined") return null;

  const shown = MONEY.filter(
    (item) =>
      item.code === "USD" ||
      item.code === "EUR" ||
      item.code === "GBP" ||
      item.code === code ||
      subject.balances[item.code] > 0,
  );

  return createPortal(
    <div className="confirm-layer" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="balance-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="balance-dialog-head">
          <h2 id={titleId}>{t("Manage balance")}</h2>
          <button type="button" className="balance-close" aria-label={t("Close")} onClick={onClose}>
            ×
          </button>
        </div>
        <div className="balance-person">
          <span className="admin-avatar" aria-hidden="true">
            {initials(subject.name)}
          </span>
          <span>
            <strong>{subject.name}</strong>
            <span>{subject.email}</span>
          </span>
        </div>
        <dl className="balance-now">
          <div className="balance-now-label">{t("Current balance")}</div>
          {shown.map((item) => (
            <div key={item.code} data-current={item.code === code ? "true" : undefined}>
              <dt>{item.code}</dt>
              <dd className="mono">{money(subject.balances[item.code], item.code, locale)}</dd>
            </div>
          ))}
        </dl>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave(subject);
          }}
        >
          <p className="kicker">{t("Operation")}</p>
          <div className="balance-ops" role="group" aria-label={t("Operation")}>
            <button type="button" aria-pressed={mode === "add"} onClick={() => onMode("add")}>
              + {t("Add funds")}
            </button>
            <button type="button" aria-pressed={mode === "deduct"} onClick={() => onMode("deduct")}>
              − {t("Deduct funds")}
            </button>
          </div>
          <label className="field">
            <span>{t("Currency")}</span>
            <select value={code} onChange={(event) => onCode(event.target.value as MoneyCode)}>
              {MONEY.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} - {t(item.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("Amount")}</span>
            <input inputMode="decimal" value={amount} onChange={(event) => onAmount(event.target.value)} />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit">
            {mode === "add" ? t("Add funds") : t("Deduct funds")}
          </button>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            {t("Cancel")}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
