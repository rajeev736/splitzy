"use client"

import * as React from "react"
import { GameBackdrop, TABLE_CLASS } from "../game-backdrop"

import { Spinner } from "@/components/ui/spinner"
import { describeLast, LAST, ordinal, type SnakesState } from "@/lib/live/snakes"
import { playSound, type SnakesSound } from "@/lib/live/sound"
import { SQUARE_GEO, type LudoPlayer } from "@/lib/live/ludo"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { Piece, PieceDefs, TOKEN_COLOURS } from "../ludo/ludo-board"
import { LudoDice } from "../ludo/ludo-dice"
import { Seat } from "../ludo/ludo-game"
import { ThrowOverlay, ThrowPicker } from "../throwables"
import { useStageFit } from "../use-stage-fit"
import { usePreloadImage } from "@/lib/live/themes"
import { useSnakesGame } from "./use-snakes-game"

/** Square n (1–100) → its centre on the 10×10 board (row 1 at the bottom, rows snake left/right). */
export function squarePoint(n: number): { x: number; y: number } {
  const i = n - 1
  const row = Math.floor(i / 10)
  const col = row % 2 === 0 ? i % 10 : 9 - (i % 10)
  return { x: col + 0.5, y: 9 - row + 0.5 }
}

/** Start: a strip under the board. */
const startPoint = (seat: number) => ({ x: 0.55 + seat * 0.62, y: 10.55 })

const BOARD_ART = "/boards/snakes-classic.webp"

/** The board: the picture (its ladders and snakes are the ones in LADDERS / SNAKES). */
export const SnakesBoardArt = React.memo(function Board() {
  return <image href={BOARD_ART} x={0} y={0} width={10} height={10} preserveAspectRatio="none" />
})

/**
 * Square-by-square positions on screen, lagging the state while a move plays
 * out. Each frame can carry a sound (a hop, the ladder, the snake, the
 * summit), played once as the frame shows — so a move sounds as it animates,
 * and Firebase echoing the same `seq` plays nothing again.
 */
function useWalk(state: SnakesState | null | undefined, onSound: (s: SnakesSound) => void) {
  type Frame = { pos: Record<string, number>; ms: number; sound?: SnakesSound }
  const target = React.useMemo(
    () => (state ? Object.fromEntries(state.order.map((u) => [u, state.players[u].pos])) : {}),
    [state]
  )
  const [anim, setAnim] = React.useState<{ seq: number; frames: Frame[]; step: number } | null>(null)
  if (state && anim?.seq !== state.seq) {
    const shown = anim ? anim.frames[Math.min(anim.step, anim.frames.length - 1)].pos : null
    const last = state.last
    const frames: Frame[] = []
    if (shown && last?.type === "move" && shown[last.by] === last.from) {
      let cur = shown
      for (let p = last.from + 1; p <= last.to; p++) {
        cur = { ...cur, [last.by]: p }
        frames.push({ pos: cur, ms: 230, sound: "hop" })
      }
      if (last.via) {
        // A beat on the snake's head / the ladder's foot, then the slide or the climb
        frames.push({ pos: { ...cur }, ms: 350 })
        frames.push({ pos: target, ms: last.finished ? 600 : 0, sound: last.via === "ladder" ? "climb" : "bite" })
      } else frames.push({ pos: target, ms: last.finished ? 250 : 0 })
      if (last.finished) frames.push({ pos: target, ms: 0, sound: "summit" })
    } else frames.push({ pos: target, ms: 0 })
    setAnim({ seq: state.seq, frames, step: 0 })
  }
  React.useEffect(() => {
    if (!anim || anim.step >= anim.frames.length - 1) return
    const id = window.setTimeout(
      () => setAnim((a) => (a && a.seq === anim.seq ? { ...a, step: a.step + 1 } : a)),
      anim.frames[anim.step].ms
    )
    return () => window.clearTimeout(id)
  }, [anim])
  const played = React.useRef("")
  const soundRef = React.useRef(onSound)
  React.useEffect(() => {
    soundRef.current = onSound
  })
  React.useEffect(() => {
    const sound = anim?.frames[anim.step]?.sound
    const key = `${anim?.seq}:${anim?.step}`
    if (!sound || played.current === key) return
    played.current = key
    soundRef.current(sound)
  }, [anim])
  return anim ? anim.frames[Math.min(anim.step, anim.frames.length - 1)].pos : target
}

