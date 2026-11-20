import { adminApp } from "@/lib/server/firebase-admin"
import { settleLive } from "@/lib/server/live-settle"
import { callerUid } from "@/lib/server/request-auth"

const CODE = /^[A-HJ-NP-Z2-9]{6}$/

/**
 * POST { code, forfeit? } — a finished live game, checked and counted by the
 * server (lib/server/live-settle): its result, everyone's XP and, for a
 * discount game, the discount. Any player may ask; it happens once.
 */
export async function POST(request: Request) {
  const app = adminApp()
  if (!app) return Response.json({ ok: false, reason: "server not configured" }, { status: 503 })
  const uid = await callerUid(app, request)
  if (!uid) return Response.json({ ok: false }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { code?: unknown; forfeit?: unknown } | null
  const code = typeof body?.code === "string" ? body.code : ""
  if (!CODE.test(code)) return Response.json({ ok: false }, { status: 400 })
  const out = await settleLive(app, uid, code, body?.forfeit === true)
  return out.ok ? Response.json(out) : Response.json(out, { status: out.status })
}
