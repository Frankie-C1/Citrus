import { savePushSubscription } from "../data/queries";

const SERVICE_WORKER_PATH = "/notification-sw.js";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

function isStandalonePwa() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function getWebPushSupportMessage() {
  if (!("serviceWorker" in navigator)) return "Dieser Browser unterstützt keine Service Worker. In-App-Benachrichtigungen bleiben aktiv.";
  if (!("PushManager" in window)) return "Web Push ist hier nicht verfügbar. Auf iOS funktioniert Push nur in installierten PWAs.";
  if (!("Notification" in window)) return "Dieser Browser stellt keine Benachrichtigungs-API bereit.";
  if (!window.isSecureContext) return "Push braucht HTTPS oder localhost. In-App-Benachrichtigungen bleiben aktiv.";
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isiOS && !isStandalonePwa()) return "Auf iPhone/iPad bitte Citrus zuerst zum Home-Bildschirm hinzufügen und als PWA öffnen.";
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) return "Push ist vorbereitet, aber VITE_VAPID_PUBLIC_KEY ist noch nicht konfiguriert.";
  return "";
}

export function canUseWebPush() {
  return !getWebPushSupportMessage();
}

export async function registerForPushNotifications(userId: string) {
  const supportMessage = getWebPushSupportMessage();
  if (supportMessage) throw new Error(supportMessage);

  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Push wurde nicht erlaubt. In-App-Benachrichtigungen und Badges bleiben aktiv.");
  }

  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: "/" });
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await savePushSubscription(userId, subscription.toJSON());
  return subscription;
}