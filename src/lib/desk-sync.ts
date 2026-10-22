import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { hydrateBank, loadBank, replaceBank, setBankPersist, type BankState } from "@/lib/bank";
import { firebaseDb } from "@/lib/firebase";

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

function plain(state: BankState) {
  return JSON.parse(JSON.stringify(state)) as BankState;
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
  void hydrateBank().then(() => {
    if (stop) return;
    unsub = onSnapshot(
      ref,
      (snap) => {
        if (stop) return;
        void (async () => {
          if (!snap.exists()) {
            const seed = await sealRemoteDesk(loadBank());
            if (!seed) {
              finishReady();
              return;
            }
            lastWritten = JSON.stringify(seed);
            await setDoc(ref, seed).catch(() => undefined);
            finishReady();
            return;
          }
          const remote = plain(snap.data() as BankState);
          const text = JSON.stringify(remote);
          if (text !== lastWritten) {
            lastWritten = text;
            await replaceBank(remote);
          }
          finishReady();
        })();
      },
      () => {
        finishReady();
      },
    );
  });
  setBankPersist((state) => {
    const body = plain(state);
    const text = JSON.stringify(body);
    if (text === lastWritten) return;
    lastWritten = text;
    void setDoc(ref, body).catch(() => {
      lastWritten = "";
    });
  });
  return () => {
    stop = true;
    unsub();
    setBankPersist(null);
  };
}

async function sealRemoteDesk(state: BankState) {
  const { sealRemote } = await import("@/lib/vault-client");
  return sealRemote(state);
}
