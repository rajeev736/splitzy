"use client"

import * as React from "react"
import { runTransaction, serverTimestamp, set } from "firebase/database"
import {
  PencilEdit01Icon,
  Tick02Icon,
  WifiDisconnected01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useRoomChildren, useRoomNode, type Keyed } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import {
  advanceTurn,
  applyTurnEnd,
  beginDrawing,
  canReveal,
  CHOICES,
  chooseEndsAt,
  goneUids,
  isClose,
  refereeAction,
  resultOf,
  revealAt,
  revealedCount,
  revealsDue,
  unrevealedIndexes,
  type CorrectMap,
  type ScribbleRoot,
  type ScribbleState,
} from "@/lib/live/scribble"
import { pickChoices, randomInt } from "@/lib/live/scribble-words"
import type { ChatMessage, LiveGameProps, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { roomRef, sendChat, updateState } from "@/services/live-rooms"
import { DefaultMessage, RoomChat } from "../room-chat"
import { hashWord } from "./hash"
import { ScribbleCanvas } from "./scribble-canvas"

type Msg = ChatMessage & { for?: string }

const NO_CORRECT: CorrectMap = {}
/** The text behind a "correct" notice; never the word itself, which others can't see yet. */
const CORRECT_TEXT = "guessed the word"

/**
 * Read-modify-write on the whole state. This screen only listens to parts of
 * it (game, correct, strokes), so the SDK's first run sees null: answering
 * null — a delete of nothing, sent with a stale hash — makes the server hand
 * back the real data and run `fn` on that. Returning undefined on that first
 * run would abort without ever asking the server. No local echo, so the
 * listeners never see a phantom empty state.
 */
const rootTransaction = (
  code: string,
  fn: (cur: ScribbleRoot) => ScribbleRoot | undefined
) =>
  runTransaction(
    roomRef(code, "state"),
    (cur: ScribbleRoot | null) => (cur === null ? null : fn(cur)),
    { applyLocally: false }
  )

/**
 * Scribble for 2–8 players. The drawer's device picks the word, reveals
 * letters and nudges near-misses; the referee device ends turns and the game;
 * every guess is checked against the word's hash on the guesser's own device.
 * See lib/live/scribble.ts for the rules and state.
 */
export function ScribbleGame({
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
  const { data: game } = useRoomNode<ScribbleState>(code, "state/game")
  const { data: correctData } = useRoomNode<CorrectMap>(code, "state/correct")
  // Only the drawer can read their own secret; for everyone else this is null
  const { data: secret } = useRoomNode<{ word: string }>(code, `secret/${uid}`)
  const chat = useRoomChildren<Msg>(code, "chat", 200)
  const correct = correctData ?? NO_CORRECT
  const ready =
    !!game &&
    Array.isArray(game.order) &&
    typeof game.phase === "string" &&
    !!game.drawer

  const byId = React.useMemo(
    () =>
      Object.fromEntries(players.map((p) => [p.uid, p])) as Record<
        string,
        RoomPlayer
      >,
    [players]
  )
  const firstName = React.useCallback(
    (id: string) => (byId[id]?.name ?? "Someone").split(" ")[0],
    [byId]
  )
  // The first turn's clock counts from the start of the game
  const startedAt = meta.startedAt || now

  const phase = ready ? game.phase : null
  const turn = ready ? game.turn : 0
  const drawerId = ready ? game.drawer : ""
  const isDrawer = ready && drawerId === uid && !me.left
  const iGuessed = !!correct[uid]
  const inTheKnow = isDrawer || iGuessed
  const wordHash = ready ? (game.wordHash ?? null) : null
  const hint = ready ? (game.hint ?? null) : null
  const drawStartedAt = ready ? (game.drawStartedAt ?? null) : null
  const drawEndsAt = ready ? (game.drawEndsAt ?? null) : null
  const revealed = ready ? (game.revealed ?? null) : null
  const usedKey = ready ? (game.used ?? []).join("\n") : ""
  const pack = ready ? game.pack : "mix"

  /* ── The drawer's word ─────────────────────────────────────────────── */

  // Known once its hash matches the public one, so a stale secret from an earlier turn never counts
  const [known, setKnown] = React.useState<{
    hash: string
    word: string
  } | null>(null)
  const secretWord = secret?.word ?? null
  React.useEffect(() => {
    if (!secretWord || !wordHash) return
    let cancelled = false
    hashWord(code, secretWord)
      .then((hash) => {
        if (!cancelled) setKnown({ hash, word: secretWord })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [code, secretWord, wordHash])
  const myWord =
    isDrawer && known && known.hash === wordHash ? known.word : null

  /* ── Choosing ──────────────────────────────────────────────────────── */

  const choosing = isDrawer && phase === "choosing"
  const [choices, setChoices] = React.useState<{
    turn: number
    words: string[]
  } | null>(null)
  React.useEffect(() => {
    if (!choosing) return
    const id = window.setTimeout(() => {
      const exclude = usedKey ? usedKey.split("\n") : []
      setChoices((prev) =>
        prev?.turn === turn
          ? prev
          : { turn, words: pickChoices(pack, CHOICES, exclude) }
      )
    }, 0)
    return () => window.clearTimeout(id)
  }, [choosing, turn, pack, usedKey])
  const myChoices = choices?.turn === turn ? choices.words : null

  const pickBusy = React.useRef(false)
  const [picking, setPicking] = React.useState<string | null>(null)
  const pickWord = React.useCallback(
    async (word: string, forTurn: number) => {
      if (pickBusy.current) return
      pickBusy.current = true
      setPicking(word)
      try {
        const hash = await hashWord(code, word)
        // The word itself goes where only this player can read it; the room gets its hash
        await set(roomRef(code, `secret/${uid}`), { word })
        const t = serverNow()
        const res = await rootTransaction(code, (cur) => {
          const g = cur.game
          if (
            !g ||
            g.phase !== "choosing" ||
            g.drawer !== uid ||
            g.turn !== forTurn
          )
            return undefined
          return {
            game: beginDrawing(g, hash, word, t),
            strokes: null,
            correct: null,
          }
        })
        if (res.committed) setKnown({ hash, word })
      } catch (e) {
        toast.error(getErrorMessage(e, "Couldn't pick that word"))
      } finally {
        pickBusy.current = false
        setPicking(null)
      }
    },
    [code, uid, serverNow]
  )

  // Out of time to choose: the first word it is
  const chooseDeadline = ready ? chooseEndsAt(game, startedAt) : 0
  React.useEffect(() => {
    if (!choosing || !myChoices || now < chooseDeadline) return
    const id = window.setTimeout(() => void pickWord(myChoices[0], turn), 0)
    return () => window.clearTimeout(id)
  }, [choosing, myChoices, now, chooseDeadline, turn, pickWord])

  /* ── Drawing: letter hints and "close!" nudges ─────────────────────── */

  React.useEffect(() => {
    if (
      !isDrawer ||
      phase !== "drawing" ||
      !myWord ||
      !hint ||
      drawStartedAt == null ||
      drawEndsAt == null
    )
      return
    if (
      revealedCount(hint) >= revealsDue(drawStartedAt, drawEndsAt, now) ||
      !canReveal(hint, myWord)
    )
      return
    const open = unrevealedIndexes(hint, myWord)
    if (open.length === 0) return
    void updateState(code, {
      "game/hint": revealAt(hint, myWord, open[randomInt(open.length)]),
    }).catch(() => undefined)
  }, [isDrawer, phase, myWord, hint, drawStartedAt, drawEndsAt, now, code])

  // Only guesses made while this screen is open get a nudge (a reload mustn't repeat them)
  const [watchSince, setWatchSince] = React.useState<number | null>(null)
  React.useEffect(() => {
    const id = window.setTimeout(() => setWatchSince(serverNow()), 0)
    return () => window.clearTimeout(id)
  }, [serverNow])
  const nudged = React.useRef<Set<string>>(new Set())
  React.useEffect(() => {
    if (
      !isDrawer ||
      phase !== "drawing" ||
      !myWord ||
      watchSince === null ||
      drawStartedAt == null
    )
      return
    const since = Math.max(watchSince, drawStartedAt)
    for (const m of chat) {
      if (nudged.current.has(m.key)) continue
      nudged.current.add(m.key)
      const msg = m.value
      if (msg.kind && msg.kind !== "chat") continue
      if (
        msg.uid === uid ||
        correct[msg.uid] ||
        typeof msg.at !== "number" ||
        msg.at < since
      )
        continue
      if (isClose(msg.text, myWord)) {
        void sendChat(code, { uid, displayName: me.name }, msg.text, {
          kind: "close",
          for: msg.uid,
        }).catch(() => undefined)
      }
    }
  }, [
    isDrawer,
    phase,
    myWord,
    watchSince,
    drawStartedAt,
    chat,
    uid,
    correct,
    code,
    me.name,
  ])

  // Turn over: the drawer shows the word to everyone (and keeps it from coming up again)
  React.useEffect(() => {
    if (!isDrawer || phase !== "turnEnd" || !myWord || revealed) return
    const used = usedKey ? usedKey.split("\n") : []
    void updateState(code, {
      "game/revealed": myWord,
      "game/used": used.includes(myWord) ? used : [...used, myWord],
    }).catch(() => undefined)
  }, [isDrawer, phase, myWord, revealed, usedKey, code])

  /* ── The referee ───────────────────────────────────────────────────── */

  const refereeBusy = React.useRef(false)
  React.useEffect(() => {
    if (
      !isReferee ||
      !ready ||
      meta.status !== "playing" ||
      me.left ||
      refereeBusy.current
    )
      return
    if (!refereeAction(game, players, correct, now, startedAt)) return
    refereeBusy.current = true
    const gone = goneUids(players, now)
    const t = serverNow()
    const run = async () => {
      if (game.phase === "over") {
        await endGame(resultOf(game, gone))
        return
      }
      // Decide again inside the transaction, on the data as it is right now
      const res = await rootTransaction(code, (cur) => {
        const g = cur.game
        if (!g || g.phase === "over") return undefined
        const action = refereeAction(g, players, cur.correct, t, startedAt)
        if (action === "turnEnd") {
          const next = applyTurnEnd(g, cur.correct, gone, t)
          return next ? { ...cur, game: next } : undefined
        }
        if (action === "advance")
          return { game: advanceTurn(g, gone, t), strokes: null, correct: null }
        return undefined
      })
      const after = res.snapshot.val() as ScribbleRoot | null
      if (after?.game?.phase === "over")
        await endGame(resultOf(after.game, gone))
    }
    run()
      .catch(() => undefined)
      .finally(() => {
        refereeBusy.current = false
      })
  }, [
    isReferee,
    ready,
    meta.status,
    me.left,
    game,
    players,
    correct,
    now,
    startedAt,
    serverNow,
    code,
    endGame,
  ])

  /* ── Guessing ──────────────────────────────────────────────────────── */

  const onSend = async (text: string) => {
    const author = { uid, displayName: me.name }
    const canGuess =
      ready &&
      game.phase === "drawing" &&
      !isDrawer &&
      !iGuessed &&
      !me.left &&
      !!game.wordHash &&
      game.drawEndsAt != null &&
      serverNow() < game.drawEndsAt
    try {
      if (canGuess && (await hashWord(code, text)) === game.wordHash) {
        await set(roomRef(code, `state/correct/${uid}`), {
          at: serverTimestamp(),
        })
        await sendChat(code, author, CORRECT_TEXT, { kind: "correct" })
        return
      }
      await sendChat(code, author, text)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't send that"))
      return false
    }
  }

  /** Chatter from people who already know the word stays between them while the turn is on. */
  const knewTheWord = (msg: Msg) => {
    if (phase !== "drawing" || drawStartedAt == null || msg.at < drawStartedAt)
      return false
    const got = correct[msg.uid]
    return msg.uid === drawerId || (!!got && got.at <= msg.at)
  }

  const renderMessage = (m: Keyed<Msg>, mine: boolean) => {
    const msg = m.value
    const plain = !msg.kind || msg.kind === "chat"
    if (plain && knewTheWord(msg)) {
      if (!inTheKnow) return null
      return (
        <p className="text-sm leading-snug break-words text-muted-foreground italic">
          <span className="font-semibold not-italic">
            {msg.name.split(" ")[0]}
          </span>
          <span>: </span>
          {msg.text}
        </p>
      )
    }
    return <DefaultMessage msg={msg} mine={mine} />
  }

  /* ── Render ────────────────────────────────────────────────────────── */

  if (!ready) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          {game === null ? "Waiting for the game…" : "Setting up…"}
        </CardContent>
      </Card>
    )
  }

  const drawer = byId[drawerId]
  const deadline =
    phase === "choosing"
      ? chooseDeadline
      : phase === "drawing"
        ? drawEndsAt
        : phase === "turnEnd"
          ? game.turnEndsAt
          : null
  const seconds =
    deadline != null ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null
  const urgent = phase === "drawing" && seconds !== null && seconds <= 10
  const drawerOffline =
    !!drawer && !drawer.online && !drawer.left && phase === "drawing"
  const shownWord = isDrawer
    ? myWord
    : phase === "turnEnd" || phase === "over"
      ? revealed
      : null

  const overlay = (() => {
    if (phase === "choosing") {
      if (isDrawer)
        return (
          <WordPicker
            words={myChoices}
            picking={picking}
            seconds={seconds}
            onPick={(w) => void pickWord(w, turn)}
          />
        )
      return (
        <Notice>
          <Spinner className="size-4" />
          {firstName(drawerId)} is choosing a word…
        </Notice>
      )
    }
    if (phase === "turnEnd") {
      return (
        <TurnSummary
          word={shownWord}
          points={game.turnPoints ?? null}
          drawerId={drawerId}
          byId={byId}
          seconds={seconds}
        />
      )
    }
    if (phase === "over") {
      return (
        <Notice>
          <Spinner className="size-4" />
          Game over — tallying the scores…
        </Notice>
      )
    }
    return null
  })()

  const chatHeading = isDrawer
    ? "Guesses — your messages only reach those who got it"
    : iGuessed
      ? "You got it! Chat with the others who did"
      : phase === "drawing"
        ? "Type your guess"
        : "Chat"
  const placeholder = isDrawer
    ? "Say something…"
    : iGuessed || phase !== "drawing"
      ? "Say something…"
      : "Type your guess…"

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 md:grid md:grid-cols-[minmax(0,1fr)_18rem] md:items-start md:gap-4">
      <div className="flex min-w-0 flex-col gap-2 md:max-w-[640px]">
        {/* Round, the hint, the clock */}
        <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-muted-foreground">
              Round {game.round} of {game.rounds} ·{" "}
              {isDrawer
                ? "You're drawing"
                : `${firstName(drawerId)} is drawing`}
            </p>
            <HintLine
              phase={game.phase}
              hint={hint}
              word={shownWord}
              wordLen={game.wordLen ?? null}
            />
          </div>
          {drawerOffline && (
            <HugeiconsIcon
              icon={WifiDisconnected01Icon}
              className="size-4 shrink-0 text-warning"
              aria-label={`${firstName(drawerId)} is offline`}
            />
          )}
          {seconds !== null && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums",
                urgent ? "bg-destructive/10 text-destructive" : "bg-muted"
              )}
              aria-live={urgent ? "polite" : "off"}
            >
              {seconds}s
            </span>
          )}
        </div>

        <Scoreboard
          game={game}
          byId={byId}
          correct={correct}
          uid={uid}
          layout="row"
          className="md:hidden"
        />

        <ScribbleCanvas
          code={code}
          uid={uid}
          canDraw={isDrawer && phase === "drawing"}
          overlay={overlay}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:h-[calc(100svh-12rem)] md:max-h-[640px] md:min-h-[420px]">
        <Scoreboard
          game={game}
          byId={byId}
          correct={correct}
          uid={uid}
          layout="list"
          className="hidden md:flex"
        />
        <Card className="flex h-[40svh] min-h-[220px] flex-col gap-0 py-0 md:h-auto md:min-h-0 md:flex-1">
          <p className="truncate border-b px-3 py-1.5 text-[11px] text-muted-foreground">
            {chatHeading}
          </p>
          <RoomChat
            code={code}
            className="min-h-0 flex-1"
            placeholder={placeholder}
            onSend={onSend}
            renderMessage={renderMessage}
            disabled={phase === "over"}
          />
        </Card>
      </div>
    </div>
  )
}

