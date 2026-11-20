"use client"

import * as React from "react"
import { toast } from "sonner"

import { Spinner } from "@/components/ui/spinner"
import { useRoomNode } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import {
  matchedTiles,
  MEMORY_IDLE_MS,
  memoryGrid,
  normalize,
  winsNeeded,
  type MemoryState,
} from "@/lib/live/memory"
import { playSound, useOnChange } from "@/lib/live/sound"
import type { LiveGameProps } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { actOnServer } from "@/services/live-server"
import { GameBackdrop } from "../game-backdrop"
import { useStageFit } from "../use-stage-fit"
import { MEMORY_TILE_CSS, MemoryTile, type TileLook } from "./memory-tile"
import { colourOf, firstName, PlayerChip, RoundOver, STAGE_CSS } from "./table-parts"

/** A bright sky, blue on top fading to lilac, with soft clouds. */
const SKY = [
  "radial-gradient(55% 16% at 6% 90%, rgba(255,255,255,.6) 0 50%, rgba(255,255,255,0) 72%)",
  "radial-gradient(42% 13% at 98% 97%, rgba(255,238,255,.65) 0 50%, rgba(255,238,255,0) 72%)",
  "radial-gradient(34% 7% at 88% 19%, rgba(255,255,255,.42) 0 50%, rgba(255,255,255,0) 72%)",
  "radial-gradient(28% 6% at 12% 9%, rgba(255,255,255,.45) 0 50%, rgba(255,255,255,0) 72%)",
  "radial-gradient(22% 5% at 60% 52%, rgba(255,255,255,.22) 0 50%, rgba(255,255,255,0) 72%)",
  "linear-gradient(180deg,#4f9ff7 0%,#77b1fb 32%,#a3b4f6 64%,#c8acf2 88%,#dcb6f0 100%)",
].join(",")


/** A tile this device flipped: `ack` is the table seq that shows it (0: still on its way). */
type Pending = { tile: number; ack: number }

/** Re-renders when the server clock reaches `at` (0: never); true from then on. */
function useReached(at: number, serverNow: () => number) {
  const [reached, setReached] = React.useState(0)
  React.useEffect(() => {
    if (!at) return
    const id = window.setTimeout(() => setReached(at), Math.max(0, at - serverNow()))
    return () => window.clearTimeout(id)
  }, [at, serverNow])
  return at > 0 && reached === at
}

