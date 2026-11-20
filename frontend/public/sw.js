/* JoySplit service worker: shows notifications in the phone's notification bar
 * and opens the right screen when one is tapped. */

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

// Web Push (for when the app is closed) — { title, body, url, tag }, sent by
// /api/push through Firebase Cloud Messaging (which wraps it in { data })
self.addEventListener("push", (event) => {
  if (!event.data) return
  let data = {}
  try {
    const payload = event.data.json()
    data = payload.data && payload.data.title ? payload.data : payload.notification || payload
  } catch {
    data = { title: "JoySplit", body: event.data.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "JoySplit", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/notifications" },
    })
  )
})

// Tap → focus an open JoySplit window on that screen, or open one
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  // Only ever open pages of this app
  let url = new URL(event.notification.data?.url || "/notifications", self.location.origin)
  if (url.origin !== self.location.origin) url = new URL("/notifications", self.location.origin)
  url = url.href
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin))
      if (open) return open.focus().then((w) => (w && "navigate" in w ? w.navigate(url) : w))
      return self.clients.openWindow(url)
    })
  )
})

/* ── Offline-fast assets ─────────────────────────────────────────────────
 * Game boards, avatars, logos, sounds and the app's own (content-hashed)
 * code come from this phone after the first visit, so screens and games
 * open instantly and nothing re-downloads on a slow network. Pages, data
 * and anything from other sites always go to the network as usual. */
const ASSET_CACHE = "joysplit-assets-v1"
const ASSET_DIRS = ["/boards/", "/avatars/", "/game-logos/", "/chess/", "/sounds/", "/brands/", "/icons/", "/group-icons/", "/assets/"]
/** Plenty for every board, avatar and sound; the oldest go first past this. */
const ASSET_LIMIT = 400

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith("joysplit-assets-") && k !== ASSET_CACHE).map((k) => caches.delete(k)))
    )
  )
})

async function trim(cache) {
  const keys = await cache.keys()
  if (keys.length > ASSET_LIMIT) await Promise.all(keys.slice(0, keys.length - ASSET_LIMIT).map((k) => cache.delete(k)))
}

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET" || req.headers.has("range")) return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  const hashed = url.pathname.startsWith("/_next/static/")
  const asset = hashed || ASSET_DIRS.some((d) => url.pathname.startsWith(d))
  if (!asset) return
  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const hit = await cache.match(req)
      // Hashed files never change: the cached copy is the file. Public assets:
      // answer from the cache now and refresh it in the background.
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            void cache.put(req, res.clone()).then(() => trim(cache))
          }
          return res
        })
        .catch(() => hit)
      if (hit) {
        if (!hashed) event.waitUntil(refresh.then(() => undefined))
        return hit
      }
      return refresh
    })
  )
})
