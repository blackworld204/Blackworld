"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectionMark } from "@/components/connection-mark";
import { Inbox } from "@/components/inbox";
import { LanguageSelect } from "@/components/language-select";
import { Mark } from "@/components/mark";
import { useSession } from "@/components/session";
import { SignOutButton } from "@/components/sign-out-button";
import { useI18n } from "@/i18n/provider";
import { loadBank, notesFor, subscribeBank, userByEmail } from "@/lib/bank";

const PAYMENT_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/send", label: "Send" },
  { href: "/dashboard/deposit", label: "Deposit" },
  { href: "/dashboard/exchange", label: "Exchange" },
  { href: "/dashboard/cards", label: "Cards" },
  { href: "/dashboard/transactions", label: "Activity" },
  { href: "/dashboard/schedule", label: "Schedule" },
  { href: "/dashboard/batch", label: "Batch" },
  { href: "/dashboard/approvals", label: "Approvals" },
];

const ACCOUNT_LINKS = [
  { href: "/dashboard/statement", label: "Account statement" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/support", label: "Support" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { session } = useSession();
  const { t } = useI18n();
  const [access, setAccess] = useState<{ admin: boolean; canCreate: boolean } | null>(null);
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
      if (event.key === "Escape" && !document.querySelector(".confirm-layer")) setOpen(false);
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
      setAccess(user ? { admin: user.role === "admin", canCreate: user.role === "admin" || Boolean(user.canCreate) } : null);
      setUnread(user ? notesFor(state, user.id).filter((note) => !note.read).length : 0);
    };
    read();
    return subscribeBank(read);
  }, [session]);

  const linkItems = (links: { href: string; label: string }[]) =>
    links.map((link) => {
      const current = link.href === "/dashboard" ? path === "/dashboard" : path.startsWith(link.href);
      const count = link.href === "/dashboard/notifications" && unread > 0 ? unread : 0;
      return (
        <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined} onClick={() => setOpen(false)}>
          <span>{t(link.label)}</span>
          {count > 0 ? <span className="app-nav-count">{count}</span> : null}
        </Link>
      );
    });

  const home = access?.admin ? "/dashboard/admin" : "/dashboard";

  const accountLinks = () => {
    if (access?.admin) {
      return linkItems([
        { href: "/dashboard/admin", label: "Admin" },
        { href: "/dashboard/settings", label: "Notification settings" },
      ]);
    }
    const institution = [
      ...(access?.canCreate ? [{ href: "/dashboard/create", label: "Create account" }] : []),
      { href: "/dashboard/developers", label: "Developers" },
      { href: "/dashboard/referrals", label: "Refer and earn" },
    ];
    return (
      <>
        <p className="app-nav-label">{t("Payments")}</p>
        {linkItems(PAYMENT_LINKS)}
        <p className="app-nav-label">{t("Account")}</p>
        {linkItems(ACCOUNT_LINKS)}
        <p className="app-nav-label">{t("Institution")}</p>
        {linkItems(institution)}
      </>
    );
  };

  return (
    <div className="app">
      <aside className="app-side">
        <Link href={home} className="brand" aria-label={t("Blackworld, dashboard")}>
          <Mark />
          <span>Blackworld</span>
        </Link>
        <nav className="app-nav" aria-label={t("Account")}>
          {accountLinks()}
        </nav>
        <SignOutButton className="app-side-out" />
      </aside>
      <div className="app-column">
      <div className="app-head">
      <header className="app-bar">
        <Link href={home} className="brand" aria-label={t("Blackworld, dashboard")}>
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
          <Inbox />
          <span className="app-account">
            <span className="mono session-email">{session?.email}</span>
            <SignOutButton className="text-button session-signout" />
          </span>
        </div>
      </header>
      {open ? (
        <div className="menu app-menu" id="account-menu" role="dialog" aria-label={t("Menu")}>
          <div className="menu-top">
            <Link href={home} className="brand" onClick={() => setOpen(false)}>
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
            <SignOutButton className="menu-signout" onDone={() => setOpen(false)} />
          </nav>
        </div>
      ) : null}
      </div>
      <div className="app-main" key={path}>{children}</div>
      </div>
    </div>
  );
}
