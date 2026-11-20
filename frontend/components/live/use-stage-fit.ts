"use client"

import * as React from "react"

/**
 * Fits a game "stage" between the room header and the bottom of what you can
 * see — above the dock, or right above the keyboard while you type. It sets
 * `--stage-top`, `--stage-h` (that height) and `--stage-w` (the element's own
 * width) on the element; style it with those (e.g. phones:
 * `fixed top-(--stage-top) h-(--stage-h)`; big screens: size the board to
 * `--stage-h` so the page doesn't scroll).
 *
 * The phone keyboard shrinks only the *visual* viewport, so anything pinned to
 * the bottom of the page would otherwise end up behind it.
 *
 * `wide(w, h)` (optional, keep it stable — e.g. a module-level function):
 * when it returns true the element gets `data-stage-wide`, so a game can lay
 * itself out sideways on short, wide screens (landscape tablets, laptops).
 *
 * Returns a ref callback; the room dock is found by `[data-room-dock]`.
 */
export function useStageFit(wide?: (width: number, height: number) => boolean) {
  return React.useCallback(
    (el: HTMLElement | null) => {
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
          const height = Math.max(200, visibleBottom - dockHeight - top)
          const width = el.clientWidth
          el.style.setProperty("--stage-top", `${top}px`)
          el.style.setProperty("--stage-h", `${height}px`)
          el.style.setProperty("--stage-w", `${width}px`)
          if (wide) el.toggleAttribute("data-stage-wide", wide(width, height))
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
      // Its own width (the column on big screens) — the height it's given doesn't feed back into it
      ro.observe(el)

      return () => {
        cancelAnimationFrame(frame)
        vv?.removeEventListener("resize", update)
        vv?.removeEventListener("scroll", update)
        window.removeEventListener("resize", update)
        document.removeEventListener("focusin", update)
        document.removeEventListener("focusout", update)
        ro.disconnect()
      }
    },
    [wide]
  )
}
