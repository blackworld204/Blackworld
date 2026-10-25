import { hydrateBank, loadBank, replaceBank, type BankState } from "@/lib/bank";
import { currentRevision, pullDesk, rememberRevision, stateNeedsOpen } from "@/lib/vault-client";

let finishReady = () => {};
let ready: Promise<void> = Promise.resolve();

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

function newerThan(revision: number) {
  const known = currentRevision();
  return known != null && revision < known;
}

/** Creates the Firestore profile for a Firebase user when the desk does not have one yet. */
export async function claimDeskAccount(token: string) {
  const response = await fetch("/api/desk", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!response?.ok) return false;
  const data = (await response.json().catch(() => null)) as { revision?: number; state?: BankState } | null;
  if (!data?.state || typeof data.revision !== "number") return false;
  if (newerThan(data.revision)) return true;
  rememberRevision(data.revision);
  await replaceBank(data.state, token);
  return true;
}

/** Loads the signed-in desk with a token from a probe sign-in, before the real session starts. */
export async function adoptDeskToken(token: string): Promise<"ready" | "offline"> {
  let remote = await pullDesk(token);
  if (remote.status === "offline") remote = await pullDesk(token);
  if (remote.status === "updated") {
    rememberRevision(remote.revision);
    await replaceBank(remote.state, token);
    return stateNeedsOpen(loadBank()) ? "offline" : "ready";
  }
  if (remote.status === "current") return stateNeedsOpen(loadBank()) ? "offline" : "ready";
  if (remote.status === "offline") return "offline";
  return "ready";
}

export function startDeskSync() {
  let stop = false;
  let pulling = false;
  const done = finishReady;

  const adopt = async (remote: { revision: number; state: Parameters<typeof replaceBank>[0] }) => {
    if (newerThan(remote.revision)) return;
    rememberRevision(remote.revision);
    await replaceBank(remote.state);
  };

  const pullServer = async () => {
    if (pulling || stop) return;
    pulling = true;
    try {
      const remote = await pullDesk();
      if (stop || remote.status !== "updated") return;
      const known = currentRevision();
      if (known != null && remote.revision <= known) return;
      await adopt(remote);
    } finally {
      pulling = false;
    }
  };

  void hydrateBank()
    .then(async () => {
      if (stop) return;
      const remote = await pullDesk();
      if (stop) return;
      if (remote.status === "updated") {
        await adopt(remote);
      } else if (remote.status === "offline") {
        deskProblem("bw-desk-reach");
      }
    })
    .finally(() => {
      done();
    });

  const timer = setInterval(() => void pullServer(), 8000);
  return () => {
    stop = true;
    clearInterval(timer);
  };
}
