"use client"

import * as React from "react"
import {
  Copy01Icon,
  SentIcon,
  Share08Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { useSession } from "@/components/providers/session-provider"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { PickerDrawer, PickerTrigger } from "@/components/shared/picker-drawer"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useFriends } from "@/hooks/queries"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { useRoomNode } from "@/hooks/use-live-room"
import { getErrorMessage } from "@/lib/errors"
import { LIVE_GAMES } from "@/lib/live/games"
import { roomLink } from "@/lib/live/room"
import type { LiveGameId, RoomMeta, RoomPlayer } from "@/lib/live/types"
import type { UserProfile } from "@/lib/types"
import { sendNotification } from "@/services/shared"

/**
 * Tells each friend about the room: an in-app notification that also reaches
 * their phone. Best effort per friend — one failure doesn't stop the rest.
 */
export async function sendRoomInvites(
  user: UserProfile,
  game: LiveGameId,
  code: string,
  friends: UserProfile[],
  /** The group it was started from, for the message. */
  groupName?: string
): Promise<{ sent: number; failed: number }> {
  const name = LIVE_GAMES[game].name
  const results = await Promise.allSettled(
    friends.map((f) =>
      sendNotification({
        userId: f.uid,
        title: groupName
          ? `${user.displayName} started ${name} in ${groupName}`
          : `${user.displayName} invited you to ${name}`,
        message: `Join the room now — code ${code}. Tap to jump in.`,
        type: "ROOM_INVITE",
        data: {
          roomCode: code,
          actorId: user.uid,
          actorName: user.displayName,
        },
      })
    )
  )
  const sent = results.filter((r) => r.status === "fulfilled").length
  return { sent, failed: friends.length - sent }
}

const firstName = (name: string) => name.split(" ")[0]

/** "Rajeev", "Rajeev & Priya", "Rajeev, Priya +2". */
function summarize(names: string[]) {
  const first = names.map(firstName)
  if (first.length <= 2) return first.join(" & ")
  return `${first[0]}, ${first[1]} +${first.length - 2}`
}

/**
 * Multi-select of friends to invite: a field showing who's picked, and a
 * searchable drawer. Friends already seated in the room are listed at the
 * bottom of the drawer but can't be picked.
 */
export function FriendPicker({
  friends,
  selected,
  onChange,
  inRoom,
}: {
  friends: UserProfile[]
  selected: string[]
  onChange: (ids: string[]) => void
  /** Uids already in the room. */
  inRoom?: ReadonlySet<string>
}) {
  const [open, setOpen] = React.useState(false)
  const available = inRoom ? friends.filter((f) => !inRoom.has(f.uid)) : friends
  const seated = inRoom ? friends.filter((f) => inRoom.has(f.uid)) : []
  const chosen = available.filter((f) => selected.includes(f.uid))
  const toggle = (id: string) =>
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id]
    )

  return (
    <>
      <PickerTrigger
        placeholder="Choose friends"
        media={
          chosen.length > 0 ? (
            <span className="flex shrink-0 -space-x-2">
              {chosen.slice(0, 3).map((f) => (
                <UserAvatar
                  key={f.uid}
                  uid={f.uid}
                  src={f.photoURL}
                  name={f.displayName}
                  size="sm"
                  className="ring-2 ring-card"
                />
              ))}
            </span>
          ) : undefined
        }
        label={
          chosen.length > 0
            ? summarize(chosen.map((f) => f.displayName))
            : undefined
        }
        sublabel={chosen.length > 0 ? `${chosen.length} selected` : undefined}
        onClick={() => setOpen(true)}
      />
      <PickerDrawer
        open={open}
        onOpenChange={setOpen}
        title="Invite friends"
        description="Each one gets a notification with the room code — on their phone too."
        multiple
        searchPlaceholder="Search name or JoySplit ID"
        emptyText={
          seated.length > 0
            ? "All your friends are already in the room."
            : "Add friends to invite them by name — or share the link."
        }
        items={available.map((f) => ({
          id: f.uid,
          label: f.displayName,
          keywords: f.splitzyId,
          sublabel: f.splitzyId,
          media: (
            <UserAvatar
              uid={f.uid}
              src={f.photoURL}
              name={f.displayName}
              size="sm"
            />
          ),
        }))}
        selected={selected}
        onSelect={toggle}
        bottom={
          seated.length > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              <span className="flex shrink-0 -space-x-2">
                {seated.slice(0, 4).map((f) => (
                  <UserAvatar
                    key={f.uid}
                    uid={f.uid}
                    src={f.photoURL}
                    name={f.displayName}
                    size="xs"
                    className="ring-2 ring-card"
                  />
                ))}
              </span>
              <span className="min-w-0 flex-1 truncate">
                Already in the room:{" "}
                {seated.map((f) => firstName(f.displayName)).join(", ")}
              </span>
            </div>
          ) : undefined
        }
      />
    </>
  )
}

