"use client"

import type * as React from "react"

/**
 * The profile peek: tap anyone's avatar and a small sheet opens with who they
 * are, with "View profile" for the whole page. One host (ProfilePeekHost,
 * mounted once in components/providers) draws the sheet; avatars only call
 * `openProfilePeek` — no hooks, no network per avatar.
 */

/** "app": the Split side's look (photo, money). "game": the Games side's (character, level, status). */
export type PeekLook = "app" | "game"

/** What the avatar already knows, shown straight away while the profile loads. */
export interface PeekHint {
  name?: string
  photo?: string | null
  /** Game character id. */
  avatar?: string | null
  frame?: string | null
}

export interface PeekRequest {
  uid: string
  look: PeekLook
  hint?: PeekHint
}

type Listener = (req: PeekRequest) => void
const listeners = new Set<Listener>()

/** Opens the peek sheet for someone (does nothing if no host is mounted). */
export function openProfilePeek(req: PeekRequest) {
  listeners.forEach((l) => l(req))
}

/** The host listens here. Returns the unsubscribe. */
export function onProfilePeek(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Where a tap on an avatar is not a peek: the avatar is (part of) a picker's
 * choice, or it sits on a game board (taps there are moves / throwables), or
 * something opted out with `data-no-peek`.
 */
const SKIP = '[role="checkbox"],[role="radio"],[role="option"],[role="switch"],[data-no-peek],[data-no-tap-sound]'

const skipped = (el: Element) => !!el.closest(SKIP)

/** Classes an avatar adds when it opens the peek: a pointer and a little press. */
export const PEEK_CLASS = "cursor-pointer transition-[scale] active:scale-95"

/**
 * Props that make an avatar's root element open the peek: a button role,
 * keyboard support, and a click that stops the row / link around it. Returns
 * null when there's nobody to peek at (no uid) or the avatar opted out.
 */
export function peekTriggerProps(
  req: PeekRequest | null | undefined,
  name: string
): (React.HTMLAttributes<HTMLElement> & { "data-peek": string }) | null {
  if (!req?.uid) return null
  // A Split avatar shown inside the Games UI (`.gu`) peeks in the game look
  const open = (el: Element) =>
    openProfilePeek(req.look === "app" && el.closest(".gu") ? { ...req, look: "game" } : req)
  return {
    role: "button",
    tabIndex: 0,
    "aria-label": `${name || "Someone"}'s profile`,
    "data-peek": req.look,
    onClick: (e) => {
      if (skipped(e.currentTarget)) return
      e.preventDefault()
      e.stopPropagation()
      open(e.currentTarget)
    },
    onKeyDown: (e) => {
      if (e.key !== "Enter" && e.key !== " ") return
      if (skipped(e.currentTarget)) return
      e.preventDefault()
      e.stopPropagation()
      open(e.currentTarget)
    },
  }
}
