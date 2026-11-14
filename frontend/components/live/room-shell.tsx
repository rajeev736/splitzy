"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "nextjs-toploader/app"
import {
  Cancel01Icon,
  ChatIcon,
  Copy01Icon,
  CrownIcon,
  Logout01Icon,
  PlayIcon,
  Share08Icon,
  StickerIcon,
  Tick02Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { AppHeader } from "@/components/layout/app-header"
import { FullScreenLoader, PageContainer } from "@/components/layout/app-shell"
import { useSession } from "@/components/providers/session-provider"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { onValue, ref } from "firebase/database"

import { useLiveRoom, useRoomChildren, type LiveRoom } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import { useGameExit } from "@/lib/games-nav"
import { LiveGameLogo } from "@/components/live/live-game-logo"
import { LIVE_GAMES } from "@/lib/live/games"
import { roomLink } from "@/lib/live/room"
import type { ChatMessage, RoomMeta, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import {
  cancelCountdown,
  cleanupRoom,
  joinRoom,
  liveDb,
  kickPlayer,
  leaveRoom,
  rematch,
  startCountdown,
  startGame,
  type JoinOutcome,
} from "@/services/live-rooms"
import { GameView } from "./game-view"
import { InviteFriendsSheet } from "./invite-friends-sheet"
import { RoomChat } from "./room-chat"
import { ReactionsOverlay, StickerBar } from "./stickers"
import { VoiceBar } from "./voice-bar"

const GAMES_TAB = "/challenges?tab=live"
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

  // Take a seat (or come back to yours) as soon as the room is known
  const [join, setJoin] = React.useState<"idle" | JoinOutcome>("idle")
  const joining = React.useRef(false)
  React.useEffect(() => {
    if (
      !loaded ||
      notFound ||
      !user ||
      !meta ||
      me ||
      join !== "idle" ||
      joining.current
    )
      return
    joining.current = true
    joinRoom(user, code)
      .then(setJoin)
      .catch((e) => {
        toast.error(getErrorMessage(e, "Couldn't join the room"))
        setJoin("not_found")
      })
  }, [loaded, notFound, user, meta, me, join, code])

  // Referee: start the countdown when full, cancel it when someone leaves, start the game on time
  const starting = React.useRef(false)
  React.useEffect(() => {
    if (!isReferee || !meta || !me || me.left) return
    const active = players.filter((p) => !p.left).length
    if (meta.status === "lobby" && active >= meta.maxPlayers) {
      void startCountdown(code, serverNow()).catch(() => undefined)
    } else if (meta.status === "countdown" && active < meta.maxPlayers) {
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

  if (!loaded || (!me && join === "idle" && !notFound)) {
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
    />
  )
}

/* ── Lobby ───────────────────────────────────────────────────────────── */

function LobbyView({
  room,
  meta,
  me,
  onLeft,
}: {
  room: LiveRoom
  meta: RoomMeta
  me: RoomPlayer
  onLeft: () => void
}) {
  const { code, players, uid, isHost, now } = room
  const game = LIVE_GAMES[meta.game]
  const { copied, copy } = useCopyToClipboard()
  const [invite, setInvite] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)
  const [confirmLeave, setConfirmLeave] = React.useState(false)
  const [startPending, setStartPending] = React.useState(false)
  const active = players.filter((p) => !p.left)
  const canStart = isHost && active.length >= meta.minPlayers
  const countdown =
    meta.status === "countdown" && meta.startsAt
      ? Math.max(0, Math.ceil((meta.startsAt - now) / 1000))
      : null

  const leave = async () => {
    setLeaving(true)
    try {
      await leaveRoom(uid, code)
      onLeft()
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't leave"))
      setLeaving(false)
    }
  }
  const start = async () => {
    setStartPending(true)
    try {
      await startGame(code, meta, players)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't start"))
      setStartPending(false)
    }
  }
  const share = () => {
    const link = roomLink(code)
    if (typeof navigator.share === "function") {
      navigator
        .share({
          title: `Play ${game.name} on JoySplit`,
          text: `Join my ${game.name} room — code ${code}`,
          url: link,
        })
        .catch(() => undefined)
    } else void copy(link, "Link copied!")
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
            aria-label="Leave room"
            onClick={() => setConfirmLeave(true)}
          >
            <HugeiconsIcon icon={Logout01Icon} className="size-5" />
          </Button>
        }
      />
      <ReactionsOverlay code={code} />
      <PageContainer className="max-w-xl gap-4 pb-32">
        {/* Code + share: the way friends get in */}
        <Card className="gap-0 py-0">
          <div className="flex flex-col items-center gap-3 p-5 text-center">
            <LiveGameLogo game={game.id} className="size-14 rounded-xl" />
            <div>
              <p className="text-xs text-muted-foreground">Room code</p>
              <button
                type="button"
                onClick={() => copy(code, "Code copied!")}
                className="font-mono text-3xl font-bold tracking-[0.3em] transition-colors hover:text-primary"
                aria-label="Copy room code"
              >
                {code}
              </button>
            </div>
            <div className="grid w-full grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copy(roomLink(code), "Link copied!")}
              >
                <HugeiconsIcon
                  icon={copied ? Tick02Icon : Copy01Icon}
                  data-icon="inline-start"
                />
                Link
              </Button>
              <Button variant="outline" size="sm" onClick={share}>
                <HugeiconsIcon icon={Share08Icon} data-icon="inline-start" />
                Share
              </Button>
              <Button size="sm" onClick={() => setInvite(true)}>
                <HugeiconsIcon icon={UserAdd01Icon} data-icon="inline-start" />
                Invite
              </Button>
            </div>
          </div>
        </Card>

        {/* Seats */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Players{" "}
              <span className="font-normal text-muted-foreground">
                {active.length}/{meta.maxPlayers}
              </span>
            </h2>
            {meta.minPlayers > active.length && (
              <span className="text-xs text-muted-foreground">
                Need {meta.minPlayers - active.length} more
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: meta.maxPlayers }, (_, seat) => {
              const p = players.find((x) => x.seat === seat && !x.left)
              return p ? (
                <Seat
                  key={seat}
                  player={p}
                  isYou={p.uid === uid}
                  isHost={p.uid === meta.hostId}
                  canKick={isHost && p.uid !== uid}
                  code={code}
                />
              ) : (
                <div
                  key={seat}
                  className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground"
                >
                  <span className="size-9 rounded-full border border-dashed" />
                  Waiting…
                </div>
              )
            })}
          </div>
        </section>

        {/* Settings + how to play */}
        {game.options.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {game.options.map((o) => {
              const v = meta.options[o.key]
              const label =
                o.choices.find((c) => c.value === v)?.label ?? String(v)
              return (
                <span
                  key={o.key}
                  className="rounded-md border bg-card px-2 py-1 text-xs"
                >
                  <span className="text-muted-foreground">{o.label}: </span>
                  <span className="font-medium">{label}</span>
                </span>
              )
            })}
          </div>
        )}
        <details className="rounded-lg border bg-card px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">How to play</summary>
          <p className="mt-2 text-sm text-muted-foreground">{game.howTo}</p>
        </details>
      </PageContainer>

      {/* Start */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-xl flex-col gap-2">
          {countdown !== null ? (
            <>
              <p className="text-center text-sm font-medium">
                Everyone&apos;s here — starting in{" "}
                <span className="text-primary tabular-nums">{countdown}s</span>
              </p>
              {isHost && (
                <Button
                  size="lg"
                  className="h-11 w-full"
                  onClick={start}
                  disabled={startPending}
                >
                  {startPending ? (
                    <Spinner />
                  ) : (
                    <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
                  )}
                  Start now
                </Button>
              )}
            </>
          ) : isHost ? (
            <>
              <Button
                size="lg"
                className="h-11 w-full"
                onClick={start}
                disabled={!canStart || startPending}
              >
                {startPending ? (
                  <Spinner />
                ) : (
                  <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
                )}
                {canStart
                  ? active.length < meta.maxPlayers
                    ? `Start with ${active.length} players`
                    : "Start game"
                  : `Waiting for ${meta.minPlayers - active.length} more`}
              </Button>
              {canStart && active.length < meta.maxPlayers && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Starts by itself once all {meta.maxPlayers} seats are taken.
                </p>
              )}
            </>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Waiting for {meta.hostName.split(" ")[0]} to start…
            </p>
          )}
        </div>
      </div>

      <InviteFriendsSheet open={invite} onOpenChange={setInvite} meta={meta} />
      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave the room?"
        description={
          isHost && active.length > 1
            ? "The next player becomes the host."
            : undefined
        }
        confirmLabel="Leave"
        isPending={leaving}
        onConfirm={leave}
      />
      {/* Keep the user's own seat state fresh for the referee rule above */}
      <span hidden>{me.seat}</span>
    </>
  )
}

function Seat({
  player,
  isYou,
  isHost,
  canKick,
  code,
}: {
  player: RoomPlayer
  isYou: boolean
  isHost: boolean
  canKick: boolean
  code: string
}) {
  return (
    <div className="relative flex min-h-20 flex-col items-center justify-center gap-1 rounded-lg border bg-card px-2 py-3">
      <span className="relative">
        <UserAvatar
          src={player.photo}
          name={player.name}
          size="sm"
          className="size-9"
        />
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card",
            player.online ? "bg-success" : "bg-muted-foreground/50"
          )}
          aria-label={player.online ? "Online" : "Offline"}
        />
      </span>
      <span className="flex max-w-full items-center gap-1 text-xs font-medium">
        {isHost && (
          <HugeiconsIcon
            icon={CrownIcon}
            className="size-3.5 shrink-0 text-warning"
            aria-label="Host"
          />
        )}
        <span className="truncate">
          {isYou ? "You" : player.name.split(" ")[0]}
        </span>
      </span>
      {canKick && (
        <button
          type="button"
          aria-label={`Remove ${player.name}`}
          onClick={() =>
            void kickPlayer(code, player.uid).catch(() =>
              toast.error("Couldn't remove them")
            )
          }
          className="absolute top-1 right-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
        </button>
      )}
    </div>
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
          typing ? "pb-4" : stickers ? "pb-44" : "pb-28"
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
            : "Leaving now counts as giving up — the others play on without you."
        }
        destructive={!me.left}
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
  const { code, players, playersById, uid, isHost } = room
  const game = LIVE_GAMES[meta.game]
  const result = meta.result
  const winners = result?.winnerIds ?? []
  const iWon = winners.includes(uid)
  const [pending, setPending] = React.useState(false)

  const nameOf = (id: string) => playersById[id]?.name ?? "Someone"
  const headline =
    winners.length === 0
      ? "It's a draw"
      : iWon
        ? winners.length > 1
          ? "You share the win!"
          : "You won!"
        : `${winners.map((w) => nameOf(w).split(" ")[0]).join(" & ")} ${winners.length > 1 ? "win" : "wins"}`
  const ranking =
    result?.ranking ?? players.filter((p) => !p.left).map((p) => p.uid)

  const startRematch = async () => {
    if (!user) return
    setPending(true)
    try {
      const next = await rematch(user, meta)
      // Replace, not push: Back from the rematch goes to Games, not through old results
      router.replace(`/play/${next}`)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't start a rematch"))
      setPending(false)
    }
  }

  return (
    <>
      <AppHeader
        title={game.name}
        subtitle={`Room ${code}`}
        showBack
        onBack={exitGame}
      />
      <ReactionsOverlay code={code} />
      <PageContainer className="max-w-xl gap-4">
        <Card className="gap-0 py-0">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex -space-x-3">
              {(winners.length ? winners : ranking.slice(0, 1)).map((w) => (
                <UserAvatar
                  key={w}
                  src={playersById[w]?.photo}
                  name={nameOf(w)}
                  size="lg"
                  className="size-16 ring-4 ring-card"
                />
              ))}
            </div>
            <div>
              <p className="text-2xl font-bold">{headline}</p>
              {result?.reason && (
                <p className="text-xs text-muted-foreground">
                  {reasonText(result.reason)}
                </p>
              )}
            </div>
          </div>
          <ol className="divide-y border-t">
            {ranking.map((id, i) => {
              const p = playersById[id]
              const score = result?.scores?.[id]
              return (
                <li
                  key={id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    id === uid && "bg-primary/5"
                  )}
                >
                  <span className="w-5 text-center text-sm font-semibold text-muted-foreground tabular-nums">
                    {i + 1}
                  </span>
                  <UserAvatar src={p?.photo} name={p?.name ?? "?"} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {p?.name ?? "Someone"}
                    {id === uid && (
                      <span className="text-muted-foreground"> (you)</span>
                    )}
                  </span>
                  {score !== undefined && (
                    <span className="text-sm font-semibold tabular-nums">
                      {score}
                    </span>
                  )}
                  {winners.includes(id) && (
                    <HugeiconsIcon
                      icon={CrownIcon}
                      className="size-4 text-warning"
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </Card>

        <div className="flex flex-col gap-2">
          {meta.rematchCode ? (
            <Button
              size="lg"
              className="h-11 w-full"
              nativeButton={false}
              render={<Link href={`/play/${meta.rematchCode}`} replace />}
            >
              <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
              Join the rematch
            </Button>
          ) : isHost ? (
            <Button
              size="lg"
              className="h-11 w-full"
              onClick={startRematch}
              disabled={pending}
            >
              {pending ? (
                <Spinner />
              ) : (
                <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
              )}
              Rematch
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              {meta.hostName.split(" ")[0]} can start a rematch — you&apos;ll
              see it here.
            </p>
          )}
          <Button variant="outline" size="lg" className="h-11 w-full" onClick={exitGame}>
            Back to games
          </Button>
        </div>
        <div className="border-t pt-3">
          <StickerBar code={code} />
        </div>
      </PageContainer>
    </>
  )
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

function Blocked({ title, text }: { title: string; text: string }) {
  const exitGame = useGameExit(GAMES_TAB)
  return (
    <>
      <AppHeader title="Game room" showBack onBack={exitGame} />
      <PageContainer className="max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
            <Button className="mt-2" onClick={exitGame}>
              Back to games
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    </>
  )
}
