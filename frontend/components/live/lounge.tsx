"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import { Crown02Icon, Exchange01Icon, Notification03Icon, PlayIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { GameButton, GameDialog, GameNote, GamePanel, GameScreen, GameSectionTitle, GameTopBar } from "@/components/game-ui/kit"
import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { useSession } from "@/components/providers/session-provider"
import { Spinner } from "@/components/ui/spinner"
import { useGroup } from "@/hooks/queries"
import { useWallet } from "@/hooks/use-fun"
import { useRoomNode, useServerClock } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import { isLiveConfigured } from "@/lib/firebase/config"
import { defaultOptions, LIVE_GAMES } from "@/lib/live/games"
import { levelOf, liveXp } from "@/lib/live/levels"
import { isTeamOptions, seatsFor } from "@/lib/live/seats"
import type { LiveGameId, RoomMeta, RoomOptions, RoomPlayer } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { leaveRoom } from "@/services/live-rooms"
import { claimActivity } from "@/services/presence"
import {
  callGroupToLounge,
  claimLead,
  enterLounge,
  handOverLead,
  hereInOrder,
  isReady,
  leaderOf,
  pickLoungeGame,
  setLoungeReady,
  startLoungeRound,
  watchLounge,
  type Lounge,
  type LoungeVisitor,
} from "@/services/lounges"
import { GameHero, GameOptionsPicker, LiveGameGrid } from "./new-room/pieces"
import { RoomShell, type LoungeLink } from "./room-shell"

/** A finished game's result is shown to its players for this long (then it's the room again). */
const RESULT_FOR_MS = 3 * 60 * 1000
/** A round that never got going (its players didn't land) stops holding the room after this. */
const STUCK_ROUND_MS = 30 * 1000

/** Results you've already closed, for this tab: coming back never shows them again. */
const SEEN_KEY = "joysplit_lounge_seen"
function readSeen(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]") as string[]
  } catch {
    return []
  }
}

/**
 * A group's game room (services/lounges): always open. Whoever came in first
 * leads — they pick the game (everyone sees it) and press Start once everyone
 * else has tapped Ready. Start goes straight to the intro and the game; when
 * it ends the players see the result once, then everyone is back in the room
 * for the next one. A game already running is watched.
 */
