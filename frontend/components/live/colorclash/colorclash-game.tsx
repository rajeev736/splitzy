"use client"

import * as React from "react"
import { toast } from "sonner"

import { GameButton, GamePanel } from "@/components/game-ui/kit"
import { Spinner } from "@/components/ui/spinner"
import { useRoomNode } from "@/hooks/use-live-room"
import {
  CC_COLOURS,
  CC_ROUND_BREAK_MS,
  CC_TURN_MS,
  cardName,
  cardOf,
  isWild,
  playableCards,
  sortHand,
  winsNeeded,
  type CCColour,
  type CCEvent,
  type ColorClashState,
} from "@/lib/live/colorclash"
import { getErrorMessage } from "@/lib/errors"
import { playSound, useOnChange } from "@/lib/live/sound"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { actOnServer } from "@/services/live-server"
import { GameBackdrop } from "../game-backdrop"
import { PlayerAvatar } from "../player-avatar"
import { useStageFit } from "../use-stage-fit"
import { CC_PAINT, CCCardView } from "./cards"
import "./colorclash.css"

/** Warm brown felt over the whole screen. */
const FELT = "radial-gradient(120% 85% at 50% 38%, #a8703f 0%, #84522b 42%, #5a3418 78%, #3d220f 100%)"

/** Where opponents sit (degrees clockwise from the bottom, where you are), by how many there are. */
const SEAT_ANGLES: Record<number, number[]> = {
  1: [180],
  2: [122, 238],
  3: [98, 180, 262],
  4: [94, 148, 212, 266],
  5: [90, 132, 180, 228, 270],
}
const seatSpot = (deg: number) => {
  const a = (deg * Math.PI) / 180
  return {
    left: `clamp(42px, ${(50 - Math.sin(a) * 40).toFixed(2)}%, calc(100% - 42px))`,
    top: `clamp(50px, ${(48 + Math.cos(a) * 38).toFixed(2)}%, calc(100% - 50px))`,
  }
}

type Point = { x: number; y: number }
type Secret = { hand?: number[] | Record<string, number>; seq?: number }
type Action = { type: string } & Record<string, unknown>

const centreOf = (el: Element | null | undefined): Point | null => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
const listOf = (v: Secret["hand"]): number[] => (Array.isArray(v) ? v : v ? Object.values(v) : [])
const capital = (c: CCColour) => CC_PAINT[c].label

function friendly(reason: string) {
  if (reason === "stale") return "The table moved on — try again"
  return reason
}

/** One line about what just happened. */
function describe(events: CCEvent[] | undefined, nameOf: (id: string) => string): string {
  const out: string[] = []
  for (const e of events ?? []) {
    switch (e.t) {
      case "deal":
        out.push(`Round ${e.round} — ${cardName(e.card)} turned up`)
        break
      case "play":
        out.push(`${nameOf(e.by)} played ${cardName(e.card)}${e.colour ? ` → ${capital(e.colour)}` : ""}`)
        break
      case "draw":
        if (e.why === "draw") out.push(`${nameOf(e.by)} drew a card`)
        else if (e.why === "timeout") out.push(`${nameOf(e.by)} ran out of time${e.n > 1 ? ` (+${e.n})` : ""}`)
        else if (e.why !== "catch") out.push(`${nameOf(e.by)} draws ${e.n}`)
        break
      case "skip":
        out.push(`${nameOf(e.by)} is skipped`)
        break
      case "reverse":
        out.push("Reverse!")
        break
      case "choose":
        out.push(`${nameOf(e.by)} chose ${capital(e.colour)}`)
        break
      case "one":
        out.push(`${nameOf(e.by)}: “One!”`)
        break
      case "catch":
        out.push(`${nameOf(e.by)} caught ${nameOf(e.target)} — +2!`)
        break
      case "challenge":
        out.push(e.guilty ? `${nameOf(e.by)} challenged — ${nameOf(e.target)} was bluffing! +4` : `${nameOf(e.by)} challenged and lost — +6`)
        break
      case "reshuffle":
        out.push("Deck reshuffled")
        break
      case "roundWon":
        out.push(`${nameOf(e.by)} wins the round (+${e.points})`)
        break
      case "timeout":
        break
    }
  }
  return out.slice(0, 2).join(" · ")
}

/* ── Bits ─────────────────────────────────────────────────────────────── */

const RING_R = 24
const RING_C = 2 * Math.PI * RING_R

