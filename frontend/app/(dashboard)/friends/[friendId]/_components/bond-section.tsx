"use client"

import * as React from "react"
import { FavouriteIcon, Tag01Icon, UserMultiple02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useFriendships } from "@/hooks/use-fun"
import { useAcceptBond, useClearBondRequest, useEndBond, useRequestBond } from "@/hooks/use-fun-mutations"
import { BOND_IDS, BONDS, isBondId, type BondId } from "@/lib/fun/catalog"
import type { Friendship, UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

const sinceLabel = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" })

/** The tag on top of a friendship: shows it, asks for one, or answers their ask. */
export function BondPill({ friend, friendship }: { friend: UserProfile; friendship: Friendship | undefined }) {
  const { user } = useSession()
  const [open, setOpen] = React.useState(false)
  const accept = useAcceptBond()
  const clear = useClearBondRequest()
  const first = friend.displayName.split(" ")[0]

  if (!friendship || !user) return null
  const bond = friendship.bond && isBondId(friendship.bond.type) ? friendship.bond : undefined
  const ask = friendship.bondRequest && isBondId(friendship.bondRequest.type) ? friendship.bondRequest : undefined
  const askedByThem = ask && ask.from !== user.uid

  return (
    <>
      {askedByThem ? (
        // They asked: answer right here
        <div className="flex w-full max-w-sm flex-col items-center gap-2 rounded-xl border bg-card px-4 py-3 text-center">
          <p className="text-sm">
            <span className="font-semibold">{first}</span> wants you to be{" "}
            {ask.type === "love" ? "in love" : `their ${BONDS[ask.type as BondId].name.toLowerCase()}`}
          </p>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button variant="outline" size="sm" disabled={clear.isPending || accept.isPending} onClick={() => clear.mutate(friendship)}>
              Not now
            </Button>
            <Button size="sm" disabled={accept.isPending || clear.isPending} onClick={() => accept.mutate(friendship)}>
              {accept.isPending && <Spinner />}
              Accept
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
            bond?.type === "love"
              ? "border-rose-300/60 bg-rose-50 text-rose-600 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300"
              : bond
                ? "border-primary/25 bg-primary/5 text-primary"
                : "border-dashed text-muted-foreground hover:text-foreground"
          )}
        >
          <HugeiconsIcon
            icon={bond?.type === "love" ? FavouriteIcon : bond ? UserMultiple02Icon : Tag01Icon}
            className="size-3.5"
          />
          {bond
            ? `${BONDS[bond.type as BondId].pair} · since ${sinceLabel(bond.since)}`
            : ask
              ? `${BONDS[ask.type as BondId].name} request sent`
              : "Add a tag"}
        </button>
      )}
      <BondSheet open={open} onOpenChange={setOpen} friend={friend} friendship={friendship} />
    </>
  )
}

function BondSheet({
  open,
  onOpenChange,
  friend,
  friendship,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  friend: UserProfile
  friendship: Friendship
}) {
  const { user } = useSession()
  const { data: friendships } = useFriendships()
  const request = useRequestBond()
  const clear = useClearBondRequest()
  const end = useEndBond()
  const first = friend.displayName.split(" ")[0]
  const bond = friendship.bond
  const ask = friendship.bondRequest
  const [pick, setPick] = React.useState<BondId>("buddy")

  // One love at a time
  const loveElsewhere = friendships.some((f) => f.id !== friendship.id && f.status === "ACTIVE" && f.bond?.type === "love")
  const busy = request.isPending || clear.isPending || end.isPending

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={bond ? `You & ${first}` : `What's ${first} to you?`}
      description={
        bond
          ? `Tagged ${BONDS[bond.type as BondId]?.pair.toLowerCase() ?? ""} since ${sinceLabel(bond.since)}.`
          : `${first} gets a request — the tag shows once they accept.`
      }
      footer={
        bond ? (
          <Button
            variant="outline"
            className="w-full text-destructive"
            disabled={busy}
            onClick={() => end.mutate(friendship, { onSuccess: () => onOpenChange(false) })}
          >
            Remove tag
          </Button>
        ) : ask && ask.from === user?.uid ? (
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={() => clear.mutate(friendship, { onSuccess: () => onOpenChange(false) })}
          >
            Take back request
          </Button>
        ) : (
          <Button
            className="w-full"
            disabled={busy || (pick === "love" && loveElsewhere)}
            onClick={() => request.mutate({ friendUid: friend.uid, bond: pick }, { onSuccess: () => onOpenChange(false) })}
          >
            {request.isPending && <Spinner />}
            Send request
          </Button>
        )
      }
    >
      {!bond && !(ask && ask.from === user?.uid) && (
        <div className="flex flex-col gap-2 pb-2" role="radiogroup" aria-label="Tag">
          {BOND_IDS.map((id) => {
            const disabled = id === "love" && loveElsewhere
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={pick === id}
                disabled={disabled}
                onClick={() => setPick(id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                  pick === id ? "border-primary bg-primary/5" : "hover:bg-muted/60"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    id === "love" ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" : "bg-primary/10 text-primary"
                  )}
                >
                  <HugeiconsIcon icon={id === "love" ? FavouriteIcon : UserMultiple02Icon} className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{BONDS[id].name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {disabled ? "You already have a love tag with someone" : BONDS[id].blurb}
                  </span>
                </span>
                <span
                  className={cn(
                    "size-4 shrink-0 rounded-full border-2",
                    pick === id ? "border-[5px] border-primary" : "border-muted-foreground/40"
                  )}
                />
              </button>
            )
          })}
        </div>
      )}
      {ask && ask.from === user?.uid && !bond && (
        <p className="pb-4 text-sm text-muted-foreground">
          Waiting for {first} to accept your {BONDS[ask.type as BondId]?.name.toLowerCase()} request.
        </p>
      )}
      {bond && (
        <p className="pb-4 text-sm text-muted-foreground">
          {bond.type === "love"
            ? "Love tags unlock hugs, kisses and miss-yous between you two."
            : "Tags show on both your profiles."}
        </p>
      )}
    </BottomSheet>
  )
}