/* ── Pieces ──────────────────────────────────────────────────────────── */

function HintLine({
  phase,
  hint,
  word,
  wordLen,
}: {
  phase: ScribbleState["phase"]
  hint: string | null
  word: string | null
  wordLen: number | null
}) {
  if (word)
    return <p className="truncate text-lg font-semibold capitalize">{word}</p>
  if (phase === "choosing")
    return (
      <p className="text-lg font-semibold text-muted-foreground">Choosing…</p>
    )
  if (phase === "turnEnd" || phase === "over")
    return (
      <p className="text-lg font-semibold text-muted-foreground">(the word)</p>
    )
  if (!hint)
    return <p className="text-lg font-semibold text-muted-foreground">…</p>
  return (
    <p className="flex items-baseline gap-2 overflow-hidden">
      <span className="truncate font-mono text-lg font-semibold tracking-[0.2em] whitespace-pre">
        {hint.replace(/ /g, "   ")}
      </span>
      {wordLen != null && (
        <span className="shrink-0 text-xs text-muted-foreground">
          {wordLen}
        </span>
      )}
    </p>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-center text-sm font-medium">
      {children}
    </p>
  )
}

function WordPicker({
  words,
  picking,
  seconds,
  onPick,
}: {
  words: string[] | null
  picking: string | null
  seconds: number | null
  onPick: (word: string) => void
}) {
  return (
    <div className="flex w-full max-w-xs flex-col gap-2">
      <p className="text-center text-sm font-medium">
        Pick a word{" "}
        {seconds !== null && (
          <span className="text-muted-foreground">· {seconds}s</span>
        )}
      </p>
      {words ? (
        words.map((w) => (
          <Button
            key={w}
            size="lg"
            variant="outline"
            className="h-12 w-full capitalize"
            onClick={() => onPick(w)}
            disabled={!!picking}
          >
            {picking === w && <Spinner />}
            {w}
          </Button>
        ))
      ) : (
        <Spinner className="mx-auto" />
      )}
    </div>
  )
}

