import { doc, updateDoc } from "firebase/firestore"

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
