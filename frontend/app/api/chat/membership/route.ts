import { getAuth } from "firebase-admin/auth"
import { getDatabaseWithUrl } from "firebase-admin/database"
import { getFirestore } from "firebase-admin/firestore"

import { adminApp } from "@/lib/server/firebase-admin"

/**
 * Group chats live in the Realtime Database, whose security rules can't see
 * who's in a group (that's in Firestore). This route checks the caller's
 * membership of each group they ask about and mirrors it to
 * chatMembers/g_{groupId}/{uid}, which the chat rules read: members get in,
 * anyone who left or was removed loses access on their next visit.
 *
 * Body: { groupIds: string[] } (up to 50). Returns { member: string[] }.
 */
export async function POST(request: Request) {
  const app = adminApp()
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  if (!app || !databaseURL)
    return Response.json(
      { ok: false, reason: "chat not configured" },
      { status: 503 }
    )

  const idToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
  if (!idToken) return Response.json({ ok: false }, { status: 401 })
  let uid: string
  try {
    uid = (await getAuth(app).verifyIdToken(idToken)).uid
  } catch {
    return Response.json({ ok: false }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    groupIds?: unknown
  } | null
  const groupIds = Array.isArray(body?.groupIds)
    ? [
        ...new Set(
          body.groupIds.filter(
            (g): g is string =>
              typeof g === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(g)
          )
        ),
      ].slice(0, 50)
    : []
  if (groupIds.length === 0) return Response.json({ ok: true, member: [] })

  const firestore = getFirestore(app)
  const snaps = await firestore.getAll(
    ...groupIds.map((id) => firestore.doc(`groups/${id}`))
  )
  const member: string[] = []
  const patch: Record<string, true | null> = {}
  snaps.forEach((snap, i) => {
    const members = snap.exists ? (snap.get("members") as unknown) : null
    const isMember =
      Array.isArray(members) &&
      members.includes(uid) &&
      snap.get("status") !== "DELETED"
    if (isMember) member.push(groupIds[i])
    patch[`g_${groupIds[i]}/${uid}`] = isMember ? true : null
  })
  await getDatabaseWithUrl(databaseURL, app).ref("chatMembers").update(patch)

  return Response.json({ ok: true, member })
}
