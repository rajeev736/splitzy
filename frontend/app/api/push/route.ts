import { getAuth } from "firebase-admin/auth"
import { FieldValue, getFirestore } from "firebase-admin/firestore"

import { adminApp } from "@/lib/server/firebase-admin"
import { pushToPhones } from "@/lib/server/push"
import type { AppNotification } from "@/lib/types"

/**
 * Sends a notification someone just wrote to the recipient's phones as a Web
 * Push, so it arrives even while JoySplit is closed.
 *
 * The caller must be signed in (Firebase ID token) and be the notification's
 * sender (`data.actorId`). Each notification is pushed at most once, and only
 * within a few minutes of being written — so nobody can resend old ones.
 */
export async function POST(request: Request) {
  const app = adminApp()
  if (!app) return Response.json({ ok: false, reason: "push not configured" }, { status: 503 })

  const idToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!idToken) return Response.json({ ok: false }, { status: 401 })
  let uid: string
  try {
    uid = (await getAuth(app).verifyIdToken(idToken)).uid
  } catch {
    return Response.json({ ok: false }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { notificationId?: unknown } | null
  const notificationId = typeof body?.notificationId === "string" ? body.notificationId : ""
  if (!notificationId || notificationId.includes("/")) return Response.json({ ok: false }, { status: 400 })

  const db = getFirestore(app)
  const ref = db.doc(`notifications/${notificationId}`)

  // Claim it once: only its sender, only while fresh, never twice
  const notif = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return null
    const n = snap.data() as AppNotification & { pushedAt?: unknown }
    if (n.data?.actorId !== uid || n.pushedAt) return null
    if (Date.now() - new Date(n.createdAt).getTime() > 10 * 60 * 1000) return null
    tx.update(ref, { pushedAt: FieldValue.serverTimestamp() })
    return { ...n, id: snap.id }
  })
  if (!notif) return Response.json({ ok: false }, { status: 409 })

  const sent = await pushToPhones(app, notif)
  return Response.json({ ok: true, sent })
}
