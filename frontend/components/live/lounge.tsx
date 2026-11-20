"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import { Exchange01Icon, Notification03Icon, PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { GameButton, GameNote, GamePanel, GameScreen, GameSectionTitle, GameTopBar } from "@/components/game-ui/kit"
import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { useSession } from "@/components/providers/session-provider"
import { Spinner } from "@/components/ui/spinner"
import { useGroup } from "@/hooks/queries"
import { useWallet } from "@/hooks/use-fun"
import { useRoomNode } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import { isLiveConfigured } from "@/lib/firebase/config"
import { defaultOptions, LIVE_GAMES } from "@/lib/live/games"
import { levelOf, liveXp } from "@/lib/live/levels"
import type { LiveGameId, RoomMeta, RoomOptions, RoomPlayer } from "@/lib/live/types"
import { leaveRoom } from "@/services/live-rooms"
import {
  callGroupToLounge,
  enterLounge,
  startLoungeGame,
  switchLoungeGame,
  watchLounge,
  type Lounge,
} from "@/services/lounges"
import { GameHero, GameOptionsPicker, LiveGameGrid } from "./new-room/pieces"
import { RoomShell, type LoungeLink } from "./room-shell"

/**
 * A group's game room (services/lounges): always open. While a game is set
 * up or running you're in it — seated if there's room, watching if not; when
 * it ends anyone picks the next one and everyone in the lounge goes along.
 * Between games (or before the first) it's the lounge itself: who's here,
 * the games to pick from, and a button that calls the whole group in.
 */
