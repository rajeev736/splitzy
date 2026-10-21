import { doc, updateDoc, writeBatch } from "firebase/firestore"

import type { AppNotification } from "@/lib/types"
import { getDb } from "./shared"

export async function markNotificationRead(id: string) {
  const firestore = getDb()
  if (firestore) await updateDoc(doc(firestore, "notifications", id), { read: true })
}

export async function markAllNotificationsRead(notifications: AppNotification[]) {
  const firestore = getDb()
  if (!firestore) return
  for (const n of notifications.filter((n) => !n.read)) {
    await updateDoc(doc(firestore, "notifications", n.id), { read: true })
  }
}

export async function updateNotificationAction(id: string, actionTaken: "CONFIRMED" | "DISPUTED") {
  const firestore = getDb()
  if (firestore) {
    await updateDoc(doc(firestore, "notifications", id), {
      read: true,
      actionTaken,
    })
  }
}

export async function clearAllNotifications(userId: string, notifications: AppNotification[]) {
  const firestore = getDb()
  if (!firestore || notifications.length === 0) return

  // Delete in batches of up to 400 docs
  const chunkSize = 400
  for (let i = 0; i < notifications.length; i += chunkSize) {
    const chunk = notifications.slice(i, i + chunkSize)
    const batch = writeBatch(firestore)
    for (const n of chunk) {
      batch.delete(doc(firestore, "notifications", n.id))
    }
    await batch.commit()
  }
}
