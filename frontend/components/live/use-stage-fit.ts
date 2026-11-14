"use client"

import * as React from "react"

/**
 * Phones: fits a game "stage" exactly between the room header and the bottom
 * of what you can see — above the dock, or right above the keyboard while you
 * type. It sets `--stage-top` and `--stage-h` on the element; style it with
 * those (e.g. `fixed top-(--stage-top) h-(--stage-h)`).
 *
 * The phone keyboard shrinks only the *visual* viewport, so anything pinned to
 * the bottom of the page would otherwise end up behind it.
 *
 * Returns a ref callback; the room dock is found by `[data-room-dock]`.
 */
export function useStageFit() {
  return React.useCallback((el: HTMLElement | null) => {
    if (!el) return
    const vv = window.visualViewport
    const header = document.querySelector<HTMLElement>("header")
    const dock = document.querySelector<HTMLElement>("[data-room-dock]")
    let frame = 0

    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const visibleTop = vv ? vv.offsetTop : 0
        const visibleBottom = visibleTop + (vv ? vv.height : window.innerHeight)
        const headerBottom = header ? header.getBoundingClientRect().bottom : 0
        // The dock hides while typing (display: none → 0 high)
        const dockHeight = dock ? dock.getBoundingClientRect().height : 0
        const top = Math.max(headerBottom, visibleTop)
        el.style.setProperty("--stage-top", `${top}px`)
        el.style.setProperty("--stage-h", `${Math.max(200, visibleBottom - dockHeight - top)}px`)
      })
    }

    update()
    vv?.addEventListener("resize", update)
    vv?.addEventListener("scroll", update)
    window.addEventListener("resize", update)
    document.addEventListener("focusin", update)
    document.addEventListener("focusout", update)
    const ro = new ResizeObserver(update)
    if (header) ro.observe(header)
    if (dock) ro.observe(dock)

    return () => {
      cancelAnimationFrame(frame)
      vv?.removeEventListener("resize", update)
      vv?.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
      document.removeEventListener("focusin", update)
      document.removeEventListener("focusout", update)
      ro.disconnect()
    }
  }, [])
}
