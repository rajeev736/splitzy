/**
 * Particle shapes for the signature stickers' bursts and trails, each a path
 * in a 24×24 box. Particles are made on the fly (flight.tsx), so these are
 * plain strings, not elements.
 */
export const SHAPES = {
  dot: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z",
  heart:
    "M12 21s-7.5-4.4-8.9-9.2C2.3 8.8 4.1 5.8 7.2 5.8c2 0 3.4 1.1 4.8 2.9 1.4-1.8 2.8-2.9 4.8-2.9 3.1 0 4.9 3 4.1 6-1.4 4.8-8.9 9.2-8.9 9.2z",
  sparkle: "M12 1l2.6 8.4L23 12l-8.4 2.6L12 23l-2.6-8.4L1 12l8.4-2.6z",
  star: "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6z",
  petal: "M12 2c5 4 6 10 0 20C6 12 7 6 12 2z",
  note: "M9 3h11v4h-8v10.5a3.5 3.5 0 1 1-3-3.46z",
  flame: "M12 2c1 5 7 7 7 13a7 7 0 0 1-14 0c0-3 2-5 3-7 1 2 2 3 3 3-1-3 0-6 1-9z",
  drop: "M12 2c4 6 7 10 7 13a7 7 0 0 1-14 0c0-3 3-7 7-13z",
  leaf: "M4 20C4 9 11 3 21 3c0 10-6 17-17 17z",
  square: "M5 5h14v14H5z",
  shard: "M12 1l6 11-6 11-6-11z",
  feather: "M20 2C11 3 5 10 4 19l-2 3 1 1 3-2c9-1 15-7 16-16-3 1-5 1-7 0 2-1 4-2 5-3z",
  bubble: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14z",
  bolt: "M14 1L4 14h6l-2 9 10-13h-6z",
  puff: "M7 19a5 5 0 0 1-.6-10A6.5 6.5 0 0 1 18.3 8.4 5.3 5.3 0 0 1 17 19z",
  snow: "M11 1h2v22h-2zM1.6 6.5l1-1.7 19.8 11.4-1 1.7zM2.6 19.2l-1-1.7L21.4 6.1l1 1.7z",
  coin: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12z",
} as const

export type Shape = keyof typeof SHAPES

/** One particle's markup (colours come from the sticker data, never from users). */
export const shapeSvg = (shape: Shape, colour: string) =>
  `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="${SHAPES[shape]}" fill="${colour}" fill-rule="evenodd"/></svg>`
