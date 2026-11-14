/**
 * Geometry of the 5-player (pentagon) Ludo board, in board units (one square
 * = 1), centred on (0, 0). The rules are in lib/live/ludo (PENTA_GEO); this
 * only says where things are drawn.
 *
 * Five arms, one per colour, point out from a pentagon in the middle (side 3,
 * so each arm — 3 squares wide — sits on one side). Each arm is like the
 * square board's: 6 squares out along one lane, the tip, 6 back along the
 * other, the colour's home column up the middle. Bases sit between arms.
 */

import { PENTA_COLOURS, PENTA_GEO, type LudoColour } from "./ludo"

export type Point = { x: number; y: number }

const ARMS = 5
/** The centre pentagon's apothem (side 3). */
export const PENTA_R0 = 3 / (2 * Math.tan(Math.PI / ARMS))
/** Base centres: between two arms, this far out. */
const BASE_R = 6.6
/** Half the size of a base square. */
export const BASE_HALF = 1.45
const deg = (d: number) => (d * Math.PI) / 180

/** Arm k points this way (degrees; 0 = right, 90 = down). Arm 0 (red) points up. */
export const armAngle = (k: number) => -90 + (360 / ARMS) * k
const armOf = (colour: LudoColour) => Math.max(0, PENTA_COLOURS.indexOf(colour))

/** Outward unit vector of arm k, and its sideways one (toward arm k + 1, clockwise). */
function axes(k: number) {
  const a = deg(armAngle(k))
  return { u: { x: Math.cos(a), y: Math.sin(a) }, v: { x: -Math.sin(a), y: Math.cos(a) } }
}

/** Centre of the square in arm k, lane `o` (−1, 0, +1), `j` squares out (0 = nearest the middle). */
export function armSquare(k: number, o: number, j: number): Point {
  const { u, v } = axes(k)
  const r = PENTA_R0 + 0.5 + j
  return { x: u.x * r + v.x * o, y: u.y * r + v.y * o }
}

/** The four corners of that square. */
export function armSquareCorners(k: number, o: number, j: number): Point[] {
  const { u, v } = axes(k)
  const c = armSquare(k, o, j)
  return [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0.5, 0.5],
    [-0.5, 0.5],
  ].map(([a, b]) => ({ x: c.x + u.x * a + v.x * b, y: c.y + u.y * a + v.y * b }))
}

/**
 * Track square `g` (0 … 64): each arm runs 0–5 out along lane −1, 6 the tip,
 * 7–12 back along lane +1; colour k starts at its arm's square 8.
 */
export function trackSquare(g: number): { arm: number; o: number; j: number } {
  const n = (((g + 8) % PENTA_GEO.track) + PENTA_GEO.track) % PENTA_GEO.track
  const arm = Math.floor(n / 13) % ARMS
  const i = n % 13
  if (i <= 5) return { arm, o: -1, j: i }
  if (i === 6) return { arm, o: 0, j: 5 }
  return { arm, o: 1, j: 12 - i }
}

export const trackPoint = (g: number): Point => {
  const s = trackSquare(g)
  return armSquare(s.arm, s.o, s.j)
}

/** Base centre of a colour (between its arm and the next), and its frame. */
export function baseFrame(colour: LudoColour) {
  const a = deg(armAngle(armOf(colour)) + 180 / ARMS)
  const u = { x: Math.cos(a), y: Math.sin(a) }
  const v = { x: -Math.sin(a), y: Math.cos(a) }
  return { c: { x: u.x * BASE_R, y: u.y * BASE_R }, u, v, angle: armAngle(armOf(colour)) + 180 / ARMS }
}

const SLOTS = [
  [-0.7, -0.7],
  [-0.7, 0.7],
  [0.7, -0.7],
  [0.7, 0.7],
]

export function baseSlot(colour: LudoColour, token: number): Point {
  const { c, u, v } = baseFrame(colour)
  const [a, b] = SLOTS[token % 4]
  return { x: c.x + u.x * a + v.x * b, y: c.y + u.y * a + v.y * b }
}

/** Where a piece of `colour` at path position `pos` is drawn. */
export function pentaPoint(colour: LudoColour, pos: number, token = 0): Point {
  const k = armOf(colour)
  if (pos < 0) return baseSlot(colour, token)
  if (pos < PENTA_GEO.colStart) return trackPoint((PENTA_GEO.start[colour] ?? 0) + pos)
  if (pos < PENTA_GEO.home) return armSquare(k, 0, 4 - (pos - PENTA_GEO.colStart))
  // Home: in the colour's triangle of the centre pentagon
  const { u } = axes(k)
  return { x: u.x * PENTA_R0 * 0.55, y: u.y * PENTA_R0 * 0.55 }
}

/** The centre pentagon's corners (between arm k and arm k + 1 is corner k). */
export function pentagonCorners(): Point[] {
  const R = 3 / (2 * Math.sin(Math.PI / ARMS))
  return Array.from({ length: ARMS }, (_, k) => {
    const a = deg(armAngle(k) + 180 / ARMS)
    return { x: Math.cos(a) * R, y: Math.sin(a) * R }
  })
}

/** Rotates a point by `degrees` about the centre. */
export function rotate(p: Point, degrees: number): Point {
  const a = deg(degrees)
  return { x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) }
}

/** Board turn that puts `colour`'s base at the bottom-left, in front of its player. */
export const pentaTurnFor = (colour: LudoColour) => 135 - baseFrame(colour).angle
