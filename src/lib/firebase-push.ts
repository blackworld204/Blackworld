import { forgetPushToken, rememberPushToken } from "@/lib/bank";
import { firebaseApp, firebaseWebConfig } from "@/lib/firebase";
import { registerPushWorker, showPush } from "@/lib/push";

let stopListen: (() => void) | null = null;
let activeUser = "";

function postConfig() {
  const config = firebaseWebConfig();
  if (!config?.messagingSenderId) return;
  navigator.serviceWorker.controller?.postMessage({ type: "firebase-config", config });
  void navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({ type: "firebase-config", config });
  });
}

export function firebasePushConfigured() {
  return Boolean(firebaseWebConfig()?.messagingSenderId);
}

/** Registers this browser with Firebase Cloud Messaging and keeps the installation id on the account. */
export async function bindFirebasePush(userId: string) {
  if (typeof window === "undefined" || !firebasePushConfigured()) return;
  if (activeUser === userId && stopListen) return;
  const messaging = await import("firebase/messaging");
  if (!(await messaging.isSupported())) return;
  const registration = await registerPushWorker();
  const app = firebaseApp();
  if (!registration || !app) return;
  postConfig();
  const instance = messaging.getMessaging(app);
  stopListen?.();
  const stops = [
    messaging.onRegistered(instance, (id) => rememberPushToken(userId, id)),
    messaging.onMessage(instance, (payload) => {
      const data = payload.data ?? {};
      const title = data.title || payload.notification?.title || "Blackworld";
      const body = data.body || payload.notification?.body || "";
      void showPush(title, body, data.tag || payload.messageId || "firebase");
    }),
  ];
  stopListen = () => {
    for (const stop of stops) stop();
    stopListen = null;
    activeUser = "";
  };
  activeUser = userId;
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  try {
    await messaging.register(instance, {
      vapidKey: vapidKey || undefined,
      serviceWorkerRegistration: registration,
    });
  } catch (error) {
    stopListen();
    throw error;
  }
}

export async function releaseFirebasePush(userId: string) {
  stopListen?.();
  activeUser = "";
  const app = firebaseApp();
  if (!app || typeof window === "undefined") return;
  const messaging = await import("firebase/messaging");
  if (!(await messaging.isSupported())) return;
  const instance = messaging.getMessaging(app);
  const id = await new Promise<string | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), 1500);
    const stop = messaging.onUnregistered(instance, (value) => {
      clearTimeout(timer);
      stop();
      resolve(value);
    });
    void messaging.unregister(instance).catch(() => {
      clearTimeout(timer);
      stop();
      resolve(null);
    });
  });
  if (id) forgetPushToken(userId, id);
}
