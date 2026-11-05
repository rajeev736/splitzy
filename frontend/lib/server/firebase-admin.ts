import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app"

/**
 * Firebase Admin on the server (Vercel), only for sending push notifications.
 * Credentials come from the FIREBASE_SERVICE_ACCOUNT_KEY environment variable:
 * the service account JSON from Firebase Console → Project settings → Service
 * accounts → Generate new private key (paste the whole file as the value).
 * Never imported by client code.
 */
export function adminApp(): App | null {
  if (getApps().length) return getApp()
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) return null
  try {
    const key = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8")) as {
      project_id: string
      client_email: string
      private_key: string
    }
    return initializeApp({
      credential: cert({
        projectId: key.project_id,
        clientEmail: key.client_email,
        // Pasted keys sometimes arrive with literal "\n"
        privateKey: key.private_key.replace(/\\n/g, "\n"),
      }),
    })
  } catch (e) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not a valid service account:", e)
    return null
  }
}
