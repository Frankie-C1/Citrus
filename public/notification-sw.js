self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Citrus";
  const options = {
    body: payload.body || "",
    icon: "/android-chrome-192x192.png",
    badge: "/favicon-32x32.png",
    data: {
      url: payload.url || "/?notifications=1",
      notificationId: payload.notificationId || null,
      targetType: payload.targetType || null,
      targetId: payload.targetId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/?notifications=1", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
