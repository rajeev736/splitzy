import type { App } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getMessaging } from "firebase-admin/messaging"

import { notificationHref } from "@/lib/system-notifications"
import type { AppNotification } from "@/lib/types"

/** Sends a notification to the recipient's phones as a Web Push (best effort). Returns how many got it. */
export async function pushToPhones(app: App, notif: Pick<AppNotification, "id" | "userId" | "title" | "message" | "type" | "data">) {
  const db = getFirestore(app)
  const tokensSnap = await db.collection(`users/${notif.userId}/pushTokens`).limit(20).get()
  const phones = tokensSnap.docs
    .map((d) => ({ ref: d.ref, token: d.get("token") as string | undefined }))
    .filter((p): p is { ref: typeof p.ref; token: string } => !!p.token)
  if (phones.length === 0) return 0

  const res = await getMessaging(app).sendEachForMulticast({
    tokens: phones.map((p) => p.token),
    // Data only: the app's own service worker (public/sw.js) shows it
    data: {
      title: notif.title.slice(0, 200),
      body: notif.message.slice(0, 1000),
      url: notificationHref(notif as AppNotification),
      tag: notif.id,
    },
    webpush: { headers: { Urgency: "high", TTL: String(24 * 60 * 60) } },
    android: { priority: "high" },
  })

  // Forget phones that uninstalled or revoked notifications
  const dead = res.responses
    .map((r, i) =>
      !r.success &&
      ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"].includes(r.error?.code ?? "")
        ? phones[i].ref
        : null
    )
    .filter((r) => r !== null)
  await Promise.all(dead.map((r) => r.delete().catch(() => undefined)))
  return res.successCount
}

/** Writes a notification (as the server) and pushes it to their phones. */
export async function notifyFromServer(
  app: App,
  input: Pick<AppNotification, "userId" | "title" | "message" | "type" | "data">
): Promise<void> {
  const db = getFirestore(app)
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${input.userId}`
  const notif = { ...input, id, read: false, createdAt: new Date().toISOString(), pushedAt: new Date().toISOString() }
  await db.doc(`notifications/${id}`).set(notif)
  await pushToPhones(app, notif).catch(() => 0)
}
