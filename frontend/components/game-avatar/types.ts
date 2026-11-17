import type * as React from "react"

/**
 * Game profile characters. In games (lobby, intro, seats, results) a player
 * shows their GAME profile — a character (and their frame) — instead of the
 * Split profile photo used everywhere else in the app.
 *
 * Data:
 * - the chosen character id lives on the user doc as `gameAvatar`
 *   (lib/types UserProfile), owned premium ids in the wallet's `avatars`;
 * - in a live room, each player entry carries `avatar` (character id) and
 *   `frame` (frame id) so every device can draw everyone without lookups.
 *
 * Tiers: "basic" (free, still art), "premium" (bought with coins, animated),
 * "legend" (bought or earned, animated with a signature intro effect).
 */

export type CharacterTier = "basic" | "premium" | "legend"

/**
 * - "still": no motion (lists, small seats, reduced motion)
 * - "idle": a gentle loop (lobby seats, profile)
 * - "intro": the signature entrance, played once (the pre-game intro); it ends
 *   on the character's resting pose and stays there
 */
export type CharacterMode = "still" | "idle" | "intro"

export interface CharacterArtProps {
  mode: CharacterMode
  /**
   * Pixel size of the square the art fills. The art is clipped to the
   * avatar's tile (a circle in seats, a rounded card in the intro): every
   * effect — flower rain, fire, shuriken — must happen INSIDE this square.
   */
  size: number
}

export interface CharacterDef {
  id: string
  name: string
  /** One short line: who they are ("Throws a mean shuriken"). */
  tagline: string
  tier: CharacterTier
  /** Coins; 0 for basic ones and for earn-only legends. */
  price: number
  /**
   * Unlocked as a reward instead of (or as well as) bought: an achievement
   * (lib/live/achievements) or reaching a level (lib/live/levels).
   */
  earn?: { achievement: string; level?: undefined } | { level: number; achievement?: undefined }
  /** Background colour of the character's tile / intro band. */
  accent: string
  Art: React.ComponentType<CharacterArtProps>
}
