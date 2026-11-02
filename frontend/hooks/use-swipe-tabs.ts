"use client"

import * as React from "react"

/** Touches starting this close to a screen edge belong to the system back / forward gesture. */
const EDGE = 20
/** Movement before the gesture picks an axis (px). */
const SLOP = 8
/** Fraction of a panel to drag before letting go moves to it. */
const COMMIT = 0.3
/** A flick this fast (px/ms) moves to the next panel however short the drag. */
const FLICK = 0.35
/** How much of the finger's movement past the first / last tab still moves the content. */
const RESIST = 0.3
const EASE = "cubic-bezier(0.25, 1, 0.5, 1)"
/** Elements whose own drag must win over tab swiping. */
const NO_SWIPE = "input[type=range], [data-no-swipe]"

export interface SwipeTabs {
  /** Element that listens for the gesture: make it cover everything that should swipe. */
  surface: (el: HTMLElement | null) => (() => void) | void
  viewport: (el: HTMLElement | null) => void
  track: (el: HTMLElement | null) => void
  indicator: (el: HTMLElement | null) => void
  index: number
  count: number
}

/**
 * Native-feeling swipeable tabs. While a finger drags sideways the panels and
 * the tab underline follow it (direct style writes, one per frame — no React
 * renders); on release they snap to the nearest tab, or the next one after a
 * 30% drag or a flick. Tab changes from anywhere else (a tap, `?tab=`) slide too.
 *
 * Panels sit side by side in a track; the inactive ones are collapsed to zero
 * height, so the page is as tall as the active panel. Each panel remembers how
 * far into it you had scrolled once the content reached the top of the screen.
 * Set `scroll-margin-top` on the viewport to the height of any sticky header
 * covering the top of the scroller.
 *
 * Render with `SwipeTabPanels` and `SwipeTabIndicator` (components/shared/swipe-tabs).
 */
export function useSwipeTabs<T extends string>(
  tabs: readonly T[],
  active: T,
  onChange: (tab: T) => void
): SwipeTabs {
  const index = Math.max(0, tabs.indexOf(active))
  const [pager] = React.useState(createPager)

  React.useLayoutEffect(() => {
    pager.update(tabs.length, (i) => {
      const tab = tabs[i]
      if (tab !== undefined) onChange(tab)
    })
  })
  React.useLayoutEffect(() => pager.sync(index), [pager, index])

  return {
    surface: pager.attachSurface,
    viewport: pager.setViewport,
    track: pager.setTrack,
    indicator: pager.setIndicator,
    index,
    count: tabs.length,
  }
}

