"use client"

import * as React from "react"
import { GameBackdrop, TABLE_CLASS } from "../game-backdrop"
import { serverTimestamp } from "firebase/database"
import { toast } from "sonner"

import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useRoomNode } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import {
  applyMove,
  applyRoll,
  describeLast,
  distinctMoves,
  HOME,
  homeCount,
  isGone,
  isOver,
  legalMoves,
  LUDO_AUTO_MOVE_MS,
  LUDO_IDLE_MS,
  LUDO_MAX_MISSED,
  ordinal,
  passTurn,
  resultOf,
  applyPower,
  applyExpiry,
  applySignature,
  heldPowers,
  isExpired,
  nextExpiry,
  HOME_COLUMN_START,
  isRival,
  isShielded,
  JUMP_BY,
  teamName,
  teamOf,
  winningTeam,
  pieceKey,
  POWER_INFO,
  rollFor,
  type PowerKind,
  type LudoColour,
  geoOf,
  PENTA_COLOURS,
  SQUARE_GEO,
  type LudoGeo,
  type SquareColour,
  type LudoPlayer,
  type LudoSkipReason,
  type LudoState,
} from "@/lib/live/ludo"
import { ABANDON_MS } from "@/lib/live/room"
import type { LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { stateTransaction } from "@/services/live-rooms"
import {
  colourAtCorner,
  LudoBoard,
  TOKEN_COLOURS,
  TURNS_FOR,
} from "./ludo-board"
import { LudoPentaBoard } from "./ludo-penta-board"
import { baseFrame, pentaTurnFor } from "@/lib/live/ludo-penta"
import { PlayerAvatar } from "../player-avatar"
import { ThrowOverlay, ThrowPicker } from "../throwables"
import { PowerTray } from "./power-tray"
import { characterById } from "@/components/game-avatar/registry"
import { useStageFit } from "../use-stage-fit"
import { useWallet } from "@/hooks/use-fun"
import { useBoardTheme, usePreloadImage } from "@/lib/live/themes"
import { LudoDice } from "./ludo-dice"
import { STEP_MS, useLudoAnimation } from "./use-ludo-animation"
import { playSound, useOnChange } from "@/lib/live/sound"

const NO_MOVES: number[] = []
const NO_TARGETS: string[] = []

/** A fair [0, 1) from the browser's CSPRNG, for the dice. */
const cryptoRand = () => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 4294967296
}
/**
 * Height a phone keeps for everything but the (square) board: the two rows of
 * seats, the status line, and the table's padding. The board gets the rest.
 */
const BOARD_RESERVE_PX = 226
/**
 * The same on big screens, out of the measured stage height (the window less
 * the header and dock): also the page's top padding, the hint line and the
 * page's room under the dock.
 */
const BOARD_RESERVE_DESK_PX = 300
/**
 * Sideways (short, wide screens: landscape tablets, laptops, phones on their
 * side) the seats sit left and right of the board, so only the status line and
 * paddings take height…
 */
const BOARD_RESERVE_WIDE_PX = 100
const BOARD_RESERVE_WIDE_DESK_PX = 170
/** …and the two seat columns (9rem each), gaps and paddings take width. */
const BOARD_SIDE_PX = 340
/** Big screens: Tailwind's `md` (48rem). */
const DESK_QUERY = "(min-width: 48rem)"

/** Sideways when that gives a clearly bigger board than seats above and below. */
function wideTable(width: number, height: number) {
  const desk = window.matchMedia(DESK_QUERY).matches
  const tall = Math.min(width - (desk ? 24 : 32), height - (desk ? BOARD_RESERVE_DESK_PX : BOARD_RESERVE_PX))
  const side = Math.min(width - BOARD_SIDE_PX, height - (desk ? BOARD_RESERVE_WIDE_DESK_PX : BOARD_RESERVE_WIDE_PX))
  return side > tall + 24
}
/** Let the last token walk into home before the results screen takes over. */
const END_DELAY_MS = 1200

const ts = () => serverTimestamp() as unknown as number

/**
 * The engine fills `turnAt` / `dice.at` with a local guess; the server's clock
 * goes in the database. A step that leaves `turnAt` alone (powers fizzling out
 * mid-turn) keeps the turn's clock running as it was.
 */
function stamp(next: LudoState, prev: LudoState): LudoState {
  const out: LudoState = { ...next, turnAt: next.turnAt === prev.turnAt ? prev.turnAt : ts() }
  if (out.dice && out.dice !== prev.dice) out.dice = { ...out.dice, at: ts() }
  return out
}

