import type { BankNote, BankState, BankTx, BankUser } from "@/lib/bank";
import { localeTag, money } from "@/lib/bank";

export function receiptHref(txId: string) {
  return `/dashboard/transactions?tx=${encodeURIComponent(txId)}`;
}

/** Resolves a transfer notice to its transaction, including older notes without txId. */
export function findTxForNote(state: BankState, note: BankNote): BankTx | null {
  if (note.txId) {
    const byId = state.txs.find((tx) => tx.id === note.txId);
    if (byId) return byId;
  }
  const ownerId = note.relatedUserId || note.userId;
  if (!ownerId) return null;
  const matched = state.txs.find(
    (tx) => tx.userId === ownerId && tx.title === note.title && tx.at === note.at,
  );
  return matched ?? null;
}

/** Member account an admin notice is about (OTP waiting, account opened, etc.). */
export function subjectUserIdForNote(state: BankState, note: BankNote, viewerId?: string): string | null {
  if (note.relatedUserId && state.users.some((item) => item.id === note.relatedUserId)) {
    return note.relatedUserId;
  }
  const tx = findTxForNote(state, note);
  if (tx?.userId && tx.userId !== viewerId) return tx.userId;
  if (note.title === "Account opened") {
    const email = note.body.split("·").map((part) => part.trim()).find((part) => part.includes("@"));
    if (email) {
      const match = state.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (match) return match.id;
    }
  }
  return null;
}

/** The member-owned note that mirrors an admin’s inbox copy. */
export function subjectNoteForAdminNote(
  state: BankState,
  note: BankNote,
  subjectUserId: string,
): BankNote | null {
  if (note.userId === subjectUserId) return note;
  if (note.txId) {
    const byTx = state.notes.find((item) => item.userId === subjectUserId && item.txId === note.txId);
    if (byTx) return byTx;
  }
  return (
    state.notes.find(
      (item) => item.userId === subjectUserId && item.title === note.title && item.at === note.at,
    ) ?? null
  );
}

/** Deep link for admins into that member’s desk, focused on the matching note/approval. */
export function adminNoteHref(
  state: BankState,
  note: BankNote,
  viewer: Pick<BankUser, "id" | "role"> | null | undefined,
): string | null {
  if (!viewer || viewer.role !== "admin") return null;
  const subjectId = subjectUserIdForNote(state, note, viewer.id);
  if (!subjectId || subjectId === viewer.id) return null;
  const subjectNote = subjectNoteForAdminNote(state, note, subjectId);
  const tx = findTxForNote(state, note);
  const params = new URLSearchParams({ user: subjectId });
  if (subjectNote) params.set("note", subjectNote.id);
  if (tx?.approvalId) params.set("approval", tx.approvalId);
  else if (tx?.id) params.set("tx", tx.id);
  return `/dashboard/admin?${params.toString()}`;
}

export function noteOpenHref(
  state: BankState,
  note: BankNote,
  viewer?: Pick<BankUser, "id" | "role"> | null,
) {
  const adminHref = adminNoteHref(state, note, viewer ?? null);
  if (adminHref) return adminHref;
  const tx = findTxForNote(state, note);
  return tx ? receiptHref(tx.id) : "/dashboard/notifications";
}

export function printReceipt() {
  document.documentElement.classList.add("print-receipt");
  const done = () => {
    document.documentElement.classList.remove("print-receipt");
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}

export function downloadReceipt(input: {
  tx: BankTx;
  name: string;
  email: string;
  locale: string;
  labels: {
    receipt: string;
    title: string;
    detail: string;
    reference: string;
    date: string;
    direction: string;
    moneyIn: string;
    moneyOut: string;
    issuedTo: string;
  };
}) {
  const { tx, name, email, locale, labels } = input;
  const when = new Intl.DateTimeFormat(localeTag(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(tx.at));
  const amount = `${tx.direction === "in" ? "+" : "−"}${money(tx.amount, tx.currency, locale)}`;
  const lines = [
    "Blackworld",
    labels.receipt,
    "",
    labels.title,
    labels.detail,
    amount,
    "",
    `${labels.reference}: ${tx.id}`,
    `${labels.date}: ${when}`,
    `${labels.direction}: ${tx.direction === "in" ? labels.moneyIn : labels.moneyOut}`,
    `${labels.issuedTo}: ${name} · ${email}`,
    "",
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `blackworld-receipt-${tx.id}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
