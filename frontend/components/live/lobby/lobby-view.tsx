"use client"

import * as React from "react"
import {
  ArrowLeft01Icon,
  ChatIcon,
  Copy01Icon,
  HelpCircleIcon,
  PlayIcon,
  StickerIcon,
  Tick02Icon,
  UserAdd01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { useRoomChildren, type LiveRoom } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import { LIVE_GAMES } from "@/lib/live/games"
import {
  benchedPlayer,
  canStart,
  freeSeats,
  isFull,
  isTeamRoom,
  playerInSeat,
  seatedPlayers,
  teamOfSeat,
} from "@/lib/live/seats"
import type { ChatMessage, RoomMeta, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import {
  kickPlayer,
  leaveRoom,
  moveSeat,
  startGame,
} from "@/services/live-rooms"
import { InviteFriendsSheet } from "../invite-friends-sheet"
import { RoomChat } from "../room-chat"
import { SoundMenu } from "../sound-settings"
import { ReactionsOverlay, StickerBar } from "../stickers"
import { VoiceBar } from "../voice-bar"
import { DuelScene } from "./duel-scene"
import { Gloss, LobbyStyles } from "./lobby-styles"
import { PartyScene } from "./party-scene"

const firstName = (p: { name: string }) => p.name.split(" ")[0]

/**
 * The waiting room, themed by game. Two-player games (Tic Tac Toe, Chess,
 * Checkers) get a matchmaking screen that turns into a VS when the opponent
 * arrives; the rest get their game's room with a banner per seat (Ludo teams:
 * two team banners and a bench for swapping). Voice, chat and stickers live
 * in the dock along the bottom; the room code and invites sit up top.
 */
export function LobbyView({
  room,
  meta,
  me,
  onLeft,
  onLeaving,
}: {
  room: LiveRoom
  meta: RoomMeta
  me: RoomPlayer
  /** After leaving: back to the games. */
  onLeft: () => void
  /** Right before leaving, so your own exit isn't taken for a kick. */
  onLeaving?: () => void
}) {
  const { code, players, uid, isHost, now, serverNow, voice } = room
  const game = LIVE_GAMES[meta.game]
  const duel = meta.maxPlayers === 2
  const team = isTeamRoom(meta)
  const { copied, copy } = useCopyToClipboard()
  const [invite, setInvite] = React.useState(false)
  const [howTo, setHowTo] = React.useState(false)
  const [stickers, setStickers] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)
  const [confirmLeave, setConfirmLeave] = React.useState(false)
  const [startPending, setStartPending] = React.useState(false)
  const [moving, setMoving] = React.useState(false)
  const active = players.filter((p) => !p.left)
  const ready = canStart(meta, players)
  const seated = seatedPlayers(meta, players).length
  const countdown =
    meta.status === "countdown" && meta.startsAt
      ? Math.max(0, Math.ceil((meta.startsAt - now) / 1000))
      : null

  const leave = async () => {
    setLeaving(true)
    onLeaving?.()
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
  const kick = (p: RoomPlayer) =>
    void kickPlayer(code, p.uid).catch(() =>
      toast.error(`Couldn't remove ${firstName(p)}`)
    )
  const move = async (seat: number) => {
    setMoving(true)
    try {
      const ok = await moveSeat(code, uid, seat)
      if (!ok) toast("Someone just took that seat")
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't switch seats"))
    } finally {
      setMoving(false)
    }
  }

  // Chat: a count on the Chat button and a short preview of what's new while it's closed
  const chat = useLobbyChat(code, uid, serverNow)

  const startBar = (
    <StartBar
      duel={duel}
      team={team}
      meta={meta}
      players={players}
      uid={uid}
      isHost={isHost}
      ready={ready}
      seated={seated}
      countdown={countdown}
      pending={startPending}
      onStart={start}
      onInvite={() => setInvite(true)}
    />
  )

  return (
    <div className="lb-root relative isolate h-svh min-h-[30rem] w-full overflow-hidden bg-[#150a2e] text-white md:h-[calc(100svh-2rem)]">
      <LobbyStyles />
      <ReactionsOverlay code={code} />

      {duel ? (
        <DuelScene
          seats={[playerInSeat(active, 0), playerInSeat(active, 1)]}
          meId={uid}
          hostId={meta.hostId}
          canKick={isHost}
          onKick={kick}
          onInvite={() => setInvite(true)}
        >
          <div className="absolute inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] flex flex-col items-center gap-2 px-4">
            {startBar}
          </div>
        </DuelScene>
      ) : (
        <PartyScene
          meta={meta}
          players={players}
          uid={uid}
          canKick={isHost}
          onKick={kick}
          onInvite={() => setInvite(true)}
          onMove={(seat) => void move(seat)}
          moving={moving}
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-2">
            {team && <TeamHint meta={meta} players={players} uid={uid} />}
            {startBar}
          </div>
        </PartyScene>
      )}

      {/* Top: leave, the game and room code, invite, how to play */}
      <div
        className={cn(
          // A soft scrim, so the title reads over any backdrop
          "absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/45 via-black/20 to-transparent px-3 pt-[calc(0.6rem+env(safe-area-inset-top,0px))] pb-5",
          !duel && "lg:pr-[22rem]"
        )}
      >
        <button
          type="button"
          aria-label="Leave the room"
          onClick={() => setConfirmLeave(true)}
          className="lb-glass flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            className="size-5"
            strokeWidth={2.4}
          />
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="lb-font truncate text-base font-extrabold [text-shadow:0_1px_3px_rgba(0,0,0,.45)]">
            {game.name}
          </p>
          <button
            type="button"
            onClick={() => copy(code, "Code copied!")}
            aria-label={`Room code ${code} — copy`}
            className="flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white"
          >
            Room <span className="font-mono tracking-[0.2em]">{code}</span>
            <HugeiconsIcon
              icon={copied ? Tick02Icon : Copy01Icon}
              className="size-3"
            />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setInvite(true)}
          className="lb-glass flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold"
        >
          <HugeiconsIcon icon={UserAdd01Icon} className="size-4" />
          Invite
        </button>
        <button
          type="button"
          aria-label="How to play"
          onClick={() => setHowTo(true)}
          className="lb-glass flex size-10 shrink-0 items-center justify-center rounded-full"
        >
          <HugeiconsIcon icon={HelpCircleIcon} className="size-5" />
        </button>
      </div>

      {/* Big screens: the chat stays open on the right (the duel keeps its full stage) */}
      {!duel && (
        <Card className="absolute top-3 right-4 bottom-[4.75rem] z-20 hidden w-80 flex-col gap-0 py-0 text-foreground shadow-xl lg:flex">
          <p className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
            <HugeiconsIcon
              icon={ChatIcon}
              className="size-4 text-muted-foreground"
            />
            Room chat
          </p>
          <RoomChat code={code} className="min-h-0 flex-1" />
        </Card>
      )}

      {/* Dock: voice, sounds, stickers, chat */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/92 text-foreground backdrop-blur-sm">
        {chat.preview && !stickers && (
          <button
            type="button"
            onClick={() => chat.open(true)}
            className={cn(
              "absolute right-3 bottom-full mb-2 flex max-w-[calc(100%-1.5rem)] animate-in items-center gap-2 rounded-full border bg-popover py-1.5 pr-3.5 pl-1.5 text-left text-sm shadow-lg fade-in-0 slide-in-from-bottom-2",
              !duel && "lg:hidden"
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <HugeiconsIcon icon={ChatIcon} className="size-4" />
            </span>
            <span className="min-w-0 truncate">
              <span className="font-semibold">
                {chat.preview.value.name.split(" ")[0]}:
              </span>{" "}
              {chat.preview.value.text}
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
          <Button
            variant={stickers ? "secondary" : "outline"}
            size="icon-sm"
            aria-label="Stickers"
            aria-pressed={stickers}
            onClick={() => setStickers((s) => !s)}
          >
            <HugeiconsIcon icon={StickerIcon} />
          </Button>
          <Button
            variant={chat.unread > 0 ? "default" : "outline"}
            size="sm"
            className={cn("relative ml-auto", !duel && "lg:hidden")}
            onClick={() => chat.open(true)}
            aria-label={chat.unread > 0 ? `Chat, ${chat.unread} new` : "Chat"}
          >
            <HugeiconsIcon icon={ChatIcon} data-icon="inline-start" />
            Chat
            {chat.unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white tabular-nums ring-2 ring-background">
                {chat.unread > 9 ? "9+" : chat.unread}
              </span>
            )}
          </Button>
        </div>
      </div>

      <Sheet open={chat.isOpen} onOpenChange={chat.open}>
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[75svh] w-full max-w-xl flex-col gap-0 rounded-t-2xl p-0"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-sm font-semibold">Room chat</SheetTitle>
          </SheetHeader>
          <RoomChat code={code} className="min-h-0 flex-1" autoFocus />
        </SheetContent>
      </Sheet>

      <Sheet open={howTo} onOpenChange={setHowTo}>
        <SheetContent
          side="bottom"
          className="mx-auto w-full max-w-xl gap-0 rounded-t-2xl p-0"
        >
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-sm font-semibold">
              How to play {game.name}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
            {game.options.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {game.options.map((o) => {
                  const v = meta.options[o.key]
                  return (
                    <span
                      key={o.key}
                      className="rounded-md border bg-card px-2 py-1 text-xs"
                    >
                      <span className="text-muted-foreground">{o.label}: </span>
                      <span className="font-medium">
                        {o.choices.find((c) => c.value === v)?.label ??
                          String(v)}
                      </span>
                    </span>
                  )
                })}
              </div>
            )}
            <p className="text-sm text-muted-foreground">{game.howTo}</p>
          </div>
        </SheetContent>
      </Sheet>

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
      {/* Keep the user's own seat state fresh for the referee rule */}
      <span hidden>{me.seat}</span>
    </div>
  )
}

/* ── Start ───────────────────────────────────────────────────────────── */

function StartBar({
  duel,
  team,
  meta,
  players,
  uid,
  isHost,
  ready,
  seated,
  countdown,
  pending,
  onStart,
  onInvite,
}: {
  duel: boolean
  team: boolean
  meta: RoomMeta
  players: RoomPlayer[]
  uid: string
  isHost: boolean
  ready: boolean
  seated: number
  countdown: number | null
  pending: boolean
  onStart: () => void
  onInvite: () => void
}) {
  const full = isFull(meta, players)
  const benched = benchedPlayer(meta, players)

  if (countdown !== null)
    return (
      <div className="flex flex-col items-center gap-2" aria-live="polite">
        <Gloss
          key={countdown}
          size={30}
          rim="#5b1a7a"
          tint="#ffe08a"
          className="lb-pop"
        >
          {countdown > 0 ? `Starting in ${countdown}` : "Here we go!"}
        </Gloss>
        {isHost && !duel && (
          <button
            type="button"
            onClick={onStart}
            disabled={pending}
            className="lb-glass rounded-full px-4 py-1.5 text-sm font-bold"
          >
            Start now
          </button>
        )}
      </div>
    )

  // Two players: nothing to press — it starts once the opponent is in
  if (duel) {
    if (full)
      return (
        <div className="flex flex-col items-center gap-2">
          <Gloss size={26} rim="#5b1a7a" tint="#ffe08a">
            Get ready…
          </Gloss>
          {isHost && (
            <button
              type="button"
              onClick={onStart}
              disabled={pending}
              className="lb-glass rounded-full px-4 py-1.5 text-sm font-bold"
            >
              Start now
            </button>
          )}
        </div>
      )
    return (
      <>
        <button
          type="button"
          onClick={onInvite}
          className="lb-gold flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-2xl text-lg"
        >
          <HugeiconsIcon
            icon={UserAdd01Icon}
            className="size-5"
            strokeWidth={2.4}
          />
          Invite a friend
        </button>
        <p className="text-center text-xs font-semibold text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,.4)]">
          The game starts as soon as they join
        </p>
      </>
    )
  }

  if (!isHost) {
    const host = players.find((p) => p.uid === meta.hostId)
    return (
      <p className="lb-glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
        <Spinner className="size-4" />
        {ready && host
          ? `Waiting for ${firstName(host)} to start…`
          : "Waiting for players…"}
      </p>
    )
  }

  const label = ready
    ? seated < meta.maxPlayers
      ? `Start with ${seated}`
      : "Start game"
    : benched
      ? benched.uid === uid
        ? "Take a seat first"
        : "Someone's on the bench"
      : team
        ? `Waiting for ${meta.maxPlayers - seated} more`
        : `Waiting for ${Math.max(1, meta.minPlayers - seated)} more`
  return (
    <>
      <button
        type="button"
        onClick={onStart}
        disabled={!ready || pending}
        className="lb-gold flex h-13 w-full max-w-xs items-center justify-center gap-2 rounded-2xl text-lg"
      >
        {pending ? (
          <Spinner className="size-5" />
        ) : (
          ready && (
            <HugeiconsIcon
              icon={PlayIcon}
              className="size-5"
              strokeWidth={2.4}
            />
          )
        )}
        {label}
      </button>
      {ready && !full && (
        <p className="text-center text-[11px] font-semibold text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,.4)]">
          Starts by itself once all {meta.maxPlayers} seats are taken
        </p>
      )}
    </>
  )
}

/** Team rooms: one line on how to switch sides, for where things stand. */
function TeamHint({
  meta,
  players,
  uid,
}: {
  meta: RoomMeta
  players: RoomPlayer[]
  uid: string
}) {
  const bench = benchedPlayer(meta, players)
  const free = freeSeats(meta, players)
  const me = players.find((p) => p.uid === uid && !p.left)
  const otherSide =
    !!me && free.some((s) => teamOfSeat(s) !== teamOfSeat(me.seat))
  const text = bench
    ? bench.uid === uid
      ? "You're on the bench — tap the free seat to sit down"
      : `${firstName(bench)} is swapping — move into the free seat and they take yours`
    : otherSide
      ? "Tap a free seat on the other side to switch teams"
      : free.length > 0
        ? "Your team has an open seat — invite a friend to it"
        : "To swap sides, one player steps onto the bench first"
  return (
    <p
      className={cn(
        "lb-glass rounded-full px-3 py-1 text-center text-[11px] font-semibold",
        bench && "ring-2 ring-[#ffd24a]"
      )}
      aria-live="polite"
    >
      {text}
    </p>
  )
}

/* ── Chat ────────────────────────────────────────────────────────────── */

/** The chat sheet's state, the unread count, and a 4-second preview of the newest message. */
function useLobbyChat(code: string, uid: string, serverNow: () => number) {
  const messages = useRoomChildren<ChatMessage>(code, "chat", 200)
  const [isOpen, setOpen] = React.useState(false)
  const [readUpTo, setReadUpTo] = React.useState<number | null>(null)
  React.useEffect(() => {
    const id = window.setTimeout(() => setReadUpTo(serverNow()), 0)
    return () => window.clearTimeout(id)
  }, [serverNow])
  const open = React.useCallback(
    (o: boolean) => {
      setOpen(o)
      setReadUpTo(serverNow())
    },
    [serverNow]
  )
  const unread =
    isOpen || readUpTo === null
      ? []
      : messages.filter(
          (m) =>
            m.value.uid !== uid &&
            (m.value.kind ?? "chat") === "chat" &&
            m.value.at > readUpTo
        )
  const latest = unread.at(-1)
  const [hidden, setHidden] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!latest) return
    const id = window.setTimeout(() => setHidden(latest.key), 4000)
    return () => window.clearTimeout(id)
  }, [latest])
  return {
    isOpen,
    open,
    unread: unread.length,
    preview: latest && hidden !== latest.key ? latest : null,
  }
}