/**
 * Still the state `at` was read from — or just one step on, where all that
 * happened is someone's power fizzling out (that mustn't eat a tap on the dice).
 */
const isCurrent = (s: LudoState, at: number) =>
  s.seq === at || (s.seq === at + 1 && s.last?.type === "expired")

/** Why the referee should pass this player's turn right now, if at all. */
function skipReason(
  player: RoomPlayer,
  since: number,
  now: number
): LudoSkipReason | null {
  if (player.left) return "left"
  if (!player.online && now - player.lastSeen >= ABANDON_MS) return "offline"
  if (since > 0 && now - since >= LUDO_IDLE_MS)
    return player.online ? "idle" : "offline"
  return null
}

/** The one token a roll can play, when there's no real choice (tokens on the same square count as one). */
function singleMove(state: LudoState, uid: string): number {
  if (state.phase !== "move" || !state.dice) return -1
  const options = distinctMoves(state, uid, state.dice.value)
  return options.length === 1 ? options[0] : -1
}

const isRollEvent = (state: LudoState) =>
  state.last?.type === "roll" ||
  state.last?.type === "no_move" ||
  state.last?.type === "three_sixes"

function moveLabel(pos: number, dice: number) {
  if (pos < 0) return "Out of base"
  if (pos + dice === HOME) return "Into home"
  return `${pos + 1} → ${pos + dice + 1}`
}

/**
 * Ludo for 2–4 players. The current player's device rolls and moves (the
 * rules require the roller to write the dice); the referee passes the turn
 * of anyone idle, offline or gone, and declares the end. Every change is a
 * transaction on the whole state, so racing devices can't disagree.
 */
