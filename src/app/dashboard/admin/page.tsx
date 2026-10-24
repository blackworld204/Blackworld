"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AdminAccount } from "@/components/admin-account";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { NoticeDialog } from "@/components/notice-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { MONEY, adjustBalance, forgetPushTokens, money, postAdminNotice, removeMember, setAccountRole, setAccountStatus, setCreateAccess, type BankUser, type MoneyCode } from "@/lib/bank";
import { deliverPush } from "@/lib/deliver-push";

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

function Mark({ name }: { name: "balance" | "block" | "allow" | "remove" | "shield" | "users" | "active" | "bell" }) {
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
  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M6 16h12" />
        <path d="M7 16V10a5 5 0 0 1 10 0v6" />
        <path d="M10 16a2 2 0 0 0 4 0" />
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
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [askBalance, setAskBalance] = useState(false);
  const [code, setCode] = useState<MoneyCode>("USD");
  const [amount, setAmount] = useState("0.00");
  const [mode, setMode] = useState<"add" | "deduct">("add");
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<
    | { type: "status"; id: string; name: string; next: "active" | "inactive" }
    | { type: "access"; id: string; name: string; canCreate: boolean }
    | { type: "role"; id: string; name: string; next: "admin" | "member" }
    | { type: "remove"; id: string; name: string }
    | null
  >(null);
  const [notice, setNotice] = useState<{ userIds: string[] | "all"; name: string | null } | null>(null);

  const rows = useMemo(() => {
    if (!state) return [];
    const q = query.trim().toLowerCase();
    return state.users.filter(
      (item) => !q || item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q),
    );
  }, [state, query]);
  const pageCount = Math.max(1, Math.ceil(rows.length / 30));

  useEffect(() => {
    setPage((value) => Math.min(Math.max(1, value), pageCount));
  }, [pageCount]);

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

  const opened = state.users.find((item) => item.id === openId) ?? null;
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
    if (!user) return;
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
    setError("");
    setAskBalance(true);
  }

  function applyBalance(subject: BankUser) {
    if (!user) return;
    setAskBalance(false);
    const value = Number(amount);
    const current = subject.balances[code];
    const digits = code === "JPY" ? 0 : 2;
    const factor = 10 ** digits;
    const next = Math.round((mode === "add" ? current + value : current - value) * factor) / factor;
    const failed = adjustBalance(user.id, subject.id, code, next);
    if (failed) {
      setError(t(failed));
      return;
    }
    setEditing(null);
    setError("");
    toast(t("Balance updated."));
  }

  return (
    <div className="app-pad">
      <header className="admin-top">
        <div className="admin-title">
          <span className="admin-mark" aria-hidden="true">
            <Mark name="shield" />
          </span>
          <div>
            <h1>{t("Admin panel")}</h1>
            <p>{t("Accounts, balances, permissions, and notices on this desk.")}</p>
          </div>
          <Link className="btn btn-primary admin-create" href="/dashboard/create">
            + {t("Create account")}
          </Link>
        </div>
      </header>

      {opened ? (
        <AdminAccount
          admin={user}
          subject={opened}
          state={state}
          onBack={() => setOpenId(null)}
          onCredit={() => openBalance(opened)}
          onNotice={() => setNotice({ userIds: [opened.id], name: opened.name })}
          onStatus={() =>
            setAsk({
              type: "status",
              id: opened.id,
              name: opened.name,
              next: opened.status === "active" ? "inactive" : "active",
            })
          }
          onAccess={() => setAsk({ type: "access", id: opened.id, name: opened.name, canCreate: !opened.canCreate })}
          onRole={() =>
            setAsk({
              type: "role",
              id: opened.id,
              name: opened.name,
              next: opened.role === "admin" ? "member" : "admin",
            })
          }
          onRemove={() => setAsk({ type: "remove", id: opened.id, name: opened.name })}
        />
      ) : null}

      {opened ? null : (
      <>
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
          <div className="admin-board-tools">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNotice({ userIds: "all", name: null })}>
              {t("Notify everyone")}
            </button>
            <label className="field admin-search">
              <span className="sr-only">{t("Search")}</span>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={t("Search users")}
              />
            </label>
          </div>
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
              {rows.slice((Math.min(page, pageCount) - 1) * 30, Math.min(page, pageCount) * 30).map((item) => (
                  <tr key={item.id} className="admin-row" onClick={() => setOpenId(item.id)}>
                    <td>
                      <button type="button" className="admin-open" onClick={() => setOpenId(item.id)}>
                        <span className="admin-avatar" style={{ background: tone(item.name) }} aria-hidden="true">
                          {initials(item.name)}
                        </span>
                        <span>
                          <strong>{item.name}</strong>
                          <span>{item.email}</span>
                        </span>
                      </button>
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
                        <span className={item.role === "admin" ? "admin-pill is-role" : "admin-pill"}>
                          {item.role === "admin" ? t("Admin") : t("Member")}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={item.canCreate ? "admin-permit is-yes" : "admin-permit"}>
                        {item.canCreate ? t("Can create") : t("No access")}
                      </span>
                    </td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-icon is-notice"
                          data-label={t("Send notice")}
                          aria-label={t("Send notice")}
                          onClick={() => setNotice({ userIds: [item.id], name: item.name })}
                        >
                          <Mark name="bell" />
                        </button>
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
                        {item.id !== user.id ? (
                          <button
                            type="button"
                            className="text-button admin-role"
                            onClick={() =>
                              setAsk({
                                type: "role",
                                id: item.id,
                                name: item.name,
                                next: item.role === "admin" ? "member" : "admin",
                              })
                            }
                          >
                            {item.role === "admin" ? t("Make member") : t("Make admin")}
                          </button>
                        ) : null}
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
        {rows.length > 0 ? (
          <nav className="admin-pager" aria-label={t("User management")}>
            <p>
              {t("{start}–{end} of {total}", {
                start: (Math.min(page, pageCount) - 1) * 30 + 1,
                end: Math.min(rows.length, Math.min(page, pageCount) * 30),
                total: rows.length,
              })}
            </p>
            <div className="admin-pager-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={Math.min(page, pageCount) <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {t("Previous")}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={Math.min(page, pageCount) >= pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                {t("Next")}
              </button>
            </div>
          </nav>
        ) : null}
      </section>
      </>
      )}
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
        open={askBalance}
        title={t("Update this balance?")}
        body={t("{name} receives the new balance.", { name: state.users.find((item) => item.id === editing)?.name ?? "" })}
        confirmLabel={t("Update balance")}
        onClose={() => setAskBalance(false)}
        onConfirm={() => {
          const subject = state.users.find((item) => item.id === editing);
          if (subject) applyBalance(subject);
          else setAskBalance(false);
        }}
      />
      <NoticeDialog
        key={notice ? (notice.userIds === "all" ? "all" : notice.userIds.join()) : "closed"}
        open={notice !== null}
        name={notice?.name ?? null}
        onClose={() => setNotice(null)}
        onSend={async (title, body) => {
          if (!notice || !user) return "Only an admin can send a notice.";
          const result = postAdminNotice(user.id, { userIds: notice.userIds, title, body });
          if (result.error !== null) return result.error;
          const push = await deliverPush(
            result.deliveries.map((item) => ({
              title: result.title,
              body: result.body,
              tag: item.tag,
              tokens: item.tokens,
            })),
          );
          if (push.stale.length) forgetPushTokens(push.stale);
          setNotice(null);
          const hadDevices = result.deliveries.some((item) => item.tokens.length > 0);
          if (push.failed) toast(t("Notice sent. The push did not go out."));
          else if (hadDevices && !push.configured) toast(t("Notice sent. It is on their desk. Push from the server is not configured."));
          else toast(t("Notice sent."));
          return null;
        }}
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
              : ask?.type === "role"
                ? ask.next === "admin"
                  ? t("Make this account an admin?")
                  : t("Make this account a member?")
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
              : ask?.type === "role"
                ? ask.next === "admin"
                  ? t("{name} will manage users, balances, and permissions.", { name: ask.name })
                  : t("{name} will use their own account. Admin tools will close.", { name: ask.name })
                : t("{name} and their balance leave this desk.", { name: ask?.name ?? "" })
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
              : ask?.type === "role"
                ? ask.next === "admin"
                  ? t("Make admin")
                  : t("Make member")
                : t("Remove")
        }
        onClose={() => setAsk(null)}
        onConfirm={() => {
          if (!ask) return;
          let failed: string | null = null;
          if (ask.type === "status") failed = setAccountStatus(user.id, ask.id, ask.next);
          else if (ask.type === "access") failed = setCreateAccess(user.id, ask.id, ask.canCreate);
          else if (ask.type === "role") failed = setAccountRole(user.id, ask.id, ask.next);
          else failed = removeMember(user.id, ask.id);
          if (failed) toast(t(failed));
          else if (ask.type === "remove") toast(t("Member removed."));
          else if (ask.type === "role") toast(ask.next === "admin" ? t("Admin access saved.") : t("Member access saved."));
          if (!failed && ask.type === "remove") setOpenId(null);
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
