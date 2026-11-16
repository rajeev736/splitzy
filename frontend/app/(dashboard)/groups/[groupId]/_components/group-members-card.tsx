"use client"

import * as React from "react"
import { Search01Icon, UserAdd01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Card, CardContent } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ItemGroup } from "@/components/ui/item"
import { useFriends } from "@/hooks/queries"
import {
  canAddGroupMembers,
  isGroupAdmin,
  sortGroupMembers,
} from "@/lib/groups"
import type { Expense, Group } from "@/lib/types"
import { MemberActionsSheet, memberHasActions } from "./member-actions-sheet"
import { MemberRow } from "./member-row"
import { PendingInvites } from "./pending-invites"

/** Search appears once the list gets long. */
const SEARCH_FROM = 8

/**
 * The member list of the group info screen: you first, then admins, then
 * everyone else. Tap someone for their actions (admins: make admin, remove).
 */
export function GroupMembersCard({
  group,
  expenses,
  onAdd,
}: {
  group: Group
  expenses?: Expense[]
  onAdd: () => void
}) {
  const { user } = useSession()
  const { data: friends } = useFriends()
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<string | null>(null)

  const friendUids = friends.map((f) => f.uid)
  const canAdd = canAddGroupMembers(group, user?.uid)
  const q = query.trim().toLowerCase()
  const members = sortGroupMembers(group, user?.uid).filter((uid) => {
    if (!q) return true
    const info = group.memberDetails?.[uid]
    return `${info?.name ?? ""} ${info?.splitzyId ?? ""}`
      .toLowerCase()
      .includes(q)
  })

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-semibold">
          {group.members.length}{" "}
          {group.members.length === 1 ? "member" : "members"}
        </h2>
        {!canAdd && (
          <span className="text-[11px] text-muted-foreground">
            Only admins can add people
          </span>
        )}
      </div>

      <Card className="gap-0 py-2">
        <CardContent className="flex flex-col gap-1 px-4">
          {group.members.length >= SEARCH_FROM && (
            <InputGroup className="my-2 h-9 bg-card">
              <InputGroupAddon className="pl-3 text-muted-foreground">
                <HugeiconsIcon icon={Search01Icon} className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search members"
                aria-label="Search members"
              />
            </InputGroup>
          )}

          {canAdd && !q && (
            <button
              type="button"
              onClick={onAdd}
              className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <HugeiconsIcon icon={UserAdd01Icon} className="size-5" />
              </span>
              <span className="text-sm font-semibold text-primary">
                Add members
              </span>
            </button>
          )}

          <ItemGroup role="list" className="gap-0">
            {members.map((uid) => {
              const info = group.memberDetails?.[uid]
              const friend = friends.find((f) => f.uid === uid)
              const isMe = uid === user?.uid
              const name =
                info?.name ||
                (isMe ? user?.displayName : friend?.displayName) ||
                `User ${uid.slice(-4)}`
              const tappable = memberHasActions(
                group,
                user?.uid,
                uid,
                friendUids
              )
              return (
                <MemberRow
                  key={uid}
                  uid={uid}
                  name={name}
                  photoURL={
                    info?.photoURL || (isMe ? user?.photoURL : friend?.photoURL)
                  }
                  splitzyId={info?.splitzyId || friend?.splitzyId || uid}
                  isMe={isMe}
                  isCreator={uid === group.createdBy}
                  isAdmin={isGroupAdmin(group, uid)}
                  onClick={tappable ? () => setSelected(uid) : undefined}
                />
              )
            })}
          </ItemGroup>
          {q && members.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              No members match &quot;{query}&quot;
            </p>
          )}

          <PendingInvites group={group} className="mt-2 mb-2" />
        </CardContent>
      </Card>

      <MemberActionsSheet
        group={group}
        uid={selected}
        expenses={expenses}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </section>
  )
}
