"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { loadBank, markNote, markNotes, notesFor, subscribeBank, when } from "@/lib/bank";

export default function NotificationsPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [ask, setAsk] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => subscribeBank(() => setTick((value) => value + 1)), []);

  if (tick < 0 || !state || !user) return <div className="app-hold" />;

  const mine = notesFor(loadBank(), user.id).slice().sort((a, b) => (a.at < b.at ? 1 : -1));
  const unread = mine.filter((note) => !note.read).length;
  const notes = mine.filter((note) => filter === "all" || !note.read);

  return (
    <div className="app-pad">
      <header className="app-intro">
        <p className="kicker">{t("Notifications")}</p>
        <h1>{t("What changed")}</h1>
        <p className="lede">
          {unread === 0 ? t("Nothing unread.") : t("{count} unread", { count: unread })}
        </p>
      </header>

      <div className="filter-row" role="group" aria-label={t("Filter")}>
        <button type="button" className="btn btn-ghost btn-sm" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          {t("All")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>
          {t("Unread")}
        </button>
        {unread > 0 ? (
          <button type="button" className="btn btn-sm" onClick={() => setAsk(true)}>
            {t("Mark all read")}
          </button>
        ) : null}
      </div>

      {notes.length === 0 ? (
        <p className="muted">{filter === "unread" ? t("Nothing unread.") : t("No notifications.")}</p>
      ) : (
        <ul className="note-list">
          {notes.map((note) => (
            <li key={note.id} data-read={note.read ? "true" : "false"}>
              <button type="button" onClick={() => markNote(note.id, !note.read)}>
                <strong>{t(note.title)}</strong>
                <span className="muted">{t(note.body)}</span>
                <span className="mono">{when(note.at, locale)}{note.read ? "" : ` · ${t("Unread")}`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p>
        <Link href="/dashboard/settings#alerts">{t("Notification settings")}</Link>
      </p>
      <ConfirmDialog
        open={ask}
        title={t("Mark all as read?")}
        body={t("Every notice on this desk is marked read.")}
        confirmLabel={t("Mark all read")}
        onClose={() => setAsk(false)}
        onConfirm={() => {
          markNotes(user.id, true);
          setAsk(false);
        }}
      />
    </div>
  );
}
