"use client"

import * as React from "react"
import Link from "next/link"
import { PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GroupIcon } from "@/components/shared/group-icon"
import { PickerDrawer, PickerTrigger } from "@/components/shared/picker-drawer"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Group, UserProfile } from "@/lib/types"
import { cn } from "@/lib/utils"
import { PERSONAL_CATEGORIES, type ExpenseDraft, type ExpenseMode } from "./use-expense-draft"

const MODES: { value: ExpenseMode; label: string }[] = [
  { value: "group", label: "Group" },
  { value: "friend", label: "Friends" },
  { value: "personal", label: "Just me" },
]

/**
 * "Split with": three tabs — Group, Friends, Just me — and for the open tab one
 * field that opens a drawer with search to pick from, however long the list.
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
                  mode === m.value
                    ? "bg-background text-foreground ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "group" && <GroupChoice draft={draft} groups={groups} />}
        {mode === "friend" && <FriendChoice draft={draft} friends={friends} />}
        {mode === "personal" && <CategoryChoice draft={draft} />}
      </CardContent>
    </Card>
  )
}

function GroupChoice({ draft, groups }: { draft: ExpenseDraft; groups: Group[] }) {
  const [open, setOpen] = React.useState(false)
  if (groups.length === 0) {
    return <EmptyChoice text="No groups yet." href="/groups/new" cta="Create a group" />
  }
  const current = draft.currentGroup
  return (
    <>
      <PickerTrigger
        placeholder="Choose a group"
        media={current ? <GroupIcon src={current.icon} alt={current.name} size="sm" className="size-8" /> : undefined}
        label={current?.name}
        sublabel={current ? `${current.members.length} members` : undefined}
        onClick={() => setOpen(true)}
      />
      <PickerDrawer
        open={open}
        onOpenChange={setOpen}
        title="Choose a group"
        searchPlaceholder="Search groups"
        items={groups.map((g) => ({
          id: g.id,
          label: g.name,
          sublabel: `${g.members.length} members`,
          media: <GroupIcon src={g.icon} alt={g.name} size="sm" className="size-8" />,
        }))}
        selected={current ? [current.id] : []}
        onSelect={draft.setSelectedGroupId}
        top={
          <Link
            href="/groups/new"
            className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary/10">
              <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
            </span>
            Create a new group
          </Link>
        }
      />
    </>
  )
}

function FriendChoice({ draft, friends }: { draft: ExpenseDraft; friends: UserProfile[] }) {
  const [open, setOpen] = React.useState(false)
  if (friends.length === 0) {
    return <EmptyChoice text="No friends yet." href="/friends/add" cta="Add a friend" />
  }
  const picked = friends.filter((f) => draft.selectedFriendIds.includes(f.uid))
  const names = picked.map((f) => f.displayName.split(" ")[0])

  return (
    <>
      <PickerTrigger
        placeholder="Choose friends"
        media={
          picked.length > 0 ? (
            <span className="flex shrink-0 -space-x-2">
              {picked.slice(0, 3).map((f) => (
                <UserAvatar
                  key={f.uid}
                  src={f.photoURL}
                  name={f.displayName}
                  size="sm"
                  className="size-8 ring-2 ring-card"
                />
              ))}
            </span>
          ) : undefined
        }
        label={
          picked.length === 0
            ? undefined
            : picked.length <= 2
              ? names.join(" & ")
              : `${names.slice(0, 2).join(", ")} +${picked.length - 2}`
        }
        sublabel={picked.length > 0 ? `${picked.length} ${picked.length === 1 ? "friend" : "friends"} · tap to change` : undefined}
        onClick={() => setOpen(true)}
      />
      <PickerDrawer
        open={open}
        onOpenChange={setOpen}
        title="Split with friends"
        description="Pick one or more friends."
        searchPlaceholder="Search name or JoySplit ID"
        multiple
        items={friends.map((f) => ({
          id: f.uid,
          label: f.displayName,
          sublabel: f.splitzyId,
          keywords: f.splitzyId,
          media: <UserAvatar src={f.photoURL} name={f.displayName} size="sm" className="size-8" />,
        }))}
        selected={draft.selectedFriendIds}
        onSelect={draft.toggleFriendSelection}
        bottom={
          <Link href="/friends/add" className="text-center text-xs font-medium text-primary hover:underline">
            Add a new friend
          </Link>
        }
      />
    </>
  )
}

/** Your own categories, kept on this device. */
const CUSTOM_KEY = "joysplit_custom_categories"
function loadCustom(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]")
    return Array.isArray(list) ? list.filter((c): c is string => typeof c === "string").slice(0, 20) : []
  } catch {
    return []
  }
}
function saveCustom(list: string[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable */
  }
}

function CategoryChoice({ draft }: { draft: ExpenseDraft }) {
  const [open, setOpen] = React.useState(false)
  const [custom, setCustom] = React.useState<string[]>(() => (typeof window === "undefined" ? [] : loadCustom()))
  const [newName, setNewName] = React.useState("")

  const preset = PERSONAL_CATEGORIES.find((c) => c.id === draft.personalCategory)
  const items = [
    ...PERSONAL_CATEGORIES.map((c) => ({ id: c.id as string, label: c.label as string, icon: c.icon as string })),
    ...custom.map((c) => ({ id: c, label: c, icon: "🏷️" })),
  ]
  const current = items.find((i) => i.id === draft.personalCategory)

  const addCustom = () => {
    const name = newName.trim().slice(0, 40)
    if (!name) return
    const existing = items.find((i) => i.label.toLowerCase() === name.toLowerCase())
    if (existing) {
      draft.setPersonalCategory(existing.id)
    } else {
      const next = [...custom, name]
      setCustom(next)
      saveCustom(next)
      draft.setPersonalCategory(name)
    }
    setNewName("")
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted-foreground">Private to you · pick a category</p>
      <PickerTrigger
        placeholder="Choose a category"
        media={
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-lg">
            {preset?.icon ?? current?.icon ?? "🏷️"}
          </span>
        }
        label={current?.label ?? draft.personalCategory}
        onClick={() => setOpen(true)}
      />
      <PickerDrawer
        open={open}
        onOpenChange={setOpen}
        title="Category"
        searchPlaceholder="Search categories"
        items={items.map((c) => ({
          id: c.id,
          label: c.label,
          media: <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-lg">{c.icon}</span>,
        }))}
        selected={[draft.personalCategory]}
        onSelect={draft.setPersonalCategory}
        bottom={
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              addCustom()
            }}
          >
            <Input
              aria-label="New category"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add your own category"
              maxLength={40}
            />
            <Button type="submit" variant="outline" disabled={!newName.trim()}>
              <HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" />
              Add
            </Button>
          </form>
        }
      />
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
