import { randomBytes } from "node:crypto";
import { readFirestoreBox, writeFirestoreBox } from "@/lib/firestore-desk";
import { isSealed } from "@/lib/sealed";
import { openText } from "@/lib/vault";

export type InboxMessage = {
  id: string;
  at: string;
  name: string;
  email: string;
  topic: string;
  company: string;
  message: string;
  mailed: boolean;
};

const DOC = "inbox";
let chain: Promise<unknown> = Promise.resolve();

function lock<T>(run: () => Promise<T>) {
  const next = chain.then(run, run);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function rowsOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is InboxMessage => {
    if (!item || typeof item !== "object") return false;
    const row = item as InboxMessage;
    return typeof row.id === "string" && typeof row.email === "string" && typeof row.message === "string";
  });
}

async function writeAll(rows: InboxMessage[]) {
  await writeFirestoreBox(DOC, JSON.stringify(rows));
}

async function readAll() {
  const box = await readFirestoreBox(DOC);
  if (!box) return [];
  try {
    const text = isSealed(box) ? openText(box) : box;
    return rowsOf(JSON.parse(text));
  } catch {
    return [];
  }
}

export function saveInboxMessage(input: Omit<InboxMessage, "id" | "at" | "mailed">) {
  return lock(async () => {
    const rows = await readAll();
    const row: InboxMessage = {
      ...input,
      id: `msg_${randomBytes(8).toString("hex")}`,
      at: new Date().toISOString(),
      mailed: false,
    };
    await writeAll([row, ...rows].slice(0, 100));
    return row;
  });
}

export function markInboxMailed(id: string) {
  return lock(async () => {
    const rows = await readAll();
    await writeAll(rows.map((row) => (row.id === id ? { ...row, mailed: true } : row)));
  });
}

export function listInbox() {
  return lock(readAll);
}
