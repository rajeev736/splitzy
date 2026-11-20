/**
 * The paint bucket's maths, kept free of the DOM so it can be tested: which
 * pixels a fill from (x, y) covers, on an RGBA bitmap.
 *
 * Fills are worked out on a fixed 1000 × 750 bitmap (one pixel per canvas
 * unit) that every device keeps of the drawing, not on the on-screen canvas,
 * so the same tap covers the same area on every screen size.
 */

/** How far (sum of the RGB differences, of 765) a pixel may be from the tapped one and still fill. */
export const FILL_TOLERANCE = 100

export interface FillMask {
  /** 1 = filled, `width` × `height`, row by row. */
  mask: Uint8Array
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * The area a fill from (sx, sy) covers: every pixel joined to it (up, down,
 * left, right) that's within FILL_TOLERANCE of its colour, then grown by one
 * pixel so the soft (anti-aliased) edge of a line is covered too and no pale
 * rim is left between the fill and the line. Null if the start is off the
 * bitmap, or that spot already has the fill's colour (`rgb`).
 */
export function floodMask(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  sx: number,
  sy: number,
  rgb: readonly [number, number, number],
  tolerance = FILL_TOLERANCE
): FillMask | null {
  sx = Math.floor(sx)
  sy = Math.floor(sy)
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return null
  const s = (sy * width + sx) * 4
  const tr = data[s]
  const tg = data[s + 1]
  const tb = data[s + 2]
  if (
    Math.abs(tr - rgb[0]) + Math.abs(tg - rgb[1]) + Math.abs(tb - rgb[2]) <=
    8
  )
    return null

  const seen = new Uint8Array(width * height)
  const like = (i: number) => {
    const j = i * 4
    return (
      Math.abs(data[j] - tr) +
        Math.abs(data[j + 1] - tg) +
        Math.abs(data[j + 2] - tb) <=
      tolerance
    )
  }
  let minX = sx
  let maxX = sx
  let minY = sy
  let maxY = sy

  // Scanline fill: take a whole run of a row at a time, queue the runs above and below
  const stack: number[] = [sx, sy]
  while (stack.length) {
    const y = stack.pop()!
    const x = stack.pop()!
    const row = y * width
    if (seen[row + x] || !like(row + x)) continue
    let lx = x
    while (lx > 0 && !seen[row + lx - 1] && like(row + lx - 1)) lx--
    let rx = x
    while (rx < width - 1 && !seen[row + rx + 1] && like(row + rx + 1)) rx++
    for (let i = lx; i <= rx; i++) seen[row + i] = 1
    if (lx < minX) minX = lx
    if (rx > maxX) maxX = rx
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= height) continue
      const nrow = ny * width
      let inRun = false
      for (let i = lx; i <= rx; i++) {
        const ok = !seen[nrow + i] && like(nrow + i)
        if (ok && !inRun) stack.push(i, ny)
        inRun = ok
      }
    }
  }

  // Grow by a pixel to cover the lines' soft edges
  const mask = seen.slice()
  for (let y = minY; y <= maxY; y++) {
    const row = y * width
    for (let x = minX; x <= maxX; x++) {
      if (!seen[row + x]) continue
      if (x > 0) mask[row + x - 1] = 1
      if (x < width - 1) mask[row + x + 1] = 1
      if (y > 0) mask[row - width + x] = 1
      if (y < height - 1) mask[row + width + x] = 1
    }
  }
  return {
    mask,
    minX: Math.max(0, minX - 1),
    minY: Math.max(0, minY - 1),
    maxX: Math.min(width - 1, maxX + 1),
    maxY: Math.min(height - 1, maxY + 1),
  }
}

/** "#rrggbb" → [r, g, b]; anything else is black. */
export function parseHex(c: unknown): [number, number, number] {
  if (typeof c !== "string" || !/^#[0-9a-f]{6}$/i.test(c)) return [0, 0, 0]
  const n = parseInt(c.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
