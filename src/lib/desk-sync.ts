import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { hydrateBank, loadBank, replaceBank, setBankPersist, type BankState } from "@/lib/bank";
import { firebaseDb } from "@/lib/firebase";
import { currentRevision, pullDesk, rememberRevision, sealRemote } from "@/lib/vault-client";

const DESK = "presentation";

let finishReady = () => {};
let ready: Promise<void> = Promise.resolve();
let lastWritten = "";

export function expectDeskSync() {
  ready = new Promise((resolve) => {
    finishReady = resolve;
  });
}

export function whenDeskReady() {
  return ready;
}

function deskProblem(name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

function plain(state: BankState) {
  return JSON.parse(JSON.stringify(state)) as BankState;
}

function stamped(state: BankState) {
  const revision = currentRevision();
  const body = plain(state) as BankState & { bwRevision?: number };
  if (typeof revision === "number") body.bwRevision = revision;
  return body;
}

export function startDeskSync() {
  const db = firebaseDb();
  if (!db) {
    finishReady();
    return () => {};
  }
  const ref = doc(db, "desks", DESK);
  let stop = false;
  let unsub = () => {};
  let pulling = false;

  const publish = async (state: BankState) => {
    const body = stamped(state);
    const text = JSON.stringify(body);
    if (text === lastWritten) return;
    lastWritten = text;
    try {
      await setDoc(ref, body);
    } catch (error) {
      lastWritten = "";
      throw error;
    }
  };

  const adoptServer = async (remote: { revision: number; state: BankState }) => {
    rememberRevision(remote.revision);
    const body = { ...plain(remote.state), bwRevision: remote.revision };
    lastWritten = JSON.stringify(body);
    await replaceBank(remote.state);
    if (stop) return;
    await setDoc(ref, body).catch(() => {
      lastWritten = "";
    });
  };

  const pullServer = async () => {
    if (pulling || stop) return;
    pulling = true;
    try {
      const remote = await pullDesk();
      if (stop || remote.status !== "updated") return;
      const known = currentRevision();
      if (known != null && remote.revision <= known) return;
      await adoptServer(remote);
    } finally {
      pulling = false;
    }
  };

  void hydrateBank().then(() => {
    if (stop) return;
    void (async () => {
      const snap = await getDoc(ref).catch(() => null);
      const remote = await pullDesk();
      if (stop) return;
      const fireRevision = snap?.exists() ? (typeof snap.data()?.bwRevision === "number" ? snap.data().bwRevision : 0) : -1;
      if (remote.status === "updated" && remote.revision > fireRevision) {
        await adoptServer(remote);
      } else if (remote.status === "current") {
        /* This browser already has the server copy. */
      } else if (snap?.exists()) {
        const raw = snap.data() as BankState & { bwRevision?: number };
        lastWritten = JSON.stringify(raw);
        if (fireRevision > 0) rememberRevision(fireRevision);
        const { bwRevision: _revision, ...rest } = raw;
        await replaceBank(plain(rest as BankState));
        if (remote.status === "offline" || remote.status === "missing") {
          const seeded = await sealRemote(loadBank());
          if (seeded?.kind === "conflict") await replaceBank(seeded.state);
        }
      } else if (remote.status === "missing" || remote.status === "offline") {
        const seeded = await sealRemote(loadBank());
        if (seeded?.kind === "saved") await publish(seeded.state);
        else if (seeded?.kind === "conflict") await adoptServer({ revision: seeded.revision, state: seeded.state });
        else {
          try {
            await publish(loadBank());
          } catch {
            deskProblem(remote.status === "offline" ? "bw-desk-reach" : "bw-desk-save");
          }
        }
      }
    })().finally(() => {
      if (stop) return;
      unsub = onSnapshot(
        ref,
        (snap) => {
          if (stop) return;
          void (async () => {
            if (!snap.exists()) {
              finishReady();
              return;
            }
            const raw = snap.data() as BankState & { bwRevision?: number };
            const revision = typeof raw.bwRevision === "number" ? raw.bwRevision : 0;
            const known = currentRevision();
            if (known != null && revision < known) {
              finishReady();
              return;
            }
            const text = JSON.stringify(raw);
            if (text === lastWritten) {
              finishReady();
              return;
            }
            lastWritten = text;
            if (revision > 0) rememberRevision(revision);
            const { bwRevision: _revision, ...rest } = raw;
            await replaceBank(plain(rest as BankState));
            finishReady();
          })();
        },
        () => {
          void pullDesk().then((remote) => {
            if (remote.status === "offline") deskProblem("bw-desk-reach");
            finishReady();
          });
        },
      );
    });
  });

  const timer = setInterval(() => void pullServer(), 8000);
  setBankPersist((state) => publish(state));
  return () => {
    stop = true;
    clearInterval(timer);
    unsub();
    setBankPersist(null);
  };
}
