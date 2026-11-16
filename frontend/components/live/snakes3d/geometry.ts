import { LADDERS, SNAKES } from "@/lib/live/snakes"

/**
 * The tower's geometry: a 2:1 isometric staircase of 10 terraces (rows) of
 * 10 grass-topped stone blocks each, numbered 1 → 100 boustrophedon. Each
 * row sits one block back and one step up from the row in front, so the
 * terraces stack straight up the screen: square 1 is at the bottom, 100 at
 * the summit. Everything is in SVG user units (the viewBox); the board scales
 * the whole drawing to its width.
 */

/** Width of a block's top face (the rhombus). */
export const TILE_W = 56
/** Height of a block's top face. */
export const TILE_H = TILE_W / 2
/** The step up from one row to the next (the visible stone riser). */
export const RISE = 54
/** Left margin: room for the start platform and the gate. */
const MARGIN_L = 66
/** Space above the summit for the sky and the flag. */
const TOP_PAD = 150
/** The cliff below square 1, fading into the mist. */
const CLIFF_DEPTH = 150
/** How far the bottom row's stone drops before the mist swallows it. */
export const CLIFF_FACE = RISE + 90

/** How far a row climbs on screen (a step back and a step up). */
export const ROW_RISE = TILE_H + RISE

/** The drawing's size (viewBox). */
export const SCENE_W = MARGIN_L + (TILE_W / 2) * 11 + 22
export const SCENE_H = TOP_PAD + 9 * ROW_RISE + 9 * (TILE_H / 2) + TILE_H + CLIFF_DEPTH

export interface Pt {
  x: number
  y: number
}

/** Row (0 = bottom) and column (0 = left) of a square. */
export function cellOf(n: number): { row: number; col: number } {
  const i = Math.max(1, Math.min(100, n)) - 1
  const row = Math.floor(i / 10)
  const k = i % 10
  return { row, col: row % 2 === 0 ? k : 9 - k }
}

/** Screen centre of a square's top face. */
export function tileCentre(n: number): Pt {
  const { row, col } = cellOf(n)
  return {
    x: MARGIN_L + TILE_W / 2 + col * (TILE_W / 2),
    y: TOP_PAD + (9 - row) * ROW_RISE + col * (TILE_H / 2) + TILE_H / 2,
  }
}

/** The start platform in front of square 1, behind the gate. */
export const START_SPOT: Pt = (() => {
  const t = tileCentre(1)
  // Down and to the left, clear of the gate so the pieces don't hide it
  return { x: t.x - 58, y: t.y + 46 }
})()

/** Where a square's pieces stand: 0 is the start platform. */
export const spotOf = (pos: number): Pt => (pos <= 0 ? START_SPOT : tileCentre(pos))

/**
 * Each seat has its own little patch of a square, so pieces sharing one
 * stay visible. Five spots in a shallow ring that fits the top face.
 */
export const SLOT_OFFSETS: Pt[] = [
  { x: 0, y: 0 },
  { x: -12, y: -4 },
  { x: 12, y: -4 },
  { x: -9, y: 5 },
  { x: 9, y: 5 },
]

/** Where seat `slot` stands on square `pos` (0 = the start platform). */
export function standOf(pos: number, slot: number): Pt {
  const base = spotOf(pos)
  const o = SLOT_OFFSETS[slot % SLOT_OFFSETS.length]
  return { x: base.x + o.x, y: base.y + o.y }
}

/** The four corners of a top face: top, right, bottom, left. */
export function rhombus(c: Pt): [Pt, Pt, Pt, Pt] {
  return [
    { x: c.x, y: c.y - TILE_H / 2 },
    { x: c.x + TILE_W / 2, y: c.y },
    { x: c.x, y: c.y + TILE_H / 2 },
    { x: c.x - TILE_W / 2, y: c.y },
  ]
}

export const pts = (list: Pt[]) => list.map((p) => `${p.x},${p.y}`).join(" ")

/**
 * A ladder's rails, in slight perspective: the far (top) end is a little
 * narrower, like looking up a real ladder.
 */
export function ladderGeometry(foot: number, top: number) {
  const a = tileCentre(foot)
  const b = tileCentre(top)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  // Perpendicular unit vector
  const nx = -dy / len
  const ny = dx / len
  const wFoot = 9
  const wTop = 6.5
  const rail1 = { from: { x: a.x + nx * wFoot, y: a.y + ny * wFoot }, to: { x: b.x + nx * wTop, y: b.y + ny * wTop } }
  const rail2 = { from: { x: a.x - nx * wFoot, y: a.y - ny * wFoot }, to: { x: b.x - nx * wTop, y: b.y - ny * wTop } }
  const rungs: { from: Pt; to: Pt }[] = []
  const count = Math.max(3, Math.round(len / 17))
  for (let i = 1; i < count; i++) {
    const t = i / count
    rungs.push({
      from: { x: rail1.from.x + (rail1.to.x - rail1.from.x) * t, y: rail1.from.y + (rail1.to.y - rail1.from.y) * t },
      to: { x: rail2.from.x + (rail2.to.x - rail2.from.x) * t, y: rail2.from.y + (rail2.to.y - rail2.from.y) * t },
    })
  }
  return { a, b, rail1, rail2, rungs, len }
}

/** A snake's body: a lazy S from its head square down to its tail square. */
export function snakePath(head: number, tail: number): { d: string; head: Pt; tail: Pt; angle: number } {
  const h = tileCentre(head)
  const t = tileCentre(tail)
  const dx = t.x - h.x
  const dy = t.y - h.y
  const len = Math.hypot(dx, dy)
  const nx = -dy / len
  const ny = dx / len
  // Bulge alternates sides so the body wriggles; bigger snakes bulge more
  const amp = Math.min(34, 10 + len * 0.12)
  const side = head % 2 === 0 ? 1 : -1
  const p1 = { x: h.x + dx * 0.3 + nx * amp * side, y: h.y + dy * 0.3 + ny * amp * side }
  const p2 = { x: h.x + dx * 0.7 - nx * amp * side, y: h.y + dy * 0.7 - ny * amp * side }
  // The head faces along the body's first direction
  const angle = (Math.atan2(h.y - p1.y, h.x - p1.x) * 180) / Math.PI
  const d = `M ${h.x} ${h.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${t.x} ${t.y}`
  return { d, head: h, tail: t, angle }
}

export const LADDER_LIST = Object.entries(LADDERS).map(([f, t]) => ({ foot: Number(f), top: t }))
export const SNAKE_LIST = Object.entries(SNAKES).map(([h, t]) => ({ head: Number(h), tail: t }))
