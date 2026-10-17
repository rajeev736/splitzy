"use client"

import Link from "next/link"
import { PlusSignIcon, Tick02Icon, UserIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GroupIcon } from "@/components/shared/group-icon"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Group, UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { MemberRow } from "./member-row"
import type { ExpenseDraft, ExpenseMode } from "./use-expense-draft"

/** "Split with" picker: a group, some friends, or just me (personal). */
export function SplitWithSheet({
  open,
  onOpenChange,
  draft,
  groups,
  friends,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  draft: ExpenseDraft
  groups: Group[]
  friends: UserProfile[]
}) {
  const close = () => onOpenChange(false)

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Split with"
      header={
        <Tabs value={draft.expenseMode} onValueChange={(v) => draft.setExpenseMode(v as ExpenseMode)}>
          <TabsList className="w-full">
            <TabsTrigger value="group">Group</TabsTrigger>
            <TabsTrigger value="friend">Friends</TabsTrigger>
            <TabsTrigger value="personal">Just me</TabsTrigger>
          </TabsList>
        </Tabs>
      }
      footer={
        <Button size="lg" className="h-11 w-full" onClick={close}>
          Done
        </Button>
      }
    >
      {draft.expenseMode === "group" &&
        (groups.length === 0 ? (
          <EmptyPicker text="You don't have any groups yet." href="/groups/new" cta="Create a group" />
        ) : (
          <div className="flex flex-col gap-1">
            {groups.map((g) => {
              const selected = draft.currentGroup.id === g.id
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => {
                    draft.setSelectedGroupId(g.id)
                    close()
                  }}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-muted/60",
                    selected && "bg-primary/5"
                  )}
                >
                  <GroupIcon src={g.icon} alt={g.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{g.name}</div>
                    <div className="text-xs text-muted-foreground">{g.members.length} members</div>
                  </div>
                  {selected && <HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-primary" />}
                </button>
              )
            })}
            <Link
              href="/groups/new"
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-semibold text-primary hover:bg-muted/60"
            >
              <span className="flex size-9 items-center justify-center rounded-lg border border-dashed border-primary/40">
                <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
              </span>
              Create a new group
            </Link>
          </div>
        ))}

      {draft.expenseMode === "friend" &&
        (friends.length === 0 ? (
          <EmptyPicker text="You haven't added any friends yet." href="/friends/add" cta="Add a friend" />
        ) : (
          <div className="flex flex-col gap-1">
            {friends.map((f) => (
              <MemberRow key={f.uid} as="label" name={f.displayName} photoURL={f.photoURL} subtitle={f.splitzyId}>
                <Checkbox
                  checked={draft.selectedFriendIds.includes(f.uid)}
                  onCheckedChange={() => draft.toggleFriendSelection(f.uid)}
                  className="size-5"
                />
              </MemberRow>
            ))}
          </div>
        ))}

      {draft.expenseMode === "personal" && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
            <HugeiconsIcon icon={UserIcon} className="size-6" />
          </span>
          <p className="text-sm font-semibold">Personal expense</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Private to your account. It doesn&apos;t affect shared balances or notify anyone.
          </p>
        </div>
      )}
    </BottomSheet>
  )
}

function EmptyPicker({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
      <Button size="sm" nativeButton={false} render={<Link href={href} />}>
        {cta}
      </Button>
    </div>
  )
}
