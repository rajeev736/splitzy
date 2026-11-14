"use client"

import * as React from "react"
import { useRouter } from "nextjs-toploader/app"
import { PlayIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { useSession } from "@/components/providers/session-provider"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useFriends } from "@/hooks/queries"
import { getErrorMessage } from "@/lib/errors"
import {
  defaultOptions,
  LIVE_GAMES,
  type LiveGameInfo,
  type LiveOption,
} from "@/lib/live/games"
import type { LiveGameId, RoomOptions } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { createRoom, registerGroupRoom } from "@/services/live-rooms"
import type { UserProfile } from "@/lib/types"
import { FriendPicker, sendRoomInvites } from "./invite-friends-sheet"
import { LiveGameLogo } from "./live-game-logo"

/** "2 players" / "2–8 players". */
export const playersLabel = (g: LiveGameInfo) =>
  g.minPlayers === g.maxPlayers
    ? `${g.maxPlayers} players`
    : `${g.minPlayers}–${g.maxPlayers} players`

/**
 * Set up a room for one game: its options, friends to invite (optional), and
 * Create — which opens the room and takes you to its lobby. Mount it keyed by
 * `game` so a different game starts from its own defaults.
 */
export function CreateRoomSheet({
  open,
  onOpenChange,
  game,
  group,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  game: LiveGameId
  /** Started from a group: every member is invited and the room shows on the group page. */
  group?: { id: string; name: string; members: string[] }
}) {
  const router = useRouter()
  const { user } = useSession()
  const { data: friends } = useFriends()
  const info = LIVE_GAMES[game]
  const [picks, setPicks] = React.useState<RoomOptions>(() =>
    defaultOptions(game)
  )
  const [selected, setSelected] = React.useState<string[]>([])
  const [pending, setPending] = React.useState(false)

  const create = async () => {
    if (!user) return
    setPending(true)
    try {
      const code = await createRoom(user, game, picks)
      if (group) {
        // The room is open either way; listing it and the invites are best effort
        await registerGroupRoom(group.id, code, game, user).catch(
          () => undefined
        )
        const members = group.members
          .filter((m) => m !== user.uid)
          .map((uid) => ({ uid }) as UserProfile)
        if (members.length > 0) {
          const { sent } = await sendRoomInvites(
            user,
            game,
            code,
            members,
            group.name
          )
          if (sent > 0)
            toast.success(`Everyone in ${group.name} has been invited`)
        }
        router.push(`/play/${code}`)
        return
      }
      // The room is open either way; invites are best effort
      const picked = friends.filter((f) => selected.includes(f.uid))
      if (picked.length > 0) {
        const { sent, failed } = await sendRoomInvites(user, game, code, picked)
        if (failed > 0)
          toast.error(
            `Couldn't reach ${failed} ${failed === 1 ? "friend" : "friends"} — share the link instead`
          )
        else if (sent > 0)
          toast.success(`Invited ${sent} ${sent === 1 ? "friend" : "friends"}`)
      }
      router.push(`/play/${code}`)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't open a room — please try again"))
      setPending(false)
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${info.name} room`}
      description="Set it up, invite friends, then share the code with anyone else."
      footer={
        <div className="flex w-full flex-col gap-1.5">
          <Button
            size="lg"
            className="h-11 w-full"
            onClick={create}
            disabled={!user || pending}
          >
            {pending ? (
              <Spinner />
            ) : (
              <HugeiconsIcon icon={PlayIcon} data-icon="inline-start" />
            )}
            Create room
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            {info.minPlayers === info.maxPlayers
              ? `Starts by itself once both seats are taken.`
              : `Starts by itself once all ${info.maxPlayers} seats are taken — or you start with ${info.minPlayers} or more.`}
          </p>
        </div>
      }
    >
      <div className="flex flex-col gap-5 pb-2">
        <div className="flex items-center gap-3">
          <LiveGameLogo game={info.id} className="size-14 rounded-xl" />
          <div className="min-w-0">
            <p className="text-base font-semibold">{info.name}</p>
            <p className="text-xs text-muted-foreground">
              {playersLabel(info)} · {info.duration}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {info.tagline}
            </p>
          </div>
        </div>

        {info.options.map((o) => (
          <OptionPills
            key={o.key}
            option={o}
            value={picks[o.key] as number | string}
            onChange={(v) => setPicks((p) => ({ ...p, [o.key]: v }))}
          />
        ))}

        {group ? (
          <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            Everyone in{" "}
            <span className="font-medium text-foreground">{group.name}</span>{" "}
            gets a notification, and the room shows on the group page until it
            ends.
          </p>
        ) : (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">
              Invite friends{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </h3>
            {friends.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">
                No friends on JoySplit yet — share the room link from the lobby
                instead.
              </p>
            ) : (
              <>
                <FriendPicker
                  friends={friends}
                  selected={selected}
                  onChange={setSelected}
                />
                <p className="text-[11px] text-muted-foreground">
                  They get a notification with the code. You can invite more, or
                  share the link, from the lobby.
                </p>
              </>
            )}
          </section>
        )}
      </div>
    </BottomSheet>
  )
}

/** One setting as a row of pills, like the coin stakes on a challenge. */
function OptionPills({
  option,
  value,
  onChange,
}: {
  option: LiveOption
  value: number | string
  onChange: (value: number | string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium">{option.label}</p>
      <div
        role="radiogroup"
        aria-label={option.label}
        className="flex flex-wrap gap-1.5"
      >
        {option.choices.map((c) => {
          const on = c.value === value
          return (
            <button
              key={String(c.value)}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(c.value)}
              className={cn(
                "inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-medium transition-colors",
                on
                  ? "border-primary bg-primary/5 text-primary"
                  : "bg-card hover:bg-muted/60"
              )}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
