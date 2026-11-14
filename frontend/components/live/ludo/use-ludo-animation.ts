"use client"

import * as React from "react"

import type { LudoState } from "@/lib/live/ludo"

/** Token positions per player as drawn on the board — lags the real state while a move animates. */
export type Positions = Record<string, number[]>

interface Frame {
  positions: Positions
  /** `${uid}:${token}` of tokens flying back to base in this frame (they get a slower transition). */
  flying?: string[]
  /** How long this frame stays before the next one. */
  ms: number
}

interface Anim {
  seq: number
  frames: Frame[]
  step: number
}

/** Time per square when a token walks. */
export const STEP_MS = 190
/** Time for a captured token to fly home. */
export const FLY_MS = 650

const BASE = [-1, -1, -1, -1]
const NO_FLYING: string[] = []

const positionsOf = (state: LudoState): Positions =>
  Object.fromEntries(
    state.order.map((uid) => [uid, state.players[uid]?.tokens ?? BASE])
  )

const clone = (p: Positions): Positions =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [...v]]))

/**
 * Frames from what's on screen to the new state: a move walks its token one
 * square at a time, then any captured tokens fly back. Anything else snaps.
 */
function buildFrames(from: Positions | null, state: LudoState): Frame[] {
  const target = positionsOf(state)
  const last = state.last
  const snap: Frame[] = [{ positions: target, ms: 0 }]
  if (!from || !last || last.type !== "move") return snap
  // The board doesn't show where this move starts (joined mid-game, skipped a state): don't guess
  if (from[last.by]?.[last.token] !== last.from) return snap

  const frames: Frame[] = []
  const path =
    last.from < 0
      ? [0]
      : Array.from({ length: last.to - last.from }, (_, i) => last.from + i + 1)
  let cur = from
  for (const pos of path) {
    cur = clone(cur)
    cur[last.by][last.token] = pos
    frames.push({ positions: cur, ms: STEP_MS })
  }
  if (last.captured?.length) {
    frames.push({
      positions: target,
      flying: last.captured.map((c) => `${c.uid}:${c.token}`),
      ms: FLY_MS,
    })
  } else {
    frames[frames.length - 1] = { positions: target, ms: STEP_MS }
  }
  return frames
}

/**
 * Where to draw every token right now. Each new state (by `seq`) is turned
 * into frames starting from whatever is currently shown, so a state that
 * lands mid-animation continues smoothly instead of jumping.
 */
export function useLudoAnimation(state: LudoState | null | undefined) {
  const [anim, setAnim] = React.useState<Anim | null>(null)
  // New state: plan its frames (adjusting state during render, keyed on the previous value)
  if (state && anim?.seq !== state.seq) {
    const from = anim
      ? anim.frames[Math.min(anim.step, anim.frames.length - 1)].positions
      : null
    setAnim({ seq: state.seq, frames: buildFrames(from, state), step: 0 })
  }
  React.useEffect(() => {
    if (!anim || anim.step >= anim.frames.length - 1) return
    const id = window.setTimeout(
      () =>
        setAnim((a) =>
          a && a.seq === anim.seq ? { ...a, step: a.step + 1 } : a
        ),
      anim.frames[anim.step].ms
    )
    return () => window.clearTimeout(id)
  }, [anim])

  const frame = anim
    ? anim.frames[Math.min(anim.step, anim.frames.length - 1)]
    : null
  return {
    positions: frame?.positions ?? (state ? positionsOf(state) : {}),
    flying: frame?.flying ?? NO_FLYING,
    /** No animation in flight. */
    settled: !anim || anim.step >= anim.frames.length - 1,
  }
}
