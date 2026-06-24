import { savePushSubscription } from "../data/queries";

const SERVICE_WORKER_PATH = "/notification-sw.js";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function canUseWebPush() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function registerForPushNotifications(userId: string) {
  if (!canUseWebPush()) {
    throw new Error("Web Push wird von diesem Browser nicht unterstützt.");
  }

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!publicKey) {
    throw new Error("VITE_VAPID_PUBLIC_KEY fehlt. Push ist vorbereitet, aber noch nicht konfiguriert.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Push-Benachrichtigungen wurden nicht erlaubt. In-App-Benachrichtigungen bleiben aktiv.");
  }

  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await savePushSubscription(userId, subscription.toJSON());
  return subscription;
}
