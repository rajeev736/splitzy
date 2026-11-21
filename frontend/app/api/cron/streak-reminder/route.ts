import { adminApp } from "@/lib/server/firebase-admin"
import { isCronRequest, remindStreaks } from "@/lib/server/streak"

// Many reminders on a busy day; remindStreaks stops itself well before this
export const maxDuration = 300

/**
 * GET — the daily streak reminder (Vercel cron, vercel.json: 13:30 UTC = 7 pm
 * IST): everyone whose play streak ends at midnight tonight hears it, once a
 * day, in-app and as a push. Only Vercel's cron may call it
 * (`Authorization: Bearer ${CRON_SECRET}`).
 */
export async function GET(request: Request) {
  if (!isCronRequest(request)) return Response.json({ ok: false }, { status: 401 })
  const app = adminApp()
  if (!app) return Response.json({ ok: false, reason: "server not configured" }, { status: 503 })
  try {
    const out = await remindStreaks(app)
    return Response.json({ ok: true, ...out })
  } catch (e) {
    console.error("streak reminder", e)
    return Response.json({ ok: false, reason: "failed" }, { status: 500 })
  }
}
