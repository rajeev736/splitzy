/**
 * When the dice on screen comes to rest after a roll. The dice marks it as a
 * roll starts landing (in a layout effect, so before any board's effect of the
 * same render), and the boards hold a move until then: the piece sets off as
 * the dice settles on its face, never while it's still turning.
 */
let settlesAt = 0

const clock = () => (typeof performance === "undefined" ? Date.now() : performance.now())

/** The dice just started landing a roll that takes `seconds` to settle. */
export function markDiceLanding(seconds: number) {
  settlesAt = Math.max(settlesAt, clock() + seconds * 1000)
}

/** Seconds until the dice has settled (0 when it's at rest). */
export function diceSettlesIn(): number {
  return Math.max(0, settlesAt - clock()) / 1000
}

/** The same, in milliseconds. */
export const diceSettlesInMs = () => Math.round(diceSettlesIn() * 1000)
