"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { CoinIcon } from "@/components/fun/coin"

/** How far (px, after the resistance) to pull before letting go refreshes. */
const ARMED_AT = 78
/** The furthest the coin comes down. */
const MAX_PULL = 130

/** The pull with resistance: follows the finger at first, then ever more stubbornly. */
const resist = (d: number) => MAX_PULL * (1 - 1 / ((d * 0.5) / MAX_PULL + 1))

/** Live game rooms: a pull there is part of play (drawing, dragging pieces), never a refresh. */
const NO_REFRESH = ["/play/", "/lounge/"]

/**
 * The Games side's pull-to-refresh (the browser's own is switched off app-wide,
 * html { overscroll-behavior-y: none }). Pull down at the top of a games
 * screen and a gold coin comes down on a rope, turning with the pull; past
 * the mark it glows and bounces — let go and it spins while the page reloads.
 * Short of the mark it springs back up.
 *
 * Touch only, and only when the page is at its top. It stays out of the way
 * of anything that handles the drag itself (a handler that called
 * preventDefault, an inner list not at its top, `data-no-ptr`, open dialogs).
 * Every frame is a direct style write — no React render while pulling.
 */
export function GamePullRefresh() {
  const pathname = usePathname() ?? ""
  const off = NO_REFRESH.some((p) => pathname.startsWith(p))
  const root = React.useRef<HTMLDivElement>(null)
  const [refreshing, setRefreshing] = React.useState(false)

  React.useEffect(() => {
    const el = root.current
    if (off || !el) return
    let startX = 0
    let startY = 0
    let tracking = false
    let pulling = false
    let pull = 0
    let spring = 0

    const paint = (p: number, armed: boolean) => {
      el.style.setProperty("--pull", `${p}px`)
      el.style.setProperty("--turn", `${p * 3.2}deg`)
      el.style.setProperty("--s", String(0.6 + (Math.min(p, ARMED_AT) / ARMED_AT) * 0.4))
      el.style.opacity = p > 2 ? "1" : "0"
      el.dataset.armed = armed ? "true" : "false"
    }

    const blocked = (target: EventTarget | null) => {
      for (let n = target instanceof Element ? target : null; n && n !== document.body; n = n.parentElement) {
        if (n.hasAttribute("data-no-ptr") || n.getAttribute("role") === "dialog" || n.tagName === "CANVAS") return true
        // An inner list that isn't at its own top scrolls first
        if (n.scrollTop > 0) return true
      }
      return false
    }

    const onStart = (e: TouchEvent) => {
      cancelAnimationFrame(spring)
      tracking = false
      pulling = false
      if (e.touches.length !== 1 || window.scrollY > 0 || el.dataset.busy === "true" || blocked(e.target)) return
      // Nothing else on top (a sheet or dialog open)
      if (document.querySelector("[role=dialog][data-state=open], [data-slot=sheet-content]")) return
      tracking = true
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const onMove = (e: TouchEvent) => {
      if (!tracking) return
      // Someone else is handling this drag (a board, the level pass's own stretch)
      if (e.defaultPrevented) {
        tracking = false
        return
      }
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY
      if (!pulling) {
        // Wait to see where it's going: sideways or upward isn't a pull
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return
        if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) {
          tracking = false
          return
        }
        pulling = true
      }
      e.preventDefault()
      pull = resist(Math.max(0, dy))
      paint(pull, pull >= ARMED_AT)
    }

    const springBack = () => {
      const from = pull
      const t0 = performance.now()
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / 320)
        // easeOutBack: a little overshoot, like it's on elastic
        const k = 1 - Math.pow(1 - t, 3) * (1 - 2.2 * t)
        pull = Math.max(0, from * (1 - k))
        paint(pull, false)
        if (t < 1) spring = requestAnimationFrame(step)
        else paint(0, false)
      }
      spring = requestAnimationFrame(step)
    }

    const onEnd = () => {
      if (!tracking || !pulling) {
        tracking = false
        return
      }
      tracking = false
      pulling = false
      if (pull >= ARMED_AT) {
        el.dataset.busy = "true"
        pull = ARMED_AT
        paint(ARMED_AT, true)
        setRefreshing(true)
        try {
          navigator.vibrate?.(12)
        } catch {
          // No vibration here
        }
        // Let the spin and the burst play, then reload
        window.setTimeout(() => window.location.reload(), 650)
      } else springBack()
    }

    window.addEventListener("touchstart", onStart, { passive: true })
    window.addEventListener("touchmove", onMove, { passive: false })
    window.addEventListener("touchend", onEnd, { passive: true })
    window.addEventListener("touchcancel", onEnd, { passive: true })
    return () => {
      cancelAnimationFrame(spring)
      window.removeEventListener("touchstart", onStart)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("touchend", onEnd)
      window.removeEventListener("touchcancel", onEnd)
    }
  }, [off])

  if (off) return null
  return (
    <div ref={root} className="gu-ptr" data-armed="false" data-refreshing={refreshing ? "true" : "false"} style={{ opacity: 0 }}>
      <span aria-hidden className="gu-ptr-rope" />
      <span aria-hidden className="gu-ptr-coin">
        <span className="gu-ptr-glow" />
        <CoinIcon className="gu-ptr-face" />
        {refreshing && (
          <span className="gu-ptr-burst">
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} style={{ "--a": `${i * 45}deg` } as React.CSSProperties} />
            ))}
          </span>
        )}
      </span>
      {refreshing ? <span role="status" className="sr-only">Refreshing</span> : null}
    </div>
  )
}
