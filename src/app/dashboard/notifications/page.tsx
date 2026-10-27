"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OtpDialog } from "@/components/otp-dialog";
import { ReceiptDialog } from "@/components/receipt-dialog";
import { toast } from "@/components/toast";
import { useAccount } from "@/components/use-account";
import { useI18n } from "@/i18n/provider";
import { loadBank, markNote, markNotes, notesFor, subscribeBank, when, type BankTx } from "@/lib/bank";
import { adminNoteHref, findTxForNote } from "@/lib/receipt";

export default function NotificationsPage() {
  const { state, user } = useAccount();
  const { t, locale } = useI18n();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [tick, setTick] = useState(0);
  const [receipt, setReceipt] = useState<BankTx | null>(null);
  const [otp, setOtp] = useState<{ id: string; expiresAt: string } | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);

  useEffect(() => subscribeBank(() => setTick((value) => value + 1)), []);

  if (tick < 0 || !state || !user) return <div className="app-hold" />;

  const bank = loadBank();
  const mine = notesFor(bank, user.id).slice().sort((a, b) => (a.at < b.at ? 1 : -1));
  const unread = mine.filter((note) => !note.read).length;
  const notes = mine.filter((note) => filter === "all" || !note.read);

  function openNote(noteId: string) {
    const note = mine.find((item) => item.id === noteId);
    if (!note) return;
    markNote(note.id, true);
    const adminHref = adminNoteHref(bank, note, user);
    if (adminHref) {
      router.push(adminHref);
      return;
    }
    const tx = findTxForNote(bank, note);
    if (tx) setReceipt(tx);
  }

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
          <button type="button" className="btn btn-sm" onClick={() => markNotes(user.id, true)}>
            {t("Mark all read")}
          </button>
        ) : null}
      </div>

      {notes.length === 0 ? (
        <p className="muted">{filter === "unread" ? t("Nothing unread.") : t("No notifications.")}</p>
      ) : (
        <ul className="note-list">
          {notes.map((note) => {
            const hasReceipt = Boolean(findTxForNote(bank, note));
            const adminHref = adminNoteHref(bank, note, user);
            const opens = Boolean(hasReceipt || adminHref);
            return (
              <li key={note.id} data-read={note.read ? "true" : "false"}>
                <button type="button" onClick={() => (opens ? openNote(note.id) : markNote(note.id, !note.read))}>
                  <strong>{t(note.title)}</strong>
                  <span className="muted">{t(note.body)}</span>
                  <span className="mono">
                    {when(note.at, locale)}
                    {note.read ? "" : ` · ${t("Unread")}`}
                    {adminHref ? ` · ${t("Open member")}` : hasReceipt ? ` · ${t("Receipt")}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p>
        <Link href="/dashboard/settings#alerts">{t("Notification settings")}</Link>
      </p>
      <ReceiptDialog
        tx={receipt}
        name={user.name}
        email={user.email}
        onClose={() => setReceipt(null)}
        otpExpiresAt={
          receipt
            ? bank.approvals.find((item) => item.id === receipt.approvalId)?.otpExpiresAt ??
              receipt.otpExpiresAt ??
              null
            : null
        }
        onContinueOtp={
          receipt?.status === "pending" && receipt.approvalId
            ? () => {
                const row = bank.approvals.find(
                  (item) => item.id === receipt.approvalId && item.status === "pending",
                );
                const expiresAt = row?.otpExpiresAt ?? receipt.otpExpiresAt;
                if (!row || !expiresAt) {
                  toast(t("That OTP request is no longer waiting."));
                  return;
                }
                setReceipt(null);
                setOtp({ id: row.id, expiresAt });
                setOtpOpen(true);
              }
            : undefined
        }
      />
      <OtpDialog
        open={otpOpen && otp !== null}
        approvalId={otp?.id ?? null}
        expiresAt={otp?.expiresAt ?? null}
        title={t("Get OTP from admin")}
        body={t("For security purposes, get the 6-digit OTP from an admin. This security check expires in 24 hours.")}
        onClose={() => setOtpOpen(false)}
        onVerified={() => {
          setOtpOpen(false);
          setOtp(null);
          toast(t("OTP accepted."));
        }}
      />
    </div>
  );
}
