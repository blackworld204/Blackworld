"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";

export function ConnectionMark() {
  const { t } = useI18n();
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const apply = (event?: Event) => {
      if (event?.type === "online") setOnline(true);
      else if (event?.type === "offline") setOnline(false);
      else setOnline(navigator.onLine);
    };
    apply();
    window.addEventListener("online", apply);
    window.addEventListener("offline", apply);
    return () => {
      window.removeEventListener("online", apply);
      window.removeEventListener("offline", apply);
    };
  }, []);

  const label = online === false ? t("Offline") : t("Online");

  return (
    <span className={online === false ? "net is-offline" : "net"} role="status" aria-live="polite">
      <span className="net-dot" aria-hidden="true" />
      <span className="net-label">{online === null ? t("Online") : label}</span>
    </span>
  );
}
