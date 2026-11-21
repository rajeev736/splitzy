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

/** Notifications, and the offline-fast cache of boards, sounds and app code (public/sw.js). */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
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
  // A live room invite: straight into the room (the link is the invite)
  // The group's game room: always open, so always worth the tap
  if (d?.lounge && d.groupId) return `/lounge/${d.groupId}`
  if (d?.roomCode) return `/play/${d.roomCode}`
  if (d?.challengeId) return `/challenges/${d.challengeId}`
  if (n.type === "PAYMENT_REMINDER" && d?.awaitingConfirm && d.actorId) return `/friends/${d.actorId}`
  if (n.type === "BADGE") {
    if (d?.frame) return "/games/inventory#milestones"
    // A play streak badge (streak_<days>): it lives on the Games side
    return d?.badge?.startsWith("streak_") ? "/games/inventory#badges" : "/profile#badges"
  }
  // Your play streak ends at midnight: one game keeps it
  if (n.type === "STREAK_REMINDER") return "/games"
  if ((n.type === "MOMENT" || n.type.startsWith("PLAN") || n.type.startsWith("BOND")) && d?.actorId) return `/friends/${d.actorId}`
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
