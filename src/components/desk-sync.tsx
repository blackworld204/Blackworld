"use client";

import { useEffect } from "react";
import { useSession } from "@/components/session";
import { toast } from "@/components/toast";
import { useI18n } from "@/i18n/provider";
import { startDeskSync } from "@/lib/desk-sync";
import { startLiveNotices } from "@/lib/live-notice";

const SAVE = "The desk could not be saved. Try again.";
const OPEN = "This desk could not be opened. Try again.";

export function DeskSync() {
  const { session } = useSession();
  const { t } = useI18n();

  useEffect(() => {
    if (!session) return;
    const stopDesk = startDeskSync();
    const stopLive = startLiveNotices(session.email);
    return () => {
      stopDesk();
      stopLive();
    };
  }, [session]);

  useEffect(() => {
    const seen = new Set<string>();
    const onProblem = (event: Event) => {
      if (seen.has(event.type)) return;
      seen.add(event.type);
      const text = event.type === "bw-desk-save" ? SAVE : OPEN;
      toast(t(text));
    };
    window.addEventListener("bw-desk-save", onProblem);
    window.addEventListener("bw-desk-open", onProblem);
    return () => {
      window.removeEventListener("bw-desk-save", onProblem);
      window.removeEventListener("bw-desk-open", onProblem);
    };
  }, [t]);

  return null;
}
