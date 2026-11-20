"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "nextjs-toploader/app"
import { ArrowRight01Icon, PlayIcon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { GameButton, GameNote, GamePanel, GameScreen, GameTopBar } from "@/components/game-ui/kit"
import { GameAvatar } from "@/components/game-avatar/game-avatar"
import { useSession } from "@/components/providers/session-provider"
import { Spinner } from "@/components/ui/spinner"
import { useFriends } from "@/hooks/queries"
import { useWallet } from "@/hooks/use-fun"
import { getErrorMessage } from "@/lib/errors"
import { defaultOptions, LIVE_GAMES } from "@/lib/live/games"
import { levelOf, liveXp } from "@/lib/live/levels"
import { isTeamOptions, seatsFor } from "@/lib/live/seats"
import type { LiveGameId, RoomOptions } from "@/lib/live/types"
import type { UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { createRoom } from "@/services/live-rooms"
import { presenceOf, StatusChip, useFriendStatuses } from "../friend-status"
import { sendRoomInvites } from "../invite-friends-sheet"
import { GameHero, GameOptionsPicker, StepDots } from "./pieces"

/**
 * Setting up a live room, full screen and one thing at a time:
 *  1. the game's settings, as big cards;
 *  2. who to invite — your friends as a grid of faces to tap;
 * then Create, which opens the room straight away (invites go out behind it).
 */
export function NewRoomFlow({ game }: { game: LiveGameId }) {
  const router = useRouter()
  const { user } = useSession()
  const wallet = useWallet()
  const { data: friends } = useFriends()
  const info = LIVE_GAMES[game]
  const [picks, setPicks] = React.useState<RoomOptions>(() => defaultOptions(game))
  // Came from a friend's "Play a game": the invite goes straight to them —
  // no picking friends (anyone else can still be invited from the lobby)
  const invite = useSearchParams().get("invite")
  const invitee: UserProfile | null = invite
    ? (friends.find((f) => f.uid === invite) ?? ({ uid: invite, displayName: "your friend" } as UserProfile))
    : null
  const [step, setStep] = React.useState<0 | 1>(info.options.length > 0 || invite ? 0 : 1)
  const [selected, setSelected] = React.useState<string[]>([])
  const [pending, setPending] = React.useState(false)
  const seats = seatsFor(game, picks)
  const teams = isTeamOptions(game, picks)
  const inviteeStatus = useFriendStatuses(invitee ? [invitee.uid] : [])[invitee?.uid ?? ""]

  const back = () => {
    if (step === 1 && info.options.length > 0) setStep(0)
    else if (window.history.length > 1) router.back()
    else router.replace("/challenges")
  }

  const create = async () => {
    if (!user || pending) return
    setPending(true)
    try {
      const code = await createRoom(user, game, picks, wallet ? levelOf(liveXp(wallet)) : undefined)
      // Into the room right away; the invites (Firestore + phone pushes) go out behind it
      const picked = invitee ? [invitee] : friends.filter((f) => selected.includes(f.uid))
      if (picked.length > 0) void inviteInBackground(user, game, code, picked)
      router.replace(`/play/${code}`)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't open a room — please try again"))
      setPending(false)
    }
  }

  const startsHint = teams
    ? "Two teams of two, partners sit opposite. Starts once all 4 seats are taken."
    : seats.minPlayers === seats.maxPlayers
      ? "Starts by itself as soon as both seats are taken."
      : `Starts once all ${seats.maxPlayers} seats are taken — or the host starts with ${seats.minPlayers}+.`

  return (
    <GameScreen>
      <GameTopBar
        onBack={back}
        center={
          <div className="flex flex-col items-center gap-1">
            <p className="gu-title text-xl leading-none">
              {invitee ? `Play with ${invitee.displayName.split(" ")[0]}` : step === 0 ? "Game setup" : "Invite friends"}
            </p>
            {info.options.length > 0 && !invitee ? <StepDots step={step} of={2} /> : null}
          </div>
        }
        right={<span className="size-10" aria-hidden />}
      />

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pt-2 pb-36">
        <div className="gu-panel-flat p-4">
          <GameHero game={game} picks={picks} />
        </div>

        {invitee ? (
          <div className="gu-panel-flat flex items-center gap-3 p-3">
            <GameAvatar uid={invitee.uid} character={invitee.gameAvatar} photo={invitee.photoURL} name={invitee.displayName} frame={invitee.frame} size={48} />
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-bold">{invitee.displayName}</span>
                <StatusChip status={inviteeStatus} className="shrink-0" />
              </span>
              <span className="block text-xs font-bold text-[var(--gu-ink-soft)]">
                {presenceOf(inviteeStatus) === "offline"
                  ? "Offline — the invite waits in their notifications"
                  : "Gets the invite as soon as the room opens"}
              </span>
            </span>
          </div>
        ) : null}

        {step === 0 ? (
          info.options.length > 0 ? (
            <GamePanel title="Settings">
              <GameOptionsPicker game={game} picks={picks} onChange={setPicks} />
            </GamePanel>
          ) : null
        ) : (
          <FriendGrid friends={friends} selected={selected} onChange={setSelected} />
        )}
      </div>

      {/* The next step, always in reach */}
      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#c9b6ef] via-[#c9b6ef]/90 to-transparent px-4 pt-6">
        <div className="mx-auto flex max-w-xl flex-col gap-2 pb-3">
          <p className="text-center text-xs font-bold text-[var(--gu-ink)]/80">{startsHint}</p>
          {invitee ? (
            <GameButton tone="green" size="lg" className="w-full" onClick={() => void create()} disabled={!user || pending}>
              {pending ? <Spinner className="size-5" /> : <HugeiconsIcon icon={PlayIcon} className="size-5" strokeWidth={2.6} />}
              {pending ? "Opening…" : `Create & invite ${invitee.displayName.split(" ")[0]}`}
            </GameButton>
          ) : step === 0 ? (
            <GameButton tone="blue" size="lg" className="w-full" onClick={() => setStep(1)}>
              Next: invite
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" strokeWidth={2.6} />
            </GameButton>
          ) : (
            <GameButton tone="green" size="lg" className="w-full" onClick={() => void create()} disabled={!user || pending}>
              {pending ? <Spinner className="size-5" /> : <HugeiconsIcon icon={PlayIcon} className="size-5" strokeWidth={2.6} />}
              {pending ? "Opening…" : selected.length > 0 ? `Create & invite ${selected.length}` : "Create room"}
            </GameButton>
          )}
        </div>
      </div>
    </GameScreen>
  )
}

async function inviteInBackground(user: UserProfile, game: LiveGameId, code: string, friends: UserProfile[]) {
  try {
    const { sent, failed } = await sendRoomInvites(user, game, code, friends)
    if (failed > 0) toast.error(`Couldn't reach ${failed} ${failed === 1 ? "friend" : "friends"} — share the room link instead`)
    else if (sent > 0) toast.success(`Invited ${sent} ${sent === 1 ? "friend" : "friends"}`)
  } catch {
    toast.error("Couldn't send the invites — share the room link instead")
  }
}

/** Your friends as a grid of faces: tap to invite, tap again to undo. Searchable. */
export function FriendGrid({
  friends,
  selected,
  onChange,
  disabled,
}: {
  friends: UserProfile[]
  selected: string[]
  onChange: (ids: string[]) => void
  /** Uids that can't be picked (already in the room). */
  disabled?: ReadonlySet<string>
}) {
  const [q, setQ] = React.useState("")
  const query = q.trim().toLowerCase()
  const statuses = useFriendStatuses(friends.map((f) => f.uid))
  // Free to play first, then busy, then offline (everyone still gets the invite)
  const rank = { online: 0, room: 1, game: 2, offline: 3 } as const
  const shown = (
    query ? friends.filter((f) => f.displayName.toLowerCase().includes(query) || f.splitzyId?.toLowerCase().includes(query)) : friends
  )
    .map((f, i) => ({ f, i, r: rank[presenceOf(statuses[f.uid])] }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.f)
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])

  if (friends.length === 0) {
    return (
      <GameNote>
        No friends on JoySplit yet. Create the room and share its code or link from the lobby — anyone with it can join.
      </GameNote>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <HugeiconsIcon icon={Search01Icon} className="pointer-events-none absolute top-1/2 left-4 z-10 size-5 -translate-y-1/2 text-[#a7a2b8]" strokeWidth={2.4} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search friends"
          aria-label="Search friends"
          className="gu-input !pl-12"
        />
      </div>
      <div className="flex items-center justify-between px-1">
        <span className="flex flex-col">
          <span className="gu-title text-base">{selected.length > 0 ? `${selected.length} picked` : "Tap to invite"}</span>
          <span className="text-[11px] font-bold text-white/90 [text-shadow:0_1px_0_rgba(20,40,110,.35)]">
            Busy or offline, they still get the invite.
          </span>
        </span>
        {selected.length > 0 ? (
          <button type="button" className="gu-chip" onClick={() => onChange([])}>
            Clear
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4" role="group" aria-label="Friends">
        {shown.map((f) => {
          const on = selected.includes(f.uid)
          const off = disabled?.has(f.uid) ?? false
          return (
            <button
              key={f.uid}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={off}
              onClick={() => toggle(f.uid)}
              className={cn("gu-choice flex flex-col items-center gap-1.5 px-1.5 pt-3 pb-2", off && "opacity-50")}
            >
              <span className="relative">
                <GameAvatar character={f.gameAvatar} photo={f.photoURL} name={f.displayName} frame={f.frame} size={52} />
                <StatusChip status={statuses[f.uid]} dotOnly className="absolute -bottom-0.5 -left-0.5" />
                {on ? (
                  <span className="absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full bg-[var(--gu-green)] text-white shadow-[0_0_0_2.5px_#fff,0_2px_0_2.5px_var(--gu-green-deep)]">
                    <HugeiconsIcon icon={Tick02Icon} className="size-4" strokeWidth={3} />
                  </span>
                ) : null}
              </span>
              <span className="w-full truncate text-[13px] font-bold">{f.displayName.split(" ")[0]}</span>
              {off ? (
                <span className="text-[10px] font-bold text-[var(--gu-ink-soft)]">In this room</span>
              ) : (
                <StatusChip status={statuses[f.uid]} />
              )}
            </button>
          )
        })}
        {shown.length === 0 ? (
          <p className="col-span-full py-4 text-center text-sm font-bold text-white">Nobody called “{q}”</p>
        ) : null}
      </div>
    </div>
  )
}
