"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import {
  ChatIcon,
  Logout01Icon,
  StickerIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { FullScreenLoader, PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { onValue, ref } from "firebase/database"

import { useWallet } from "@/hooks/use-fun"
import { useLiveRoom, useRoomChildren, useRoomNode, type LiveRoom } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import { useGameExit } from "@/lib/games-nav"
import { LIVE_GAMES } from "@/lib/live/games"
import { levelOf, liveXp } from "@/lib/live/levels"
import { isJoinable } from "@/lib/live/room"
import { isFull } from "@/lib/live/seats"
import { ordinal } from "@/lib/live/ludo"
import type { ChatMessage, LiveGameId, RoomMeta, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import {
  cancelCountdown,
  cleanupRoom,
  joinRoom,
  liveDb,
  leaveRoom,
  rematch,
  setPlayerLevel,
  startCountdown,
  startGame,
  type JoinOutcome,
} from "@/services/live-rooms"
import { GameView } from "./game-view"
import { LobbyView } from "./lobby/lobby-view"
import { playSound } from "@/lib/live/sound"
import { RoomChat } from "./room-chat"
import { SoundMenu } from "./sound-settings"
import { BoardThemePicker } from "./board-theme-picker"
import { ResultScreen, type ResultRow, type ResultTone } from "./result-screen"
import { ReactionsOverlay, StickerBar } from "./stickers"
import { VoiceBar } from "./voice-bar"

const GAMES_TAB = "/challenges?tab=live"

/**
 * Removed by the host: remembered for this tab (session), so a refresh or the
 * link doesn't seat you again by itself. "Join again" clears it.
 */
const kickedKey = (code: string) => `joysplit_kicked_${code}`
const wasKicked = (code: string) => {
  try {
    return sessionStorage.getItem(kickedKey(code)) === "1"
  } catch {
    return false
  }
}
const markKicked = (code: string, on: boolean) => {
  try {
    if (on) sessionStorage.setItem(kickedKey(code), "1")
    else sessionStorage.removeItem(kickedKey(code))
  } catch {
    /* storage unavailable */
  }
}
/** Rooms you're leaving yourself right now — so your own exit isn't mistaken for a kick. */
const leavingRooms = new Set<string>()
/** Finished rooms shed their drawing / chat this long after the end. */
const CLEANUP_AFTER_MS = 60 * 1000

/**
 * One live room from start to finish: joins you on arrival, the lobby while
 * seats fill, a countdown when they're all taken (or the host starts early),
 * the game, then the result with a rematch. The referee device (see
 * lib/live/room.ts) performs the automatic steps.
 */
export function RoomShell({ code }: { code: string }) {
  const exitGame = useGameExit(GAMES_TAB)
  const { user } = useSession()
  const room = useLiveRoom(code)
  const { meta, players, me, isReferee, loaded, notFound, now, serverNow } =
    room
  // Your level (from your wallet) rides on your seat, for everyone's badges
  const wallet = useWallet()
  const level = wallet ? levelOf(liveXp(wallet)) : undefined

  // Take a seat (or come back to yours) as soon as the room is known — unless the host removed you
  const [join, setJoin] = React.useState<"idle" | JoinOutcome>("idle")
  const joining = React.useRef(false)
  const [kicked, setKicked] = React.useState(() => wasKicked(code))
  React.useEffect(() => {
    if (
      !loaded ||
      notFound ||
      !user ||
      !meta ||
      me ||
      kicked ||
      join !== "idle" ||
      joining.current
    )
      return
    joining.current = true
    joinRoom(user, code, level)
      .then(setJoin)
      .catch((e) => {
        toast.error(getErrorMessage(e, "Couldn't join the room"))
        setJoin("not_found")
      })
    // The level is read when joining; a late one is caught up below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, notFound, user, meta, me, kicked, join, code])

  // Your seat's level when it changes: the wallet loading late, or a level-up at the end
  React.useEffect(() => {
    if (!me || me.left || !level || me.level === level) return
    void setPlayerLevel(code, me.uid, level).catch(() => undefined)
  }, [me, level, code])

  // The host removed you from the lobby: out you go, and you stay out until you choose to join again
  const seatedHere = React.useRef(false)
  React.useEffect(() => {
    if (me && !me.left) {
      seatedHere.current = true
      return
    }
    if (!seatedHere.current || me || !meta || !isJoinable(meta) || leavingRooms.has(code)) return
    seatedHere.current = false
    markKicked(code, true)
    toast.error("The host removed you from the room")
    exitGame()
  }, [me, meta, code, exitGame])

  // Referee: start the countdown when full, cancel it when someone leaves, start the game on time
  const starting = React.useRef(false)
  React.useEffect(() => {
    if (!isReferee || !meta || !me || me.left) return
    // Every seat taken (team rooms: nobody waiting on the bench)
    const full = isFull(meta, players)
    if (meta.status === "lobby" && full) {
      void startCountdown(code, serverNow()).catch(() => undefined)
    } else if (meta.status === "countdown" && !full) {
      void cancelCountdown(code).catch(() => undefined)
    } else if (
      meta.status === "countdown" &&
      meta.startsAt &&
      now >= meta.startsAt &&
      !starting.current
    ) {
      starting.current = true
      startGame(code, meta, players).catch(() => {
        starting.current = false
      })
    }
  }, [isReferee, meta, me, players, now, code, serverNow])

  // Referee: a minute after the end, drop the heavy parts of the room
  React.useEffect(() => {
    if (!isReferee || meta?.status !== "ended" || !meta.endedAt) return
    const wait = Math.max(0, meta.endedAt + CLEANUP_AFTER_MS - serverNow())
    const id = window.setTimeout(() => void cleanupRoom(code), wait)
    return () => window.clearTimeout(id)
  }, [isReferee, meta?.status, meta?.endedAt, code, serverNow])

  if (kicked && !me && meta && isJoinable(meta)) {
    return (
      <Blocked
        title="Removed from the room"
        text="The host took you out of this room. You can ask to join again."
        action={{
          label: "Join again",
          onClick: () => {
            markKicked(code, false)
            joining.current = false
            setJoin("idle")
            setKicked(false)
          },
        }}
      />
    )
  }
  if (!loaded || (!me && join === "idle" && !notFound && !kicked)) {
    return (
      <RoomLoading
        stage={!loaded ? "room" : "seat"}
        error={room.error}
        signedIn={!!user}
        onBack={exitGame}
      />
    )
  }
  if (notFound || !meta || join === "not_found") {
    return (
      <Blocked
        title="Room not found"
        text="This room may have ended and been cleared, or the code is wrong."
      />
    )
  }
  if (!me) {
    if (join === "full") {
      return (
        <Blocked
          title="Room is full"
          text={`All ${meta.maxPlayers} seats in this ${LIVE_GAMES[meta.game].name} room are taken. Ask the host for a new room, or start your own.`}
        />
      )
    }
    if (join === "started") {
      return (
        <Blocked
          title="Already playing"
          text="This game started without you. Ask for a rematch when it's over!"
        />
      )
    }
    // Ended: anyone with the link can see how it went
  }

  if (meta.status === "ended") return <EndedView room={room} meta={meta} />
  if (!me)
    return (
      <Blocked title="Already playing" text="This game started without you." />
    )
  if (meta.status === "playing")
    return <PlayingView room={room} meta={meta} me={me} />
  return (
    <LobbyView
      room={room}
      meta={meta}
      me={me}
      onLeft={exitGame}
      onLeaving={() => leavingRooms.add(code)}
    />
  )
}

/* ── Playing ─────────────────────────────────────────────────────────── */

function PlayingView({
  room,
  meta,
  me,
}: {
  room: LiveRoom
  meta: RoomMeta
  me: RoomPlayer
}) {
  const exitGame = useGameExit(GAMES_TAB)
  const { code, players, uid, isReferee, now, serverNow, voice } = room
  // Already finished (a race game)? Then leaving keeps your place instead of giving up
  const { data: gameState } = useRoomNode<RaceState>(code, "state")
  const donePlace = me.left ? null : finishedPlace(meta.game, gameState, uid)
  const game = LIVE_GAMES[meta.game]
  const [stickers, setStickers] = React.useState(false)
  // While someone types (chat / guesses) the phone keyboard is up: the dock steps aside
  const [typing, setTyping] = React.useState(false)
  React.useEffect(() => {
    const isField = (t: EventTarget | null) =>
      t instanceof HTMLElement && t.matches("input, textarea")
    const onIn = (e: FocusEvent) => isField(e.target) && setTyping(true)
    const onOut = (e: FocusEvent) => isField(e.target) && setTyping(false)
    document.addEventListener("focusin", onIn)
    document.addEventListener("focusout", onOut)
    return () => {
      document.removeEventListener("focusin", onIn)
      document.removeEventListener("focusout", onOut)
    }
  }, [])
  const [chat, setChat] = React.useState(false)
  const [confirmLeave, setConfirmLeave] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)
  const hasOwnChat = meta.game === "scribble"

  // New messages while the chat is closed: a count on the Chat button and a
  // short preview above the dock (phones; big screens keep the chat open on the right)
  const messages = useRoomChildren<ChatMessage>(code, "chat", 200)
  const [readUpTo, setReadUpTo] = React.useState<number | null>(null)
  React.useEffect(() => {
    const id = window.setTimeout(() => setReadUpTo(serverNow()), 0)
    return () => window.clearTimeout(id)
  }, [serverNow])
  const openChat = (open: boolean) => {
    setChat(open)
    setReadUpTo(serverNow())
  }
  const unread =
    hasOwnChat || chat || readUpTo === null
      ? []
      : messages.filter(
          (m) => m.value.uid !== uid && (m.value.kind ?? "chat") === "chat" && m.value.at > readUpTo
        )
  const latest = unread.at(-1)
  const [hiddenPreview, setHiddenPreview] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!latest) return
    const id = window.setTimeout(() => setHiddenPreview(latest.key), 4000)
    return () => window.clearTimeout(id)
  }, [latest])
  const preview = latest && hiddenPreview !== latest.key ? latest : null

  const leave = async () => {
    setLeaving(true)
    try {
      await leaveRoom(uid, code)
      exitGame()
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't leave"))
      setLeaving(false)
    }
  }

  return (
    <>
      <AppHeader
        title={game.name}
        subtitle={`Room ${code}`}
        showBack
        onBack={() => setConfirmLeave(true)}
        rightAction={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Leave game"
            onClick={() => setConfirmLeave(true)}
          >
            <HugeiconsIcon icon={Logout01Icon} className="size-5" />
          </Button>
        }
      />
      <ReactionsOverlay code={code} />
      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-1 flex-col px-2 pt-2 sm:px-6 sm:pt-4",
          // Big screens: the game, with the chat open beside it (Scribble has its own)
          !hasOwnChat && "lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5",
          // Room under the dock, which grows when the sticker row is open
          typing ? "pb-4" : stickers ? "pb-44" : "pb-28 md:pb-20"
        )}
      >
        <div className="flex min-w-0 flex-col gap-2">
          {me.left ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                You left this game. You can still watch how it ends.
              </CardContent>
            </Card>
          ) : null}
          <GameView
            code={code}
            meta={meta}
            players={players}
            uid={uid}
            me={me}
            isReferee={isReferee}
            now={now}
            serverNow={serverNow}
          />
        </div>
        {!hasOwnChat && (
          <Card className="sticky top-[calc(4.5rem+env(safe-area-inset-top,0px))] hidden h-[calc(100svh-11rem)] max-h-[720px] min-h-[360px] flex-col gap-0 py-0 lg:flex">
            <p className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
              <HugeiconsIcon icon={ChatIcon} className="size-4 text-muted-foreground" />
              Room chat
            </p>
            <RoomChat code={code} className="min-h-0 flex-1" />
          </Card>
        )}
      </div>

      {/* Dock: voice, stickers, chat (games measure it to fit above it) */}
      <div
        data-room-dock
        className={cn(
          "pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur-sm",
          typing && "hidden md:block"
        )}
      >
        {/* A new message while the chat is closed: who said what, tap to open */}
        {preview && !stickers && (
          <button
            type="button"
            onClick={() => openChat(true)}
            className="absolute right-3 bottom-full mb-2 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-full border bg-popover py-1.5 pr-3.5 pl-1.5 text-left text-sm shadow-lg animate-in fade-in-0 slide-in-from-bottom-2 lg:hidden"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <HugeiconsIcon icon={ChatIcon} className="size-4" />
            </span>
            <span className="min-w-0 truncate">
              <span className="font-semibold">{preview.value.name.split(" ")[0]}:</span> {preview.value.text}
            </span>
          </button>
        )}
        {stickers && (
          <div className="mx-auto max-w-3xl border-b px-3">
            <StickerBar code={code} />
          </div>
        )}
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
          <VoiceBar code={code} uid={uid} players={players} voice={voice} />
          <SoundMenu />
          {(meta.game === "ludo" || meta.game === "chess" || meta.game === "snakes3d" || meta.game === "tictactoe") && (
            <BoardThemePicker game={meta.game} />
          )}
          <Button
            variant={stickers ? "secondary" : "outline"}
            size="sm"
            aria-pressed={stickers}
            onClick={() => setStickers((s) => !s)}
          >
            <HugeiconsIcon icon={StickerIcon} data-icon="inline-start" />
            Stickers
          </Button>
          {!hasOwnChat && (
            <Button
              variant={unread.length > 0 ? "default" : "outline"}
              size="sm"
              className="relative ml-auto lg:hidden"
              onClick={() => openChat(true)}
              aria-label={unread.length > 0 ? `Chat, ${unread.length} new` : "Chat"}
            >
              <HugeiconsIcon icon={ChatIcon} data-icon="inline-start" />
              Chat
              {unread.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white ring-2 ring-background tabular-nums">
                  {unread.length > 9 ? "9+" : unread.length}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {!hasOwnChat && (
        <Sheet open={chat} onOpenChange={openChat}>
          <SheetContent
            side="bottom"
            className="mx-auto flex h-[75svh] w-full max-w-xl flex-col gap-0 rounded-t-2xl p-0"
          >
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle className="text-sm font-semibold">
                Room chat
              </SheetTitle>
            </SheetHeader>
            <RoomChat code={code} className="min-h-0 flex-1" autoFocus />
          </SheetContent>
        </Sheet>
      )}

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave the game?"
        description={
          me.left
            ? undefined
            : donePlace !== null
              ? `You've finished ${ordinal(donePlace)} — your place is kept. You can come back to watch the rest.`
              : "Leaving now counts as giving up — the others play on without you."
        }
        destructive={!me.left && donePlace === null}
        confirmLabel="Leave"
        isPending={leaving}
        onConfirm={leave}
      />
    </>
  )
}

/* ── Ended ───────────────────────────────────────────────────────────── */

function EndedView({ room, meta }: { room: LiveRoom; meta: RoomMeta }) {
  const router = useRouter()
  const exitGame = useGameExit(GAMES_TAB)
  const { user } = useSession()
  const wallet = useWallet()
  const { code, players, playersById, uid, isHost } = room
  const game = LIVE_GAMES[meta.game]
  const result = meta.result
  const winners = result?.winnerIds ?? []
  const iWon = winners.includes(uid)
  const [pending, setPending] = React.useState(false)
  // Just ended (not an old result opened later): the full entrance, confetti and a sound
  const [fresh] = React.useState(
    () => !!meta.endedAt && room.serverNow() - meta.endedAt <= 15_000
  )
  // A fanfare (or a sad tune) once, for the players, right as it ends
  const played = !!playersById[uid]
  React.useEffect(() => {
    if (!played || !fresh) return
    playSound(iWon ? "win" : winners.length ? "lose" : "home")
    // Once, when this screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nameOf = (id: string) => playersById[id]?.name ?? "Someone"
  const firstNames = (ids: string[]) =>
    ids.map((w) => nameOf(w).split(" ")[0]).join(" & ")
  const tone: ResultTone = !winners.length
    ? "draw"
    : !played
      ? "watch"
      : iWon
        ? "win"
        : "lose"
  // Under the ribbon: who won when it isn't (only) you, then why it ended
  const others = winners.filter((w) => w !== uid)
  const note = [
    tone === "win"
      ? others.length
        ? `Shared with ${firstNames(others)}`
        : undefined
      : winners.length
        ? `${firstNames(winners)} ${winners.length > 1 ? "win" : "wins"}`
        : undefined,
    result?.reason ? reasonText(result.reason) : undefined,
  ]
    .filter(Boolean)
    .join(" · ")
  const ranking =
    result?.ranking ?? players.filter((p) => !p.left).map((p) => p.uid)
  // Winners share first place; the rest keep their spot in the ranking
  const rows: ResultRow[] = ranking.map((id, i) => {
    const s = result?.stats?.[id]
    return {
      id,
      name: nameOf(id),
      photo: playersById[id]?.photo,
      avatar: playersById[id]?.avatar,
      frame: playersById[id]?.frame,
      level: playersById[id]?.level,
      place: winners.includes(id) ? 1 : i + 1,
      winner: winners.includes(id),
      you: id === uid,
      score: result?.scores?.[id],
      // Ludo: pieces cut, and times cut · Snakes & Ladders: ladders climbed, snakes that bit
      stats: !s
        ? undefined
        : "kills" in s
          ? [`Cut ${s.kills ?? 0}`, `Got cut ${s.deaths ?? 0}`]
          : "ladders" in s
            ? [`Ladders ${s.ladders ?? 0}`, `Snakes ${s.snakes ?? 0}`]
            : undefined,
    }
  })

  const startRematch = async () => {
    if (!user) return
    setPending(true)
    try {
      const next = await rematch(user, meta, wallet ? levelOf(liveXp(wallet)) : undefined)
      // Replace, not push: Back from the rematch goes to Games, not through old results
      router.replace(`/play/${next}`)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't start a rematch"))
      setPending(false)
    }
  }

  return (
    <>
      <ReactionsOverlay code={code} />
      <ResultScreen
        game={meta.game}
        gameName={game.name}
        code={code}
        tone={tone}
        note={note || undefined}
        rows={rows}
        fresh={fresh}
        playAgain={
          meta.rematchCode
            ? { kind: "join", href: `/play/${meta.rematchCode}` }
            : isHost
              ? { kind: "rematch", onClick: startRematch, pending }
              : { kind: "wait", hostName: meta.hostName.split(" ")[0] }
        }
        onBack={exitGame}
        stickers={<StickerBar code={code} />}
      />
    </>
  )
}

/** The bits of a race game's state that say who finished (Ludo, Snakes: `place`; Sudoku: `finished` times). */
type RaceState = {
  players?: Record<string, { place?: number }>
  finished?: Record<string, number>
}

/** Your finishing place in a race game you've already finished, else null. */
function finishedPlace(game: LiveGameId, state: RaceState | null | undefined, uid: string): number | null {
  if (!state) return null
  if (game === "ludo" || game === "snakes" || game === "snakes3d") {
    const place = state.players?.[uid]?.place ?? 0
    return place > 0 ? place : null
  }
  if (game === "sudoku") {
    const done = state.finished ?? {}
    const mine = done[uid]
    if (mine === undefined) return null
    return 1 + Object.values(done).filter((at) => at < mine).length
  }
  return null
}

function reasonText(reason: string) {
  const map: Record<string, string> = {
    checkmate: "Checkmate",
    stalemate: "Stalemate",
    timeout: "Won on time",
    resign: "By resignation",
    abandoned: "The other side left",
    draw_agreed: "Draw agreed",
    insufficient: "Not enough material to mate",
    repetition: "Threefold repetition",
    fifty_moves: "Fifty-move rule",
    all_home: "All four tokens home",
    rounds_over: "All rounds played",
    no_moves: "No moves left",
    reached_100: "Reached 100",
    all_solved: "Everyone solved it",
    time_up: "Time ran out",
  }
  return map[reason] ?? reason.replace(/_/g, " ")
}

/* ── Opening ─────────────────────────────────────────────────────────── */

/** Whether this device is connected to the live game server (Realtime Database). */
function useLiveConnected() {
  const [connected, setConnected] = React.useState<boolean | null>(null)
  React.useEffect(() => {
    try {
      return onValue(ref(liveDb(), ".info/connected"), (s) => setConnected(s.val() === true))
    } catch {
      return
    }
  }, [])
  return connected
}

/**
 * "Opening the room…", and if it takes long, what it's stuck on — so a
 * phone that can't get in says why instead of spinning forever.
 */
function RoomLoading({
  stage,
  error,
  signedIn,
  onBack,
}: {
  /** room: waiting for the room itself · seat: the room is here, taking your seat */
  stage: "room" | "seat"
  error: Error | null
  signedIn: boolean
  onBack: () => void
}) {
  const connected = useLiveConnected()
  const [slow, setSlow] = React.useState(false)
  React.useEffect(() => {
    const id = window.setTimeout(() => setSlow(true), 8000)
    return () => window.clearTimeout(id)
  }, [])
  if (!slow) return <FullScreenLoader label="Opening the room…" />
  const steps: { label: string; ok: boolean | null }[] = [
    { label: "Signed in", ok: signedIn },
    { label: "Connected to the game server", ok: connected },
    { label: "Room found", ok: stage === "seat" ? true : error ? false : null },
    { label: "Taking your seat", ok: stage === "seat" ? null : null },
  ]
  return (
    <>
      <AppHeader title="Game room" showBack onBack={onBack} />
      <PageContainer className="max-w-md">
        <Card>
          <CardContent className="flex flex-col gap-4 py-6">
            <div className="text-center">
              <p className="text-lg font-semibold">Still opening the room…</p>
              <p className="text-sm text-muted-foreground">
                {connected === false
                  ? "This phone can't reach the game server. Check the internet connection (mobile data or Wi-Fi), then try again."
                  : "This is taking longer than it should."}
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                      s.ok === true ? "bg-success" : s.ok === false ? "bg-destructive" : "bg-muted-foreground/40"
                    )}
                  >
                    {s.ok === true ? "✓" : s.ok === false ? "!" : "…"}
                  </span>
                  {s.label}
                </li>
              ))}
            </ul>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 font-mono text-xs break-words text-destructive">
                {error.message}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={onBack}>
                Back to games
              </Button>
              <Button onClick={() => window.location.reload()}>Try again</Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    </>
  )
}

/* ── Can't get in ────────────────────────────────────────────────────── */

function Blocked({
  title,
  text,
  action,
}: {
  title: string
  text: string
  /** A main button above "Back to games". */
  action?: { label: string; onClick: () => void }
}) {
  const exitGame = useGameExit(GAMES_TAB)
  return (
    <>
      <AppHeader title="Game room" showBack onBack={exitGame} />
      <PageContainer className="max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
            {action && (
              <Button className="mt-2 w-full" onClick={action.onClick}>
                {action.label}
              </Button>
            )}
            <Button className={action ? "w-full" : "mt-2"} variant={action ? "outline" : "default"} onClick={exitGame}>
              Back to games
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    </>
  )
}
