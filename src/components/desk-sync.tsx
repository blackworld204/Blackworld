"use client";

import { useEffect } from "react";
import { useSession } from "@/components/session";
import { startDeskSync } from "@/lib/desk-sync";
import { startLiveNotices } from "@/lib/live-notice";

export function DeskSync() {
  const { session } = useSession();

  useEffect(() => {
    if (!session) return;
    const stopDesk = startDeskSync();
    const stopLive = startLiveNotices(session.email);
    return () => {
      stopDesk();
      stopLive();
    };
  }, [session]);

  return null;
}