/** A player's photo in the turn-timer ring. */
function TimerAvatar({ player, share, turn, size = 52 }: { player: RoomPlayer | undefined; share: number | null; turn: boolean; size?: number }) {
  const colour = share === null ? "#ffffff" : share > 0.5 ? "#4ade80" : share > 0.2 ? "#facc15" : "#f87171"
  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }}>
      {turn && <span aria-hidden className="cc-glow absolute -inset-1.5 rounded-full bg-[radial-gradient(circle,rgb(255_230_120/0.7),transparent_70%)]" />}
      <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={RING_R} fill="#3a200d" stroke="rgb(255 255 255 / 0.2)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={RING_R}
          fill="none"
          stroke={turn ? colour : "rgb(255 255 255 / 0.55)"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={turn && share !== null ? RING_C * (1 - share) : 0}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 1s linear" }}
        />
      </svg>
      <PlayerAvatar player={player} size={size - 14} frame={false} className="absolute inset-[7px]" />
    </span>
  )
}

/** A face-down fan of `count` cards (a few drawn at most). */
function BackFan({ count, width = 16 }: { count: number; width?: number }) {
  const n = Math.min(count, 7)
  const mid = (n - 1) / 2
  return (
    <span className="relative block" style={{ width: width * 3, height: width * 1.5 + 4 }} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <CCCardView
          key={i}
          card={null}
          width={width}
          className="absolute bottom-0 left-1/2 origin-bottom drop-shadow-[0_1px_1px_rgb(0_0_0/0.4)]"
          style={{ transform: `translateX(-50%) translateX(${(i - mid) * width * 0.32}px) rotate(${(i - mid) * 9}deg)` }}
        />
      ))}
    </span>
  )
}

function WinPips({ wins, rounds }: { wins: number; rounds: number }) {
  if (rounds <= 1) return null
  return (
    <span className="flex gap-0.5" aria-label={`${wins} round${wins === 1 ? "" : "s"} won`}>
      {Array.from({ length: winsNeeded(rounds) }, (_, i) => (
        <span key={i} className={cn("size-1.5 rounded-full", i < wins ? "bg-amber-300 shadow-[0_0_4px_#fcd34d]" : "bg-white/25")} />
      ))}
    </span>
  )
}

/** An opponent around the table. */
function Seat({
  player,
  name,
  count,
  turn,
  share,
  called,
  exposed,
  wins,
  rounds,
  setEl,
  style,
}: {
  player: RoomPlayer | undefined
  name: string
  count: number
  turn: boolean
  share: number | null
  called: boolean
  exposed: boolean
  wins: number
  rounds: number
  setEl: (el: HTMLElement | null) => void
  style: React.CSSProperties
}) {
  const left = !!player?.left
  return (
    <div
      ref={setEl}
      className={cn("absolute flex w-[84px] -translate-x-1/2 -translate-y-1/2 flex-col items-center", left && "opacity-45 grayscale")}
      style={style}
    >
      <BackFan count={count} />
      <div className="relative -mt-2.5">
        <TimerAvatar player={player} share={share} turn={turn} size={46} />
        {called && (
          <span className="cc-pop absolute -top-2 -right-4 rotate-12 rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-black text-amber-950 shadow">ONE!</span>
        )}
        {exposed && <span className="cc-bounce absolute -top-1 -left-2 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs font-black shadow">!</span>}
      </div>
      <span
        className={cn(
          "mt-0.5 flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold shadow",
          turn ? "bg-amber-300 text-amber-950" : "bg-black/45 text-white"
        )}
      >
        <span className="truncate">{left ? "Left" : name}</span>
        <span className={cn("rounded-full px-1 text-[10px] tabular-nums", turn ? "bg-amber-950/15" : "bg-white/20")}>{count}</span>
      </span>
      <span className="mt-0.5 h-1.5">
        <WinPips wins={wins} rounds={rounds} />
      </span>
    </div>
  )
}

/** Direction of play: two curved arrows around the piles; mirrored when play reverses. */
function DirectionArrows({ direction }: { direction: 1 | -1 }) {
  const head = (x: number, y: number, rot: number) => <path d="M-6 -6 L4 0 L-6 6 Z" transform={`translate(${x} ${y}) rotate(${rot})`} fill="currentColor" />
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 size-[min(78vw,330px)] text-amber-100/35 transition-transform duration-500 ease-out"
      style={{ transform: `translate(-50%, -50%) scaleX(${direction})` }}
    >
      <svg viewBox="-100 -100 200 200" className="cc-arrows-spin size-full">
        {/* Clockwise on screen: down the left, over the top */}
        <path d="M -62 62 A 88 88 0 0 1 -62 -62" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        {head(-62, -62, 45)}
        <path d="M 62 -62 A 88 88 0 0 1 62 62" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        {head(62, 62, 225)}
      </svg>
    </div>
  )
}

type PileItem = { id: number; n: number; from?: Point; by?: string }

