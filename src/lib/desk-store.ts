import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BankState } from "@/lib/bank";
import { isSealed } from "@/lib/sealed";
import { openText, sealState, sealText } from "@/lib/vault";

type DeskFile = { revision: number; state: BankState };
type Stored = { revision?: number; state?: BankState; box?: string };

let chain: Promise<unknown> = Promise.resolve();

function deskFile() {
  return process.env.DESK_PATH || path.join(process.cwd(), "data", "desk.json");
}

function lock<T>(run: () => Promise<T>) {
  const next = chain.then(run, run);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function writeEnvelope(file: DeskFile) {
  const target = deskFile();
  await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temp = `${target}.${process.pid}.tmp`;
  const body = JSON.stringify({ revision: file.revision, box: sealText(JSON.stringify(file.state)) });
  await writeFile(temp, body, { mode: 0o600 });
  await rename(temp, target);
}

async function loadLocked(): Promise<DeskFile | null> {
  let raw = "";
  try {
    raw = await readFile(deskFile(), "utf8");
  } catch {
    return null;
  }
  let parsed: Stored;
  try {
    parsed = JSON.parse(raw) as Stored;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed.revision !== "number") return null;
  if (typeof parsed.box === "string" && isSealed(parsed.box)) {
    try {
      const state = JSON.parse(openText(parsed.box)) as BankState;
      if (!state?.users) return null;
      return { revision: parsed.revision, state };
    } catch {
      return null;
    }
  }
  if (!parsed.state?.users) return null;
  const file = { revision: parsed.revision + 1, state: sealState(parsed.state) };
  await writeEnvelope(file);
  return file;
}

export function readDesk() {
  return lock(loadLocked);
}

async function persist(file: DeskFile) {
  await writeEnvelope(file);
}

/** Saves a plaintext desk. A missing base adopts the file when one already exists. */
export function writePlainDesk(plain: BankState, base: number | null) {
  return lock(async () => {
    const current = await loadLocked();
    if (current && base !== current.revision) {
      return { kind: "conflict" as const, revision: current.revision, state: current.state };
    }
    const revision = (current?.revision ?? 0) + 1;
    const state = sealState(plain);
    await persist({ revision, state });
    return { kind: "saved" as const, revision, state };
  });
}

export function withDeskLock<T>(run: (current: DeskFile | null) => Promise<{ file: DeskFile | null; value: T }>) {
  return lock(async () => {
    const current = await loadLocked();
    const result = await run(current);
    if (result.file) await persist(result.file);
    return result.value;
  });
}
