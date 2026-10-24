import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { receiveLiveNotes, subscribeBank, type BankNote } from "@/lib/bank";
import { firebaseDb } from "@/lib/firebase";

const DOC = "live";

type LiveItem = {
  id: string;
  userId: string;
  title: string;
  body: string;
  at: string;
};

function asItem(value: unknown): LiveItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.userId !== "string") return null;
  if (typeof item.title !== "string" || typeof item.body !== "string" || typeof item.at !== "string") return null;
  const id = item.id.trim().slice(0, 80);
  const userId = item.userId.trim().slice(0, 80);
  const title = item.title.trim().slice(0, 80);
  const body = item.body.trim().slice(0, 400);
  if (id.length < 2 || userId.length < 2 || title.length < 2 || body.length < 2) return null;
  return { id, userId, title, body, at: item.at.slice(0, 40) };
}

function asNote(item: LiveItem): BankNote {
  return { ...item, read: false, channel: "admin" };
}

/** Puts the notice where every open desk can see it without waiting for the full save. */
export async function publishLiveNotices(notes: BankNote[]) {
  const db = firebaseDb();
  const incoming = notes.map((note) => asItem(note)).filter((item): item is LiveItem => item !== null);
  if (!db || incoming.length === 0) return;
  const ref = doc(db, "desks", DOC);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists() && Array.isArray(snap.get("items")) ? (snap.get("items") as unknown[]) : [];
    const map = new Map<string, LiveItem>();
    for (const item of [...incoming, ...current.map(asItem)]) {
      if (item) map.set(item.id, item);
    }
    const items = [...map.values()].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 40);
    tx.set(ref, { items });
  });
}

export function startLiveNotices(email: string) {
  const db = firebaseDb();
  if (!db) return () => {};
  let latest: BankNote[] = [];
  let timer = 0;
  const apply = () => {
    if (latest.length === 0) return;
    receiveLiveNotes(latest, email);
  };
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, 0);
  };
  const unsub = onSnapshot(
    doc(db, "desks", DOC),
    (snap) => {
      const items = snap.exists() && Array.isArray(snap.get("items")) ? (snap.get("items") as unknown[]) : [];
      latest = items.map(asItem).filter((item): item is LiveItem => item !== null).map(asNote);
      schedule();
    },
    () => undefined,
  );
  const stopBank = subscribeBank(schedule);
  return () => {
    window.clearTimeout(timer);
    unsub();
    stopBank();
  };
}
