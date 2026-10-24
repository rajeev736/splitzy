/* JoySplit service worker: shows notifications in the phone's notification bar
 * and opens the right screen when one is tapped. */

self.addEventListener("install", () => self.skipWaiting())
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()))

// Web Push (for when the app is closed) — payload: { title, body, url, tag }
self.addEventListener("push", (event) => {
  if (!event.data) return
  let data = {}
  try {
    data = event.data.json()
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
  const url = new URL(event.notification.data?.url || "/notifications", self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin))
      if (open) return open.focus().then((w) => (w && "navigate" in w ? w.navigate(url) : w))
      return self.clients.openWindow(url)
    })
  )
})
