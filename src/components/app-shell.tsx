"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectionMark } from "@/components/connection-mark";
import { Glyph } from "@/components/glyph";
import { LanguageSelect } from "@/components/language-select";
import { Mark } from "@/components/mark";
import { useSession } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import { loadBank, subscribeBank, userByEmail } from "@/lib/bank";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/send", label: "Send" },
  { href: "/dashboard/deposit", label: "Deposit" },
  { href: "/dashboard/cards", label: "Cards" },
  { href: "/dashboard/exchange", label: "Exchange" },
  { href: "/dashboard/transactions", label: "Activity" },
  { href: "/dashboard/schedule", label: "Schedule" },
  { href: "/dashboard/batch", label: "Batch" },
  { href: "/dashboard/approvals", label: "Approvals" },
  { href: "/dashboard/team", label: "Team" },
  { href: "/dashboard/developers", label: "Developers" },
  { href: "/dashboard/referrals", label: "Refer and earn" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/support", label: "Support" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { session, signOut } = useSession();
  const { t } = useI18n();
  const [admin, setAdmin] = useState(false);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    const column = document.querySelector(".app-column");
    if (column instanceof HTMLElement) column.scrollTop = 0;
    const nav = document.querySelector(".app-nav");
    const current = nav?.querySelector("[aria-current='page']");
    if (!(nav instanceof HTMLElement) || !(current instanceof HTMLElement)) return;
    const top = current.offsetTop - (nav.clientHeight - current.offsetHeight) / 2;
    nav.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const read = () => {
      if (!session) return;
      const state = loadBank();
      const user = userByEmail(state, session.email);
      setAdmin(user?.role === "admin");
      setUnread(state.notes.filter((note) => !note.read).length);
    };
    read();
    return subscribeBank(read);
  }, [session]);

  const accountLinks = () => (
    <>
      {LINKS.map((link) => {
        const current = link.href === "/dashboard" ? path === "/dashboard" : path.startsWith(link.href);
        const count = link.href === "/dashboard/notifications" && unread > 0 ? unread : 0;
        return (
          <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined} onClick={() => setOpen(false)}>
            <span>{t(link.label)}</span>
            {count > 0 ? <span className="app-nav-count">{count}</span> : null}
          </Link>
        );
      })}
      {admin ? (
        <Link href="/dashboard/admin" aria-current={path.startsWith("/dashboard/admin") ? "page" : undefined} onClick={() => setOpen(false)}>
          {t("Admin")}
        </Link>
      ) : null}
    </>
  );

  return (
    <div className="app">
      <aside className="app-side">
        <Link href="/dashboard" className="brand" aria-label={t("Blackworld, dashboard")}>
          <Mark />
          <span>Blackworld</span>
        </Link>
        <nav className="app-nav" aria-label={t("Account")}>
          {accountLinks()}
        </nav>
        <button type="button" className="app-side-out" onClick={signOut}>
          {t("Sign out")}
        </button>
      </aside>
      <div className="app-column">
      <div className="app-head">
      <header className="app-bar">
        <Link href="/dashboard" className="brand" aria-label={t("Blackworld, dashboard")}>
          <Mark />
          <span>Blackworld</span>
        </Link>
        <button
          type="button"
          className="menu-toggle app-menu-toggle"
          aria-expanded={open}
          aria-controls="account-menu"
          onClick={() => setOpen(true)}
        >
          {t("Menu")}
        </button>
        <div className="app-bar-actions">
          <ConnectionMark />
          <LanguageSelect />
          <Link
            href="/dashboard/notifications"
            className="text-button app-bell"
            aria-label={unread > 0 ? `${t("Notifications")}, ${unread}` : t("Notifications")}
          >
            <span className="app-bell-icon">
              <Glyph name="bell" />
              {unread > 0 ? <span className="app-count">{unread}</span> : null}
            </span>
            <span className="app-bell-label">{t("Notifications")}</span>
          </Link>
          <span className="app-account">
            <span className="mono session-email">{session?.email}</span>
            <button type="button" className="text-button session-signout" onClick={signOut}>
              {t("Sign out")}
            </button>
          </span>
        </div>
      </header>
      {open ? (
        <div className="menu app-menu" id="account-menu" role="dialog" aria-label={t("Menu")}>
          <div className="menu-top">
            <Link href="/dashboard" className="brand" onClick={() => setOpen(false)}>
              <Mark />
              <span>Blackworld</span>
            </Link>
            <button type="button" className="text-button" onClick={() => setOpen(false)}>
              {t("Close")}
            </button>
          </div>
          <nav className="menu-links" aria-label={t("Account")}>
            {session ? <p className="menu-email">{session.email}</p> : null}
            {accountLinks()}
            <button type="button" className="menu-signout" onClick={signOut}>
              {t("Sign out")}
            </button>
          </nav>
        </div>
      ) : null}
      </div>
      <div className="app-main" key={path}>{children}</div>
      </div>
    </div>
  );
}