/** The size of an element's box, live. */
function useBox<T extends HTMLElement>() {
  const [box, setBox] = React.useState({ w: 0, h: 0 })
  const ref = React.useCallback((el: T | null) => {
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBox({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, box] as const
}

/** Tiles' size and grid for the board's box: whichever way round gives bigger tiles. */
function fitGrid(size: number, w: number, h: number) {
  const GAP = 0.1
  const fit = ([cols, rows]: [number, number]) => Math.floor(Math.min(w / (cols + (cols - 1) * GAP), h / (rows + (rows - 1) * GAP)))
  const tall = memoryGrid(size)
  const wide = memoryGrid(size, true)
  const [cols, rows] = fit(wide) > fit(tall) ? wide : tall
  const tile = Math.max(24, Math.min(132, fit([cols, rows])))
  return { cols, rows, tile, gap: Math.max(4, Math.round(tile * GAP)) }
}

/**
 * Memory Tiles: everyone round one board of face-down tiles. The server runs
 * every flip (lib/live/memory, lib/server/hosted) and only ever shows what's
 * face up; this screen flips your tap straight away (a shimmer until the
 * picture arrives) and turns it back if the server says no. The referee's
 * device keeps the clock moving (a miss flips back, an idle turn passes, the
 * next round deals) with `tick`.
 */
export function MemoryGame({ code, players, uid, me, isReferee, now, serverNow }: LiveGameProps) {
  const { data } = useRoomNode<MemoryState>(code, "state")
  const s = React.useMemo(() => (data ? normalize(data) : data), [data])
  const byId = React.useMemo(() => Object.fromEntries(players.map((p) => [p.uid, p])), [players])
  const goneKey = players
    .filter((p) => p.left)
    .map((p) => p.uid)
    .join(",")

  const stageRef = useStageFit()
  const [boardRef, box] = useBox<HTMLDivElement>()

  /* ── Your flips (optimistic) ─────────────────────────────────────── */

  const [pending, setPending] = React.useState<Pending[]>([])
  const seqRef = React.useRef(0)
  const ackRef = React.useRef(0)
  const chain = React.useRef<Promise<void>>(Promise.resolve())
  React.useEffect(() => {
    seqRef.current = s?.seq ?? 0
  }, [s?.seq])
  const seq = s?.seq ?? 0
  // Still flipping: sent and not yet answered, or answered but the table hasn't caught up
  const live = pending.filter((p) => !p.ack || seq < p.ack)

  const send = React.useCallback(
    async (tile: number) => {
      const seen = Math.max(seqRef.current, ackRef.current)
      try {
        let res: { seq: number }
        try {
          res = await actOnServer(code, { type: "flip", tile, seq: seen })
        } catch (e) {
          // The table moved on (a peek flipped back, the clock ticked): the server checks the flip itself
          if (!/stale/.test(getErrorMessage(e, ""))) throw e
          res = await actOnServer(code, { type: "flip", tile })
        }
        ackRef.current = Math.max(ackRef.current, res.seq)
        setPending((list) => list.map((p) => (p.tile === tile && !p.ack ? { ...p, ack: res.seq } : p)))
      } catch (e) {
        setPending((list) => list.filter((p) => !(p.tile === tile && !p.ack)))
        toast(refusal(getErrorMessage(e, "")), { id: "memory-flip" })
      }
    },
    [code]
  )

  /* ── The clock (the referee's device) ────────────────────────────── */

  const phase = s?.phase ?? "over"
  const turn = s?.turn ?? ""
  const turnAt = s?.turnAt ?? 0
  const peekUntil = s?.peekUntil ?? 0
  const nextAt = s?.nextAt ?? 0
  const seatsKey = s?.players.join(",") ?? ""
  React.useEffect(() => {
    if (!isReferee || !seatsKey || phase === "over") return
    const gone = new Set(goneKey ? goneKey.split(",") : [])
    const active = seatsKey.split(",").filter((p) => !gone.has(p))
    const due =
      active.length <= 1
        ? 0
        : phase === "peek"
          ? peekUntil
          : phase === "roundover"
            ? nextAt
            : gone.has(turn)
              ? 0
              : turnAt + MEMORY_IDLE_MS
    let tries = 0
    let timer = 0
    let dead = false
    const fire = () => {
      actOnServer(code, { type: "tick" }).catch(() => {
        // Too early by the server's clock, or a hiccup: try again shortly (until the table changes)
        if (!dead && ++tries < 8) timer = window.setTimeout(fire, 900)
      })
    }
    timer = window.setTimeout(fire, Math.max(0, due - serverNow()) + 120)
    return () => {
      dead = true
      window.clearTimeout(timer)
    }
  }, [isReferee, seq, phase, turn, turnAt, peekUntil, nextAt, seatsKey, goneKey, code, serverNow])

  /* ── Sounds ──────────────────────────────────────────────────────── */

  const peekDone = useReached(phase === "peek" ? peekUntil : 0, serverNow)
  const myTurn = !!s && !me.left && turn === uid && (phase === "play" || phase === "peek")
  useOnChange(s?.matched.length ?? 0, (n, was) => {
    if (n > was) playSound("correct")
  })
  useOnChange(myTurn && phase === "play", (mine) => {
    if (mine) playSound("your_turn")
  })
  // Someone else's flips (yours sound as you tap)
  const upCount = s ? s.matched.length * 2 + s.flipped.length : 0
  useOnChange(upCount, (n, was) => {
    if (s && n > was && s.turn !== uid && s.peekBy !== uid) playSound("place")
  })
  useOnChange(phase === "roundover" ? (s?.round ?? 0) : 0, (r) => {
    if (r && s?.lastWinners.includes(uid)) playSound("summit")
  })

  /* ── Render ──────────────────────────────────────────────────────── */

  if (s === undefined || s === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 font-bold text-white">
        <Spinner className="size-6" />
        {s === null && <span>Dealing the tiles…</span>}
      </div>
    )
  }

  const gone = new Set(goneKey ? goneKey.split(",") : [])
  const found = new Map<number, { pic: number; by: string }>()
  for (const m of s.matched) {
    found.set(m.a, { pic: m.pic, by: m.by })
    found.set(m.b, { pic: m.pic, by: m.by })
  }
  // A miss stays up until its peek runs out (here, by this device's clock too)
  const showFlipped = s.phase === "play" || (s.phase === "peek" && !peekDone)
  const flippedPic = new Map(showFlipped ? s.flipped.map((f) => [f.tile, f.pic]) : [])
  const waiting = new Set(live.map((p) => p.tile))
  const lookOf = (i: number): TileLook => {
    const f = found.get(i)
    if (f) return { kind: "found", pic: f.pic, colour: colourOf(byId[f.by]) }
    const pic = flippedPic.get(i)
    if (pic !== undefined) return { kind: "up", pic, miss: s.phase === "peek" }
    if (waiting.has(i)) return { kind: "waiting" }
    return { kind: "down" }
  }

  const canFlipNow = myTurn && (s.phase === "play" || peekDone)
  const openNow = (s.phase === "play" ? s.flipped.length : 0) + live.length

  const onTap = (tile: number, el: HTMLElement) => {
    if (me.left || s.phase === "roundover" || s.phase === "over") return
    if (!canFlipNow) {
      nudge(el)
      if (!myTurn) toast(`It's ${firstName(byId[s.turn])}'s turn`, { id: "memory-wait", duration: 1500 })
      return
    }
    if (matchedTiles(s).has(tile) || flippedPic.has(tile) || waiting.has(tile) || openNow >= 2) return
    setPending((list) => [...list.filter((p) => !p.ack || seq < p.ack), { tile, ack: 0 }])
    playSound("place")
    chain.current = chain.current.then(() => send(tile))
  }

  const { cols, tile, gap } = fitGrid(s.size, box.w, box.h)
  const pairsLeft = s.size / 2 - s.matched.length
  const turnPlayer = byId[s.turn]
  const peekPlayer = byId[s.peekBy]

  let status: string
  if (me.left) status = "You left — watching"
  else if (s.phase === "roundover") status = s.round >= s.rounds ? "Board cleared!" : "Board cleared — next round coming up"
  else if (s.phase === "peek" && !peekDone)
    status = `No match${s.peekBy === uid ? "" : ` for ${firstName(peekPlayer)}`} — ${s.turn === uid ? "your turn next" : `${firstName(turnPlayer)} is next`}`
  else if (myTurn) status = s.phase === "play" && s.flipped.length + live.length === 1 ? "Now find its match!" : "Your turn — flip two tiles"
  else status = `${firstName(turnPlayer)} is flipping…`

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative flex flex-col gap-2 text-white",
        "max-md:fixed max-md:inset-x-0 max-md:top-(--stage-top) max-md:z-20 max-md:h-(--stage-h) max-md:overflow-hidden max-md:px-2 max-md:pt-1 max-md:pb-2",
        "md:h-[calc(var(--stage-h,100svh)-1.5rem)] md:min-h-[420px] md:py-2"
      )}
    >
      <style>{MEMORY_TILE_CSS + STAGE_CSS}</style>
      <GameBackdrop background={SKY} />

      {/* Round and pairs left */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-1">
        <span className="mt-pill">{s.rounds > 1 ? `Round ${s.round} of ${s.rounds}` : "Single round"}</span>
        <span className="mt-pill">
          {pairsLeft} {pairsLeft === 1 ? "pair" : "pairs"} left
        </span>
      </div>

      {/* Players */}
      <div
        className="grid shrink-0 gap-1.5"
        style={{ gridTemplateColumns: `repeat(${Math.max(2, s.players.length)}, minmax(0, 1fr))` }}
      >
        {s.players.map((p) => (
          <PlayerChip
            key={p}
            player={byId[p]}
            you={p === uid}
            pairs={s.pairs[p] ?? 0}
            wins={s.wins[p] ?? 0}
            need={s.rounds > 1 ? winsNeeded(s.rounds) : 0}
            active={(s.phase === "play" || s.phase === "peek") && s.turn === p}
            left={gone.has(p)}
            ring={
              s.turn === p && (s.phase === "play" || s.phase === "peek")
                ? Math.max(0, Math.min(1, 1 - (now - s.turnAt) / MEMORY_IDLE_MS))
                : null
            }
          />
        ))}
      </div>

      {/* The board */}
      <div ref={boardRef} className="relative min-h-0 flex-1">
        <div className="absolute inset-0 flex items-center justify-center">
          {box.w > 0 && (
            <div className="mt-board" style={{ gridTemplateColumns: `repeat(${cols}, ${tile}px)`, gap, padding: gap }}>
              {Array.from({ length: s.size }, (_, i) => (
                <MemoryTile key={i} index={i} look={lookOf(i)} size={tile} canTap={canFlipNow} onTap={onTap} />
              ))}
            </div>
          )}
        </div>
        {s.phase === "roundover" && (
          <RoundOver s={s} byId={byId} uid={uid} secondsLeft={Math.max(0, Math.ceil((s.nextAt - now) / 1000))} />
        )}
      </div>

      {/* What's happening */}
      <div className={cn("mt-status shrink-0", myTurn && s.phase === "play" && "mt-status-turn")} aria-live="polite">
        {status}
      </div>
    </div>
  )
}

/** A gentle shake: not now. */
function nudge(el: HTMLElement) {
  el.animate?.(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(-2px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 320, easing: "ease-in-out" }
  )
}

/** The server's reason, said kindly. */
function refusal(reason: string) {
  if (/not your turn/.test(reason)) return "Not your turn any more"
  if (/flipping back/.test(reason)) return "Hold on — those tiles are flipping back"
  if (/already up/.test(reason)) return "That tile is already face up"
  if (/round is over|game is over/.test(reason)) return "This round is over"
  return reason ? `Couldn't flip that tile: ${reason}` : "Couldn't flip that tile — try again"
}
