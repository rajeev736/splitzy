"use client"

import * as React from "react"
import Link from "next/link"
import { PlusSignIcon, Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GroupIcon } from "@/components/shared/group-icon"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Card, CardContent } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import type { Group, UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { PERSONAL_CATEGORIES, type ExpenseDraft, type ExpenseMode } from "./use-expense-draft"

const MODES: { value: ExpenseMode; label: string }[] = [
  { value: "group", label: "Group" },
  { value: "friend", label: "Friends" },
  { value: "personal", label: "Just me" },
]

/** Past this many friends, a search box helps find the right one. */
const SEARCH_FROM = 8

/**
 * "Split with": three tabs — Group, Friends, Just me — and the choices for the
 * open tab right under them. Switching is one tap; nothing hides in a sheet.
 */
export function SplitWithPicker({
  draft,
  groups,
  friends,
}: {
  draft: ExpenseDraft
  groups: Group[]
  friends: UserProfile[]
}) {
  const mode = draft.expenseMode

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">Split with</span>
          <div role="tablist" aria-label="Split with" className="grid grid-cols-3 rounded-md border bg-muted/60 p-0.5">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={mode === m.value}
                onClick={() => draft.setExpenseMode(m.value)}
                className={cn(
                  "rounded-[5px] px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                  mode === m.value ? "bg-background text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "group" && <GroupChoices draft={draft} groups={groups} />}
        {mode === "friend" && <FriendChoices draft={draft} friends={friends} />}
        {mode === "personal" && <CategoryChoices draft={draft} />}
      </CardContent>
    </Card>
  )
}

function GroupChoices({ draft, groups }: { draft: ExpenseDraft; groups: Group[] }) {
  if (groups.length === 0) {
    return <EmptyChoice text="No groups yet." href="/groups/new" cta="Create a group" />
  }
  return (
    <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
      {groups.map((g) => (
        <Chip key={g.id} selected={draft.currentGroup.id === g.id} onClick={() => draft.setSelectedGroupId(g.id)}>
          <GroupIcon src={g.icon} alt={g.name} size="sm" className="size-6" />
          <span className="truncate">{g.name}</span>
        </Chip>
      ))}
      <Link
        href="/groups/new"
        className="flex h-9 items-center gap-1.5 rounded-md border border-dashed px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
        New group
      </Link>
    </div>
  )
}

function FriendChoices({ draft, friends }: { draft: ExpenseDraft; friends: UserProfile[] }) {
  const [search, setSearch] = React.useState("")
  if (friends.length === 0) {
    return <EmptyChoice text="No friends yet." href="/friends/add" cta="Add a friend" />
  }

  const q = search.trim().toLowerCase()
  const shown = q
    ? friends.filter((f) => f.displayName.toLowerCase().includes(q) || f.splitzyId.toLowerCase().includes(q))
    : friends
  const picked = draft.selectedFriendIds.length

  return (
    <div className="flex flex-col gap-2.5">
      {friends.length > SEARCH_FROM && (
        <InputGroup className="h-9">
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search friends"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends"
            className="text-sm"
          />
        </InputGroup>
      )}
      <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto">
        {shown.map((f) => {
          const selected = draft.selectedFriendIds.includes(f.uid)
          return (
            <Chip key={f.uid} selected={selected} onClick={() => draft.toggleFriendSelection(f.uid)}>
              {selected ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <HugeiconsIcon icon={Tick02Icon} className="size-3.5" />
                </span>
              ) : (
                <UserAvatar src={f.photoURL} name={f.displayName} size="xs" className="size-6" />
              )}
              <span className="truncate">{f.displayName}</span>
            </Chip>
          )
        })}
        {shown.length === 0 && <p className="py-2 text-xs text-muted-foreground">No friend matches &quot;{search}&quot;.</p>}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {picked === 1 ? "Tap more friends to split with several." : `${picked} friends selected`}
      </p>
    </div>
  )
}

function CategoryChoices({ draft }: { draft: ExpenseDraft }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted-foreground">Private to you · pick a category</p>
      <div className="flex flex-wrap gap-2">
        {PERSONAL_CATEGORIES.map((cat) => (
          <Chip
            key={cat.id}
            selected={draft.personalCategory === cat.id}
            onClick={() => draft.setPersonalCategory(cat.id)}
          >
            <span className="flex size-6 items-center justify-center text-base">{cat.icon}</span>
            {cat.label}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function EmptyChoice({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2.5">
      <span className="text-xs text-muted-foreground">{text}</span>
      <Link href={href} className="text-xs font-semibold text-primary hover:underline">
        {cta}
      </Link>
    </div>
  )
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex h-9 max-w-52 min-w-0 items-center gap-2 rounded-md border pr-3 pl-1.5 text-sm font-medium whitespace-nowrap transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-foreground hover:border-foreground/30"
      )}
    >
      {children}
    </button>
  )
}
