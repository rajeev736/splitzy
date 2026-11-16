"use client"

import * as React from "react"

import type { LudoColour } from "./ludo"

/**
 * Board themes for Ludo and Chess. One free theme each (Classic); the rest
 * are bought with coins (prices must match `themePrice` in firestore.rules)
 * and kept in the wallet's `themes`. Which theme you play on is per device.
 */

export type ThemeGame = "ludo" | "chess" | "snakes3d"

export type Shade = { light: string; mid: string; dark: string }

/**
 * A board drawn from a picture. `breaks` are where the grid's lines between
 * border | base | middle | base | border fall, as fractions of the picture's
 * width (the same across and down) — the picture is stretched piecewise so
 * its squares sit exactly on the game's 15×15 grid.
 */
export interface BoardImage {
  src: string
  breaks: [number, number, number, number]
}

export interface LudoLook {
  /** Draw the board from this picture (the colours below still tint pieces). */
  image?: BoardImage
  /** Base, home column and piece colours for each seat colour. */
  palette: Record<LudoColour, Shade>
  /** Track squares and their lines. */
  track: string
  trackStroke: string
  /** The square inside each base, where pieces wait. */
  inner: string
  /** Outer frame line. */
  frame: string
  frameWidth: number
  /** Bases shade from light to dark (false: flat colour). */
  gradient: boolean
  /** A motif painted in each base. */
  pattern?: "mandala" | "stitch" | "floral"
  /** Stars on the safe squares. */
  star: string
  /** The table around the board (CSS background). */
  table: string
}

export interface ChessLook {
  /** Square colours (each square's coordinate is written in the other one). */
  light: string
  dark: string
  /** A picture of the whole 8×8 board (light square top-left); without one the colours are painted. */
  board?: string
  /** A picture of the board in its frame, the squares `frameInset` (a fraction of the width) in from each edge. */
  framed?: string
  frameInset?: number
  /** Tint on the last move's squares. */
  highlight: string
}

export interface Snakes3DLook {
  /** Which world the tower is drawn in. */
  scene: "jungle" | "night"
  /** A picture for the theme picker. */
  preview: string
  /** The table around the board (CSS background). */
  table: string
}

export interface BoardTheme<L> {
  id: string
  game: ThemeGame
  name: string
  blurb: string
  /** Coins; 0 = free. */
  price: number
  look: L
}

const CLASSIC_PALETTE: Record<LudoColour, Shade> = {
  red: { light: "#ff8a80", mid: "#e53935", dark: "#8e1b1b" },
  green: { light: "#86e08f", mid: "#2e9e44", dark: "#13561f" },
  yellow: { light: "#ffe082", mid: "#f4b400", dark: "#8a6100" },
  blue: { light: "#8ab4ff", mid: "#1e6fe0", dark: "#0b3478" },
  purple: { light: "#d59cf0", mid: "#8e24aa", dark: "#4a148c" },
}

const flat = (mid: string, dark: string, light: string): Shade => ({ light, mid, dark })

