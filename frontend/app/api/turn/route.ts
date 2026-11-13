import { getAuth } from "firebase-admin/auth"

import { adminApp } from "@/lib/server/firebase-admin"

/**
 * Short-lived TURN credentials for voice chat, from Cloudflare's free TURN
 * service. Peer-to-peer audio (STUN only) works on most networks; a relay is
 * what gets strict mobile carriers and office firewalls through.
 *
 * Needs two server-only environment variables (see .env.example), from
 * Cloudflare dashboard → Calls → TURN keys:
 *   CLOUDFLARE_TURN_KEY_ID      the key's id
 *   CLOUDFLARE_TURN_API_TOKEN   its API token — never sent to the browser
 * Without them the route answers 404 { configured: false } and the app stays
 * STUN-only. Callers must be signed in (Firebase ID token), so the relay is
 * only ever handed to JoySplit users.
 */
export async function POST(request: Request) {
  const app = adminApp()
  if (!app)
    return Response.json(
      { configured: false, reason: "auth not configured" },
      { status: 503 }
    )

  const idToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
  if (!idToken) return Response.json({ ok: false }, { status: 401 })
  try {
    await getAuth(app).verifyIdToken(idToken)
  } catch {
    return Response.json({ ok: false }, { status: 401 })
  }

  const keyId = process.env.CLOUDFLARE_TURN_KEY_ID
  const apiToken = process.env.CLOUDFLARE_TURN_API_TOKEN
  if (!keyId || !apiToken)
    return Response.json({ configured: false }, { status: 404 })

  try {
    const res = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        // One hour: longer than any game; the browser fetches fresh ones per voice session
        body: JSON.stringify({ ttl: 3600 }),
        cache: "no-store",
      }
    )
    if (!res.ok) {
      console.error("Cloudflare TURN credentials:", res.status)
      return Response.json({ configured: false }, { status: 502 })
    }
    const data = (await res.json()) as { iceServers?: unknown }
    const iceServers = Array.isArray(data.iceServers) ? data.iceServers : []
    return Response.json(
      { iceServers },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (e) {
    console.error("Cloudflare TURN credentials:", e)
    return Response.json({ configured: false }, { status: 502 })
  }
}
