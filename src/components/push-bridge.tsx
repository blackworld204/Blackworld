"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import {
  alertsOf,
  loadBank,
  noteIsQuiet,
  notesFor,
  subscribeBank,
  userByEmail,
} from "@/lib/bank";
import { bindFirebasePush } from "@/lib/firebase-push";
import {
  noteAllowsPush,
  pushStatus,
  registerPushWorker,
  showPush,
} from "@/lib/push";
import { noteOpenHref } from "@/lib/receipt";

export function PushBridge() {
  const { session } = useSession();
  const { t } = useI18n();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (pushStatus() !== "on") return;
    registerPushWorker().catch(() => undefined);
    const state = loadBank();
    const user = session ? userByEmail(state, session.email) : null;
    if (user) void bindFirebasePush(user.id).catch(() => undefined);
  }, [session]);

  useEffect(() => {
    seen.current = null;
    const read = () => {
      const state = loadBank();
      const user = session ? userByEmail(state, session.email) : null;
      const notes = user ? notesFor(state, user.id) : [];
      const ids = notes.map((note) => note.id);
      if (!seen.current) {
        seen.current = new Set(ids);
        return;
      }
      const fresh = notes.filter(
        (note) =>
          !note.read && !seen.current?.has(note.id) && !noteIsQuiet(note.id),
      );
      for (const note of notes) seen.current.add(note.id);
      if (!session || !user || pushStatus() !== "on" || fresh.length === 0)
        return;
      const alerts = user ? alertsOf(user) : null;
      for (const note of fresh) {
        if (alerts && !noteAllowsPush(note, alerts)) continue;
        showPush(
          t(note.title),
          t(note.body),
          note.id,
          noteOpenHref(state, note, { id: user.id, role: user.role }),
        ).catch(() => undefined);
      }
    };
    read();
    return subscribeBank(read);
  }, [session, t]);

  return null;
}
