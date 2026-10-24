"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { DeskRunner } from "@/components/desk-runner";
import { RequireSession } from "@/components/require-session";
import { SignOutButton } from "@/components/sign-out-button";
import { BankProvider, useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";

const ADMIN_ROUTES = [
  "/dashboard/admin",
  "/dashboard/settings",
  "/dashboard/notifications",
  "/dashboard/create",
];

function adminRoute(path: string) {
  return ADMIN_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireSession>
      <BankProvider>
        <AppShell>
          <AccountGate>{children}</AccountGate>
        </AppShell>
      </BankProvider>
    </RequireSession>
  );
}

function AccountGate({ children }: { children: React.ReactNode }) {
  const { state, user } = useAccount();
  const { t } = useI18n();
  const path = usePathname();
  const router = useRouter();
  const adminDesk = user?.role === "admin" && user.status === "active";
  const allowed = adminRoute(path);

  useEffect(() => {
    if (adminDesk && !allowed) router.replace("/dashboard/admin");
  }, [adminDesk, allowed, router]);

  if (!state) return <div className="app-hold" />;
  if (adminDesk && !allowed) return <div className="app-hold" />;
  if (!user || user.status !== "active") {
    return (
      <div className="app-pad">
        <header className="app-intro">
          <p className="kicker">{t("Account")}</p>
          <h1>{user ? t("This account is inactive.") : t("No account")}</h1>
          {user ? null : (
            <p className="lede">{t("This sign-in has no account.")}</p>
          )}
        </header>
        <SignOutButton className="btn btn-primary" />
      </div>
    );
  }
  return (
    <>
      <DeskRunner />
      {children}
    </>
  );
}
