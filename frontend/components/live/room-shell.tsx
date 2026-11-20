"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import {
  ChatIcon,
  Logout03Icon,
  Settings02Icon,
  Home01Icon,
  StickerIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"
import { get, onValue, ref } from "firebase/database"

import {
  GameButton,
  GameDialog,
  GameIconButton,
  GameNote,
  GamePanel,
  GameScreen,
  GameTopBar,
} from "@/components/game-ui/kit"
import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { useSession } from "@/components/providers/session-provider"
import { Spinner } from "@/components/ui/spinner"
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
  deleteRoom,
  joinRoom,
  liveDb,
  leaveRoom,
  rematch,
  roomRef,
  setPlayerLevel,
  startCountdown,
  startGame,
  type JoinOutcome,
} from "@/services/live-rooms"
import { claimActivity } from "@/services/presence"
import { GameView } from "./game-view"
import { LiveGameLogo } from "./live-game-logo"
import { LobbyView } from "./lobby/lobby-view"
import { playSound } from "@/lib/live/sound"
import { RoomChat } from "./room-chat"
import { SoundSettingsPanel } from "./sound-settings"
import { BoardThemePicker } from "./board-theme-picker"
import { ResultScreen, type ResultRow, type ResultTone } from "./result-screen"
import { ReactionsOverlay, StickerBar } from "./stickers"
import { VoiceBar } from "./voice-bar"

const GAMES_TAB = "/challenges?tab=live"

/**
 * The group's game room (components/live/lounge) wraps a room: nobody is
 * turned away (a full or running game is watched), there's no lobby (the
 * leader starts once everyone's ready, and the game begins as soon as
 * they're seated), and after the result everyone goes back to the room.
 */
export interface LoungeLink {
  groupName: string
  /** From the result back to the group's room, where the leader picks the next game. */
  backToRoom: () => void
  /** Out of the lounge, back to the group. */
  exit: () => void
}

/** A group round still gathering its players after this long has failed to start. */
const ROUND_GATHER_MS = 12_000

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

/** Someone watching a game they have no seat in (the group's game room). */
function spectatorOf(uid: string, name: string): RoomPlayer {
  return { uid, name, seat: 0, joinedAt: 0, online: false, lastSeen: 0, left: true }
}

/**
 * One live room from start to finish: joins you on arrival, the lobby while
 * seats fill, a countdown when they're all taken (or the host starts early),
 * the game, then the result with a rematch. The referee device (see
 * lib/live/room.ts) performs the automatic steps.
 */
