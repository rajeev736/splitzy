import type { App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

/** The signed-in caller of an API route (Firebase ID token in `Authorization: Bearer …`), or null. */
export async function callerUid(app: App, request: Request): Promise<string | null> {
  const idToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!idToken) return null
  try {
    return (await getAuth(app).verifyIdToken(idToken)).uid
  } catch {
    return null
  }
}