function TurnSummary({
  word,
  points,
  drawerId,
  byId,
  seconds,
}: {
  word: string | null
  points: Record<string, number> | null
  drawerId: string
  byId: Record<string, RoomPlayer>
  seconds: number | null
}) {
  const rows = Object.entries(points ?? {}).sort((a, b) => b[1] - a[1])
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2 text-center">
      <p className="text-xs text-muted-foreground">The word was</p>
      <p
        className={cn(
          "text-2xl font-bold capitalize",
          !word && "text-muted-foreground"
        )}
      >
        {word ?? "(the word)"}
      </p>
      <ul className="w-full divide-y overflow-hidden rounded-lg border bg-card text-sm">
        {rows.length === 0 && (
          <li className="px-3 py-2 text-muted-foreground">Nobody guessed it</li>
        )}
        {rows.map(([id, pts]) => {
          const p = byId[id]
          return (
            <li key={id} className="flex items-center gap-2 px-3 py-1.5">
              <UserAvatar
                src={p?.photo}
                name={p?.name ?? "?"}
                size="xs"
                uid={id}
              />
              <span className="min-w-0 flex-1 truncate text-left font-medium">
                {(p?.name ?? "Someone").split(" ")[0]}
                {id === drawerId && (
                  <span className="text-muted-foreground"> · drew it</span>
                )}
              </span>
              <span className="font-semibold text-success tabular-nums">
                +{pts}
              </span>
            </li>
          )
        })}
      </ul>
      {seconds !== null && (
        <p className="text-xs text-muted-foreground">Next turn in {seconds}s</p>
      )}
    </div>
  )
}

