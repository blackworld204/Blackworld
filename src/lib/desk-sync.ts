import { hydrateBank, loadBank, replaceBank } from "@/lib/bank";
import { currentRevision, pullDesk, rememberRevision, sealRemote } from "@/lib/vault-client";

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

export function startDeskSync() {
  let stop = false;
  let pulling = false;

  const adopt = async (remote: { revision: number; state: Parameters<typeof replaceBank>[0] }) => {
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

  void hydrateBank().then(async () => {
    if (stop) return;
    const remote = await pullDesk();
    if (stop) return;
    if (remote.status === "updated") {
      await adopt(remote);
    } else if (remote.status === "missing") {
      const seeded = await sealRemote(loadBank());
      if (seeded?.kind === "conflict") await replaceBank(seeded.state);
    } else if (remote.status === "offline") {
      deskProblem("bw-desk-reach");
    }
    finishReady();
  });

  const timer = setInterval(() => void pullServer(), 8000);
  return () => {
    stop = true;
    clearInterval(timer);
  };
}