export function RoomShell({ code, lounge }: { code: string; lounge?: LoungeLink }) {
  const gameExit = useGameExit(GAMES_TAB)
  const exitGame = lounge?.exit ?? gameExit
  const { user } = useSession()
  const room = useLiveRoom(code)
  const { meta, players, me, isReferee, loaded, notFound, now, serverNow } = room
  // Your level (from your wallet) rides on your seat, for everyone's badges
  const wallet = useWallet()
  const level = wallet ? levelOf(liveXp(wallet)) : undefined

  // Take a seat (or come back to yours) as soon as the room is known — unless the host removed you
  const [join, setJoin] = React.useState<"idle" | JoinOutcome>("idle")
  const joining = React.useRef(false)
  // A join on its way: a seat seen now may be this device's own write, not yet accepted
  const joinInFlight = React.useRef(false)
  const [kicked, setKicked] = React.useState(() => wasKicked(code))
  React.useEffect(() => {
    if (!loaded || notFound || !user || !meta || me || kicked || join !== "idle" || joining.current) return
    joining.current = true
    joinInFlight.current = true
    joinRoom(user, code, level)
      .then((outcome) => {
        joinInFlight.current = false
        setJoin(outcome)
      })
      .catch((e) => {
        joinInFlight.current = false
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

  // The host removed you from the lobby: out you go, and you stay out until you choose to join again.
  // Only a seat the server accepted counts, and the loss is checked on the server first —
  // a refused join (shown for a moment, then rolled back) or a closing room is not a kick.
  const seatedHere = React.useRef(false)
  // The check outlives re-renders (the countdown stopping as you go is part of the same kick)
  const kickCheck = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => window.clearTimeout(kickCheck.current), [])
  React.useEffect(() => {
    if (me && !me.left) {
      if (!joinInFlight.current) seatedHere.current = true
      return
    }
    if (!seatedHere.current || me || !meta || !isJoinable(meta) || leavingRooms.has(code) || !user) return
    seatedHere.current = false
    window.clearTimeout(kickCheck.current)
    kickCheck.current = window.setTimeout(() => {
      void Promise.all([get(roomRef(code, "meta")), get(roomRef(code, `players/${user.uid}`))])
        .then(([m, p]) => {
          const now = m.val() as RoomMeta | null
          if (!now || !isJoinable(now) || p.exists() || leavingRooms.has(code)) return
          markKicked(code, true)
          toast.error("The host removed you from the room")
          exitGame()
        })
        .catch(() => undefined)
    }, 1200)
  }, [me, meta, code, exitGame, user, join])

  // What you're doing, for friends deciding whether to invite you: playing, or in a room
  const seatedNow = !!me && !me.left
  const playingNow = seatedNow && meta?.status === "playing"
  const metaGame = meta?.game
  React.useEffect(() => {
    if (!loaded) return
    return claimActivity(playingNow ? "game" : "room", playingNow ? metaGame : undefined)
  }, [loaded, playingNow, metaGame])

  // Referee: start the countdown when full, cancel it when someone leaves, start the game on time
  const starting = React.useRef(false)
  React.useEffect(() => {
    if (!isReferee || !meta || !me || me.left) return
    // A group round: no lobby, no countdown — straight in once everyone picked is seated
    // (or, after a while, with whoever made it; if that's too few, the round is called off)
    if (meta.lounge) {
      if (meta.status !== "lobby" && meta.status !== "countdown") return
      if (starting.current) return
      const seated = new Set(players.filter((p) => !p.left).map((p) => p.uid))
      const everyone = (meta.only ?? []).every((id) => seated.has(id))
      const late = now - meta.createdAt > ROUND_GATHER_MS
      if (!everyone && !late) return
      starting.current = true
      startGame(code, meta, players).catch(() => {
        if (late && meta.hostId === me.uid) void deleteRoom(code).catch(() => undefined)
        else starting.current = false
      })
      return
    }
    // Every seat taken (team rooms: nobody waiting on the bench)
    const full = isFull(meta, players)
    if (meta.status === "lobby" && full) {
      void startCountdown(code, serverNow()).catch(() => undefined)
    } else if (meta.status === "countdown" && !full) {
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

  if (kicked && !me && meta && isJoinable(meta)) {
    return (
      <Blocked
        title="Removed from the room"
        text="The host took you out of this room. You can ask to join again."
        onBack={exitGame}
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
    return <RoomLoading stage={!loaded ? "room" : "seat"} error={room.error} signedIn={!!user} onBack={exitGame} />
  }
  if (notFound || !meta || join === "not_found") {
    return (
      <Blocked
        title="Room not found"
        text="This room has ended and been cleared, or the code is wrong."
        onBack={exitGame}
      />
    )
  }

  if (meta.status === "ended") return <EndedView room={room} meta={meta} lounge={lounge} onExit={exitGame} />

  // A group round being gathered: everyone (players and watchers) sees who's coming in
  if (meta.lounge && meta.status !== "playing") return <GatheringView meta={meta} players={players} onBack={exitGame} />

  // No seat: the group's game room lets you watch; anywhere else you're turned away
  const spectator = !me && user ? spectatorOf(user.uid, user.displayName) : null
  if (!me) {
    if (lounge && spectator) {
      if (meta.status === "playing") return <PlayingView room={room} meta={meta} me={spectator} spectating lounge={lounge} onExit={exitGame} />
      return <WatchingLobby meta={meta} players={players} onBack={exitGame} />
    }
    if (join === "private") {
      return (
        <Blocked
          title="Private game"
          text={`This ${LIVE_GAMES[meta.game].name} game is a discount challenge between two friends — only they can play in it.`}
          onBack={exitGame}
        />
      )
    }
    if (join === "full") {
      return (
        <Blocked
          title="Room is full"
          text={`All ${meta.maxPlayers} seats in this ${LIVE_GAMES[meta.game].name} room are taken. Ask the host for a new room, or start your own.`}
          onBack={exitGame}
        />
      )
    }
    return (
      <Blocked title="Already playing" text="This game started without you. Ask for a rematch when it's over!" onBack={exitGame} />
    )
  }
  if (meta.status === "playing") return <PlayingView room={room} meta={meta} me={me} lounge={lounge} onExit={exitGame} />
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

const THEMED: LiveGameId[] = ["ludo", "chess", "snakes3d", "tictactoe"]
/** Games drawn edge to edge on their own backdrop (components/live/game-backdrop). */
const BACKDROP_GAMES: LiveGameId[] = ["ludo", "snakes", "snakes3d"]

function PlayingView({
  room,
  meta,
  me,
  spectating = false,
  lounge,
  onExit,
}: {
  room: LiveRoom
  meta: RoomMeta
  me: RoomPlayer
  /** Watching without a seat (the group's game room). */
  spectating?: boolean
  lounge?: LoungeLink
  onExit: () => void
}) {
  const { code, players, uid, isReferee, now, serverNow, voice } = room
  // Already finished (a race game)? Then leaving keeps your place instead of giving up
  const { data: gameState } = useRoomNode<RaceState>(code, "state")
  const donePlace = me.left ? null : finishedPlace(meta.game, gameState, uid)
  const game = LIVE_GAMES[meta.game]
  const [stickers, setStickers] = React.useState(false)
  // While someone types (chat / guesses) the phone keyboard is up: the dock steps aside
  const [typing, setTyping] = React.useState(false)
  React.useEffect(() => {
    const isField = (t: EventTarget | null) => t instanceof HTMLElement && t.matches("input, textarea")
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
  // The two top-right buttons' panels: settings (sound, board look) and the leave check
  const [panel, setPanel] = React.useState<"settings" | "leave" | null>(null)
  const [leaving, setLeaving] = React.useState(false)
  const hasOwnChat = meta.game === "scribble"
  // Only seated players can talk, chat and throw stickers (database.rules.json)
  const seated = !spectating

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
      : messages.filter((m) => m.value.uid !== uid && (m.value.kind ?? "chat") === "chat" && m.value.at > readUpTo)
  const latest = unread.at(-1)
  const [hiddenPreview, setHiddenPreview] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (!latest) return
    const id = window.setTimeout(() => setHiddenPreview(latest.key), 4000)
    return () => window.clearTimeout(id)
  }, [latest])
  const preview = latest && hiddenPreview !== latest.key ? latest : null

  // Escape asks before leaving instead of dropping you out
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !chat) setPanel((p) => (p ? null : "leave"))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [chat])

  const leave = async () => {
    if (spectating || me.left) {
      onExit()
      return
    }
    setLeaving(true)
    try {
      await leaveRoom(uid, code)
      onExit()
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't leave"))
      setLeaving(false)
    }
  }
  const leaveText = spectating
    ? "You're only watching — the game goes on without you."
    : me.left
      ? "You've already left this game."
      : donePlace !== null
        ? `You've finished ${ordinal(donePlace)} — your place is kept. You can come back to watch the rest.`
        : "Leaving now counts as giving up — the others play on without you."
  const risky = !spectating && !me.left && donePlace === null

  return (
    <GameScreen className="min-h-svh">
      <GameTopBar
        title={game.name}
        subtitle={lounge ? `${lounge.groupName} · game room` : `Room ${code}`}
        right={
          <>
            {spectating ? (
              <span className="gu-chip">
                <HugeiconsIcon icon={ViewIcon} className="size-3.5" strokeWidth={2.4} />
                Watching
              </span>
            ) : null}
            <GameIconButton icon={Settings02Icon} label="Settings" tone="cream" size="sm" onClick={() => setPanel("settings")} />
            <GameIconButton
              icon={Logout03Icon}
              label={spectating ? "Stop watching" : "Leave game"}
              tone="red"
              size="sm"
              className="ml-1.5"
              onClick={() => setPanel("leave")}
            />
          </>
        }
        // Board games fill the screen with their own colours: a soft shade keeps the bar readable on them
        className={cn("bg-gradient-to-b to-transparent", BACKDROP_GAMES.includes(meta.game) ? "from-black/30" : "from-[#3f95ee]")}
      />
      <ReactionsOverlay code={code} />
      <div
        className={cn(
          "mx-auto flex w-full max-w-3xl flex-1 flex-col px-2 pt-1 sm:px-6 sm:pt-2",
          // Big screens: the game, with the chat open beside it (Scribble has its own)
          !hasOwnChat && seated && "lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5",
          // Room under the dock, which grows when the sticker row is open
          typing ? "pb-4" : stickers ? "pb-44" : "pb-28 md:pb-24"
        )}
      >
        <div className="flex min-w-0 flex-col gap-2">
          {spectating || me.left ? (
            <GameNote className="py-2.5 text-[13px]">
              {spectating
                ? "You're watching this game. When it ends you can jump into the next one."
                : "You left this game. You can still watch how it ends."}
            </GameNote>
          ) : null}
          <GameView
            code={code}
            meta={meta}
            players={players}
            uid={uid}
            me={me}
            isReferee={isReferee && seated}
            now={now}
            serverNow={serverNow}
          />
        </div>
        {!hasOwnChat && seated && (
          <div className="gu-panel-flat sticky top-[calc(4.5rem+env(safe-area-inset-top,0px))] hidden h-[calc(100svh-11rem)] max-h-[720px] min-h-[360px] flex-col overflow-hidden lg:flex">
            <p className="flex items-center gap-2 border-b border-[var(--gu-line)] px-4 py-2.5 font-bold">
              <HugeiconsIcon icon={ChatIcon} className="size-4" strokeWidth={2.4} />
              Room chat
            </p>
            <RoomChat code={code} className="min-h-0 flex-1 bg-white/60" />
          </div>
        )}
      </div>

      {/* Dock: voice, stickers, chat (games measure it to fit above it) */}
      {seated ? (
        <div data-room-dock className={cn("pb-safe fixed inset-x-0 bottom-0 z-30 px-2", typing && "hidden md:block")}>
          {/* A new message while the chat is closed: who said what, tap to open */}
          {preview && !stickers && (
            <button
              type="button"
              onClick={() => openChat(true)}
              className="gu-panel-flat absolute right-3 bottom-full mb-2 flex max-w-[calc(100%-1.5rem)] items-center gap-2 !rounded-full py-1.5 pr-3.5 pl-1.5 text-left text-sm animate-in fade-in-0 slide-in-from-bottom-2 lg:hidden"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--gu-blue)] text-white">
                <HugeiconsIcon icon={ChatIcon} className="size-4" />
              </span>
              <span className="min-w-0 truncate">
                <span className="font-bold">{preview.value.name.split(" ")[0]}:</span> {preview.value.text}
              </span>
            </button>
          )}
          <div className="gu mx-auto mb-2 max-w-3xl overflow-hidden rounded-[22px] bg-[var(--gu-cream)] shadow-[0_0_0_4px_var(--gu-frame),0_5px_0_3px_var(--gu-frame-deep),0_10px_20px_rgba(30,40,110,.25)]">
            {stickers && (
              <div className="border-b border-[var(--gu-line)] px-3">
                <StickerBar code={code} />
              </div>
            )}
            <div className="flex items-center gap-2 px-2.5 py-2">
              <VoiceBar code={code} uid={uid} players={players} voice={voice} className="min-w-0" />
              <span className="flex-1" />
              <GameIconButton
                icon={StickerIcon}
                label={stickers ? "Hide stickers" : "Stickers"}
                tone={stickers ? "purple" : "cream"}
                size="sm"
                aria-pressed={stickers}
                onClick={() => setStickers((s) => !s)}
              />
              {!hasOwnChat && (
                <GameIconButton
                  icon={ChatIcon}
                  label={unread.length > 0 ? `Chat, ${unread.length} new` : "Chat"}
                  tone={unread.length > 0 ? "blue" : "cream"}
                  size="sm"
                  className="lg:hidden"
                  badge={unread.length > 0 ? (unread.length > 9 ? "9+" : unread.length) : undefined}
                  onClick={() => openChat(true)}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {!hasOwnChat && seated && chat ? (
        <div className="gu fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Room chat">
          <button type="button" aria-label="Close chat" className="gu-scrim absolute inset-0" onClick={() => openChat(false)} />
          <div className="gu-pop relative mx-2 mb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] flex h-[72svh] w-full max-w-xl flex-col">
            <GamePanel title="Chat" onClose={() => openChat(false)} className="flex min-h-0 flex-1 flex-col" bodyClassName="flex min-h-0 flex-1 flex-col !p-0 !pt-7">
              <RoomChat code={code} className="min-h-0 flex-1" autoFocus />
            </GamePanel>
          </div>
        </div>
      ) : null}

      {/* Settings: sounds and the board look */}
      <GameDialog open={panel === "settings"} onClose={() => setPanel(null)} title="Settings">
        <div className="flex flex-col gap-4">
          <SoundSettingsPanel />
            {THEMED.includes(meta.game) && (
              <div className="flex items-center justify-between gap-3 border-t border-[var(--gu-line)] pt-3">
                <span className="gu-label">Board look</span>
                <BoardThemePicker game={meta.game as "ludo" | "chess" | "snakes3d" | "tictactoe"} />
              </div>
            )}
          <GameButton tone="green" className="w-full" onClick={() => setPanel(null)}>
            Done
          </GameButton>
        </div>
      </GameDialog>

      {/* Leave: the same check as before, in one tap from the red button */}
      <GameDialog open={panel === "leave"} onClose={() => setPanel(null)} title="Leave?">
        <div className="flex flex-col gap-4 text-center">
          <p className="text-[15px] font-semibold text-[var(--gu-ink-soft)]">{leaveText}</p>
          <div className="grid grid-cols-2 gap-3">
            <GameButton tone="cream" onClick={() => setPanel(null)} disabled={leaving}>
              Stay
            </GameButton>
            <GameButton tone={risky ? "red" : "orange"} onClick={() => void leave()} disabled={leaving}>
              {leaving ? <Spinner className="size-5" /> : null}
              Leave
            </GameButton>
          </div>
        </div>
      </GameDialog>
    </GameScreen>
  )
}

/* ── The group's game room: a full lobby, watched ────────────────────── */

function WatchingLobby({ meta, players, onBack }: { meta: RoomMeta; players: RoomPlayer[]; onBack: () => void }) {
  const game = LIVE_GAMES[meta.game]
  const seated = players.filter((p) => !p.left)
  return (
    <GameScreen>
      <GameTopBar title={game.name} subtitle="Game room" onBack={onBack} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 pb-10">
        <GamePanel title="Full house">
          <div className="flex flex-col items-center gap-4 text-center">
            <LiveGameLogo game={meta.game} className="size-20 rounded-3xl" />
            <p className="text-[15px] font-semibold text-[var(--gu-ink-soft)]">
              All {meta.maxPlayers} seats are taken. You&apos;ll watch this game — when it ends, you can play the next one.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {seated.map((p) => (
                <span key={p.uid} className="flex w-16 flex-col items-center gap-1">
                  <GameAvatar uid={p.uid} character={p.avatar} photo={p.photo} name={p.name} frame={p.frame} size={48} />
                  <span className="w-full truncate text-xs font-bold">{p.name.split(" ")[0]}</span>
                </span>
              ))}
            </div>
            <p className="flex items-center gap-2 text-sm font-bold text-[var(--gu-green-deep)]">
              <Spinner className="size-4" /> Starting soon…
            </p>
          </div>
        </GamePanel>
      </div>
    </GameScreen>
  )
}

/**
 * A group round, the second between the leader's Start and the game: the
 * players taking their seats. No lobby — it starts by itself as they land.
 */
function GatheringView({ meta, players, onBack }: { meta: RoomMeta; players: RoomPlayer[]; onBack: () => void }) {
  const game = LIVE_GAMES[meta.game]
  const seated = new Set(players.filter((p) => !p.left).map((p) => p.uid))
  const byId = new Map(players.map((p) => [p.uid, p]))
  const expected = meta.only ?? players.map((p) => p.uid)
  return (
    <GameScreen>
      <GameTopBar title={game.name} subtitle="Group game room" onBack={onBack} />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-7 px-4 pb-16">
        <LiveGameLogo game={meta.game} className="size-24 animate-[gu-pop_.4s_ease-out_both] rounded-[1.8rem] drop-shadow-[0_6px_0_rgba(44,63,115,.25)]" />
        <p className="gu-title text-center text-3xl">Here we go!</p>
        <div className="flex flex-wrap justify-center gap-3">
          {expected.map((id) => {
            const p = byId.get(id)
            const inSeat = seated.has(id)
            return (
              <span key={id} className={cn("flex w-16 flex-col items-center gap-1 transition-opacity duration-300", !inSeat && "opacity-45")}>
                <GameAvatar uid={id} character={p?.avatar} photo={p?.photo} name={p?.name ?? "Player"} frame={p?.frame} size={52} />
                <span className="w-full truncate text-center text-xs font-bold text-white [text-shadow:0_1px_0_rgba(20,40,110,.4)]">
                  {p?.name.split(" ")[0] ?? "…"}
                </span>
              </span>
            )
          })}
        </div>
        <p className="flex items-center gap-2 text-sm font-bold text-white [text-shadow:0_1px_0_rgba(20,40,110,.4)]">
          <Spinner className="size-4" /> Taking seats…
        </p>
      </div>
    </GameScreen>
  )
}

/* ── Ended ───────────────────────────────────────────────────────────── */

function EndedView({
  room,
  meta,
  lounge,
  onExit,
}: {
  room: LiveRoom
  meta: RoomMeta
  lounge?: LoungeLink
  onExit: () => void
}) {
  const router = useRouter()
  const { user } = useSession()
  const wallet = useWallet()
  const { code, players, playersById, uid, isHost } = room
  const game = LIVE_GAMES[meta.game]
  const result = meta.result
  const winners = result?.winnerIds ?? []
  const iWon = winners.includes(uid)
  const [pending, setPending] = React.useState(false)
  // Just ended (not an old result opened later): the full entrance, confetti and a sound
  const [fresh] = React.useState(() => !!meta.endedAt && room.serverNow() - meta.endedAt <= 15_000)
  // A fanfare (or a sad tune) once, for the players, right as it ends
  const played = !!playersById[uid]
  React.useEffect(() => {
    if (!played || !fresh) return
    playSound(iWon ? "win" : winners.length ? "lose" : "home")
    // Once, when this screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const nameOf = (id: string) => playersById[id]?.name ?? "Someone"
  const firstNames = (ids: string[]) => ids.map((w) => nameOf(w).split(" ")[0]).join(" & ")
  const tone: ResultTone = !winners.length ? "draw" : !played ? "watch" : iWon ? "win" : "lose"
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
  const ranking = result?.ranking ?? players.filter((p) => !p.left).map((p) => p.uid)
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
          meta.challengeId
            ? // A discount game: on to the discount (no rematch room — a new challenge is a new deal)
              { kind: "link", href: `/challenges/${meta.challengeId}`, label: "See discount" }
            : lounge
            ? { kind: "rematch", onClick: lounge.backToRoom, pending: false, label: "Back to room" }
            : meta.rematchCode
              ? { kind: "join", href: `/play/${meta.rematchCode}` }
              : isHost
                ? { kind: "rematch", onClick: startRematch, pending }
                : { kind: "wait", hostName: meta.hostName.split(" ")[0] }
        }
        onBack={onExit}
        backLabel={lounge ? "Leave" : "Back"}
        stickers={played ? <StickerBar code={code} /> : undefined}
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
    everyone_left: "Everyone left the room",
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
  const steps: { label: string; ok: boolean | null }[] = [
    { label: "Signed in", ok: signedIn },
    { label: "Connected to the game server", ok: connected },
    { label: "Room found", ok: stage === "seat" ? true : error ? false : null },
    { label: "Taking your seat", ok: null },
  ]
  return (
    <GameScreen>
      <GameTopBar onBack={onBack} />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-5 pb-16">
        {!slow ? (
          <div className="flex flex-col items-center gap-4">
            <Spinner className="size-9 text-white" />
            <p className="gu-title text-2xl">{stage === "room" ? "Opening the room…" : "Taking your seat…"}</p>
          </div>
        ) : (
          <GamePanel title="Hmm…">
            <div className="flex flex-col gap-4">
              <p className="text-center text-[15px] font-semibold text-[var(--gu-ink-soft)]">
                {connected === false
                  ? "This phone can't reach the game server. Check the internet (mobile data or Wi-Fi), then try again."
                  : "Opening the room is taking longer than it should."}
              </p>
              <ul className="flex flex-col gap-2 text-sm font-semibold">
                {steps.map((s) => (
                  <li key={s.label} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                        s.ok === true ? "bg-[var(--gu-green-deep)]" : s.ok === false ? "bg-[var(--gu-red)]" : "bg-[#c9bfae]"
                      )}
                    >
                      {s.ok === true ? "✓" : s.ok === false ? "!" : "…"}
                    </span>
                    {s.label}
                  </li>
                ))}
              </ul>
              {error && (
                <p className="rounded-xl bg-[#fde2e2] px-3 py-2 font-mono text-xs break-words text-[var(--gu-red-deep)]">
                  {error.message}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <GameButton tone="cream" onClick={onBack}>
                  Back
                </GameButton>
                <GameButton tone="green" onClick={() => window.location.reload()}>
                  Retry
                </GameButton>
              </div>
            </div>
          </GamePanel>
        )}
      </div>
    </GameScreen>
  )
}

/* ── Can't get in ────────────────────────────────────────────────────── */

function Blocked({
  title,
  text,
  action,
  onBack,
}: {
  title: string
  text: string
  /** A main button above "Back to games". */
  action?: { label: string; onClick: () => void }
  onBack: () => void
}) {
  return (
    <GameScreen>
      <GameTopBar onBack={onBack} />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 pb-16">
        <GamePanel title={title}>
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-[15px] font-semibold text-[var(--gu-ink-soft)]">{text}</p>
            {action && (
              <GameButton tone="green" className="w-full" onClick={action.onClick}>
                {action.label}
              </GameButton>
            )}
            <GameButton tone={action ? "cream" : "blue"} className="w-full" icon={Home01Icon} onClick={onBack}>
              Back to games
            </GameButton>
          </div>
        </GamePanel>
      </div>
    </GameScreen>
  )
}
