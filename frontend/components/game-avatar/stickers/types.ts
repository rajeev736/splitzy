import type * as React from "react"

import type { SoundEvent } from "@/lib/live/sound"
import type { Shape } from "./shapes"

/**
 * A character's signature sticker: something only a player wearing that
 * character can send (free, unlimited, a short anti-spam gap), flown from
 * their seat to the target's and played for everyone in the room — the
 * receivers see it even without the character.
 *
 * Every piece is data so the one player (flight.tsx) can choreograph all of
 * them: launch flare at the sender, the flight with its trail, then a layered
 * hit — flash, shockwaves, a tinted screen, particles, a stamp on the target
 * (claw marks, a lasso, a halo of flames…), a comic word and the target's
 * own reaction.
 */
export interface CharSticker {
  /** 1-based, the `<n>` in the reaction's `c:<characterId>:<n>`. */
  n: number
  name: string
  /** One line for the inventory: what it does. */
  blurb: string
  /** The thing that flies, in a 64×64 viewBox. */
  art: React.ReactNode
  /** Played on the hit. */
  sound: SoundEvent
  flight: Flight
  impact: Impact
}

export type FlightPath =
  /** A throw, arcing over. */
  | "arc"
  /** Fast and flat. */
  | "straight"
  /** Hops along in three bounces. */
  | "bounce"
  /** Flies a loop-de-loop on the way. */
  | "loop"
  /** Falls out of the sky at an angle. */
  | "sky"
  /** Floats straight down from above the target, swaying (a parachute). */
  | "drop"
  /** Flies to hover above the target's head (a UFO). */
  | "hover"
  /** Stays at the sender and fires a beam across (a laser, lightning). */
  | "beam"

export interface Flight {
  path: FlightPath
  /** Seconds; a sensible default per path. */
  duration?: number
  /** Arc height in px (arc / loop). */
  lift?: number
  /** Degrees turned over the flight. */
  spin?: number
  /** Turn the art along its direction; the art's own heading in degrees (0 = it points right). */
  aim?: number
  /** px; default 60. */
  size?: number
  /** Several copies in a volley (shuriken). */
  count?: number
  /** Little bits left behind on the way. */
  trail?: { shape: Shape; colours: string[] }
  /** "beam" only: the beam's glow and core colours, and whether it's lightning. */
  beam?: { glow: string; core: string; jagged?: boolean }
}

/** What the flying thing does when it gets there. */
export type ItemHit =
  /** Grows and fades out. */
  | "pop"
  /** Squashes flat and is gone. */
  | "smash"
  /** Stays stuck for a moment. */
  | "stick"
  /** Settles on top of the target's head. */
  | "land"
  /** Thumps three times (a speaker). */
  | "thump"
  /** Tilts for a clink. */
  | "tilt"
  /** Bobs in place (hovering). */
  | "bob"

/** How the target's photo reacts. */
export type TargetReaction = "shake" | "knock" | "yank" | "squash" | "lift" | "spin" | "flicker" | "wobble"

export interface Burst {
  shape: Shape
  colours: string[]
  count: number
  /** px */
  reach: number
  /** px; default 12. */
  size?: number
  /** "burst" flies out all round, "rise" floats up, "fall" rains down over the target, "swirl" spirals out. */
  motion?: "burst" | "rise" | "fall" | "swirl"
  /** Seconds after the hit. */
  delay?: number
}

export interface Impact {
  item: ItemHit
  /** The flash: centre, middle and edge colours. */
  flash: readonly [string, string, string]
  /** Shockwave ring colours, one ring each. */
  rings?: string[]
  /** The whole screen glows from the target in this colour. */
  tint?: string
  bursts: Burst[]
  /**
   * Something drawn on / around the target, in a 100-wide viewBox (height from
   * `ratio`), `size` × the target's radius wide, centred `dy` radii below the
   * target's centre. Paths with `data-draw` and pathLength=1 are drawn in.
   */
  stamp?: {
    art: React.ReactNode
    size: number
    /** height / width; default 1. */
    ratio?: number
    dy?: number
    motion: "pop" | "grow" | "spin" | "drop" | "draw" | "unroll"
    /** Seconds it stays. */
    hold?: number
  }
  /** The comic word that pops above the target. */
  word?: { text: string; fill: string; stroke: string }
  react?: TargetReaction
}