export const LUDO_THEMES: BoardTheme<LudoLook>[] = [
  {
    id: "ludo_classic",
    game: "ludo",
    name: "Classic",
    blurb: "Bright and glossy",
    price: 0,
    look: {
      palette: CLASSIC_PALETTE,
      track: "#ffffff",
      trackStroke: "#c9ced8",
      inner: "#ffffff",
      frame: "#0f172a",
      frameWidth: 0.06,
      gradient: true,
      star: "#e5e7eb",
      table: "radial-gradient(130% 90% at 50% 0%, #2f6be0 0%, #1a46a8 45%, #0d2463 100%)",
    },
  },
  {
    id: "ludo_flat",
    game: "ludo",
    name: "Flat",
    blurb: "The board from the box: bold, flat colours",
    price: 250,
    look: {
      image: { src: "/boards/ludo-flat.webp", breaks: [12 / 736, 297 / 736, 439 / 736, 724 / 736] },
      palette: {
        red: flat("#fd0100", "#9b0a10", "#ff6b70"),
        green: flat("#009a2a", "#04621c", "#4fd474"),
        yellow: flat("#fee800", "#a39200", "#fff27a"),
        blue: flat("#00acff", "#0b6f99", "#7fd6f8"),
        purple: flat("#9c27b0", "#5e1569", "#d07fe0"),
      },
      track: "#ffffff",
      trackStroke: "#111111",
      inner: "#ffffff",
      frame: "#000000",
      frameWidth: 0.16,
      gradient: false,
      star: "#ffffff",
      table: "linear-gradient(180deg, #1f2937 0%, #0b0f17 100%)",
    },
  },
  {
    id: "ludo_mandala",
    game: "ludo",
    name: "Mandala",
    blurb: "Deep colours, cream track, mandalas in every base",
    price: 450,
    look: {
      image: { src: "/boards/ludo-mandala.webp", breaks: [20 / 600, 244 / 600, 356 / 600, 580 / 600] },
      // The picture's top-right base is blue and bottom-left green
      palette: {
        red: flat("#c0272d", "#6b1110", "#e2706f"),
        green: flat("#1d63b0", "#0f356a", "#6e9ad6"),
        yellow: flat("#e6c21a", "#8a6f05", "#f3da6f"),
        blue: flat("#13945a", "#07482a", "#5fbe8c"),
        purple: flat("#6b2fa0", "#3c1760", "#a47ccc"),
      },
      track: "#f1e8d4",
      trackStroke: "#3a3a3a",
      inner: "#f1e8d4",
      frame: "#000000",
      frameWidth: 0.14,
      gradient: false,
      pattern: "mandala",
      star: "#f1e8d4",
      table: "linear-gradient(180deg, #1b1b1b 0%, #050505 100%)",
    },
  },
  {
    id: "ludo_stitch",
    game: "ludo",
    name: "Cross-stitch",
    blurb: "Embroidered: muted colours and stitched motifs",
    price: 450,
    look: {
      image: { src: "/boards/ludo-stitch.webp", breaks: [171 / 1200, 506 / 1200, 694 / 1200, 1029 / 1200] },
      palette: {
        red: flat("#a73046", "#6f0e23", "#e07790"),
        green: flat("#638553", "#234621", "#8dbb8a"),
        yellow: flat("#cc9235", "#8c6513", "#f2cf86"),
        blue: flat("#455c63", "#22363d", "#8aa6b0"),
        purple: flat("#6d4b8d", "#3d2952", "#ab92c4"),
      },
      track: "#fbfaf6",
      trackStroke: "#2b2b2b",
      inner: "#fbfaf6",
      frame: "#2b2b2b",
      frameWidth: 0.08,
      gradient: false,
      pattern: "stitch",
      star: "#e8e2d2",
      table: "linear-gradient(180deg, #475569 0%, #1e293b 100%)",
    },
  },
  {
    id: "ludo_mughal",
    game: "ludo",
    name: "Mughal floral",
    blurb: "Miniature-painting palette with flowers",
    price: 600,
    look: {
      image: { src: "/boards/ludo-mughal.webp", breaks: [86 / 736, 321 / 736, 410 / 736, 650 / 736] },
      // The picture's bases: yellow, pink, maroon, olive (clockwise from top-left)
      palette: {
        red: flat("#d4a238", "#8a6614", "#f0cd7c"),
        green: flat("#e3a5ab", "#a0566a", "#f6cfd7"),
        yellow: flat("#6b1a2a", "#4a0b15", "#c0606f"),
        blue: flat("#55602f", "#2b3510", "#93a35e"),
        purple: flat("#7b4b94", "#47295a", "#b391c6"),
      },
      track: "#f5e9cc",
      trackStroke: "#c7b089",
      inner: "#f5e9cc",
      frame: "#7a1424",
      frameWidth: 0.16,
      gradient: false,
      pattern: "floral",
      star: "#e7d3a8",
      table: "linear-gradient(180deg, #3d2a1c 0%, #1e140c 100%)",
    },
  },
]