/**
 * Invite people to a room: pick friends to notify, or share the code / link.
 * Gets only the meta, so it reads the seats itself to grey out friends who
 * are already here.
 */
export function InviteFriendsSheet({
  open,
  onOpenChange,
  meta,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meta: RoomMeta
}) {
  const { user } = useSession()
  const { data: friends } = useFriends()
  const { data: players } = useRoomNode<Record<string, RoomPlayer>>(
    meta.code,
    "players"
  )
  const { copied, copy } = useCopyToClipboard()
  const [selected, setSelected] = React.useState<string[]>([])
  const [sending, setSending] = React.useState(false)
  const link = roomLink(meta.code)
  const game = LIVE_GAMES[meta.game]

  const inRoom = React.useMemo(
    () =>
      new Set(
        Object.values(players ?? {})
          .filter((p) => !p.left)
          .map((p) => p.uid)
      ),
    [players]
  )
  const freeSeats = Math.max(0, meta.maxPlayers - inRoom.size)
  // Friends who took a seat since being picked drop out of the send
  const picked = friends.filter(
    (f) => selected.includes(f.uid) && !inRoom.has(f.uid)
  )

  const send = async () => {
    if (!user || picked.length === 0) return
    setSending(true)
    try {
      const { sent, failed } = await sendRoomInvites(
        user,
        meta.game,
        meta.code,
        picked
      )
      if (sent > 0) {
        toast.success(
          sent === 1
            ? `Invited ${firstName(picked[0].displayName)}`
            : `Invited ${sent} friends`
        )
      }
      if (failed > 0)
        toast.error(
          `Couldn't reach ${failed} ${failed === 1 ? "friend" : "friends"} — try again`
        )
      setSelected([])
      if (failed === 0) onOpenChange(false)
    } catch (e) {
      toast.error(getErrorMessage(e, "Couldn't send the invites"))
    } finally {
      setSending(false)
    }
  }

  const share = () => {
    if (typeof navigator.share === "function") {
      navigator
        .share({
          title: `Play ${game.name} on JoySplit`,
          text: `Join my ${game.name} room — code ${meta.code}`,
          url: link,
        })
        .catch(() => undefined)
    } else {
      void copy(link, "Link copied!")
    }
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Invite to the room"
      description={`${game.name} · ${freeSeats === 0 ? "every seat is taken" : `${freeSeats} of ${meta.maxPlayers} seats free`}`}
    >
      <div className="flex flex-col gap-4 pb-2">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Friends</h3>
          {friends.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">
              Add friends to invite them by name — or share the link below.
            </p>
          ) : (
            <>
              <FriendPicker
                friends={friends}
                selected={selected}
                onChange={setSelected}
                inRoom={inRoom}
              />
              {picked.length > freeSeats && (
                <p className="text-[11px] text-warning">
                  Only {freeSeats} {freeSeats === 1 ? "seat" : "seats"} left —
                  the first to arrive get in.
                </p>
              )}
              <Button
                size="lg"
                className="h-11 w-full"
                onClick={send}
                disabled={!user || picked.length === 0 || sending}
              >
                {sending ? (
                  <Spinner />
                ) : (
                  <HugeiconsIcon icon={SentIcon} data-icon="inline-start" />
                )}
                Send invites{picked.length > 0 ? ` (${picked.length})` : ""}
              </Button>
            </>
          )}
        </section>

        <div
          className="flex items-center gap-3 text-[11px] text-muted-foreground"
          aria-hidden
        >
          <span className="h-px flex-1 bg-border" />
          or share
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="rounded-lg border bg-muted/40 p-3 text-center">
          <p className="text-xs text-muted-foreground">Room code</p>
          <button
            type="button"
            onClick={() => copy(meta.code, "Code copied!")}
            className="font-mono text-2xl font-bold tracking-[0.3em] transition-colors hover:text-primary"
            aria-label="Copy room code"
          >
            {meta.code}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => copy(link, "Link copied!")}>
            <HugeiconsIcon
              icon={copied ? Tick02Icon : Copy01Icon}
              data-icon="inline-start"
            />
            Copy link
          </Button>
          <Button variant="outline" onClick={share}>
            <HugeiconsIcon icon={Share08Icon} data-icon="inline-start" />
            Share
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
