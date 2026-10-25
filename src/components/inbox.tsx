"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Glyph } from "@/components/glyph";
import { useSession } from "@/components/session";
import { useI18n } from "@/i18n/provider";
import { loadBank, markNote, markNotes, noteIsQuiet, notesFor, subscribeBank, userByEmail, when, type BankNote } from "@/lib/bank";

export function Inbox() {
  const pathname = usePathname();
  const { session } = useSession();
  const { t, locale } = useI18n();
  const root = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const seen = useRef<Set<string> | null>(null);
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const [ask, setAsk] = useState(false);
  const [notes, setNotes] = useState<BankNote[]>([]);
  const [userId, setUserId] = useState("");
  const [live, setLive] = useState<BankNote[]>([]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const anchor = buttonRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const margin = 12;
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const rtl = document.documentElement.dir === "rtl";
      let boundStart = margin;
      let boundEnd = vw - margin;
      const side = document.querySelector(".app-side");
      if (side instanceof HTMLElement && getComputedStyle(side).display !== "none") {
        const sideBox = side.getBoundingClientRect();
        if (sideBox.width > 8) {
          if (sideBox.left < vw / 2) boundStart = Math.max(boundStart, sideBox.right + 8);
          else boundEnd = Math.min(boundEnd, sideBox.left - 8);
        }
      }
      const width = Math.min(380, Math.max(160, boundEnd - boundStart));
      const aligned = rtl ? rect.left : rect.right - width;
      const left = Math.round(Math.min(Math.max(aligned, boundStart), boundEnd - width));
      const top = Math.round(rect.bottom + 8);
      const maxHeight = Math.round(Math.max(96, vh - top - margin));
      setBox((current) =>
        current && current.top === top && current.left === left && current.width === Math.round(width) && current.maxHeight === maxHeight
          ? current
          : { top, left, width: Math.round(width), maxHeight },
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".confirm-layer")) setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !root.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const unread = notes.filter((note) => !note.read).length;
  const recent = notes.slice(0, 5);

  function dismiss(id: string) {
    setLive((current) => current.filter((note) => note.id !== id));
  }

  function openNote(id: string) {
    if (userId) markNote(id, true);
    dismiss(id);
    setOpen(false);
  }

  return (
    <div className="inbox" ref={root}>
      <button
        ref={buttonRef}
        type="button"
        className="text-button app-bell"
        aria-expanded={open}
        aria-controls="inbox-panel"
        aria-label={unread > 0 ? `${t("Notifications")}, ${unread}` : t("Notifications")}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="app-bell-icon">
          <Glyph name="bell" />
          {unread > 0 ? <span className="app-count">{unread}</span> : null}
        </span>
        <span className="app-bell-label">{t("Notifications")}</span>
      </button>
      {open ? (
        <div
          id="inbox-panel"
          className="inbox-panel"
          role="dialog"
          aria-label={t("Notifications")}
          style={
            box
              ? { top: box.top, left: box.left, width: box.width, maxHeight: box.maxHeight }
              : { visibility: "hidden" }
          }
        >
          <div className="inbox-head">
            <strong>{t("Notifications")}</strong>
            {unread > 0 && userId ? (
              <button type="button" className="text-button" onClick={() => setAsk(true)}>
                {t("Mark all read")}
              </button>
            ) : null}
          </div>
          {recent.length === 0 ? (
            <p className="muted inbox-empty">{t("No notifications.")}</p>
          ) : (
            <ul className="note-list">
              {recent.map((note) => (
                <li key={note.id} data-read={note.read ? "true" : "false"}>
                  <Link href="/dashboard/notifications" onClick={() => openNote(note.id)}>
                    <strong>{t(note.title)}</strong>
                    <span className="muted">{t(note.body)}</span>
                    <span className="mono">{when(note.at, locale)}{note.read ? "" : ` · ${t("Unread")}`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="inbox-foot">
            <Link href="/dashboard/notifications" onClick={() => setOpen(false)}>
              {t("See all")}
            </Link>
          </div>
        </div>
      ) : null}
      {live.length > 0 ? (
        <div className="inbox-live" aria-live="polite">
          {live.map((note) => (
            <article key={note.id}>
              <Link href="/dashboard/notifications" onClick={() => openNote(note.id)}>
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
      <ConfirmDialog
        open={ask}
        title={t("Mark all as read?")}
        body={t("Every notice on this desk is marked read.")}
        confirmLabel={t("Mark all read")}
        onClose={() => setAsk(false)}
        onConfirm={() => {
          if (userId) markNotes(userId, true);
          setAsk(false);
        }}
      />
    </div>
  );
}
