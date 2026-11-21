import { adminApp } from "@/lib/server/firebase-admin"
import { callerUid } from "@/lib/server/request-auth"
import { claimDaily } from "@/lib/server/streak"

/**
 * POST — the daily reward, the first time the Games side opens each day (IST),
 * paid by the server (lib/server/streak `claimDaily`):
 * `{ ok: true, claimed, coins, day, run, balance }` (day: 1–7 of the cycle) — `claimed: false`
 * (coins 0) when today's was already taken. Errors: `{ ok: false, reason }`.
 */
export async function POST(request: Request) {
  const app = adminApp()
  if (!app) return Response.json({ ok: false, reason: "server not configured" }, { status: 503 })
  const uid = await callerUid(app, request)
  if (!uid) return Response.json({ ok: false, reason: "not signed in" }, { status: 401 })
  try {
    const out = await claimDaily(app, uid)
    if (!out.ok) return Response.json({ ok: false, reason: out.reason }, { status: out.status })
    const { claimed, coins, day, run, balance } = out
    return Response.json({ ok: true, claimed, coins, day, run, balance })
  } catch (e) {
    console.error("daily reward", e)
    return Response.json({ ok: false, reason: "try again" }, { status: 500 })
  }
}