/** The pager itself: plain DOM, so dragging never re-renders the page. */
function createPager() {
  let viewport: HTMLElement | null = null
  let track: HTMLElement | null = null
  let indicator: HTMLElement | null = null
  let surface: HTMLElement | null = null
  let count = 1
  let onIndex: (i: number) => void = () => {}

  let mounted = false
  /** The tab shown (or being animated to). */
  let idx = 0
  /** Where the track is, in tabs (fractional while dragging). */
  let pos = 0
  let animating = false
  let timer = 0
  let raf = 0

  /** How far into each panel you had scrolled, keyed by tab. */
  const saved = new Map<number, number>()
  /**
   * Set while panels other than the active one are showing: the scroller and
   * how far into the reference panel it was, and the vertical shift that lines
   * up each shown panel's own remembered position with the screen.
   */
  let prep: {
    scroller: HTMLElement | null
    scrollInto: number
    visibleH: number
    minH: number
    shifts: Map<number, number>
  } | null = null

  let drag: {
    x0: number
    y0: number
    locked: boolean
    base: number
    from: number
    width: number
    samples: { x: number; t: number }[]
  } | null = null

  const panels = () => (track ? (Array.from(track.children) as HTMLElement[]) : [])
  const clamp = (i: number) => Math.min(count - 1, Math.max(0, i))
  const reducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

  function paint(duration: number) {
    const transition = duration ? `transform ${duration}ms ${EASE}` : "none"
    if (track) {
      track.style.transition = transition
      track.style.transform = `translate3d(${-pos * 100}%,0,0)`
    }
    if (indicator) {
      indicator.style.transition = transition
      indicator.style.transform = `translate3d(${Math.min(count - 1, Math.max(0, pos)) * 100}%,0,0)`
    }
  }

  /** Show panels lo..hi next to the active one, each at its own remembered scroll position. */
  function expand(lo: number, hi: number) {
    if (!viewport || !track) return
    if (!prep) {
      const scroller = scrollParent(viewport)
      const inset = parseFloat(getComputedStyle(viewport).scrollMarginTop) || 0
      const top = (scroller ? scroller.getBoundingClientRect().top : 0) + inset
      const scrollInto = Math.max(0, top - viewport.getBoundingClientRect().top)
      const visibleH = (scroller ? scroller.clientHeight : window.innerHeight) - inset
      saved.set(idx, scrollInto)
      prep = { scroller, scrollInto, visibleH, minH: 0, shifts: new Map([[idx, 0]]) }
      track.style.willChange = "transform"
    }
    const list = panels()
    for (let i = Math.max(0, lo); i <= Math.min(count - 1, hi); i++) {
      const panel = list[i]
      if (!panel || prep.shifts.has(i)) continue
      panel.style.height = ""
      panel.style.overflow = ""
      const height = panel.offsetHeight
      // Content already at the top of the screen: show this panel where you left it
      const target = prep.scrollInto > 0 ? Math.min(saved.get(i) ?? 0, Math.max(0, height - prep.visibleH)) : 0
      const shift = prep.scrollInto - target
      prep.shifts.set(i, shift)
      panel.style.transform = shift ? `translate3d(0,${shift}px,0)` : ""
      prep.minH = Math.max(prep.minH, height + shift)
    }
    if (prep.minH) track.style.minHeight = `${prep.minH}px`
  }

  /** Collapse every panel but the active one and scroll it to where it was shown. */
  function settle() {
    window.clearTimeout(timer)
    animating = false
    const shift = prep?.shifts.get(idx) ?? 0
    const scroller = prep?.scroller ?? null
    // Read before collapsing the other panels, which may make the page shorter and clamp it
    const scrollTo = shift ? (scroller ? scroller.scrollTop : window.scrollY) - shift : 0
    panels().forEach((panel, i) => {
      const on = i === idx
      panel.style.height = on ? "" : "0px"
      panel.style.overflow = on ? "" : "hidden"
      panel.style.transform = ""
      panel.inert = !on
    })
    if (track) {
      track.style.minHeight = ""
      track.style.willChange = ""
    }
    prep = null
    // Moves the page exactly as far as the panel was shifted, so nothing jumps on screen
    if (shift) (scroller ?? window).scrollTo({ top: Math.max(0, scrollTo), behavior: "instant" })
  }

  function goTo(target: number, animate: boolean) {
    target = clamp(target)
    const changed = target !== idx
    // A drag frame still queued would cut the snap short
    cancelAnimationFrame(raf)
    raf = 0
    if (!track) {
      idx = pos = target
      return
    }
    expand(Math.min(Math.floor(pos), target), Math.max(Math.ceil(pos), target))
    const distance = Math.abs(target - pos)
    idx = target
    pos = target
    if (!animate || distance === 0 || reducedMotion()) {
      paint(0)
      settle()
    } else {
      const duration = Math.round(Math.min(300, Math.max(160, distance * 320)))
      animating = true
      paint(duration)
      window.clearTimeout(timer)
      timer = window.setTimeout(settle, duration + 50)
    }
    if (changed) onIndex(target)
  }

  /** Where a running snap animation has got to, so a new drag can catch it mid-way. */
  function currentPos() {
    if (!track || !track.offsetWidth) return pos
    const transform = getComputedStyle(track).transform
    if (!transform || transform === "none") return 0
    return -new DOMMatrixReadOnly(transform).m41 / track.offsetWidth
  }

  function frame() {
    raf = 0
    paint(0)
  }

  function onStart(e: TouchEvent) {
    if (e.touches.length !== 1) {
      // A second finger: let go of the swipe
      if (drag?.locked) goTo(Math.round(pos), true)
      drag = null
      return
    }
    if (count < 2 || !surface || !track) return
    const touch = e.touches[0]
    if (touch.clientX < EDGE || touch.clientX > window.innerWidth - EDGE) return
    const target = e.target as Element
    if (target.closest(NO_SWIPE)) return
    // A row that scrolls sideways keeps the gesture for itself
    for (let node: Element | null = target; node && node !== surface; node = node.parentElement) {
      if (node.scrollWidth > node.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(node).overflowX)) return
    }
    drag = { x0: touch.clientX, y0: touch.clientY, locked: false, base: pos, from: idx, width: 1, samples: [] }
  }

  function onMove(e: TouchEvent) {
    if (!drag) return
    const touch = e.touches[0]
    let dx = touch.clientX - drag.x0
    const dy = touch.clientY - drag.y0

    if (!drag.locked) {
      if (Math.abs(dx) <= SLOP && Math.abs(dy) <= SLOP) return
      // Vertical (or the browser already scrolling): the page scrolls as usual
      if (Math.abs(dx) <= Math.abs(dy) || !e.cancelable || !viewport) {
        drag = null
        return
      }
      if (animating) {
        // Catch the panels mid-snap
        pos = currentPos()
        window.clearTimeout(timer)
        animating = false
        paint(0)
      }
      // Start from here, so the content doesn't jump by the slop
      drag.x0 = touch.clientX
      dx = 0
      drag.locked = true
      drag.base = pos
      drag.from = Math.round(pos)
      drag.width = viewport.clientWidth || window.innerWidth
      expand(drag.from - 1, drag.from + 1)
    }

    if (e.cancelable) e.preventDefault()
    drag.samples.push({ x: touch.clientX, t: e.timeStamp })
    while (drag.samples.length > 2 && e.timeStamp - drag.samples[0].t > 100) drag.samples.shift()

    let next = drag.base - dx / drag.width
    next = Math.min(drag.from + 1, Math.max(drag.from - 1, next))
    // Rubber band past the first and last tab
    if (next < 0) next *= RESIST
    else if (next > count - 1) next = count - 1 + (next - (count - 1)) * RESIST
    pos = next
    if (!raf) raf = requestAnimationFrame(frame)
  }

  function onEnd(e: TouchEvent) {
    const d = drag
    if (!d || e.touches.length > 0) return
    drag = null
    if (!d.locked) return
    // A swipe is not a tap on whatever it ended over
    if (e.cancelable) e.preventDefault()
    cancelAnimationFrame(raf)
    raf = 0

    const first = d.samples[0]
    const last = d.samples[d.samples.length - 1]
    const velocity = first && last && last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0
    const off = pos - d.from
    const dir = Math.sign(off)
    // Finger moving left (negative velocity) heads for the next tab
    const flick = e.type === "touchend" && Math.abs(velocity) > FLICK ? -Math.sign(velocity) : 0
    const step = flick ? (flick === dir ? dir : 0) : Math.abs(off) > COMMIT ? dir : 0
    goTo(d.from + step, true)
  }

  return {
    update(nextCount: number, nextOnIndex: (i: number) => void) {
      count = Math.max(1, nextCount)
      onIndex = nextOnIndex
    },
    /** The active tab from React (a tap, the URL, or our own onIndex coming back). */
    sync(i: number) {
      if (!mounted) {
        mounted = true
        idx = pos = i
        if (track) {
          paint(0)
          settle()
        }
        return
      }
      if (i === idx) return
      drag = null
      goTo(i, true)
    },
    attachSurface(el: HTMLElement | null) {
      if (!el) return
      surface = el
      el.addEventListener("touchstart", onStart, { passive: true })
      el.addEventListener("touchmove", onMove, { passive: false })
      el.addEventListener("touchend", onEnd, { passive: false })
      el.addEventListener("touchcancel", onEnd, { passive: false })
      return () => {
        el.removeEventListener("touchstart", onStart)
        el.removeEventListener("touchmove", onMove)
        el.removeEventListener("touchend", onEnd)
        el.removeEventListener("touchcancel", onEnd)
        cancelAnimationFrame(raf)
        raf = 0
        drag = null
        if (surface === el) surface = null
      }
    },
    setViewport(el: HTMLElement | null) {
      viewport = el
    },
    setTrack(el: HTMLElement | null) {
      track = el
      if (!el) {
        window.clearTimeout(timer)
        animating = false
        prep = null
      }
    },
    setIndicator(el: HTMLElement | null) {
      indicator = el
    },
  }
}

/** The nearest ancestor that scrolls vertically, or null for the page itself. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
    if (/auto|scroll|overlay/.test(getComputedStyle(node).overflowY)) return node
  }
  return null
}
