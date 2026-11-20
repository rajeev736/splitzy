"use client"

import type { Driver, PopoverDOM } from "driver.js"
import { doc, updateDoc } from "firebase/firestore"

import { getDb } from "@/services/shared"

/**
 * What the Split tour (welcome-tour.tsx) and the Games tour (games-welcome.tsx)
 * share: finding a `data-tour` mark that's really on screen, remembering that
 * a tour was seen — on the account (users/{uid}.tours), so no other phone,
 * browser or the installed app shows it again — and the "Skip" button.
 */

/**
 * The first element on screen for a mark — pages stay mounted while hidden,
 * and some marks only show at some widths, so invisible ones are passed over.
 * Null when none is showing (driver.js then skips the step, see skipMissingElement).
 */
export function visibleMark(mark: string): Element | null {
  if (typeof document === "undefined") return null
  for (const el of document.querySelectorAll(`[data-tour="${mark}"]`)) {
    if (el.getClientRects().length === 0) continue
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el
  }
  return null
}

/** driver.js wants an element-returning function; a null from it means "missing". */
export const markFinder = (mark: string) => () => visibleMark(mark) as Element

export type TourId = "split" | "games"

/** The Split tour keeps the key it always had, so nobody sees it twice. */
const doneKey = (tour: TourId, uid: string) => (tour === "split" ? `joysplit_tour_done_${uid}` : `joysplit_${tour}_tour_done_${uid}`)

/** Tours already written to the account in this session (no repeat writes). */
const saved = new Set<string>()

/** Records on the account that `tour` was seen (best effort; this device's copy is kept too). */
function saveSeen(tour: TourId, uid: string) {
  const key = `${uid}:${tour}`
  const db = getDb()
  if (saved.has(key) || !db) return
  saved.add(key)
  void updateDoc(doc(db, "users", uid), { [`tours.${tour}`]: true }).catch(() => saved.delete(key))
}

/**
 * Whether this user has seen `tour`: on their account (`seen`, the profile's
 * `tours`), or on this device. Seen here but not yet on the account (an
 * older app version): it's copied up, so other devices know too.
 */
export function tourDone(tour: TourId, uid: string, seen?: Partial<Record<TourId, boolean>>): boolean {
  if (seen?.[tour]) return true
  try {
    const here = localStorage.getItem(doneKey(tour, uid)) === "1"
    if (here) saveSeen(tour, uid)
    return here
  } catch {
    // No storage: never nag
    return true
  }
}

/** Marks `tour` seen — call it as the tour starts, so closing the app part-way never brings it back. */
export function markTourDone(tour: TourId, uid: string) {
  try {
    localStorage.setItem(doneKey(tour, uid), "1")
  } catch {}
  saveSeen(tour, uid)
}

/** Whether some driver.js tour is on screen right now (only one at a time). */
export const tourRunning = () => typeof document !== "undefined" && document.body.classList.contains("driver-active")

/**
 * A plain "Skip" at the start of the footer on every step but the last (the ✕
 * in the corner is there on every step, and Esc works too).
 */
export function addSkipButton(popover: PopoverDOM, drv: Driver, className: string) {
  if (drv.isLastStep()) return
  const skip = document.createElement("button")
  skip.type = "button"
  skip.className = className
  skip.textContent = "Skip"
  skip.onclick = () => drv.destroy()
  popover.footer.prepend(skip)
}

/** The keyboard shouldn't pop up for a field that focuses itself while it's being pointed at. */
export function blurActive() {
  if (document.activeElement instanceof HTMLElement && !document.activeElement.closest(".driver-popover")) {
    document.activeElement.blur()
  }
}
