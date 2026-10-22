const FIREBASE_VERSION = "13.1.0";
let messagingReady = false;

function startMessaging(config) {
  if (messagingReady || !config?.apiKey || !config.projectId || !config.messagingSenderId || !config.appId) return;
  importScripts(
    `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app-compat.js`,
    `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-messaging-compat.js`,
  );
  firebase.initializeApp(config);
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    if (payload.notification) return;
    const title = payload.data?.title;
    if (!title) return;
    return self.registration.showNotification(title, {
      body: payload.data?.body || "",
      tag: payload.messageId || "blackworld",
      data: { url: "/dashboard/notifications" },
    });
  });
  messagingReady = true;
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "firebase-config") startMessaging(event.data.config);
});

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL("/dashboard/notifications", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          if ("navigate" in client) client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
