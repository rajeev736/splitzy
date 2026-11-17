/** Faint icon wallpapers for the intro's bands, one per seat (white, tinted by the band below). */

const ICONS = {
  note: "M8 2v11.2A3.5 3.5 0 1 0 10 16V6h6V2z",
  star: "M10 1l2.7 5.6 6.1.9-4.4 4.3 1 6.1L10 15l-5.4 2.9 1-6.1L1.2 7.5l6.1-.9z",
  heart: "M10 18s-8-4.9-8-10.2C2 4.6 4.3 2.5 6.8 2.5c1.5 0 2.6.8 3.2 1.9.6-1.1 1.7-1.9 3.2-1.9C15.7 2.5 18 4.6 18 7.8 18 13.1 10 18 10 18z",
  bolt: "M11.5 1L3 11.5h6L7.5 19 17 7.5h-6z",
  paw: "M10 9c3 0 6 3.7 6 6.3 0 2-1.6 2.7-3 2.2-1.1-.4-2-.9-3-.9s-1.9.5-3 .9c-1.4.5-3-.2-3-2.2C4 12.7 7 9 10 9zM4.3 4.5a2 2.5 0 1 1 0 .1zM8 2a2 2.5 0 1 1 0 .1zM12 2a2 2.5 0 1 1 0 .1zM15.7 4.5a2 2.5 0 1 1 0 .1z",
  ring: "M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
  sparkle: "M10 0c.8 5.2 4.8 9.2 10 10-5.2.8-9.2 4.8-10 10-.8-5.2-4.8-9.2-10-10 5.2-.8 9.2-4.8 10-10z",
  shuriken: "M10 0l2.4 7.6L20 10l-7.6 2.4L10 20l-2.4-7.6L0 10l7.6-2.4zM10 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
} as const

const ORDER: (keyof typeof ICONS)[] = ["note", "shuriken", "paw", "bolt", "heart", "star", "sparkle", "ring"]

/** The tile's size in px; the drift animation moves by exactly one tile. */
export const PATTERN_TILE = 72

function tile(d: string) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="#fff" fill-rule="evenodd">` +
    `<path transform="translate(8 8) rotate(-14 10 10)" d="${d}"/>` +
    `<path transform="translate(44 42) scale(.8) rotate(18 10 10)" d="${d}"/>` +
    `</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const TILES = ORDER.map((k) => tile(ICONS[k]))

export const patternFor = (seat: number) => TILES[seat % TILES.length]