export function LoungeShell({ groupId }: { groupId: string }) {
  const router = useRouter()
  const { user } = useSession()
  const wallet = useWallet()
  const level = wallet ? levelOf(liveXp(wallet)) : undefined
  const { data: group, isPending: groupPending } = useGroup(groupId)
  const isMember = !!user && !!group?.members.includes(user.uid)
  const { now } = useServerClock()

  const [lounge, setLounge] = React.useState<Lounge | null | undefined>(undefined)
  const [error, setError] = React.useState<Error | null>(null)
  React.useEffect(() => {
    if (!isLiveConfigured || !isMember) return
    return watchLounge(groupId, setLounge, setError)
  }, [groupId, isMember])

  // In a room, for friends deciding whether to invite you (a game inside it says "game")
  React.useEffect(() => claimActivity("room"), [])

  // You're "here" while this screen is open
  React.useEffect(() => {
    if (!isLiveConfigured || !user || !isMember) return
    return enterLounge(groupId, user)
  }, [groupId, user, isMember])

  // The lead is yours by turn (you came first, or the leader left): take it
  const leader = leaderOf(lounge)
  const uid = user?.uid
  const meHere = !!uid && !!lounge?.here?.[uid]
  React.useEffect(() => {
    if (!uid || !meHere || leader !== uid || lounge?.leader === uid) return
    void claimLead(groupId, uid).catch(() => undefined)
  }, [uid, meHere, leader, lounge?.leader, groupId])

  const code = lounge?.room ?? null
  const { data: meta } = useRoomNode<RoomMeta>(code, "meta")
  const { data: seats } = useRoomNode<Record<string, RoomPlayer>>(code, "players")

  const [seen, setSeen] = React.useState<string[]>(readSeen)
  const backToRoom = React.useCallback(() => {
    if (!code) return
    setSeen((prev) => {
      const next = [...prev.filter((c) => c !== code), code].slice(-20)
      try {
        sessionStorage.setItem(SEEN_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable */
      }
      return next
    })
  }, [code])

  const goBack = React.useCallback(() => {
    if (window.history.length > 1) router.back()
    else router.replace(`/groups/${groupId}`)
  }, [router, groupId])

  // Out of the lounge: a seat in a game that hasn't started is freed for someone else
  const exit = React.useCallback(() => {
    if (user && code && meta && (meta.status === "lobby" || meta.status === "countdown") && seats?.[user.uid])
      void leaveRoom(user.uid, code).catch(() => undefined)
    goBack()
  }, [user, code, meta, seats, goBack])

  const link: LoungeLink | undefined = React.useMemo(
    () => (group ? { groupName: group.name, backToRoom, exit } : undefined),
    [group, backToRoom, exit]
  )

  if (!isLiveConfigured) {
    return <Message title="Not switched on" text="Live games need the Realtime Database, which this server doesn't have yet." onBack={goBack} />
  }
  if (groupPending || (isMember && lounge === undefined && !error)) {
    return (
      <GameScreen>
        <GameTopBar onBack={goBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 pb-20">
          <Spinner className="size-9 text-white" />
          <p className="gu-title text-2xl">Opening the game room…</p>
        </div>
      </GameScreen>
    )
  }
  if (!group || !isMember || !user) {
    return <Message title="Members only" text="This game room belongs to a group you're not in." onBack={goBack} />
  }
  if (error) return <Message title="Can't open it" text={error.message} onBack={goBack} />

  // What the room's current game means for you right now
  const mine = seats?.[user.uid]
  const gathering = !!meta?.lounge && (meta.status === "lobby" || meta.status === "countdown") && now - meta.createdAt < STUCK_ROUND_MS
  const playing = meta?.status === "playing"
  const resultForMe =
    meta?.status === "ended" &&
    !!mine &&
    !mine.left &&
    !!code &&
    !seen.includes(code) &&
    !!meta.endedAt &&
    now - meta.endedAt < RESULT_FOR_MS

  if (code && link && (gathering || playing || resultForMe)) {
    return <RoomShell key={code} code={code} lounge={link} />
  }

  return (
    <LoungeHome
      groupId={groupId}
      groupName={group.name}
      members={group.members}
      lounge={lounge ?? null}
      leader={leader}
      code={code}
      level={level}
      last={meta && meta.status === "ended" ? meta : null}
      lastWinners={(meta?.result?.winnerIds ?? []).map((id) => seats?.[id]?.name.split(" ")[0] ?? "Someone")}
      onBack={goBack}
    />
  )
}

/* ── The room between games ──────────────────────────────────────────── */

function LoungeHome({
  groupId,
  groupName,
  members,
  lounge,
  leader,
  code,
  level,
  last,
  lastWinners,
  onBack,
}: {
  groupId: string
  groupName: string
  members: string[]
  lounge: Lounge | null
  leader: string | null
  /** The lounge's current (finished, or never started) room. */
  code: string | null
  level?: number
  /** The game that just ended, for a line about it. */
  last: RoomMeta | null
  lastWinners: string[]
  onBack: () => void
}) {
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const here = hereInOrder(lounge)
  const isLeader = !!uid && leader === uid
  const leaderName = here.find(([id]) => id === leader)?.[1].name.split(" ")[0] ?? "The leader"
  const game = lounge?.game ?? null
  const picks: RoomOptions = React.useMemo(() => (game ? defaultOptions(game, lounge?.options ?? {}) : {}), [game, lounge?.options])
  const iAmReady = isReady(lounge, uid)

  const others = here.filter(([id]) => id !== leader)
  const notReady = others.filter(([id]) => !isReady(lounge, id))
  const seats = game ? seatsFor(game, picks) : null
  const teams = game ? isTeamOptions(game, picks) : false
  const players = here.map(([id]) => id)
  const playing = seats ? players.slice(0, seats.maxPlayers) : []
  const watching = seats ? here.slice(seats.maxPlayers) : []
  const blocker = !game
    ? "Pick a game first"
    : notReady.length > 0
      ? `Waiting for ${notReady.length} to get ready`
      : teams && playing.length !== 4
        ? "2 v 2 needs exactly 4 players"
        : seats && playing.length < seats.minPlayers
          ? `Needs at least ${seats.minPlayers} players`
          : null

  const [changing, setChanging] = React.useState(false)
  const [starting, setStarting] = React.useState(false)
  const [calling, setCalling] = React.useState(false)
  const [handTo, setHandTo] = React.useState<[string, LoungeVisitor] | null>(null)
  const showGrid = isLeader && (!game || changing)

  const pick = (g: LiveGameId, options: RoomOptions) => {
    setChanging(false)
    void pickLoungeGame(groupId, g, options).catch((e) => toast.error(getErrorMessage(e, "Couldn't pick the game")))
  }

  const toggleReady = () => {
    if (!lounge?.round) return
    void setLoungeReady(groupId, uid, iAmReady ? null : lounge.round).catch((e) =>
      toast.error(getErrorMessage(e, "Couldn't update"))
    )
  }

  const start = async () => {
    if (!user || !game || blocker) return
    setStarting(true)
    try {
      await startLoungeRound(groupId, user, game, picks, playing, code, level)
      // The room switches over by itself (the lounge points at the new game)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't start the game"))
    } finally {
      setStarting(false)
    }
  }

  const call = async () => {
    if (!user) return
    setCalling(true)
    try {
      const { sent, throttled } = await callGroupToLounge(groupId, groupName, user, members, game)
      if (throttled) toast("The group was just called — give them a minute")
      else toast.success(sent > 0 ? `Called ${sent} ${sent === 1 ? "member" : "members"} in` : "Nobody else is in this group yet")
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't call the group"))
    } finally {
      setCalling(false)
    }
  }

  const handOver = async () => {
    if (!handTo) return
    const [to, v] = handTo
    setHandTo(null)
    try {
      await handOverLead(groupId, to)
      toast.success(`${v.name.split(" ")[0]} leads the room now`)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't hand over"))
    }
  }

  return (
    <GameScreen>
      <GameTopBar title={groupName} subtitle="Group game room · always open" onBack={changing ? () => setChanging(false) : onBack} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-44">
        {/* Who's here: the leader's crown, and who's ready */}
        <GamePanel title="In the room">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap justify-center gap-x-2 gap-y-3">
              {here.map(([id, v]) => {
                const lead = id === leader
                const ready = lead || isReady(lounge, id)
                const canHand = isLeader && !lead
                const face = (
                  <>
                    <span className="relative">
                      {lead ? (
                        <span className="absolute -top-3.5 left-1/2 z-10 flex size-7 -translate-x-1/2 items-center justify-center rounded-full bg-[var(--gu-yellow)] text-[#8a5200] shadow-[0_0_0_2.5px_#fff,0_2px_0_2.5px_#d08a00]">
                          <HugeiconsIcon icon={Crown02Icon} className="size-4" strokeWidth={2.4} />
                        </span>
                      ) : null}
                      {/* The leader's tap on someone hands them the lead: no peek there */}
                      <GameAvatar uid={id} peek={!canHand} character={v.avatar} photo={v.photo} name={v.name} frame={v.frame} size={52} />
                      {ready && !lead ? (
                        <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-[var(--gu-green)] text-white shadow-[0_0_0_2.5px_#fff]">
                          <HugeiconsIcon icon={Tick02Icon} className="size-4" strokeWidth={3} />
                        </span>
                      ) : null}
                    </span>
                    <span className="w-full truncate text-center text-xs font-bold">{id === uid ? "You" : v.name.split(" ")[0]}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] leading-none font-bold",
                        lead
                          ? "bg-[#fff1c2] text-[#a35f00]"
                          : ready
                            ? "bg-[#d9f7d0] text-[var(--gu-green-deep)]"
                            : "bg-[var(--gu-cream-2)] text-[var(--gu-ink-soft)]"
                      )}
                    >
                      {lead ? "Leader" : ready ? "Ready" : "Not ready"}
                    </span>
                  </>
                )
                return canHand ? (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setHandTo([id, v])}
                    aria-label={`${v.name}: make leader`}
                    className="flex w-[4.5rem] flex-col items-center gap-1 rounded-2xl pt-1 pb-1.5 transition-transform active:scale-95"
                  >
                    {face}
                  </button>
                ) : (
                  <span key={id} className="flex w-[4.5rem] flex-col items-center gap-1 pt-1 pb-1.5">
                    {face}
                  </span>
                )
              })}
            </div>
            {isLeader && others.length > 0 ? (
              <p className="-mt-1 text-center text-[11px] font-semibold text-[var(--gu-ink-soft)]">Tap someone to make them the leader.</p>
            ) : null}
            <GameButton tone="yellow" icon={Notification03Icon} onClick={() => void call()} disabled={calling}>
              {calling ? "Calling…" : "Call the group"}
            </GameButton>
          </div>
        </GamePanel>

        {last ? (
          <GameNote className="text-[var(--gu-ink)]">
            Last game: <b>{LIVE_GAMES[last.game].name}</b>
            {lastWinners.length ? ` · ${lastWinners.join(" & ")} won` : " · no winner"}
          </GameNote>
        ) : null}

        {/* The game: picked by the leader, the same for everyone */}
        {showGrid ? (
          <section className="flex flex-col gap-3">
            <GameSectionTitle>{game ? "Change the game" : "Pick a game"}</GameSectionTitle>
            <LiveGameGrid onPick={(g) => pick(g, g === game ? picks : defaultOptions(g))} />
          </section>
        ) : game ? (
          <GamePanel title="Up next">
            <div className="flex flex-col gap-5">
              <GameHero game={game} picks={picks} />
              {isLeader ? (
                <>
                  {LIVE_GAMES[game].options.length > 0 ? (
                    <GameOptionsPicker game={game} picks={picks} onChange={(next) => pick(game, next)} />
                  ) : null}
                  <GameButton tone="purple" icon={Exchange01Icon} onClick={() => setChanging(true)}>
                    Change game
                  </GameButton>
                </>
              ) : (
                <p className="text-center text-sm font-semibold text-[var(--gu-ink-soft)]">{leaderName} picked this game.</p>
              )}
              {watching.length > 0 ? (
                <p className="text-center text-xs font-bold text-[var(--gu-orange-deep)]">
                  {LIVE_GAMES[game].name} seats {seats?.maxPlayers} — {watching.map(([, v]) => v.name.split(" ")[0]).join(", ")} will watch.
                </p>
              ) : null}
            </div>
          </GamePanel>
        ) : (
          <GameNote className="!py-4 text-center text-[15px] font-bold text-[var(--gu-ink)]">
            <Spinner className="mr-2 inline size-4 align-[-2px]" />
            {leaderName} is picking a game…
          </GameNote>
        )}
      </div>

      {/* Ready / Start, always in reach */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#c9b6ef] via-[#c9b6ef]/90 to-transparent px-4 pt-6">
        <div className="mx-auto flex max-w-xl flex-col gap-2 pb-3">
          <p className="text-center text-xs font-bold text-[var(--gu-ink)]/80">
            {others.length === 0
              ? "Just you here — call the group in."
              : `${others.length - notReady.length} of ${others.length} ready`}
          </p>
          {isLeader ? (
            <GameButton tone="green" size="lg" className="w-full" onClick={() => void start()} disabled={!!blocker || starting}>
              {starting ? <Spinner className="size-5" /> : <HugeiconsIcon icon={PlayIcon} className="size-5" strokeWidth={2.6} />}
              {starting ? "Starting…" : (blocker ?? "Start")}
            </GameButton>
          ) : !game ? (
            <GameButton tone="cream" size="lg" className="w-full" disabled>
              Waiting for {leaderName} to pick
            </GameButton>
          ) : iAmReady ? (
            <GameButton tone="cream" size="lg" className="w-full" onClick={toggleReady}>
              <HugeiconsIcon icon={Tick02Icon} className="size-5 text-[var(--gu-green-deep)]" strokeWidth={3} />
              Ready · tap to cancel
            </GameButton>
          ) : (
            <GameButton tone="green" size="lg" className="w-full" onClick={toggleReady}>
              I&apos;m ready
            </GameButton>
          )}
        </div>
      </div>

      <GameDialog open={!!handTo} onClose={() => setHandTo(null)} title="New leader">
        <div className="flex flex-col items-center gap-4 text-center">
          {handTo ? (
            <GameAvatar uid={handTo[0]} character={handTo[1].avatar} photo={handTo[1].photo} name={handTo[1].name} frame={handTo[1].frame} size={64} />
          ) : null}
          <p className="font-semibold text-[var(--gu-ink-soft)]">
            Make <b className="text-[var(--gu-ink)]">{handTo?.[1].name.split(" ")[0]}</b> the leader? They&apos;ll pick and start
            the games — you won&apos;t any more.
          </p>
          <div className="grid w-full grid-cols-2 gap-3">
            <GameButton tone="cream" onClick={() => setHandTo(null)}>
              Cancel
            </GameButton>
            <GameButton tone="yellow" icon={Crown02Icon} onClick={() => void handOver()}>
              Make leader
            </GameButton>
          </div>
        </div>
      </GameDialog>
    </GameScreen>
  )
}

function Message({ title, text, onBack }: { title: string; text: string; onBack: () => void }) {
  return (
    <GameScreen>
      <GameTopBar onBack={onBack} />
      <div className="mx-auto w-full max-w-sm px-5 pt-16">
        <GamePanel title={title}>
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="font-semibold text-[var(--gu-ink-soft)]">{text}</p>
            <GameButton onClick={onBack}>Back</GameButton>
          </div>
        </GamePanel>
      </div>
    </GameScreen>
  )
}