function Scoreboard({
  game,
  byId,
  correct,
  uid,
  layout,
  className,
}: {
  game: ScribbleState
  byId: Record<string, RoomPlayer>
  correct: CorrectMap
  uid: string
  layout: "row" | "list"
  className?: string
}) {
  const row = layout === "row"
  return (
    <ol
      className={cn(
        row
          ? "no-scrollbar flex gap-1.5 overflow-x-auto py-0.5"
          : "flex flex-col divide-y rounded-xl border bg-card",
        className
      )}
      aria-label="Scores"
    >
      {game.order.map((id) => {
        const p = byId[id]
        const drawing = id === game.drawer
        const got = !!correct[id] && game.phase === "drawing"
        const left = !!p?.left
        const badge = drawing ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
            <HugeiconsIcon icon={PencilEdit01Icon} className="size-2.5" />
          </span>
        ) : got ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-success text-success-foreground ring-2 ring-card">
            <HugeiconsIcon
              icon={Tick02Icon}
              className="size-2.5"
              strokeWidth={3}
            />
          </span>
        ) : null
        return (
          <li
            key={id}
            className={cn(
              "flex items-center gap-2",
              row
                ? "shrink-0 rounded-full border bg-card py-1 pr-2.5 pl-1"
                : "px-3 py-2",
              left && "opacity-50",
              id === uid && !row && "bg-primary/5"
            )}
          >
            <UserAvatar
              src={p?.photo}
              name={p?.name ?? "?"}
              size={row ? "xs" : "sm"}
              uid={id}
              badge={badge}
            />
            <span
              className={cn(
                "truncate text-xs font-medium",
                !row && "min-w-0 flex-1 text-sm"
              )}
            >
              {id === uid ? "You" : (p?.name ?? "Someone").split(" ")[0]}
              {left && <span className="text-muted-foreground"> · left</span>}
            </span>
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                !row && "text-sm"
              )}
            >
              {game.scores?.[id] ?? 0}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
