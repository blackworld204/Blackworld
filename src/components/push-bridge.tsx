"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import { alertsOf, loadBank, subscribeBank, userByEmail } from "@/lib/bank";
import { noteAllowsPush, pushStatus, registerPushWorker, showPush } from "@/lib/push";

export function PushBridge() {
  const { session } = useSession();
  const { t } = useI18n();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (pushStatus() === "on") registerPushWorker().catch(() => undefined);
  }, []);

  useEffect(() => {
    seen.current = null;
    const read = () => {
      const state = loadBank();
      const ids = state.notes.map((note) => note.id);
      if (!seen.current) {
        seen.current = new Set(ids);
        return;
      }
      const fresh = state.notes.filter((note) => !note.read && !seen.current?.has(note.id));
      for (const note of state.notes) seen.current.add(note.id);
      if (!session || pushStatus() !== "on" || fresh.length === 0) return;
      const user = userByEmail(state, session.email);
      const alerts = user ? alertsOf(user) : null;
      for (const note of fresh) {
        if (alerts && !noteAllowsPush(note.title, alerts)) continue;
        showPush(t(note.title), t(note.body), note.id).catch(() => undefined);
      }
    };
    read();
    return subscribeBank(read);
  }, [session, t]);

  return null;
}
