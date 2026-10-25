import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BankState } from "@/lib/bank";
import { mergeMember, scopeDesk } from "@/lib/desk-scope";
import { deskToken, readFirestoreDesk, writeFirestoreDesk, writeStoredPhoto } from "@/lib/firestore-desk";
import { isSealed } from "@/lib/sealed";
import { openState, openText, sealState, sealText } from "@/lib/vault";

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

async function currentDesk() {
  const token = deskToken();
  if (token) {
    const remote = await readFirestoreDesk(token);
    if (remote) return remote;
  }
  return loadLocked();
}

async function parkPhotos(state: BankState) {
  const token = deskToken();
  const users = await Promise.all(
    state.users.map(async (user) => {
      if (!user.photo?.startsWith("data:image/jpeg")) {
        if (!user.photo) return user;
        const next = { ...user };
        delete next.photo;
        return next;
      }
      if (!token) return { ...user, hasPhoto: true };
      try {
        await writeStoredPhoto(token, user.id, user.photo);
      } catch {
        return { ...user, hasPhoto: true };
      }
      const next = { ...user, hasPhoto: true };
      delete next.photo;
      return next;
    }),
  );
  return { ...state, users };
}

async function keep(file: DeskFile) {
  const parked = await parkPhotos(openState(file.state));
  let sealed = parked;
  try {
    sealed = sealState(parked);
  } catch {
    sealed = parked;
  }
  const stored = { revision: file.revision, state: sealed };
  let filed = false;
  try {
    await writeEnvelope(stored);
    filed = true;
  } catch {
    filed = false;
  }
  const token = deskToken();
  let fired = false;
  if (token) {
    try {
      await writeFirestoreDesk(token, stored);
      fired = true;
    } catch {
      fired = false;
    }
  }
  if (token ? !fired : !filed) throw new Error("desk");
}

function actorOf(state: BankState, email: string) {
  return state.users.find((user) => !user.email.startsWith("bw1.") && user.email.toLowerCase() === email.toLowerCase());
}

function forClient(state: BankState, email: string | null) {
  const view = scopeDesk(state, email);
  try {
    return sealState(view);
  } catch {
    return view;
  }
}

export function readDesk() {
  return lock(currentDesk);
}

/** Saves a plaintext desk. A member's copy is merged onto the server book. */
export function writePlainDesk(plain: BankState, base: number | null, actorEmail: string | null = null) {
  return lock(async () => {
    const current = await currentDesk();
    const opened = current ? openState(current.state) : null;
    if (current && opened && base !== current.revision) {
      return { kind: "conflict" as const, revision: current.revision, state: forClient(opened, actorEmail) };
    }
    const actor = opened && actorEmail ? actorOf(opened, actorEmail) : null;
    if (current && opened && actorEmail && !actor) {
      return { kind: "conflict" as const, revision: current.revision, state: forClient(opened, actorEmail) };
    }
    const next = opened && actor && actor.role !== "admin" ? mergeMember(opened, plain, actorEmail ?? "") : plain;
    const revision = (current?.revision ?? 0) + 1;
    let state = next;
    try {
      state = sealState(next);
    } catch {
      state = next;
    }
    await keep({ revision, state });
    return { kind: "saved" as const, revision, state: forClient(next, actorEmail) };
  });
}

export function withDeskLock<T>(run: (current: DeskFile | null) => Promise<{ file: DeskFile | null; value: T }>) {
  return lock(async () => {
    const current = await currentDesk();
    const result = await run(current);
    if (result.file) await keep(result.file);
    return result.value;
  });
}
