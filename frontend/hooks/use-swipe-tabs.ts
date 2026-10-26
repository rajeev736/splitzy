"use client"

import * as React from "react"

/**
 * Swipe left / right on a tab panel to move to the next / previous tab, like a
 * phone app. Only clear horizontal swipes count, so vertical scrolling, sliders
 * and sideways-scrolling rows inside the panel keep working.
 *
 * Returns a ref callback for the swipeable element.
 */
export function useSwipeTabs<T extends string>(tabs: readonly T[], active: T, onChange: (tab: T) => void) {
  const latest = React.useRef({ tabs, active, onChange })
  React.useEffect(() => {
    latest.current = { tabs, active, onChange }
  })

  return React.useCallback((el: HTMLElement | null) => {
    if (!el) return
    let start: { x: number; y: number; t: number } | null = null

    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement
      if (e.touches.length !== 1 || target.closest("input[type=range], [data-no-swipe]")) return
      // A row that scrolls sideways keeps the gesture for itself
      for (let node: HTMLElement | null = target; node && node !== el; node = node.parentElement) {
        if (node.scrollWidth > node.clientWidth + 1 && getComputedStyle(node).overflowX !== "visible") return
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
    }
    const onEnd = (e: TouchEvent) => {
      if (!start) return
      const dx = e.changedTouches[0].clientX - start.x
      const dy = e.changedTouches[0].clientY - start.y
      const quick = Date.now() - start.t < 600
      start = null
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || !quick) return

      const { tabs, active, onChange } = latest.current
      const i = tabs.indexOf(active)
      // Swipe left → next tab, swipe right → previous tab
      const next = dx < 0 ? tabs[i + 1] : tabs[i - 1]
      if (next !== undefined) onChange(next)
    }

    el.addEventListener("touchstart", onStart, { passive: true })
    el.addEventListener("touchend", onEnd)
    return () => {
      el.removeEventListener("touchstart", onStart)
      el.removeEventListener("touchend", onEnd)
    }
  }, [])
}
