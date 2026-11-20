"use client"

import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { FriendActionButton, type FriendState } from "@/components/profile-peek/friend-action"
import { GroupIcon } from "@/components/shared/group-icon"
import { useGroups } from "@/hooks/queries"
import { useWallet } from "@/hooks/use-fun"
import { formatPaise } from "@/lib/money"
import type { Expense, UserProfile } from "@/lib/types"
import { ProfilePair } from "./profile-pair"

/**
 * Someone who isn't your friend (a group member, a player, someone in a
 * chat): their public profile — photo, name, JoySplit ID — the friend action
 * (Add / Accept / Request sent), the groups you share and the expenses you're
 * both on. Money and moments stay for friends.
 */
export function NonFriendProfile({
  person,
  state,
  mutual,
  meUid,
}: {
  person: UserProfile
  state: FriendState
  mutual: Expense[]
  meUid: string
}) {
  const { data: groups } = useGroups()
  const wallet = useWallet(person.uid)
  const together = groups.filter((g) => g.members.includes(person.uid))
  const first = person.displayName.split(" ")[0]

  return (
    <>
      <section className="flex flex-col items-center gap-3 text-center">
        <h1 className="sr-only">{person.displayName}</h1>
        <ProfilePair friend={person} wallet={wallet} />
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          {state.kind === "sent" ? "Friend request sent" : state.kind === "received" ? `${first} wants to be friends` : "Not a friend yet"}
        </span>
      </section>

      <div className="flex flex-col gap-2">
        <FriendActionButton state={state} name={person.displayName} splitzyId={person.splitzyId} className="h-11 rounded-xl" />
        {state.kind === "none" && (
          <p className="text-center text-xs text-muted-foreground">
            Add {first} as a friend to split directly, chat and see their balance with you.
          </p>
        )}
      </div>

      {together.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Groups together ({together.length})</h2>
          <ul className="flex flex-col divide-y rounded-xl border border-card-stroke bg-card shadow-xs">
            {together.map((g) => (
              <li key={g.id}>
                <Link href={`/groups/${g.id}`} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/60">
                  <GroupIcon src={g.icon} alt={g.name} size="sm" className="rounded-lg" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.name}</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mutual.length > 0 && (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Expenses together ({mutual.length})</h2>
          <ul className="flex flex-col">
            {mutual.map((e) => (
              <li key={e.id} className="border-b last:border-b-0">
                <Link
                  href={`/expenses/${e.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{e.title}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {e.groupId ? e.groupName || "Group" : "Direct"} · {e.payerId === meUid ? "You paid" : `${e.payerName} paid`} · {e.date}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{formatPaise(e.amountPaise)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