/** Snakes & Ladders on a flat 10×10 board, 2–5 players. */
export function SnakesGame(props: LiveGameProps) {
  const game = useSnakesGame(props)
  // Fetch and decode the board picture while the game state is still loading
  usePreloadImage(BOARD_ART)
  if (!game.state) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }
  return <SnakesTable {...game} state={game.state} code={props.code} uid={props.uid} me={props.me} />
}

export interface SnakesTableProps {
  /** The room; "" previews the table without one (no throwables). */
  code: string
  uid: string
  me: RoomPlayer
  state: SnakesState
  canRoll: boolean
  rolling: boolean
  roll: () => void
  byId: Record<string, RoomPlayer>
  nameOf: (uid: string) => string
  gone: string[]
  countdown: number | null
}

/** The jungle-green felt the board sits on, over the whole screen. */
const SNAKES_BACKDROP = "radial-gradient(130% 90% at 50% 0%, #16a34a 0%, #15803d 40%, #052e16 100%)"

/** The table: seats around the board, the pieces walking square by square, the status line. */
export function SnakesTable({ code, uid, me, state, canRoll, rolling, roll, byId, nameOf, gone, countdown }: SnakesTableProps) {
  const shown = useWalk(state, playSound)
  const stageRef = useStageFit()
  const [throwAt, setThrowAt] = React.useState<RoomPlayer | null>(null)
  const id = React.useId().replace(/:/g, "")
  // The face each player's dice rests on
  const [faces, setFaces] = React.useState<Record<string, number>>({})
  const lastRoll =
    state.last && (state.last.type === "move" || state.last.type === "blocked") ? { by: state.last.by, value: state.last.value } : null
  if (lastRoll && faces[lastRoll.by] !== lastRoll.value) setFaces((f) => ({ ...f, [lastRoll.by]: lastRoll.value }))

  const mine = state.players[uid]
  const myTurn = state.phase !== "over" && state.turn === uid
  const headline =
    state.phase === "over"
      ? "Game over"
      : mine?.place
        ? `You reached 100 — ${ordinal(mine.place)}!`
        : myTurn
          ? "Your turn — tap your dice"
          : `${nameOf(state.turn)} is rolling…`

  const seat = (u: string, align: "left" | "right", compact: boolean) => {
    const p = state.players[u]
    const rp = byId[u]
    if (!p || !rp) return <div key={u} aria-hidden />
    const isTurn = state.phase !== "over" && state.turn === u
    const rolledLast = lastRoll?.by === u
    const showDice = isTurn || rolledLast
    // Seat shows "x/4 home" for Ludo; here: the square they're on
    const asLudo: LudoPlayer = { uid: u, colour: p.colour, tokens: [], place: p.place, missed: p.missed, ...(p.out ? { out: true } : {}) }
    return (
      <Seat
        key={u}
        player={rp}
        ludo={asLudo}
        isTurn={isTurn}
        isMe={u === uid}
        countdown={isTurn ? countdown : null}
        align={align}
        compact={compact}
        geo={SQUARE_GEO}
        status={p.place ? `${ordinal(p.place)} · finished` : p.pos === 0 ? (state.variant === "gate" ? "At the gate" : "Start") : `On ${p.pos}`}
        dice={
          showDice ? (
            <LudoDice
              value={faces[u] ?? null}
              spin={rolledLast ? state.seq : null}
              rolling={u === uid && rolling}
              size={32}
              dim={!isTurn}
              onRoll={u === uid && canRoll ? roll : undefined}
              glow={u === uid && canRoll ? TOKEN_COLOURS[p.colour] : undefined}
            />
          ) : null
        }
        onTap={u !== uid && !me.left && code ? () => setThrowAt(rp) : undefined}
      />
    )
  }
  // You sit at the bottom, by your dice (like Ludo); the others across the board
  const n = state.order.length
  const others = state.order.includes(uid) ? state.order.filter((u) => u !== uid) : state.order
  const below = state.order.includes(uid) ? Math.max(1, Math.floor(n / 2)) : Math.floor(n / 2)
  const top = others.slice(0, n - below)
  const bottom = state.order.includes(uid) ? [uid, ...others.slice(n - below)] : others.slice(n - below)
  const cols = (n: number) => (n === 3 ? "grid-cols-3" : "grid-cols-2")
  const align = (i: number, n: number): "left" | "right" => (i === n - 1 && n > 1 ? "right" : "left")

  // Pieces: on their square (or the start strip), spread out when they share one
  const groups = new Map<string, string[]>()
  for (const u of state.order) {
    if (gone.includes(u) || state.players[u].out) continue
    const k = String(shown[u] ?? 0)
    groups.set(k, [...(groups.get(k) ?? []), u])
  }
  const pieces = state.order
    .filter((u) => !gone.includes(u) && !state.players[u].out)
    .map((u) => {
      const pos = shown[u] ?? 0
      if (pos <= 0) return { u, ...startPoint(state.order.indexOf(u)), scale: 0.72 }
      const at = squarePoint(Math.min(pos, LAST))
      const g = groups.get(String(pos)) ?? [u]
      const i = g.indexOf(u)
      const spread = g.length > 1 ? 0.2 : 0
      const ang = (i / g.length) * Math.PI * 2
      return { u, x: at.x + Math.cos(ang) * spread, y: at.y + Math.sin(ang) * spread, scale: g.length > 1 ? 0.62 : 0.8 }
    })
    .sort((a, b) => a.y - b.y)

  return (
    <div
      ref={stageRef}
      style={{ "--board-reserve": "236px", "--board-reserve-desk": "310px" } as React.CSSProperties}
      className={cn(
        "flex flex-col gap-2.5",
        "max-md:fixed max-md:inset-x-0 max-md:top-(--stage-top) max-md:z-20 max-md:h-(--stage-h) max-md:justify-center max-md:overflow-hidden max-md:p-2",
        "max-md:[--board-w:min(100%,calc(var(--stage-h)_-_var(--board-reserve)))]",
        // Big screens: out of the measured height between the header and the dock
        "md:[--board-w:min(100%,calc(var(--stage-h,100svh)_-_var(--board-reserve-desk)))]"
      )}
    >
      <GameBackdrop background={SNAKES_BACKDROP} />
      <div className={TABLE_CLASS}>
        <div className={cn("grid gap-2 px-1 pb-2", cols(top.length))}>{top.map((u, i) => seat(u, align(i, top.length), top.length > 2))}</div>
        <div className="mx-auto w-(--board-w) max-w-[min(94vw,32rem)] rounded-xl bg-white/15 md:max-w-full p-1 shadow-[0_12px_30px_rgb(0_0_0/0.4)]">
          <svg viewBox="-0.15 -0.8 10.3 12" className="block h-auto w-full select-none" role="img" aria-label="Snakes and ladders board">
            <rect x={-0.05} y={-0.05} width={10.1} height={10.1} rx={0.15} fill="#1f2937" />
            <SnakesBoardArt />
            <rect x={0} y={10.15} width={10} height={0.8} rx={0.2} fill="#fff" fillOpacity={0.2} />
            <text x={9.85} y={10.68} textAnchor="end" fontSize={0.3} fontWeight={800} fill="#fff" fillOpacity={0.85} fontFamily="system-ui, sans-serif">
              START
            </text>
            <PieceDefs id={id} />
            {pieces.map((p) => (
              <Piece
                key={p.u}
                id={id}
                colour={state.players[p.u].colour}
                x={p.x}
                y={p.y}
                scale={p.scale}
                movable={false}
                flying={false}
                label={`${nameOf(p.u)}'s piece`}
                quiet
                onTap={() => undefined}
              />
            ))}
          </svg>
        </div>
        <div className={cn("grid gap-2 px-1 pt-2", cols(bottom.length))}>{bottom.map((u, i) => seat(u, align(i, bottom.length), bottom.length > 2))}</div>
        <div className="mt-2 flex min-h-12 flex-col justify-center rounded-xl bg-black/25 px-3 py-1.5 text-center">
          <p className="truncate text-sm font-semibold">{headline}</p>
          <p className="truncate text-xs text-white/70" aria-live="polite">
            {describeLast(state, nameOf)}
          </p>
        </div>
      </div>
      <p className="px-1 text-center text-[11px] text-white/75 max-md:hidden">Tap another player&apos;s photo to throw something at them</p>
      {code && (
        <>
          <ThrowOverlay code={code} />
          <ThrowPicker code={code} target={throwAt} onOpenChange={(o) => !o && setThrowAt(null)} />
        </>
      )}
    </div>
  )
}