export const CHESS_THEMES: BoardTheme<ChessLook>[] = [
  {
    id: "chess_classic",
    game: "chess",
    name: "Classic",
    blurb: "Cool grey-blue",
    price: 0,
    look: { light: "#e9edf2", dark: "#8ea4b1", highlight: "#f5c400" },
  },
  {
    id: "chess_wood",
    game: "chess",
    name: "Wood",
    blurb: "Maple and walnut in a dark frame",
    price: 350,
    look: { light: "#d7b185", dark: "#382214", framed: "/boards/chess-wood.webp", frameInset: 27 / 1084, highlight: "#d1a52d" },
  },
  {
    id: "chess_green",
    game: "chess",
    name: "Tournament green",
    blurb: "Cream and green",
    price: 250,
    look: { light: "#ebecd0", dark: "#739552", board: "/chess/green-board.webp", highlight: "#ffff33" },
  },
]

export const SNAKES3D_THEMES: BoardTheme<Snakes3DLook>[] = [
  {
    id: "snakes3d_jungle",
    game: "snakes3d",
    name: "Jungle",
    blurb: "Real 3D: stone pillars, vines and a waterfall",
    price: 0,
    look: {
      scene: "jungle",
      preview: "/boards/snakes3d-jungle.webp",
      table: "radial-gradient(130% 90% at 50% 0%, #1f8a7a 0%, #0f5e57 45%, #08332f 100%)",
    },
  },
  {
    id: "snakes3d_night",
    game: "snakes3d",
    name: "Night tower",
    blurb: "A terraced tower under the stars",
    price: 0,
    look: {
      scene: "night",
      preview: "/boards/snakes3d-night.webp",
      table: "radial-gradient(130% 90% at 50% 0%, #2f6be0 0%, #1a46a8 45%, #0d2463 100%)",
    },
  },
]

export const THEMES = { ludo: LUDO_THEMES, chess: CHESS_THEMES, snakes3d: SNAKES3D_THEMES }
export const ALL_THEMES: BoardTheme<unknown>[] = [...LUDO_THEMES, ...CHESS_THEMES, ...SNAKES3D_THEMES]
export const themePrice = (id: string) => ALL_THEMES.find((t) => t.id === id)?.price ?? 0
export const isFreeTheme = (id: string) => themePrice(id) === 0 && ALL_THEMES.some((t) => t.id === id)

/* ── Which theme this device plays on ──────────────────────────────────── */

const KEY = (game: ThemeGame) => `joysplit_board_${game}`
const listeners = new Set<() => void>()
const cache: Partial<Record<ThemeGame, string>> = {}

function readChosen(game: ThemeGame): string {
  if (cache[game]) return cache[game]!
  let v = THEMES[game][0].id
  try {
    const raw = localStorage.getItem(KEY(game))
    if (raw && THEMES[game].some((t) => t.id === raw)) v = raw
  } catch {
    /* storage unavailable */
  }
  cache[game] = v
  return v
}

export function chooseTheme(game: ThemeGame, id: string) {
  cache[game] = id
  try {
    localStorage.setItem(KEY(game), id)
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l())
}

/**
 * The theme this device plays `game` on — falling back to Classic when the
 * chosen one isn't owned (`owned` = the wallet's themes).
 */
export function useBoardTheme<G extends ThemeGame>(game: G, owned: string[] | undefined) {
  const id = React.useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => readChosen(game),
    () => THEMES[game][0].id
  )
  const list = THEMES[game] as BoardTheme<G extends "ludo" ? LudoLook : G extends "chess" ? ChessLook : Snakes3DLook>[]
  const usable = list.find((t) => t.id === id && (t.price === 0 || owned?.includes(t.id))) ?? list[0]
  return usable
}