/** A card on the discard pile; flies in from where it was played (once, on mount). */
function PileCard({ item, width, locate }: { item: PileItem; width: number; locate: (by: string) => Point | null }) {
  const el = React.useRef<HTMLDivElement>(null)
  const rot = ((item.id * 47 + item.n * 13) % 25) - 12
  React.useLayoutEffect(() => {
    const node = el.current
    const src = item.from ?? (item.by ? locate(item.by) : null)
    const dst = centreOf(node)
    if (!node || !src || !dst) return
    const dx = src.x - dst.x
    const dy = src.y - dst.y
    node.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(${rot - 30}deg) scale(1.15)` },
        { transform: `rotate(${rot}deg) scale(1)` },
      ],
      { duration: 430, easing: "cubic-bezier(.2,.85,.25,1)" }
    )
  }, [item, locate, rot])
  return (
    <div ref={el} className="absolute inset-0" style={{ transform: `rotate(${rot}deg)` }}>
      <CCCardView card={item.id} width={width} />
    </div>
  )
}

type Flight = { key: string; to: string; delay: number }

/** A face-down card sliding from the draw pile to whoever drew it. */
function FlyingBack({
  flight,
  width,
  from,
  locate,
  origin,
  onDone,
}: {
  flight: Flight
  width: number
  from: () => Point | null
  locate: (by: string) => Point | null
  /** The stage's top-left on screen (the flight is placed inside it). */
  origin: () => Point
  onDone: (key: string) => void
}) {
  const el = React.useRef<HTMLDivElement>(null)
  React.useLayoutEffect(() => {
    const node = el.current
    const a = from()
    const b = locate(flight.to)
    if (!node || !a || !b) {
      onDone(flight.key)
      return
    }
    const o = origin()
    const w = width / 2 + o.x
    const h = (width * 1.5) / 2 + o.y
    const anim = node.animate(
      [
        { transform: `translate(${a.x - w}px, ${a.y - h}px) scale(1)`, opacity: 1 },
        { transform: `translate(${(a.x + b.x) / 2 - w}px, ${Math.min(a.y, b.y) - h - 30}px) scale(0.85) rotate(-12deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate(${b.x - w}px, ${b.y - h}px) scale(0.45) rotate(-20deg)`, opacity: 0 },
      ],
      { duration: 520, delay: flight.delay, easing: "ease-in-out", fill: "both" }
    )
    anim.onfinish = () => onDone(flight.key)
    return () => anim.cancel()
  }, [flight, width, from, locate, origin, onDone])
  return (
    <div ref={el} className="pointer-events-none absolute top-0 left-0 z-40 opacity-0">
      <CCCardView card={null} width={width} />
    </div>
  )
}

/** A card in your hand. New ones (not in `known`) slide in. */
function HandCard({
  id,
  width,
  style,
  known,
  index,
  playable,
  dim,
  fresh,
  onTap,
}: {
  id: number
  width: number
  style: React.CSSProperties
  known: React.RefObject<Set<number>>
  index: number
  playable: boolean
  dim: boolean
  fresh: boolean
  onTap: (id: number, el: HTMLElement) => void
}) {
  const el = React.useRef<HTMLButtonElement>(null)
  React.useLayoutEffect(() => {
    const node = el.current
    if (!node || known.current.has(id)) return
    node.firstElementChild?.animate(
      [
        { transform: "translateY(-90px) scale(0.6)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 380, delay: Math.min(index, 10) * 45, easing: "cubic-bezier(.2,.85,.3,1.15)", fill: "backwards" }
    )
  }, [id, index, known])
  return (
    <button
      ref={el}
      type="button"
      aria-label={cardName(id)}
      onClick={(e) => onTap(id, e.currentTarget)}
      className="absolute bottom-2.5 transition-[transform,filter] duration-200 ease-out"
      style={style}
    >
      <span className={cn("block rounded-[10px]", fresh && "shadow-[0_0_0_3px_#fde047,0_0_18px_4px_rgb(253_224_71/0.7)]")}>
        <CCCardView card={id} width={width} className={cn(dim && "brightness-[.55] saturate-[.7]", playable && "drop-shadow-[0_6px_10px_rgb(0_0_0/0.45)]")} />
      </span>
    </button>
  )
}

/** A bottom sheet over the table (no close: something must be picked). */
function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="gu fixed inset-0 z-[90] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="gu-scrim absolute inset-0 cursor-default" onClick={onClose} disabled={!onClose} />
      <div className="gu-pop relative mx-3 mb-[calc(1rem+env(safe-area-inset-bottom,0px))] w-full max-w-sm">
        <GamePanel title={title} onClose={onClose}>
          {children}
        </GamePanel>
      </div>
    </div>
  )
}

function ColourPicker({ onPick, hand }: { onPick: (c: CCColour) => void; hand: number[] }) {
  const held = (c: CCColour) => hand.filter((id) => cardOf(id).colour === c).length
  return (
    <div className="grid grid-cols-2 gap-3">
      {CC_COLOURS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="flex h-20 flex-col items-center justify-center rounded-2xl text-lg font-black text-white shadow-[inset_0_-5px_0_rgb(0_0_0/0.25),0_4px_0_rgb(0_0_0/0.2)] transition-transform active:translate-y-0.5 active:scale-95"
          style={{ background: `linear-gradient(${CC_PAINT[c].light}, ${CC_PAINT[c].face} 55%)`, textShadow: `0 2px 0 ${CC_PAINT[c].deep}` }}
        >
          {CC_PAINT[c].label}
          <span className="text-xs font-bold opacity-90">{held(c)} in hand</span>
        </button>
      ))}
    </div>
  )
}

/* ── The table ────────────────────────────────────────────────────────── */

/**
 * Color Clash for 2–6. The server runs every move (lib/live/colorclash via
 * app/api/live/act); this screen reads the public table and your own hand,
 * animates what changed, and sends taps. A tap shows at once and snaps back if
 * the server says no. The referee's device nudges the clock (`tick`) when a
 * turn runs out or a round break is over.
 */
export function ColorClashGame({ code, players, uid, me, isReferee, now }: LiveGameProps) {
  const { data: state } = useRoomNode<ColorClashState>(code, "state")
  const { data: secret } = useRoomNode<Secret>(code, `secret/${uid}`)
  const stageFit = useStageFit()
  const stageEl = React.useRef<HTMLDivElement | null>(null)
  const stageRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      stageEl.current = el
      return stageFit(el)
    },
    [stageFit]
  )
  const stageOrigin = React.useCallback((): Point => {
    const r = stageEl.current?.getBoundingClientRect()
    return { x: r?.left ?? 0, y: r?.top ?? 0 }
  }, [])

  const byId = React.useMemo(() => Object.fromEntries(players.map((p) => [p.uid, p])), [players])
  const nameOf = React.useCallback((id: string) => (id === uid ? "You" : (byId[id]?.name ?? "Someone").split(" ")[0]), [byId, uid])
  const rawHand = secret?.hand
  const hand = React.useMemo(() => listOf(rawHand), [rawHand])

  /* Elements things fly between */
  const seatEls = React.useRef<Record<string, HTMLElement | null>>({})
  const pileEl = React.useRef<HTMLButtonElement>(null)
  const handEl = React.useRef<HTMLDivElement | null>(null)
  const locate = React.useCallback((by: string) => (by === "pile" ? centreOf(pileEl.current) : by === uid && handEl.current ? centreOf(handEl.current) : centreOf(seatEls.current[by])), [uid])
  const pileCentre = React.useCallback(() => centreOf(pileEl.current), [])

  /* Your hand's width (cards size to it) */
  const [box, setBox] = React.useState({ w: 360, h: 700 })
  const measureHand = React.useCallback((el: HTMLDivElement | null) => {
    handEl.current = el
    if (!el) return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: window.innerHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* A play shown before the server answers; dropped once the table moves on (or the server says no) */
  const [pending, setPending] = React.useState<{ card: number; seq: number; from: Point | null } | null>(null)
  const livePending = pending && state && state.seq === pending.seq ? pending : null
  const [busySeq, setBusySeq] = React.useState<number | null>(null)
  const busy = !!state && busySeq === state.seq
  const [wildFor, setWildFor] = React.useState<{ card: number; from: Point | null } | null>(null)
  // Cards already shown in the hand (new ones slide in)
  const known = React.useRef<Set<number>>(new Set())

  /* The discard pile: the last few tops, each flying in from whoever played it */
  const displayTop = livePending?.card ?? state?.top
  const pileKey = state ? `${state.round}:${displayTop}` : ""
  const [pileFor, setPileFor] = React.useState("")
  const [pile, setPile] = React.useState<(PileItem & { round: number })[]>([])
  if (state && displayTop !== undefined && pileKey !== pileFor) {
    setPileFor(pileKey)
    const round = state.round
    setPile((prev) => {
      const last = prev[prev.length - 1]
      if (!last || last.round !== round) return [{ id: displayTop, n: (last?.n ?? 0) + 1, round, by: last ? "pile" : undefined }]
      // A refused play snaps back off the pile
      if (prev.length >= 2 && prev[prev.length - 2].id === displayTop) return prev.slice(0, -1)
      if (last.id === displayTop) return prev
      const from = livePending?.card === displayTop ? (livePending.from ?? undefined) : undefined
      const playedBy = (state.last ?? []).find((e): e is Extract<CCEvent, { t: "play" }> => e.t === "play" && e.card === displayTop)?.by
      return [...prev.slice(-3), { id: displayTop, n: last.n + 1, round, from, by: from ? undefined : (playedBy ?? "pile") }]
    })
  }

  /* Cards sliding off the draw pile to whoever drew */
  const [flights, setFlights] = React.useState<Flight[]>([])
  const [flightSeq, setFlightSeq] = React.useState(0)
  if (state && state.seq !== flightSeq) {
    setFlightSeq(state.seq)
    if (flightSeq !== 0) {
      const add = (state.last ?? []).flatMap((e) =>
        e.t === "draw" ? Array.from({ length: Math.min(e.n, 4) }, (_, i) => ({ key: `${state.seq}-${e.by}-${i}`, to: e.by, delay: i * 90 })) : []
      )
      if (add.length) setFlights((f) => [...f, ...add])
    }
  }
  const landed = React.useCallback((key: string) => setFlights((f) => f.filter((x) => x.key !== key)), [])

  // Remember what the hand showed (after the new cards have animated in)
  React.useEffect(() => {
    known.current = new Set(hand)
  }, [hand])

  /* Sounds */
  useOnChange(state?.seq ?? 0, () => {
    if (!state) return
    const ev = state.last ?? []
    const has = (t: CCEvent["t"]) => ev.some((e) => e.t === t)
    const won = ev.find((e): e is Extract<CCEvent, { t: "roundWon" }> => e.t === "roundWon")
    const caught = ev.find((e): e is Extract<CCEvent, { t: "catch" }> => e.t === "catch")
    if (won) playSound(won.by === uid ? "win" : "lose")
    else if (caught) playSound(caught.target === uid ? "captured" : "capture")
    else if (has("one")) playSound("power")
    else if (state.turn === uid && state.phase !== "roundOver" && ev.some((e) => e.t !== "one" && e.t !== "catch")) playSound("your_turn")
    else if (ev.some((e) => e.t === "play" && e.by !== uid)) playSound("place")
    else if (has("draw")) playSound("move")
  })

  /* The referee moves the clock along */
  const ticked = React.useRef({ seq: -1, at: 0 })
  React.useEffect(() => {
    if (!isReferee || !state || state.phase === "over") return
    const active = state.order.filter((id) => !byId[id]?.left)
    const turnGone = !!state.turn && !!byId[state.turn]?.left
    const due = state.phase === "roundOver" ? now - state.turnAt >= CC_ROUND_BREAK_MS + 300 : now - state.turnAt >= CC_TURN_MS + 800
    if (!turnGone && active.length >= 2 && !due) return
    if (ticked.current.seq === state.seq && now - ticked.current.at < 4000) return
    ticked.current = { seq: state.seq, at: now }
    void actOnServer(code, { type: "tick" }).catch(() => undefined)
  }, [now, state, isReferee, byId, code])

  if (state === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6 text-white" />
      </div>
    )
  }
  if (!state || !state.order) {
    return <div className="py-16 text-center text-sm font-semibold text-white">Shuffling the deck…</div>
  }

  /* ── Derived ──────────────────────────────────────────────────────── */

  const seated = state.order.includes(uid) && !me.left
  const viewpoint = state.order.includes(uid) ? uid : state.order[0]
  const vi = state.order.indexOf(viewpoint)
  const others = [...state.order.slice(vi + 1), ...state.order.slice(0, vi)]
  const angles = SEAT_ANGLES[others.length] ?? SEAT_ANGLES[5]
  const synced = secret?.seq === state.seq
  const myTurn = seated && state.turn === uid
  const playing = state.phase === "play" || state.phase === "choose" || state.phase === "challenge"
  const share = playing && state.turn ? Math.max(0, Math.min(1, 1 - (now - state.turnAt) / CC_TURN_MS)) : null
  const canAct = myTurn && synced && !busy && !livePending
  const playable = canAct && state.phase === "play" ? playableCards(state, hand) : new Set<number>()
  const drawnCard = myTurn && state.drew ? hand[hand.length - 1] : undefined
  // Until your hand catches up with the table, the card just played stays off it
  const shown = sortHand(hand).filter((id) => id !== livePending?.card && (synced || id !== state.top))
  const top = displayTop ?? state.top
  const colour = livePending && isWild(cardOf(livePending.card)) ? null : state.colour
  const choosing = state.phase === "choose"
  const called = !!state.one?.[uid]
  const myCount = hand.length
  const canCallOne =
    seated &&
    synced &&
    !called &&
    playing &&
    (myCount === 1 || (myCount === 2 && myTurn && state.phase === "play" && playable.size > 0))
  const catchTarget = seated && state.exposed && state.exposed !== uid && state.counts[state.exposed] === 1 ? state.exposed : null
  const wins = (id: string) => state.wins?.[id] ?? 0

  /* ── Moves ────────────────────────────────────────────────────────── */

  const send = async (action: Action, opts: { quiet?: boolean } = {}) => {
    const seq = state.seq
    setBusySeq(seq)
    try {
      await actOnServer(code, { ...action, seq })
      return true
    } catch (e) {
      if (!opts.quiet) toast.error(friendly(getErrorMessage(e, "That didn't go through")))
      return false
    } finally {
      setBusySeq((b) => (b === seq ? null : b))
    }
  }

  const playCard = async (card: number, from: Point | null, chosen?: CCColour) => {
    setPending({ card, seq: state.seq, from })
    playSound("place")
    const ok = await send({ type: "play", card, ...(chosen ? { colour: chosen } : {}) })
    if (!ok) {
      // Snap back: it slides into the hand again
      known.current.delete(card)
      setPending(null)
    }
  }

  const onTapCard = (card: number, el: HTMLElement) => {
    if (!playable.has(card)) {
      el.animate([{ transform: el.style.transform }, { transform: `${el.style.transform} translateX(-6px)` }, { transform: `${el.style.transform} translateX(6px)` }, { transform: el.style.transform }], { duration: 260 })
      if (myTurn && state.phase === "play" && synced) toast(state.drew ? "Play the card you drew, or pass" : "That card doesn't match — tap the deck to draw", { id: "cc-nomatch" })
      return
    }
    const from = centreOf(el)
    if (isWild(cardOf(card))) setWildFor({ card, from })
    else void playCard(card, from)
  }

  const canDraw = canAct && state.phase === "play" && !state.drew
  const mustDraw = canDraw && playable.size === 0

  /* ── Words ────────────────────────────────────────────────────────── */

  const turnName = nameOf(state.turn)
  let headline: string
  if (state.phase === "over") headline = "Game over"
  else if (state.phase === "roundOver") headline = state.summary ? `${nameOf(state.summary.winner)} ${state.summary.winner === uid ? "win" : "wins"} the round!` : "Round over"
  else if (me.left) headline = "You left the game"
  else if (!state.order.includes(uid)) headline = `Watching — ${turnName}'s turn`
  else if (myTurn && choosing) headline = "Choose the first colour"
  else if (myTurn && state.phase === "challenge") headline = "Wild +4 on you!"
  else if (myTurn && state.drew) headline = "Play the card you drew — or pass"
  else if (myTurn) headline = mustDraw ? "No match — tap the deck to draw" : "Your turn — play a matching card"
  else if (choosing) headline = `${turnName} is choosing a colour…`
  else if (state.phase === "challenge") headline = `${turnName} is deciding on the +4…`
  else headline = `${turnName}'s turn`
  const log = describe(state.last, nameOf)

  /* ── Hand layout ──────────────────────────────────────────────────── */

  const n = shown.length
  // Big hands get slightly smaller cards before they have to scroll
  const cardW = Math.round(Math.max(54, Math.min(92, box.w / 4.6, box.h / 7.4) * (1 - Math.min(0.15, Math.max(0, n - 7) * 0.03))))
  // Overlapping, gently fanned; past what fits, a straight row that scrolls
  const edge = 18
  const fit = n > 1 ? (box.w - 2 * edge - cardW) / (n - 1) : 0
  const step = n > 1 ? Math.max(cardW * 0.36, Math.min(cardW * 0.68, fit)) : 0
  const total = cardW + step * Math.max(0, n - 1)
  const scrolls = total > box.w - 2 * edge
  const offset = scrolls ? 10 : (box.w - total) / 2
  const fanDeg = scrolls ? 0 : Math.min(3, 18 / Math.max(1, n))
  const mid = (n - 1) / 2
  const pileW = Math.round(cardW * 0.86)

  const summary = state.summary
  const breakLeft = state.phase === "roundOver" ? Math.max(0, Math.ceil((CC_ROUND_BREAK_MS - (now - state.turnAt)) / 1000)) : 0

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative flex flex-col overflow-hidden text-white select-none",
        "max-md:fixed max-md:inset-x-0 max-md:top-(--stage-top) max-md:z-20 max-md:h-(--stage-h)",
        "md:h-[min(calc(var(--stage-h,100svh)_-_1rem),900px)] md:min-h-[520px]"
      )}
    >
      <GameBackdrop background={FELT} />

      {/* Round, colour in play, piles */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2 text-[11px] font-bold">
        <span className="rounded-full bg-black/35 px-2.5 py-1">
          {state.rounds > 1 ? `Round ${state.round} · Best of ${state.rounds}` : "Single round"}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-black/35 py-1 pr-2.5 pl-1.5">
          <span
            className="size-3.5 rounded-full ring-2 ring-white/80 transition-colors duration-300"
            style={{ background: choosing || !colour ? "conic-gradient(#ef3b3b 0 25%, #ffc21a 0 50%, #2fb24c 0 75%, #2a7cf0 0)" : CC_PAINT[colour].face }}
          />
          {choosing || !colour ? "Any colour" : CC_PAINT[colour].label}
        </span>
        <span className="rounded-full bg-black/35 px-2.5 py-1 tabular-nums">Deck {state.drawCount}</span>
      </div>

      {/* The table */}
      <div className="relative min-h-0 flex-1">
        <div aria-hidden className="absolute inset-x-[3%] inset-y-[5%] rounded-[50%] border-[10px] border-[#4a2812] bg-[radial-gradient(ellipse_at_50%_42%,#b27744_0%,#94592f_55%,#764421_100%)] shadow-[inset_0_0_40px_rgb(0_0_0/0.45),0_10px_30px_rgb(0_0_0/0.45),0_0_0_3px_#7b4a24]" />

        {others.map((id, i) => (
          <Seat
            key={id}
            player={byId[id]}
            name={nameOf(id)}
            count={state.counts[id] ?? 0}
            turn={playing && state.turn === id}
            share={state.turn === id ? share : null}
            called={!!state.one?.[id]}
            exposed={state.exposed === id}
            wins={wins(id)}
            rounds={state.rounds}
            setEl={(el) => {
              seatEls.current[id] = el
            }}
            style={seatSpot(angles[i] ?? 180)}
          />
        ))}

        {/* Centre: direction, the deck and the discard pile */}
        <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2">
          <DirectionArrows direction={state.direction} />
          <div className="relative flex items-center gap-5">
            <button
              ref={pileEl}
              type="button"
              aria-label={`Draw a card (${state.drawCount} left)`}
              disabled={!canDraw}
              onClick={() => void send({ type: "draw" })}
              className={cn("relative rounded-xl transition-transform enabled:active:scale-95", mustDraw && "cc-bounce")}
              style={{ width: pileW, height: pileW * 1.5 }}
            >
              {mustDraw && <span aria-hidden className="cc-glow absolute -inset-2 rounded-2xl bg-amber-200/50 blur-md" />}
              {[2, 1, 0].map((k) => (
                <CCCardView key={k} card={null} width={pileW} className="absolute top-0 left-0" style={{ transform: `translate(${k * -2}px, ${k * 2.5}px)` }} />
              ))}
              {canDraw && (
                <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black whitespace-nowrap text-amber-950 shadow">
                  DRAW
                </span>
              )}
            </button>

            <div className="relative" style={{ width: pileW, height: pileW * 1.5 }}>
              {colour && <span key={`${colour}-${state.round}`} aria-hidden className="cc-flash absolute -inset-6 rounded-full" style={{ background: `radial-gradient(circle, ${CC_PAINT[colour].face} 0%, transparent 70%)` }} />}
              <span
                aria-hidden
                className="absolute -inset-2 rounded-2xl transition-[box-shadow] duration-500"
                style={{
                  boxShadow: colour ? `0 0 0 3px ${CC_PAINT[colour].face}, 0 0 22px 4px ${CC_PAINT[colour].face}` : "0 0 0 3px rgb(255 255 255 / 0.6), 0 0 18px 2px rgb(255 255 255 / 0.4)",
                }}
              />
              {pile.map((item) => (
                <PileCard key={item.n} item={item} width={pileW} locate={locate} />
              ))}
              {pile.length === 0 && <CCCardView card={top} width={pileW} className="absolute inset-0" />}
            </div>
          </div>
        </div>

        {/* Catch someone who forgot */}
        {catchTarget && (
          <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2">
            <GameButton tone="red" className="cc-pop cc-bounce" disabled={busy} onClick={() => void send({ type: "catch", target: catchTarget })}>
              Catch {nameOf(catchTarget)}!
            </GameButton>
          </div>
        )}

        {/* Round over */}
        {state.phase === "roundOver" && summary && (
          <div className="gu absolute inset-x-3 top-1/2 z-20 mx-auto max-w-sm -translate-y-1/2">
            <div className="cc-pop">
              <GamePanel title={`Round ${state.round}`}>
                <p className="text-center text-lg font-black text-[var(--gu-ink)]">
                  {nameOf(summary.winner)} {summary.winner === uid ? "win" : "wins"}! <span className="text-emerald-600">+{summary.points}</span>
                </p>
                <ul className="mt-2 space-y-1.5">
                  {state.order.map((id) => (
                    <li key={id} className="flex items-center gap-2 text-sm font-semibold text-[var(--gu-ink)]">
                      <PlayerAvatar player={byId[id]} size={26} frame={false} />
                      <span className="min-w-0 flex-1 truncate">{nameOf(id)}</span>
                      <span className="flex -space-x-3">
                        {(summary.hands[id] ?? []).slice(0, 6).map((c) => (
                          <CCCardView key={c} card={c} width={18} />
                        ))}
                      </span>
                      <WinPips wins={wins(id)} rounds={state.rounds} />
                      <span className="w-10 text-right tabular-nums">{state.points?.[id] ?? 0}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--gu-ink-soft)]">Next round in {breakLeft}s</span>
                  {seated && (
                    <GameButton tone="green" size="sm" disabled={busy} onClick={() => void send({ type: "next" }, { quiet: true })}>
                      Deal now
                    </GameButton>
                  )}
                </div>
              </GamePanel>
            </div>
          </div>
        )}
      </div>

      {/* What happened, and whose turn */}
      <div className="px-3 text-center">
        <p className="truncate text-[11px] font-semibold text-amber-100/80" aria-live="polite">
          {log || " "}
        </p>
      </div>

      {/* You */}
      <div className="flex items-center gap-2 px-3 pt-1">
        <div
          ref={(el) => {
            if (!state.order.includes(uid)) seatEls.current[viewpoint] = el
          }}
          className="relative"
        >
          <TimerAvatar player={byId[viewpoint]} share={state.turn === viewpoint ? share : null} turn={playing && state.turn === viewpoint} size={44} />
          {state.one?.[viewpoint] && <span className="cc-pop absolute -top-2 -right-3 rotate-12 rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-black text-amber-950 shadow">ONE!</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-black tracking-wide text-amber-200">
            {state.order.includes(uid) ? "YOU" : nameOf(viewpoint).toUpperCase()}
            <span className="rounded-full bg-black/35 px-1.5 text-white tabular-nums">{state.counts[viewpoint] ?? 0}</span>
            <WinPips wins={wins(viewpoint)} rounds={state.rounds} />
          </p>
          <p className={cn("truncate text-sm leading-tight font-bold", myTurn && "text-amber-100")}>{headline}</p>
        </div>
        {canCallOne && (
          <GameButton tone="yellow" size="sm" className="cc-pop cc-bounce" disabled={busy} onClick={() => void send({ type: "one" })}>
            One!
          </GameButton>
        )}
        {myTurn && state.drew && state.phase === "play" && (
          <GameButton tone="cream" size="sm" disabled={!canAct} onClick={() => void send({ type: "pass" })}>
            Pass
          </GameButton>
        )}
      </div>

      {/* Your hand */}
      <div
        ref={measureHand}
        className="relative shrink-0 overflow-x-auto overflow-y-hidden pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] [scrollbar-width:none]"
        style={{ height: cardW * 1.5 + 34 }}
      >
        {state.order.includes(uid) ? (
          <div className="relative h-full" style={{ width: Math.max(box.w, total + 16) }}>
            {shown.map((id, i) => {
              const lift = playable.has(id)
              const rot = (i - mid) * fanDeg
              const y = (scrolls || mid === 0 ? 0 : ((i - mid) / mid) ** 2 * 8) - (lift ? 14 : 0)
              return (
                <HandCard
                  key={id}
                  id={id}
                  index={i}
                  width={cardW}
                  known={known}
                  playable={lift}
                  dim={myTurn && state.phase === "play" && synced && !lift}
                  fresh={id === drawnCard}
                  onTap={onTapCard}
                  style={{ left: offset + i * step, transform: `translateY(${y}px) rotate(${rot}deg)`, transformOrigin: "50% 100%", zIndex: i }}
                />
              )
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <BackFan count={state.counts[viewpoint] ?? 0} width={34} />
          </div>
        )}
      </div>

      {flights.map((f) => (
        <FlyingBack key={f.key} flight={f} width={pileW} from={pileCentre} locate={locate} origin={stageOrigin} onDone={landed} />
      ))}

      {/* A Wild: pick the colour */}
      {wildFor && (
        <Sheet title="Pick a colour" onClose={() => setWildFor(null)}>
          <ColourPicker
            hand={hand.filter((id) => id !== wildFor.card)}
            onPick={(c) => {
              const w = wildFor
              setWildFor(null)
              void playCard(w.card, w.from, c)
            }}
          />
        </Sheet>
      )}
      {myTurn && choosing && synced && (
        <Sheet title="First colour">
          <p className="mb-3 text-center text-sm font-semibold text-[var(--gu-ink-soft)]">A Wild was turned up — you pick the colour, then play.</p>
          <ColourPicker hand={hand} onPick={(c) => void send({ type: "choose", colour: c })} />
        </Sheet>
      )}
      {myTurn && state.phase === "challenge" && state.challenge && synced && (
        <Sheet title="Wild +4!">
          <p className="text-center text-sm font-semibold text-[var(--gu-ink)]">
            {nameOf(state.challenge.by)} played a Wild +4 on you.
          </p>
          <p className="mt-1 text-center text-xs font-medium text-[var(--gu-ink-soft)]">
            Think they had a <b style={{ color: CC_PAINT[state.challenge.colour].deep }}>{CC_PAINT[state.challenge.colour].label}</b> card? Challenge: if they did, they
            draw 4 and you play on. If not, you draw 6.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <GameButton tone="cream" disabled={busy} onClick={() => void send({ type: "accept" })}>
              Take 4
            </GameButton>
            <GameButton tone="red" disabled={busy} onClick={() => void send({ type: "challenge" })}>
              Challenge!
            </GameButton>
          </div>
        </Sheet>
      )}
    </div>
  )
}
