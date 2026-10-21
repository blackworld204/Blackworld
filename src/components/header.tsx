"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ConnectionMark } from "@/components/connection-mark";
import { LanguageSelect } from "@/components/language-select";
import { Mark } from "@/components/mark";
import { useSession } from "@/components/session";
import { useI18n } from "@/i18n/provider";

const links = [
  { href: "/#platform", label: "Platform" },
  { href: "/#exchange", label: "Exchange" },
  { href: "/docs", label: "Developers" },
  { href: "/about", label: "Company" },
  { href: "/support", label: "Support" },
];

export function Header() {
  const pathname = usePathname();
  const { session, ready, signOut } = useSession();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  return (
    <header className="site-header">
      <div className="wrap header-bar">
        <Link href="/" className="brand" aria-label={t("Blackworld home")}>
          <Mark />
          <span>Blackworld</span>
        </Link>
        <nav className="nav-desktop" aria-label={t("Platform")}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <ConnectionMark />
          <LanguageSelect />
          {ready && session ? (
            <>
              <span className="session-email">{session.email}</span>
              <Link href="/dashboard" className="text-button desk-link">
                {t("Dashboard")}
              </Link>
              <button type="button" className="text-button session-signout" onClick={signOut}>
                {t("Sign out")}
              </button>
            </>
          ) : ready ? (
            <Link href="/login" className="text-button login-link">
              {t("Login")}
            </Link>
          ) : null}
          <Link href="/apply" className="btn btn-primary btn-sm">
            {t("Apply")}
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen(true)}
          >
            {t("Menu")}
          </button>
        </div>
      </div>
      {open ? (
        <div className="menu" id="site-menu" role="dialog" aria-label="Menu">
          <div className="menu-top">
            <Link href="/" className="brand" aria-label={t("Blackworld home")} onClick={() => setOpen(false)}>
              <Mark />
              <span>Blackworld</span>
            </Link>
            <div className="menu-tools">
              <LanguageSelect />
              <button type="button" className="text-button" onClick={() => setOpen(false)}>
                {t("Close")}
              </button>
            </div>
          </div>
          <nav className="menu-links" aria-label={t("Menu")}>
            {session ? <p className="menu-email">{session.email}</p> : null}
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {t(link.label)}
              </Link>
            ))}
            <Link href="/demo" onClick={() => setOpen(false)}>{t("Watch demo")}</Link>
            {session ? (
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                {t("Dashboard")}
              </Link>
            ) : null}
            {session ? (
              <button type="button" className="menu-signout" onClick={signOut}>
                {t("Sign out")}
              </button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>{t("Login")}</Link>
            )}
          </nav>
          <Link href="/apply" className="btn btn-primary" onClick={() => setOpen(false)}>
            {t("Apply for partnership")}
          </Link>
        </div>
      ) : null}
    </header>
  );
}
