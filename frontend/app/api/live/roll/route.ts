import { adminApp } from "@/lib/server/firebase-admin"
import { serverRoll, warmRoller } from "@/lib/server/live-roll"
import { callerUid } from "@/lib/server/request-auth"

const CODE = /^[A-HJ-NP-Z2-9]{6}$/

/**
 * POST { code, seq } — rolls your dice in a live room (Ludo, Snakes &
 * Ladders). Dice come only from here: see lib/server/live-roll.
 */
export async function POST(request: Request) {
  const app = adminApp()
  if (!app) return Response.json({ ok: false, reason: "server not configured" }, { status: 503 })
  const uid = await callerUid(app, request)
  if (!uid) return Response.json({ ok: false }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { code?: unknown; seq?: unknown; warm?: unknown } | null
  // A game screen opening: get ready (see warmRoller), roll nothing
  if (body?.warm === true) {
    await warmRoller(app)
    return Response.json({ ok: true })
  }
  const code = typeof body?.code === "string" ? body.code : ""
  const seq = typeof body?.seq === "number" && Number.isInteger(body.seq) ? body.seq : -1
  if (!CODE.test(code) || seq < 0) return Response.json({ ok: false }, { status: 400 })
  const out = await serverRoll(app, uid, code, seq)
  return out.ok ? Response.json(out) : Response.json(out, { status: out.status })
}
