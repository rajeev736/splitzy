"use client"

import * as React from "react"

import { characterById } from "@/components/game-avatar/registry"
import { isTeamRoom } from "@/lib/live/seats"
import type { RoomMeta, RoomPlayer } from "@/lib/live/types"

/** The intro's fade out (and in, with reduced motion). */
export const FADE_MS = 200
/** Reduced motion: everyone in place at once, a fade in, a short hold, a fade out. */
export const REDUCED_MS = 1300
/** A start older than this (a refresh mid-game) doesn't replay the intro. */
const FRESH_MS = 4000

/** Band colours for players without a character, by seat. */
const SEAT_ACCENTS = ["#2f7cf6", "#f2b512", "#55b82a", "#e8473b", "#d23ba6", "#8b5cf6", "#0ea5a4", "#f97316"]
/** 2v2: the seat's Ludo colour (red, green, yellow, blue: Team A is red + yellow). */
const LUDO_ACCENTS = ["#e8473b", "#3fb54a", "#f2b512", "#2f7cf6"]

/** Ludo 2v2 with its four players (lib/live/seats: seats 0 + 2 Team A, 1 + 3 Team B). */
export function isTeamGame(meta: RoomMeta, players: RoomPlayer[]) {
  return isTeamRoom(meta) && players.filter((p) => !p.left).length === 4
}

/** The player's band / tile colour: their character's, else one by seat. */
export function accentOf(p: RoomPlayer, teams: boolean) {
  const def = characterById(p.avatar)
  if (def) return def.accent
  if (teams) return LUDO_ACCENTS[p.seat % 4]
  return SEAT_ACCENTS[p.seat % SEAT_ACCENTS.length]
}

/** Short enough to sit big on a band: the first name if the whole one is long. */
export function displayName(name: string) {
  const full = name.trim() || "Player"
  const short = full.length > 12 ? full.split(/\s+/)[0] : full
  return short.length > 12 ? `${short.slice(0, 11)}…` : short
}

/**
 * Play the intro? Only right after the game started (by server time), not on
 * a refresh mid-game, and once per start on this device.
 */
export function shouldPlayIntro(code: string, meta: RoomMeta, players: RoomPlayer[], serverNow: () => number) {
  if (typeof window === "undefined" || meta.status !== "playing" || !meta.startedAt) return false
  if (players.filter((p) => !p.left).length < 2) return false
  const age = serverNow() - meta.startedAt
  if (age > FRESH_MS || age < -FRESH_MS) return false
  try {
    return window.sessionStorage.getItem(introKey(code, meta.startedAt)) === null
  } catch {
    return true
  }
}

export const introKey = (code: string, startedAt: number) => `joysplit:intro:${code}:${startedAt}`

/** How many of the (ascending) moments, in ms from mount, have passed. All of them when `instant`. */
export function useMarks(marks: number[], instant: boolean) {
  const key = marks.join(",")
  const [passed, setPassed] = React.useState(instant ? marks.length : 0)
  React.useEffect(() => {
    if (instant) return
    const ids = key
      .split(",")
      .map(Number)
      .map((t, i) => window.setTimeout(() => setPassed((p) => Math.max(p, i + 1)), t))
    return () => ids.forEach(window.clearTimeout)
  }, [key, instant])
  return passed
}

/** The window's size, kept up to date. */
export function useViewport() {
  const [vp, setVp] = React.useState(() =>
    typeof window === "undefined" ? { w: 390, h: 844 } : { w: window.innerWidth, h: window.innerHeight }
  )
  React.useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])
  return vp
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Tiny seeded PRNG, so the lightning has the same shape on every render. */
export function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
