import { adminApp } from "@/lib/server/firebase-admin"
import { runHosted } from "@/lib/server/hosted"
import { callerUid } from "@/lib/server/request-auth"

const CODE = /^[A-HJ-NP-Z2-9]{6}$/

/**
 * POST { code, action } — a move in a game the server runs (Color Clash,
 * Memory Tiles; lib/live/hosted): start, play, draw, flip, tick… The server
 * checks it against the rules and the hidden cards before anything changes.
 */
export async function POST(request: Request) {
  const app = adminApp()
  if (!app) return Response.json({ ok: false, reason: "server not configured" }, { status: 503 })
  const uid = await callerUid(app, request)
  if (!uid) return Response.json({ ok: false }, { status: 401 })
  const body = (await request.json().catch(() => null)) as { code?: unknown; action?: unknown } | null
  const code = typeof body?.code === "string" ? body.code : ""
  const action = body?.action
  if (!CODE.test(code) || !action || typeof action !== "object" || typeof (action as { type?: unknown }).type !== "string")
    return Response.json({ ok: false }, { status: 400 })
  const out = await runHosted(app, uid, code, action as { type: string })
  return out.ok ? Response.json(out) : Response.json(out, { status: out.status })
}
