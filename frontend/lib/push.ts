"use client"

import { doc, setDoc } from "firebase/firestore"

import { app, auth, db } from "@/lib/firebase/config"
import { systemNotificationPermission } from "@/lib/system-notifications"

/**
 * Web Push: notifications that reach the phone even while JoySplit is closed.
 *
 * Each phone that allowed notifications registers a push token (Firebase
 * Cloud Messaging) under users/{uid}/pushTokens; when someone writes you a
 * notification, their app asks /api/push to deliver it to those phones, and
 * public/sw.js shows it.
 */

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

export const pushConfigured = () => !!VAPID_KEY && !!app

/** Registers this phone for push (once permission is granted). Safe to call often. */
export async function registerPush(uid: string): Promise<boolean> {
  if (!pushConfigured() || !db || systemNotificationPermission() !== "granted") return false
  try {
    const { getMessaging, getToken, isSupported } = await import("firebase/messaging")
    if (!(await isSupported())) return false
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    await navigator.serviceWorker.ready
    const token = await getToken(getMessaging(app!), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
    if (!token) return false
    await setDoc(
      doc(db, "users", uid, "pushTokens", token),
      {
        token,
        platform: /android/i.test(navigator.userAgent) ? "android" : /iphone|ipad/i.test(navigator.userAgent) ? "ios" : "web",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )
    return true
  } catch (e) {
    console.warn("Push registration:", e)
    return false
  }
}

/** Asks the server to push a notification you just wrote. Best effort. */
export async function pushNotification(notificationId: string): Promise<void> {
  if (!pushConfigured() || typeof window === "undefined") return
  try {
    const idToken = await auth?.currentUser?.getIdToken()
    if (!idToken) return
    await fetch("/api/push", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ notificationId }),
    })
  } catch {
    // The notification is in the app either way
  }
}