export function LudoGame({
  code,
  meta,
  players,
  uid,
  me,
  isReferee,
  now,
  serverNow,
  endGame,
}: LiveGameProps) {
  const { data: state } = useRoomNode<LudoState>(code, "state")
  const gone = React.useMemo(
    () => players.filter((p) => p.left).map((p) => p.uid),
    [players]
  )
  const byId = React.useMemo(
    () => Object.fromEntries(players.map((p) => [p.uid, p])),
    [players]
  )
  const nameOf = React.useCallback(
    (id: string) => (byId[id]?.name ?? "Someone").split(" ")[0],
    [byId]
  )
  const anim = useLudoAnimation(state)

  // Sounds for what just happened (the step taps come from the pieces as they hop)
  useOnChange(state?.seq ?? -1, (_, prevSeq) => {
    const last = state?.last
    if (!state || !last) return
    // Power Ludo: your power-up ran out of time (not on first load — that's old news)
    const lost = last.expired?.filter((l) => l.uid === uid) ?? []
    if (lost.length && prevSeq >= 0)
      toast(`Your ${lost.map((l) => POWER_INFO[l.kind].name).join(" and ")} fizzled out`, {
        description: "Power-ups last 2 minutes — use them on your turn, before you roll",
      })
    // Only powers fizzled out: nothing else happened
    if (last.type === "expired") return
    if (last.type === "roll" || last.type === "no_move") {
      playSound("dice")
      if (last.value === 6) window.setTimeout(() => playSound("six"), 650)
    } else if (last.type === "three_sixes") {
      playSound("dice")
    } else if (last.type === "power") {
      playSound("power")
    } else if (last.type === "move") {
      if ((last.picked || last.earned) && last.by === uid)
        window.setTimeout(
          () => playSound("power"),
          (last.from < 0 ? 1 : last.to - last.from) * STEP_MS
        )
      // After the piece has walked there
      const walk = (last.from < 0 ? 1 : last.to - last.from) * STEP_MS
      if (last.captured?.length) {
        const mine = last.captured.some((c) => c.uid === uid)
        window.setTimeout(() => playSound(mine ? "captured" : "capture"), walk)
      } else if (last.home) window.setTimeout(() => playSound("home"), walk)
    }
    if (
      state.phase === "roll" &&
      state.turn === uid &&
      last.by !== uid &&
      !me.left
    )
      window.setTimeout(() => playSound("your_turn"), 900)
  })

  /* ── Writes ──────────────────────────────────────────────────────── */

  // Callers check `seq` inside `fn` and throw when the state moved on, so a
  // duplicate (double tap, two referees, a retry) simply aborts.
  const commit = React.useCallback(
    async (
      fn: (s: LudoState) => LudoState,
      quiet = false
    ): Promise<boolean> => {
      try {
        const res = await stateTransaction<LudoState>(code, (current) => {
          if (!current) return undefined
          try {
            return stamp(fn(current), current)
          } catch {
            // Stale: the game moved on under us (someone else's write landed first)
            return undefined
          }
        })
        return res.committed
      } catch (e) {
        if (!quiet) toast.error(getErrorMessage(e, "Couldn't update the game"))
        return false
      }
    },
    [code]
  )

  const myTurn =
    !!state && state.phase !== "over" && state.turn === uid && !me.left
  const seq = state?.seq ?? -1
  const diceValue = state?.dice?.value ?? null
  const movable = React.useMemo(
    () =>
      state && myTurn && state.phase === "move" && state.dice
        ? legalMoves(state, uid, state.dice.value)
        : NO_MOVES,
    [state, myTurn, uid]
  )
  const autoToken = state && myTurn ? singleMove(state, uid) : -1

  const [rollLock, setRollLock] = React.useState(-1)
  const roll = () => {
    if (!state || !myTurn || state.phase !== "roll") return
    // Fair at heart, with Ludo King style drama (see rollFor in lib/live/ludo)
    const value = rollFor(state, uid, cryptoRand)
    const at = state.seq
    setRollLock(at)
    void commit((s) => {
      if (!isCurrent(s, at)) throw new Error("stale")
      return applyRoll(s, uid, value, {
        now: serverNow(),
        gone,
        rand: Math.random,
      })
    }).then((ok) => {
      if (!ok) setRollLock(-1)
    })
  }

  const move = React.useCallback(
    (token: number, expectSeq: number, value: number) =>
      commit((s) => {
        if (!isCurrent(s, expectSeq)) throw new Error("stale")
        return applyMove(s, uid, token, value, {
          now: serverNow(),
          gone,
          rand: Math.random,
        })
      }),
    [commit, uid, serverNow, gone]
  )
  const onToken = (token: number) => {
    if (!state?.dice || !movable.includes(token)) return
    void move(token, state.seq, state.dice.value)
  }

  /* ── Power Ludo ──────────────────────────────────────────────────── */

  // The power you're aiming (waiting for you to tap a piece); `sig` = your character's own
  const [aimingAt, setAiming] = React.useState<{
    kind: PowerKind
    sig: boolean
    seq: number
  } | null>(null)
  const canUsePower =
    !!state && myTurn && state.phase === "roll" && rollLock !== state.seq
  // Aiming lasts only while it's still your turn to roll, in the same state
  const aimed =
    aimingAt && canUsePower && state && aimingAt.seq === state.seq
      ? aimingAt
      : null
  const aiming = aimed?.kind ?? null
  const firePower = (
    kind: PowerKind,
    sig: boolean,
    target: { uid: string; token: number } | null
  ) => {
    if (!state || !canUsePower) return
    const at = state.seq
    setAiming(null)
    void commit((s) => {
      if (s.seq !== at) throw new Error("stale")
      const ctx = { now: serverNow(), gone, rand: Math.random }
      return sig
        ? applySignature(s, uid, target, ctx)
        : applyPower(s, uid, kind, target, ctx)
    })
  }
  const pickPower = (kind: PowerKind, sig: boolean) => {
    if (!canUsePower || !state) {
      toast("Use a power on your turn, before you roll")
      return
    }
    const p = state.players[uid]
    if (sig && p?.signature?.used) return
    if (!sig && heldPowers(p).every((h) => h.kind !== kind || isExpired(h, now))) {
      toast(`Your ${POWER_INFO[kind].name} fizzled out`)
      return
    }
    if (POWER_INFO[kind].target === "none") firePower(kind, sig, null)
    else
      setAiming(
        aimed && aimed.kind === kind && aimed.sig === sig
          ? null
          : { kind, sig, seq: state.seq }
      )
  }
  // Pieces the aimed power can hit: rivals' pieces out on the track (not shielded), or your own
  const targets = React.useMemo(() => {
    if (!aiming || !state) return NO_TARGETS
    const own = POWER_INFO[aiming].target === "own"
    const out: string[] = []
    for (const id of state.order) {
      const p = state.players[id]
      // Rival powers never hit your partner (teams)
      if (!p || (own ? id !== uid : !isRival(state, uid, id) || isGone(state, id, gone)))
        continue
      p.tokens.forEach((pos, t) => {
        if (pos < 0 || pos >= HOME_COLUMN_START) return
        if (!own && isShielded(state, id, t)) return
        if (aiming === "jump" && pos + JUMP_BY >= HOME_COLUMN_START) return
        out.push(pieceKey(id, t))
      })
    }
    return out
  }, [aiming, state, uid, gone])

  // Power Ludo: the referee drops power-ups the moment they run out of time
  const expiresAt = state ? nextExpiry(state) : null
  React.useEffect(() => {
    if (!isReferee || !state || state.phase === "over" || expiresAt === null || now < expiresAt)
      return
    const at = state.seq
    void commit((s) => {
      if (s.seq !== at) throw new Error("stale")
      return applyExpiry(s, { now: serverNow(), gone })
    }, true)
  }, [isReferee, state, expiresAt, now, gone, commit, serverNow])

  // Ludo King style: a roll with only one possible move plays itself after a beat
  React.useEffect(() => {
    if (autoToken < 0 || diceValue === null) return
    const id = window.setTimeout(
      () => void move(autoToken, seq, diceValue),
      LUDO_AUTO_MOVE_MS
    )
    return () => window.clearTimeout(id)
  }, [autoToken, seq, diceValue, move])

  /* ── Referee ─────────────────────────────────────────────────────── */

  // Pass the turn of a player who left, dropped offline, or sat on their decision too long
  React.useEffect(() => {
    if (!isReferee || !state || state.phase === "over" || isOver(state, gone))
      return
    const current = byId[state.turn]
    if (!current) return
    const reason = skipReason(current, state.turnAt || meta.startedAt || 0, now)
    if (!reason) return
    const { turn, seq: at } = state
    void commit((s) => {
      if (s.seq !== at) throw new Error("stale")
      return passTurn(s, turn, reason, {
        now: serverNow(),
        gone,
        rand: Math.random,
      })
    }, true)
  }, [isReferee, state, byId, now, gone, meta.startedAt, commit, serverNow])

  // Declare the end: the engine marked it over, or everyone else has left
  const ended = React.useRef(false)
  React.useEffect(() => {
    if (!state || ended.current) return
    const over =
      state.phase === "over" || (gone.length > 0 && isOver(state, gone))
    if (!over || !(isReferee || state.turn === uid)) return
    const id = window.setTimeout(() => {
      ended.current = true
      endGame(resultOf(state, gone)).catch(() => {
        ended.current = false
      })
    }, END_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [state, gone, isReferee, uid, endGame])

  /* ── Dice faces ──────────────────────────────────────────────────── */

  // The face each player's dice rests on: their last roll (never blank)
  const rollEvent =
    state && state.last && isRollEvent(state)
      ? {
          by: state.last.by,
          // The face actually thrown (a doubled roll shows its single dice)
          value:
            state.last.type === "roll" || state.last.type === "no_move"
              ? state.last.x2
                ? state.last.value / 2
                : state.last.value
              : 6,
        }
      : null
  const [faces, setFaces] = React.useState<Record<string, number>>({})
  if (rollEvent && faces[rollEvent.by] !== rollEvent.value) {
    setFaces((f) => ({ ...f, [rollEvent.by]: rollEvent.value }))
  }

  const [throwAt, setThrowAt] = React.useState<RoomPlayer | null>(null)
  // Phones: fit the table to the screen (see the root below)
  const stageRef = useStageFit(wideTable)
  // The board theme this device plays on (bought ones from the wallet)
  const wallet = useWallet()
  const theme = useBoardTheme("ludo", wallet?.themes)
  const look = theme.look
  // Fetch and decode the board picture while the game state is still loading
  usePreloadImage(look.image?.src)

  /* ── Render ──────────────────────────────────────────────────────── */

  if (state === undefined) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    )
  }
  if (!state) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Setting up the board…
        </CardContent>
      </Card>
    )
  }

  const mine = state.players[uid]
  // 5 players play on the pentagon board; otherwise the classic square
  const penta = state.board === "penta"
  const geo = geoOf(state)
  // Your colour sits at the bottom-left, in front of you, with your dice;
  // everyone else is at their own corner of the turned board
  const turns = !penta && mine ? TURNS_FOR[mine.colour as SquareColour] : 0
  const at = (corner: number) => colourAtCorner(corner, turns)
  const pentaTurn = penta ? pentaTurnFor(mine?.colour ?? "red") : 0
  // Seats in two rows, each player by their base: the square has 2 + 2;
  // the pentagon 3 on top (left, middle, right) and 2 below
  let topRow: LudoColour[]
  let bottomRow: LudoColour[]
  if (penta) {
    const placed = PENTA_COLOURS.map((c) => {
      const a = ((baseFrame(c).angle + pentaTurn) * Math.PI) / 180
      return { c, x: Math.cos(a), below: Math.sin(a) > 0 }
    })
    topRow = placed
      .filter((p) => !p.below)
      .sort((a, b) => a.x - b.x)
      .map((p) => p.c)
    bottomRow = placed
      .filter((p) => p.below)
      .sort((a, b) => a.x - b.x)
      .map((p) => p.c)
  } else {
    topRow = [at(0), at(1)]
    bottomRow = [at(3), at(2)]
  }
  const rowCols = (n: number) => (n === 3 ? "grid-cols-3" : "grid-cols-2")
  const alignOf = (i: number, n: number): "left" | "right" =>
    i === n - 1 && n > 1 ? "right" : "left"
  const current = byId[state.turn]
  const currentName = nameOf(state.turn)
  const since = state.turnAt || meta.startedAt || 0
  const countdown =
    state.phase === "over" || !since
      ? null
      : Math.max(0, Math.min(1, 1 - (now - since) / LUDO_IDLE_MS))
  const byColour = Object.fromEntries(
    state.order.map((id) => [state.players[id].colour, id])
  ) as Partial<Record<LudoColour, string>>
  // Pieces of players who left or are out leave the board
  const offBoard = state.order.filter((id) => isGone(state, id, gone))
  // Tokens the roller can choose between (tokens on the same square count once)
  const options =
    myTurn && state.phase === "move" && diceValue !== null
      ? distinctMoves(state, uid, diceValue)
      : NO_MOVES
  const bonus =
    state.last?.type === "move" && state.last.bonus && state.last.by === uid

  // Teams: which side you're on, and how the other pair is doing
  const myTeam = mine ? teamOf(state, uid) : undefined
  const won = winningTeam(state, gone)
  let headline: string
  let caption: string | null = null
  if (state.phase === "over") {
    headline = won !== null ? `${teamName(won)} wins!` : "Game over"
  } else if (mine?.out) {
    headline = "You're out"
    caption = `You missed ${LUDO_MAX_MISSED} turns in a row`
  } else if (me.left) {
    headline = "You left the game"
    caption = "Watching how it ends"
  } else if (mine && mine.place > 0) {
    headline = state.teams ? "All four home!" : `You finished ${ordinal(mine.place)}!`
    caption = state.teams ? "Cheer on your partner…" : "Waiting for the others to get home…"
  } else if (myTurn && state.phase === "roll") {
    headline = myTeam !== undefined ? `Your turn (${teamName(myTeam)}) — tap your dice` : "Your turn — tap your dice"
    caption = bonus
      ? state.last?.type === "move" && state.last.value === 6
        ? "You rolled a 6 — roll again"
        : "Bonus roll — go again"
      : mine?.missed
        ? `Missed ${mine.missed} of ${LUDO_MAX_MISSED} — miss ${LUDO_MAX_MISSED} in a row and you're out`
        : null
  } else if (myTurn) {
    headline = `You rolled a ${diceValue}`
    caption = options.length > 1 ? "Tap a piece to move it" : "Moving…"
  } else if (state.phase === "roll") {
    headline = `${currentName} is rolling…`
    caption =
      current && !current.online
        ? "They're offline — their turn is skipped shortly"
        : null
  } else {
    headline = `${currentName} rolled a ${diceValue}`
    caption = "Choosing a piece…"
  }

  const seat = (
    colour: LudoColour,
    align: "left" | "right",
    compact = false,
    className?: string
  ) => {
    const id = byColour[colour]
    const lp = id ? state.players[id] : undefined
    const rp = id ? byId[id] : undefined
    if (!id || !lp || !rp) return <div key={colour} aria-hidden className={className} />
    const isTurn = state.phase !== "over" && state.turn === id
    const canRoll =
      isTurn && id === uid && state.phase === "roll" && rollLock !== state.seq
    const rolledLast = rollEvent?.by === id
    const showDice = isTurn || rolledLast
    // Ludo King style: the dice sits next to whoever's turn it is; on yours it glows — tap it to roll.
    // Always the same element, so the tumble you start with your tap keeps playing until it lands.
    const dice = !showDice ? null : (
      <LudoDice
        value={faces[id] ?? null}
        spin={rolledLast ? state.seq : null}
        rolling={id === uid && rollLock === state.seq}
        size={32}
        dim={!isTurn}
        onRoll={canRoll ? roll : undefined}
        glow={canRoll ? look.palette[colour].mid : undefined}
      />
    )
    return (
      <Seat
        key={colour}
        player={rp}
        ludo={lp}
        isTurn={isTurn}
        isMe={id === uid}
        countdown={isTurn ? countdown : null}
        align={align}
        dice={dice}
        tint={look.palette[colour].mid}
        team={lp.team !== undefined && state.teams ? (lp.team === 0 ? "A" : "B") : undefined}
        partner={myTeam !== undefined && id !== uid && lp.team === myTeam}
        compact={compact}
        geo={geo}
        onTap={id !== uid && !me.left ? () => setThrowAt(rp) : undefined}
        className={className}
      />
    )
  }
  // Sideways (square board only): each seat in its corner, left and right of the board
  const sideCell = (row: "top" | "bottom", i: number) =>
    penta
      ? undefined
      : row === "top"
        ? i === 0
          ? "group-data-[stage-wide]/stage:col-start-1 group-data-[stage-wide]/stage:row-start-1 group-data-[stage-wide]/stage:self-start"
          : "group-data-[stage-wide]/stage:col-start-3 group-data-[stage-wide]/stage:row-start-1 group-data-[stage-wide]/stage:self-start"
        : i === 0
          ? "group-data-[stage-wide]/stage:col-start-1 group-data-[stage-wide]/stage:row-start-2 group-data-[stage-wide]/stage:self-end"
          : "group-data-[stage-wide]/stage:col-start-3 group-data-[stage-wide]/stage:row-start-2 group-data-[stage-wide]/stage:self-end"

  return (
    <div
      ref={stageRef}
      style={
        {
          // Power Ludo has a row of powers in the status box too
          "--board-reserve": `${BOARD_RESERVE_PX + (state.mode === "powers" ? 40 : 0)}px`,
          "--board-reserve-desk": `${BOARD_RESERVE_DESK_PX + (state.mode === "powers" ? 40 : 0)}px`,
          "--board-reserve-wide": `${BOARD_RESERVE_WIDE_PX + (state.mode === "powers" ? 40 : 0)}px`,
          "--board-reserve-wide-desk": `${BOARD_RESERVE_WIDE_DESK_PX + (state.mode === "powers" ? 40 : 0)}px`,
          "--board-side": `${BOARD_SIDE_PX}px`,
        } as React.CSSProperties
      }
      className={cn(
        "group/stage flex flex-col gap-2.5",
        // Phones: the whole table fits between the header and the dock — no scrolling;
        // the board takes whatever height the seats and the status line leave
        "max-md:fixed max-md:inset-x-0 max-md:top-(--stage-top) max-md:z-20 max-md:h-(--stage-h) max-md:justify-center max-md:overflow-hidden max-md:p-2",
        "max-md:[--board-w:min(100%,calc(var(--stage-h)_-_var(--board-reserve)))]",
        // Big screens: the board grows with the column and the measured height between the
        // header and the dock (tablets, desktops), so the game page never scrolls
        "md:[--board-w:min(100%,calc(var(--stage-h,100svh)_-_var(--board-reserve-desk)))]",
        // Short, wide screens (square board): seats left and right, the board takes the height
        !penta &&
          "max-md:data-[stage-wide]:[--board-w:max(120px,min(calc(var(--stage-w)_-_var(--board-side)),calc(var(--stage-h)_-_var(--board-reserve-wide))))]",
        !penta &&
          "md:data-[stage-wide]:[--board-w:max(120px,min(calc(var(--stage-w)_-_var(--board-side)),calc(var(--stage-h)_-_var(--board-reserve-wide-desk))))]"
      )}
    >
      {/* The table's colours fill the screen; players in their corners around the board, Ludo King style */}
      <GameBackdrop background={look.table} />
      <div
        className={cn(
          TABLE_CLASS,
          !penta &&
            "group-data-[stage-wide]/stage:grid group-data-[stage-wide]/stage:grid-cols-[minmax(0,1fr)_var(--board-w)_minmax(0,1fr)] group-data-[stage-wide]/stage:gap-x-2"
        )}
      >
        <div className={cn("grid gap-2 px-1 pb-2", rowCols(topRow.length), !penta && "group-data-[stage-wide]/stage:contents")}>
          {topRow.map((c, i) =>
            seat(c, alignOf(i, topRow.length), topRow.length > 2, sideCell("top", i))
          )}
        </div>
        {/* --board-w: the column, or less if the height runs out */}
        <div className="mx-auto w-(--board-w) max-w-full rounded-xl bg-white/15 p-1 shadow-[0_12px_30px_rgb(0_0_0/0.4)] group-data-[stage-wide]/stage:col-start-2 group-data-[stage-wide]/stage:row-span-2 group-data-[stage-wide]/stage:row-start-1">
          {penta ? (
            <LudoPentaBoard
              state={state}
              positions={anim.positions}
              flying={anim.flying}
              movable={movable}
              meUid={uid}
              onToken={onToken}
              rotation={pentaTurn}
              hidden={offBoard}
              look={look}
              targets={aiming ? targets : undefined}
              onTarget={(id, token) =>
                aimed && firePower(aimed.kind, aimed.sig, { uid: id, token })
              }
              className="rounded-lg"
            />
          ) : (
            <LudoBoard
              state={state}
              positions={anim.positions}
              flying={anim.flying}
              movable={movable}
              meUid={uid}
              onToken={onToken}
              turns={turns}
              hidden={offBoard}
              look={look}
              targets={aiming ? targets : undefined}
              onTarget={(id, token) =>
                aimed && firePower(aimed.kind, aimed.sig, { uid: id, token })
              }
              className="rounded-lg"
            />
          )}
        </div>
        <div className={cn("grid gap-2 px-1 pt-2", rowCols(bottomRow.length), !penta && "group-data-[stage-wide]/stage:contents")}>
          {bottomRow.map((c, i) =>
            seat(c, alignOf(i, bottomRow.length), bottomRow.length > 2, sideCell("bottom", i))
          )}
        </div>
        <div className="mt-2 flex min-h-12 flex-col justify-center rounded-xl bg-black/25 px-3 py-1.5 text-center group-data-[stage-wide]/stage:col-span-3 group-data-[stage-wide]/stage:row-start-3">
          {state.mode === "powers" && mine && (
            <PowerTray
              me={me}
              characterName={characterById(me.avatar)?.name}
              signature={mine.signature}
              held={heldPowers(mine)}
              now={now}
              aiming={aimed}
              canUse={canUsePower}
              onPick={pickPower}
            />
          )}
          <p className="truncate text-sm font-semibold">
            {aimed
              ? `${aimed.sig ? "★ " : ""}${POWER_INFO[aimed.kind].name}: ${
                  POWER_INFO[aimed.kind].target === "own"
                    ? "tap one of your pieces"
                    : "tap a rival's piece"
                }`
              : headline}
          </p>
          {options.length > 1 && diceValue !== null && mine ? (
            // Also a tap target off the board — and the fallback if the auto-move didn't land
            <div
              className="mt-1 no-scrollbar flex justify-center gap-1.5 overflow-x-auto"
              role="group"
              aria-label="Pieces you can move"
            >
              {options.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-2.5 text-xs font-semibold transition-colors active:bg-white/25"
                  onClick={() => onToken(t)}
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: TOKEN_COLOURS[mine.colour] }}
                    aria-hidden
                  />
                  {moveLabel(mine.tokens[t], diceValue)}
                </button>
              ))}
            </div>
          ) : (
            <p className="truncate text-xs text-white/70" aria-live="polite">
              {caption ?? describeLast(state, nameOf)}
            </p>
          )}
        </div>
      </div>

      <p className="px-1 text-center text-[11px] text-muted-foreground max-md:hidden">
        Tap another player&apos;s photo to throw something at them
      </p>

      <ThrowOverlay code={code} />
      <ThrowPicker
        code={code}
        target={throwAt}
        onOpenChange={(o) => !o && setThrowAt(null)}
      />
    </div>
  )
}

