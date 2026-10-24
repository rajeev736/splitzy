import type { AppNotification } from "@/lib/types"

/**
 * Notifications in the phone's notification bar (via the service worker), for
 * while JoySplit is open or in the background. Delivery when the app is fully
 * closed needs Web Push from a server, which `public/sw.js` is ready to show.
 */

export const systemNotificationsSupported = () =>
  typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator

export const systemNotificationPermission = (): NotificationPermission | "unsupported" =>
  systemNotificationsSupported() ? Notification.permission : "unsupported"

export function registerServiceWorker() {
  if (!systemNotificationsSupported()) return
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.warn("Service worker:", e))
}

/** Asks the browser for permission (must run from a tap). Returns true when allowed. */
export async function enableSystemNotifications(): Promise<boolean> {
  if (!systemNotificationsSupported()) return false
  registerServiceWorker()
  const result = await Notification.requestPermission()
  return result === "granted"
}

/** The screen a notification is about. */
export function notificationHref(n: AppNotification): string {
  const d = n.data
  if (d?.challengeId) return `/challenges/${d.challengeId}`
  if (n.type === "FRIEND_REQUEST") return "/friends/requests"
  if (n.type.startsWith("FRIEND")) return "/friends"
  if (n.type === "GROUP_INVITE") return "/groups/invitations"
  if (d?.expenseId) return `/expenses/${d.expenseId}`
  if (d?.groupId) return `/groups/${d.groupId}`
  return "/notifications"
}

/** Shows one notification in the notification bar, if the user allowed it. */
export async function showSystemNotification(n: AppNotification) {
  if (systemNotificationPermission() !== "granted") return
  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(n.title, {
    body: n.message,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: n.id, // the same notification never shows twice
    data: { url: notificationHref(n) },
  })
}
