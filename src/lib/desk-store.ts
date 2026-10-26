import { randomBytes } from "node:crypto";
import { emptyBank, type BankState, type BankUser } from "@/lib/bank";
import { emptyBalances } from "@/lib/currencies";
import { mergeMember, scopeDesk } from "@/lib/desk-scope";
import { deskToken, readFirestoreDesk, writeFirestoreDesk, writeStoredPhoto } from "@/lib/firestore-desk";
import { openState, sealState } from "@/lib/vault";

type DeskFile = { revision: number; state: BankState };

let chain: Promise<unknown> = Promise.resolve();

function lock<T>(run: () => Promise<T>) {
  const next = chain.then(run, run);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function parkPhotos(token: string, state: BankState) {
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

async function keep(token: string, file: DeskFile) {
  const parked = await parkPhotos(token, openState(file.state));
  let sealed = parked;
  try {
    sealed = sealState(parked);
  } catch {
    sealed = parked;
  }
  await writeFirestoreDesk(token, { revision: file.revision, state: sealed });
}

function sameMail(user: BankUser, email: string) {
  const mail = email.trim().toLowerCase();
  if (!mail || user.email.startsWith("bw1.")) return false;
  return user.email.toLowerCase() === mail || user.pendingEmail === mail;
}

function actorOf(state: BankState, email: string) {
  return state.users.find((user) => sameMail(user, email));
}

function profileFor(email: string): BankUser {
  const mail = email.trim().toLowerCase();
  const name = mail.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Account";
  return {
    id: `usr_${randomBytes(4).toString("hex")}`,
    name: name.slice(0, 80),
    email: mail,
    phone: "",
    role: "member",
    status: "active",
    canCreate: false,
    balances: emptyBalances(),
    memberSince: new Date().toISOString().slice(0, 10),
    pin: "",
  };
}

function forClient(state: BankState, email: string | null) {
  return scopeDesk(state, email);
}

export function readDesk() {
  const token = deskToken();
  return lock(() => readFirestoreDesk(token));
}

/** Adds the Firebase Authentication user to the Firestore desk when the profile is missing. */
export function ensureDeskUser(email: string) {
  const token = deskToken();
  return lock(async () => {
    const mail = email.trim().toLowerCase();
    if (!mail) return null;
    const current = await readFirestoreDesk(token);
    const opened = current ? openState(current.state) : emptyBank();
    const staged = opened.users.find((user) => !user.email.startsWith("bw1.") && user.pendingEmail === mail);
    if (current && staged) {
      const next = {
        ...opened,
        users: opened.users.map((user) => (user.id === staged.id ? { ...user, email: mail, pendingEmail: undefined } : user)),
      };
      const revision = current.revision + 1;
      let state = next;
      try {
        state = sealState(next);
      } catch {
        state = next;
      }
      await keep(token, { revision, state });
      return { revision, state: forClient(next, mail) };
    }
    if (current && opened.users.some((user) => sameMail(user, mail))) {
      return { revision: current.revision, state: forClient(opened, mail) };
    }
    const user = profileFor(mail);
    const next = { ...opened, users: [user, ...opened.users] };
    const revision = (current?.revision ?? 0) + 1;
    let state = next;
    try {
      state = sealState(next);
    } catch {
      state = next;
    }
    await keep(token, { revision, state });
    return { revision, state: forClient(next, mail) };
  });
}

/** Saves a plaintext desk. A member's copy is merged onto the server book. */
export function writePlainDesk(plain: BankState, base: number | null, actorEmail: string | null = null) {
  const token = deskToken();
  return lock(async () => {
    const current = await readFirestoreDesk(token);
    const opened = current ? openState(current.state) : null;
    if (current && opened && base !== current.revision) {
      return { kind: "conflict" as const, revision: current.revision, state: forClient(opened, actorEmail) };
    }
    const actor = opened && actorEmail ? actorOf(opened, actorEmail) : null;
    if (current && opened && actorEmail && !actor) {
      const incoming = plain.users.find((user) => sameMail(user, actorEmail));
      const user = incoming ?? profileFor(actorEmail);
      const next = { ...opened, users: [user, ...opened.users.filter((item) => item.id !== user.id)] };
      const revision = current.revision + 1;
      let state = next;
      try {
        state = sealState(next);
      } catch {
        state = next;
      }
      await keep(token, { revision, state });
      return { kind: "saved" as const, revision, state: forClient(next, actorEmail) };
    }
    const next = opened && actor && actor.role !== "admin" ? mergeMember(opened, plain, actorEmail ?? "") : plain;
    const revision = (current?.revision ?? 0) + 1;
    let state = next;
    try {
      state = sealState(next);
    } catch {
      state = next;
    }
    await keep(token, { revision, state });
    return { kind: "saved" as const, revision, state: forClient(next, actorEmail) };
  });
}

export function withDeskLock<T>(run: (current: DeskFile | null) => Promise<{ file: DeskFile | null; value: T }>) {
  const token = deskToken();
  return lock(async () => {
    const current = await readFirestoreDesk(token);
    const result = await run(current);
    if (result.file) await keep(token, result.file);
    return result.value;
  });
}
