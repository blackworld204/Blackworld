"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Glyph } from "@/components/glyph";
import { useSession } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import { loadBank, markNote, noteIsQuiet, notesFor, subscribeBank, userByEmail, type BankNote } from "@/lib/bank";
import { noteOpenHref } from "@/lib/receipt";

function viewerForInbox(email: string | undefined) {
  if (!email) return null;
  const state = loadBank();
  const user = userByEmail(state, email);
  return user ? { id: user.id, role: user.role } : null;
}

export function Inbox() {
  const pathname = usePathname();
  const { session } = useSession();
  const { t } = useI18n();
  const seen = useRef<Set<string> | null>(null);
  const [notes, setNotes] = useState<BankNote[]>([]);
  const [userId, setUserId] = useState("");
  const [live, setLive] = useState<BankNote[]>([]);
  const onScreen = pathname === "/dashboard/notifications" || pathname.startsWith("/dashboard/notifications/");

  useEffect(() => {
    seen.current = null;
    const read = () => {
      if (!session) {
        setNotes([]);
        setUserId("");
        return;
      }
      const state = loadBank();
      const user = userByEmail(state, session.email);
      if (!user) {
        setNotes([]);
        setUserId("");
        return;
      }
      const mine = notesFor(state, user.id);
      setNotes(mine);
      setUserId(user.id);
      const ids = mine.map((note) => note.id);
      if (!seen.current) {
        seen.current = new Set(ids);
        return;
      }
      const fresh = mine.filter((note) => !note.read && !seen.current?.has(note.id) && !noteIsQuiet(note.id));
      for (const note of mine) seen.current.add(note.id);
      if (fresh.length === 0) return;
      setLive((current) => [...fresh, ...current].slice(0, 3));
    };
    read();
    return subscribeBank(read);
  }, [session]);

  useEffect(() => {
    if (live.length === 0) return;
    const timer = window.setTimeout(() => setLive((current) => current.slice(0, -1)), 8000);
    return () => window.clearTimeout(timer);
  }, [live]);

  useEffect(() => {
    const bar = document.querySelector(".app-bar");
    if (!(bar instanceof HTMLElement)) return;
    const place = () => {
      const bottom = bar.getBoundingClientRect().bottom;
      document.documentElement.style.setProperty("--inbox-live-top", `${Math.round(bottom + 8)}px`);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(bar);
    window.addEventListener("resize", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
    };
  }, []);

  const unread = notes.filter((note) => !note.read).length;

  function dismiss(id: string) {
    setLive((current) => current.filter((note) => note.id !== id));
  }

  function openNote(id: string) {
    if (userId) markNote(id, true);
    dismiss(id);
  }

  return (
    <div className="inbox">
      <Link
        href="/dashboard/notifications"
        className="text-button app-bell"
        aria-current={onScreen ? "page" : undefined}
        aria-label={unread > 0 ? `${t("Notifications")}, ${unread}` : t("Notifications")}
      >
        <span className="app-bell-icon">
          <Glyph name="bell" />
          {unread > 0 ? <span className="app-count">{unread}</span> : null}
        </span>
        <span className="app-bell-label">{t("Notifications")}</span>
      </Link>
      {live.length > 0 ? (
        <div className="inbox-live" aria-live="polite">
          {live.map((note) => (
            <article key={note.id}>
              <Link
                href={noteOpenHref(loadBank(), note, viewerForInbox(session?.email))}
                onClick={() => openNote(note.id)}
              >
                <strong>{t(note.title)}</strong>
                <span>{t(note.body)}</span>
              </Link>
              <button type="button" className="text-button" onClick={() => dismiss(note.id)}>
                {t("Close")}
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
