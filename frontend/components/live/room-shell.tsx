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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { useLiveRoom, type LiveRoom } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import { LIVE_GAMES } from "@/lib/live/games"
import { roomLink } from "@/lib/live/room"
import type { RoomMeta, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import {
  cancelCountdown,
  cleanupRoom,
  joinRoom,
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
  const router = useRouter()
  const { user } = useSession()
  const room = useLiveRoom(code)
  const { meta, players, me, isReferee, loaded, notFound, now, serverNow } = room

  // Take a seat (or come back to yours) as soon as the room is known
  const [join, setJoin] = React.useState<"idle" | JoinOutcome>("idle")
  const joining = React.useRef(false)
  React.useEffect(() => {
    if (!loaded || notFound || !user || !meta || me || join !== "idle" || joining.current) return
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
    } else if (meta.status === "countdown" && meta.startsAt && now >= meta.startsAt && !starting.current) {
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
    return <FullScreenLoader label="Opening the room…" />
  }
  if (notFound || !meta || join === "not_found") {
    return <Blocked title="Room not found" text="This room may have ended and been cleared, or the code is wrong." />
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
      return <Blocked title="Already playing" text="This game started without you. Ask for a rematch when it's over!" />
    }
    // Ended: anyone with the link can see how it went
  }

  if (meta.status === "ended") return <EndedView room={room} meta={meta} />
  if (!me) return <Blocked title="Already playing" text="This game started without you." />
  if (meta.status === "playing") return <PlayingView room={room} meta={meta} me={me} />
  return <LobbyView room={room} meta={meta} me={me} onLeft={() => router.replace(GAMES_TAB)} />
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
  const countdown = meta.status === "countdown" && meta.startsAt ? Math.max(0, Math.ceil((meta.startsAt - now) / 1000)) : null

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
        .share({ title: `Play ${game.name} on JoySplit`, text: `Join my ${game.name} room — code ${code}`, url: link })
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
          <Button variant="ghost" size="icon" aria-label="Leave room" onClick={() => setConfirmLeave(true)}>
            <HugeiconsIcon icon={Logout01Icon} className="size-5" />
          </Button>
        }
      />
      <ReactionsOverlay code={code} />
      <PageContainer className="max-w-xl gap-4 pb-32">
        {/* Code + share: the way friends get in */}
        <Card className="gap-0 py-0">
          <div className="flex flex-col items-center gap-3 p-5 text-center">
            <span className={cn("flex size-14 items-center justify-center rounded-xl text-3xl", game.tone)} aria-hidden>
              {game.emoji}
            </span>
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
              <Button variant="outline" size="sm" onClick={() => copy(roomLink(code), "Link copied!")}>
                <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} data-icon="inline-start" />
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
              <span className="text-xs text-muted-foreground">Need {meta.minPlayers - active.length} more</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: meta.maxPlayers }, (_, seat) => {
              const p = players.find((x) => x.seat === seat && !x.left)
              return p ? (
                <Seat key={seat} player={p} isYou={p.uid === uid} isHost={p.uid === meta.hostId} canKick={isHost && p.uid !== uid} code={code} />
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
              const label = o.choices.find((c) => c.value === v)?.label ?? String(v)
              return (
                <span key={o.key} className="rounded-md border bg-card px-2 py-1 text-xs">
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
                Everyone&apos;s here — starting in <span className="tabular-nums text-primary">{countdown}s</span>
              </p>
              {isHost && (
                <Button size="lg" className="h-11 w-full" onClick={start} disabled={startPending}>
                  {startPending ? <Spinner /> : <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />}
                  Start now
                </Button>
              )}
            </>
          ) : isHost ? (
            <>
              <Button size="lg" className="h-11 w-full" onClick={start} disabled={!canStart || startPending}>
                {startPending ? <Spinner /> : <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />}
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
        description={isHost && active.length > 1 ? "The next player becomes the host." : undefined}
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
        <UserAvatar src={player.photo} name={player.name} size="sm" className="size-9" />
        <span
          className={cn(
            "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card",
            player.online ? "bg-success" : "bg-muted-foreground/50"
          )}
          aria-label={player.online ? "Online" : "Offline"}
        />
      </span>
      <span className="flex max-w-full items-center gap-1 text-xs font-medium">
        {isHost && <HugeiconsIcon icon={CrownIcon} className="size-3.5 shrink-0 text-warning" aria-label="Host" />}
        <span className="truncate">{isYou ? "You" : player.name.split(" ")[0]}</span>
      </span>
      {canKick && (
        <button
          type="button"
          aria-label={`Remove ${player.name}`}
          onClick={() => void kickPlayer(code, player.uid).catch(() => toast.error("Couldn't remove them"))}
          className="absolute top-1 right-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
        </button>
      )}
    </div>
  )
}

/* ── Playing ─────────────────────────────────────────────────────────── */

function PlayingView({ room, meta, me }: { room: LiveRoom; meta: RoomMeta; me: RoomPlayer }) {
  const router = useRouter()
  const { code, players, uid, isReferee, now, serverNow, voice } = room
  const game = LIVE_GAMES[meta.game]
  const [stickers, setStickers] = React.useState(false)
  const [chat, setChat] = React.useState(false)
  const [confirmLeave, setConfirmLeave] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)
  const hasOwnChat = meta.game === "scribble"

  const leave = async () => {
    setLeaving(true)
    try {
      await leaveRoom(uid, code)
      router.replace(GAMES_TAB)
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
          <Button variant="ghost" size="icon" aria-label="Leave game" onClick={() => setConfirmLeave(true)}>
            <HugeiconsIcon icon={Logout01Icon} className="size-5" />
          </Button>
        }
      />
      <ReactionsOverlay code={code} />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-2 pt-2 pb-28 sm:px-6 sm:pt-4">
        {me.left ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              You left this game. You can still watch how it ends.
            </CardContent>
          </Card>
        ) : null}
        <GameView code={code} meta={meta} players={players} uid={uid} me={me} isReferee={isReferee} now={now} serverNow={serverNow} />
      </div>

      {/* Dock: voice, stickers, chat */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur-sm">
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
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setChat(true)}>
              <HugeiconsIcon icon={ChatIcon} data-icon="inline-start" />
              Chat
            </Button>
          )}
        </div>
      </div>

      {!hasOwnChat && (
        <Sheet open={chat} onOpenChange={setChat}>
          <SheetContent side="bottom" className="mx-auto flex h-[70svh] w-full max-w-xl flex-col gap-0 rounded-t-lg p-0">
            <SheetHeader className="border-b px-4 py-3">
              <SheetTitle className="text-sm font-semibold">Room chat</SheetTitle>
            </SheetHeader>
            <RoomChat code={code} className="min-h-0 flex-1" autoFocus />
          </SheetContent>
        </Sheet>
      )}

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Leave the game?"
        description={me.left ? undefined : "Leaving now counts as giving up — the others play on without you."}
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
  const ranking = result?.ranking ?? players.filter((p) => !p.left).map((p) => p.uid)

  const startRematch = async () => {
    if (!user) return
    setPending(true)
    try {
      const next = await rematch(user, meta)
      router.push(`/play/${next}`)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't start a rematch"))
      setPending(false)
    }
  }

  return (
    <>
      <AppHeader title={game.name} subtitle={`Room ${code}`} showBack onBack={() => router.replace(GAMES_TAB)} />
      <ReactionsOverlay code={code} />
      <PageContainer className="max-w-xl gap-4">
        <Card className="gap-0 py-0">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex -space-x-3">
              {(winners.length ? winners : ranking.slice(0, 1)).map((w) => (
                <UserAvatar key={w} src={playersById[w]?.photo} name={nameOf(w)} size="lg" className="size-16 ring-4 ring-card" />
              ))}
            </div>
            <div>
              <p className="text-2xl font-bold">{headline}</p>
              {result?.reason && <p className="text-xs text-muted-foreground">{reasonText(result.reason)}</p>}
            </div>
          </div>
          <ol className="divide-y border-t">
            {ranking.map((id, i) => {
              const p = playersById[id]
              const score = result?.scores?.[id]
              return (
                <li key={id} className={cn("flex items-center gap-3 px-4 py-2.5", id === uid && "bg-primary/5")}>
                  <span className="w-5 text-center text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                  <UserAvatar src={p?.photo} name={p?.name ?? "?"} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {p?.name ?? "Someone"}
                    {id === uid && <span className="text-muted-foreground"> (you)</span>}
                  </span>
                  {score !== undefined && <span className="text-sm font-semibold tabular-nums">{score}</span>}
                  {winners.includes(id) && <HugeiconsIcon icon={CrownIcon} className="size-4 text-warning" />}
                </li>
              )
            })}
          </ol>
        </Card>

        <div className="flex flex-col gap-2">
          {meta.rematchCode ? (
            <Button size="lg" className="h-11 w-full" nativeButton={false} render={<Link href={`/play/${meta.rematchCode}`} />}>
              <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
              Join the rematch
            </Button>
          ) : isHost ? (
            <Button size="lg" className="h-11 w-full" onClick={startRematch} disabled={pending}>
              {pending ? <Spinner /> : <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />}
              Rematch
            </Button>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              {meta.hostName.split(" ")[0]} can start a rematch — you&apos;ll see it here.
            </p>
          )}
          <Button variant="outline" size="lg" className="h-11 w-full" nativeButton={false} render={<Link href={GAMES_TAB} />}>
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

/* ── Can't get in ────────────────────────────────────────────────────── */

function Blocked({ title, text }: { title: string; text: string }) {
  return (
    <>
      <AppHeader title="Game room" showBack />
      <PageContainer className="max-w-md">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-lg font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{text}</p>
            <Button className="mt-2" nativeButton={false} render={<Link href={GAMES_TAB} />}>
              Back to games
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    </>
  )
}