/* ── Seat ────────────────────────────────────────────────────────────── */

/** Ring colour for the share of time left: green → amber → red. */
const timeColour = (share: number) => `hsl(${Math.round(120 * share)} 85% 48%)`
const RING_R = 25
const RING_C = 2 * Math.PI * RING_R

/**
 * A player at the table: their photo with the turn timer running round it
 * (green to red), their colour, missed turns, and the dice beside them.
 */
export function Seat({
  player,
  ludo,
  isTurn,
  isMe,
  countdown,
  align,
  dice,
  onTap,
  compact = false,
  geo = SQUARE_GEO,
  status: statusOverride,
  tint,
  team,
  partner = false,
  className,
}: {
  player: RoomPlayer
  ludo: LudoPlayer
  isTurn: boolean
  isMe: boolean
  /** 1 → 0 share of the decision time left, while a timer runs for them. */
  countdown: number | null
  align: "left" | "right"
  /** The dice, shown beside whoever's turn it is. */
  dice?: React.ReactNode
  /** Opens the throw picker (other players only). */
  onTap?: () => void
  /** Three to a row: the dice takes room only while it's showing. */
  compact?: boolean
  geo?: LudoGeo
  /** The line under the name (other games: e.g. "On 47"); default: Ludo's pieces home. */
  status?: string
  /** The colour dot / ring in the board theme's tone (default: classic). */
  tint?: string
  /** Teams 2v2: "A" / "B", shown as a badge by the name. */
  team?: "A" | "B"
  /** Teams: this is your partner. */
  partner?: boolean
  /** Placement in the table (e.g. its corner when the seats sit beside the board). */
  className?: string
}) {
  const colour = tint ?? TOKEN_COLOURS[ludo.colour]
  const out = !!ludo.out
  const dim = player.left || out || !player.online
  const missed = ludo.missed ?? 0
  const status =
    ludo.place > 0
      ? `${ordinal(ludo.place)} · finished`
      : out
        ? "Out"
        : player.left
          ? "Left"
          : !player.online
            ? "Offline"
            : (statusOverride ?? `${homeCount(ludo, geo)}/4 home`)
  const share = countdown ?? 1
  const name = (
    <div
      className={cn(
        "min-w-0 flex-1 leading-tight",
        align === "right" && "text-right"
      )}
    >
      <p
        className={cn(
          "flex items-center gap-1 text-xs font-semibold",
          align === "right" && "flex-row-reverse"
        )}
      >
        <span className="truncate">{isMe ? "You" : player.name.split(" ")[0]}</span>
        {team && (
          <span
            className={cn(
              "flex h-3.5 min-w-3.5 shrink-0 items-center justify-center rounded px-0.5 text-[9px] font-extrabold text-white",
              team === "A" ? "bg-[#e0453a]" : "bg-[#22a06b]",
              partner && "ring-1 ring-white"
            )}
            title={partner ? `Your partner (Team ${team})` : `Team ${team}`}
            aria-label={partner ? `Your partner, Team ${team}` : `Team ${team}`}
          >
            {team}
          </span>
        )}
      </p>
      <p
        className="flex items-center gap-1 text-[10px] text-white/70"
        style={{ justifyContent: align === "right" ? "flex-end" : undefined }}
      >
        <span className="truncate">{status}</span>
        {missed > 0 && !out && (
          <span
            className="flex gap-0.5"
            aria-label={`Missed ${missed} of ${LUDO_MAX_MISSED} turns`}
          >
            {Array.from({ length: LUDO_MAX_MISSED }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full",
                  i < missed ? "bg-red-400" : "bg-white/30"
                )}
              />
            ))}
          </span>
        )}
      </p>
    </div>
  )
  return (
    // One compact row — photo, dice, name — so the board gets the height on small phones
    <div
      className={cn(
        "flex min-w-0 items-center gap-1.5",
        className,
        align === "right" && "flex-row-reverse",
        dim && "opacity-60"
      )}
    >
      <button
        type="button"
        data-throw-anchor={player.uid}
        onClick={onTap}
        disabled={!onTap}
        aria-label={onTap ? `Throw something at ${player.name}` : player.name}
        className="relative size-14 shrink-0 rounded-full transition-transform enabled:active:scale-95"
      >
        <svg
          viewBox="0 0 56 56"
          className="absolute inset-0 -rotate-90"
          aria-hidden
        >
          <circle
            cx="28"
            cy="28"
            r={RING_R}
            fill="none"
            stroke="rgb(255 255 255 / 0.18)"
            strokeWidth="4"
          />
          <circle
            cx="28"
            cy="28"
            r={RING_R}
            fill="none"
            stroke={countdown !== null ? timeColour(share) : colour}
            strokeOpacity={countdown !== null || isTurn ? 1 : 0.85}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={countdown !== null ? RING_C * (1 - share) : 0}
            style={{
              transition: "stroke-dashoffset 1s linear, stroke 1s linear",
            }}
          />
        </svg>
        {/* The game character; no frame here — the timer ring is the seat's frame */}
        <PlayerAvatar
          player={player}
          size={42}
          frame={false}
          className="absolute inset-[7px]"
        />
        <span
          className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full ring-2 ring-[#0d2463]"
          style={{ backgroundColor: colour }}
          aria-label={`${ludo.colour} pieces`}
        />
        {isTurn && (
          <span
            aria-hidden
            className="absolute -inset-1 rounded-full"
            style={{ boxShadow: `0 0 16px 2px ${colour}` }}
          />
        )}
      </button>
      <div
        className={cn(
          "flex shrink-0 items-center justify-center",
          compact && !dice ? "w-0" : "size-10"
        )}
      >
        {dice}
      </div>
      {name}
    </div>
  )
}