export function LoungeShell({ groupId }: { groupId: string }) {
  const router = useRouter()
  const { user } = useSession()
  const wallet = useWallet()
  const level = wallet ? levelOf(liveXp(wallet)) : undefined
  const { data: group, isPending: groupPending } = useGroup(groupId)
  const isMember = !!user && !!group?.members.includes(user.uid)

  const [lounge, setLounge] = React.useState<Lounge | null | undefined>(undefined)
  const [error, setError] = React.useState<Error | null>(null)
  React.useEffect(() => {
    if (!isLiveConfigured || !isMember) return
    return watchLounge(groupId, setLounge, setError)
  }, [groupId, isMember])

  // You're "here" while this screen is open
  React.useEffect(() => {
    if (!isLiveConfigured || !user || !isMember) return
    return enterLounge(groupId, user)
  }, [groupId, user, isMember])

  const code = lounge?.room ?? null
  const { data: meta } = useRoomNode<RoomMeta>(code, "meta")
  const { data: seats } = useRoomNode<Record<string, RoomPlayer>>(code, "players")

  // "Pick another game" after a game: the picker for you, until the next game starts
  const [pickingAt, setPickingAt] = React.useState<string | null>(null)
  // "Switch game" from a lobby
  const [switching, setSwitching] = React.useState(false)

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

  const start = React.useCallback(
    async (game: LiveGameId, options: RoomOptions) => {
      if (!user) return
      const inLobby = !!meta && (meta.status === "lobby" || meta.status === "countdown")
      if (inLobby && meta.hostId === user.uid) await switchLoungeGame(groupId, user, game, options, code, level)
      else await startLoungeGame(groupId, user, game, options, inLobby ? null : code, level)
      setPickingAt(null)
      setSwitching(false)
    },
    [user, meta, groupId, code, level]
  )

  const lobbyHost = !!meta && (meta.status === "lobby" || meta.status === "countdown") && meta.hostId === user?.uid
  const link: LoungeLink | undefined = React.useMemo(
    () =>
      group
        ? {
            groupName: group.name,
            playAgain: (m) => start(m.game, m.options),
            pickNext: () => setPickingAt(code ?? "none"),
            exit,
            lobbyAction: lobbyHost ? (
              <button
                type="button"
                onClick={() => setSwitching(true)}
                className="lb-glass flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-bold"
              >
                <HugeiconsIcon icon={Exchange01Icon} className="size-4" />
                Switch
              </button>
            ) : undefined,
          }
        : undefined,
    [group, start, code, exit, lobbyHost]
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
  if (!group || !isMember) {
    return <Message title="Members only" text="This game room belongs to a group you're not in." onBack={goBack} />
  }
  if (error) return <Message title="Can't open it" text={error.message} onBack={goBack} />

  const live = !!code && !!meta && meta.status !== "ended"
  const picking = pickingAt !== null && pickingAt === (code ?? "none")
  const showRoom = !!code && !!meta && link && (live || !picking)

  if (showRoom && !switching) {
    return <RoomShell key={code} code={code} lounge={link} />
  }

  return (
    <LoungeHome
      groupId={groupId}
      groupName={group.name}
      members={group.members}
      lounge={lounge ?? null}
      last={meta && meta.status === "ended" ? meta : null}
      lastWinners={(meta?.result?.winnerIds ?? []).map((id) => seats?.[id]?.name.split(" ")[0] ?? "Someone")}
      switching={switching}
      onBack={switching ? () => setSwitching(false) : pickingAt ? () => setPickingAt(null) : goBack}
      onStart={start}
    />
  )
}

/* ── Between games ───────────────────────────────────────────────────── */

function LoungeHome({
  groupId,
  groupName,
  members,
  lounge,
  last,
  lastWinners,
  switching,
  onBack,
  onStart,
}: {
  groupId: string
  groupName: string
  members: string[]
  lounge: Lounge | null
  /** The game that just ended, for a line about it. */
  last: RoomMeta | null
  lastWinners: string[]
  switching: boolean
  onBack: () => void
  onStart: (game: LiveGameId, options: RoomOptions) => Promise<void>
}) {
  const { user } = useSession()
  const here = Object.entries(lounge?.here ?? {}).sort((a, b) => a[1].at - b[1].at)
  const [setup, setSetup] = React.useState<{ game: LiveGameId; picks: RoomOptions } | null>(null)
  const [starting, setStarting] = React.useState(false)
  const [calling, setCalling] = React.useState(false)

  const call = async () => {
    if (!user) return
    setCalling(true)
    try {
      const { sent, throttled } = await callGroupToLounge(groupId, groupName, user, members, setup?.game ?? lounge?.game ?? null)
      if (throttled) toast("The group was just called — give them a minute")
      else toast.success(sent > 0 ? `Called ${sent} ${sent === 1 ? "member" : "members"} in` : "Nobody else is in this group yet")
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't call the group"))
    } finally {
      setCalling(false)
    }
  }

  const start = async () => {
    if (!setup) return
    setStarting(true)
    try {
      await onStart(setup.game, setup.picks)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't start the game"))
      setStarting(false)
    }
  }

  return (
    <GameScreen>
      <GameTopBar title={`${groupName}`} subtitle={switching ? "Switch the game" : "Group game room · always open"} onBack={setup ? () => setSetup(null) : onBack} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 pt-2 pb-36">
        {/* Who's here, and calling the rest in */}
        <GamePanel title="In the room">
          <div className="flex flex-col gap-4">
            {here.length === 0 ? (
              <p className="text-center text-sm font-semibold text-[var(--gu-ink-soft)]">Nobody yet</p>
            ) : (
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-2">
                {here.map(([uid, v]) => (
                  <span key={uid} className="flex w-16 flex-col items-center gap-1">
                    <span className="relative">
                      <GameAvatar character={v.avatar} photo={v.photo} name={v.name} frame={v.frame} size={48} />
                      <span className="absolute right-0 bottom-0 size-3.5 rounded-full bg-[var(--gu-green)] shadow-[0_0_0_2.5px_#fff]" />
                    </span>
                    <span className="w-full truncate text-center text-xs font-bold">{uid === user?.uid ? "You" : v.name.split(" ")[0]}</span>
                  </span>
                ))}
              </div>
            )}
            <GameButton tone="yellow" icon={Notification03Icon} onClick={() => void call()} disabled={calling}>
              {calling ? "Calling…" : "Call the group"}
            </GameButton>
            <p className="-mt-1 text-center text-xs font-semibold text-[var(--gu-ink-soft)]">
              Everyone in {groupName} gets a notification to jump in.
            </p>
          </div>
        </GamePanel>

        {last ? (
          <GameNote className="text-[var(--gu-ink)]">
            Last game: <b>{LIVE_GAMES[last.game].name}</b>
            {lastWinners.length ? ` · 🏆 ${lastWinners.join(" & ")} won` : " · no winner"}
          </GameNote>
        ) : null}

        {setup ? (
          <GamePanel title="Settings">
            <div className="flex flex-col gap-5">
              <GameHero game={setup.game} picks={setup.picks} />
              <GameOptionsPicker game={setup.game} picks={setup.picks} onChange={(picks) => setSetup({ ...setup, picks })} />
            </div>
          </GamePanel>
        ) : (
          <section className="flex flex-col gap-3">
            <GameSectionTitle>{switching ? "Switch to" : "Pick a game"}</GameSectionTitle>
            <LiveGameGrid onPick={(game) => setSetup({ game, picks: defaultOptions(game) })} />
          </section>
        )}
      </div>

      {setup ? (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#c9b6ef] via-[#c9b6ef]/90 to-transparent px-4 pt-6">
          <div className="mx-auto flex max-w-xl flex-col gap-2 pb-3">
            <p className="text-center text-xs font-bold text-[var(--gu-ink)]/80">Everyone in the room is taken into the game.</p>
            <GameButton tone="green" size="lg" className="w-full" onClick={() => void start()} disabled={starting}>
              {starting ? <Spinner className="size-5" /> : <HugeiconsIcon icon={PlayIcon} className="size-5" strokeWidth={2.6} />}
              {starting ? "Starting…" : `Play ${LIVE_GAMES[setup.game].shortName ?? LIVE_GAMES[setup.game].name}`}
            </GameButton>
          </div>
        </div>
      ) : null}
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
