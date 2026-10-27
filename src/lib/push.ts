const KEY = "blackworld-push";

export type PushStatus = "on" | "off" | "denied" | "unsupported";

export function pushSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function pushStatus(): PushStatus {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (localStorage.getItem(KEY) === "on" && Notification.permission === "granted") return "on";
  return "off";
}

export async function registerPushWorker() {
  if (!pushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js");
}

export async function enablePush(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    localStorage.setItem(KEY, "off");
    return permission === "denied" ? "denied" : "off";
  }
  await registerPushWorker();
  localStorage.setItem(KEY, "on");
  return "on";
}

export function disablePush() {
  localStorage.setItem(KEY, "off");
}

export async function showPush(title: string, body: string, tag: string, url = "/dashboard/notifications") {
  if (pushStatus() !== "on") return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    tag,
    lang: document.documentElement.lang || "en",
    data: { url },
  });
}

export function noteAllowsPush(
  note: { title: string; channel?: string },
  alerts: { transfers: boolean; security: boolean; statements: boolean },
) {
  if (note.channel === "admin") return true;
  const label = note.title.toLowerCase();
  if (label.includes("pin") || label.includes("sign-in") || label.includes("security")) return alerts.security;
  if (label.includes("statement")) return alerts.statements;
  return alerts.transfers;
}
