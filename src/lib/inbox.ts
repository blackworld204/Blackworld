import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSealed } from "@/lib/sealed";
import { openText, sealText } from "@/lib/vault";

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

const FILE = path.join(process.cwd(), "data", "inbox.json");
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
  await mkdir(path.dirname(FILE), { recursive: true, mode: 0o700 });
  const temp = `${FILE}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify({ box: sealText(JSON.stringify(rows)) }), { mode: 0o600 });
  await rename(temp, FILE);
}

async function readAll() {
  let raw = "";
  try {
    raw = await readFile(FILE, "utf8");
  } catch {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const box = (parsed as { box?: unknown }).box;
    if (typeof box !== "string" || !isSealed(box)) return [];
    try {
      return rowsOf(JSON.parse(openText(box)));
    } catch {
      return [];
    }
  }
  const rows = rowsOf(parsed);
  if (rows.length === 0) return [];
  await writeAll(rows);
  return rows;
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
