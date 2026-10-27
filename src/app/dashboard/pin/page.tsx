"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { SetPinForm } from "@/components/set-pin-form";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { hasTransferPin } from "@/lib/bank";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/dashboard")) return "/dashboard";
  if (value.startsWith("//") || value.includes("://")) return "/dashboard";
  return value;
}

function PinSetup() {
  const { user } = useAccount();
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNext(search.get("next"));

  useEffect(() => {
    if (user && hasTransferPin(user)) router.replace(next);
  }, [user, next, router]);

  if (!user) return <div className="app-hold" />;
  if (hasTransferPin(user)) return <div className="app-hold" />;

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Security")}</p>
        <h1>{t("Set transfer PIN")}</h1>
      </header>
      <SetPinForm user={user} onDone={() => router.replace(next)} />
    </div>
  );
}

export default function PinPage() {
  return (
    <Suspense fallback={<div className="app-hold" />}>
      <PinSetup />
    </Suspense>
  );
}
