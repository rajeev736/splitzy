"use client"

import Link from "next/link"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { ChatPerson } from "@/components/chat/message-row"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { GroupIcon } from "@/components/shared/group-icon"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Badge } from "@/components/ui/badge"
import { firstName } from "@/lib/chat"
import { cn } from "@/lib/utils"

/** "typing…" / "Aman is typing…" / "Aman and Priya are typing…" */
export function typingLabel(names: string[], group: boolean) {
  if (names.length === 0) return null
  if (!group) return "typing…"
  const first = names.map(firstName)
  if (first.length === 1) return `${first[0]} is typing…`
  if (first.length === 2) return `${first[0]} and ${first[1]} are typing…`
  return `${first.length} people are typing…`
}

/** "Aman, Neha, Priya, You": who's in a group, for its header. */
export function memberLine(members: ChatPerson[], meUid: string) {
  const others = members
    .filter((m) => m.uid !== meUid)
    .map((m) => firstName(m.name))
    .sort((a, b) => a.localeCompare(b))
  return [...others, "You"].join(", ")
}

/**
 * The chat's title in the app header: photo or group icon, name, and a line
 * under it (typing, or a group's members). Tapping it opens the info sheet.
 */
export function ChatHeaderTitle({
  group,
  title,
  photo,
  groupIcon,
  uid,
  subtitle,
  typing,
  onOpen,
}: {
  group: boolean
  title: string
  photo?: string
  groupIcon?: string
  /** The friend, in a DM. */
  uid?: string
  subtitle?: string | null
  typing?: string | null
  onOpen: () => void
}) {
  const line = typing ?? subtitle
  return (
    <button
      type="button"
      onClick={onOpen}
      className="-my-1 -ml-1 flex w-full min-w-0 items-center gap-3 rounded-xl py-1 pr-2 pl-1 text-left transition-colors hover:bg-subtle-hover active:bg-subtle-pressed"
      aria-label={`${title}: chat info`}
    >
      {group ? (
        <GroupIcon
          src={groupIcon}
          alt={title}
          size="sm"
          className="size-9 rounded-full"
        />
      ) : (
        <UserAvatar uid={uid} src={photo} name={title} size="sm" className="size-9" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base leading-5 font-semibold">
          {title}
        </span>
        {line && (
          <span
            className={cn(
              "block truncate text-xs leading-4",
              typing ? "font-medium text-primary" : "text-muted-foreground"
            )}
          >
            {line}
          </span>
        )}
      </span>
    </button>
  )
}

/** Contact / group info: who it is, who's in it, and a way to their page. */
export function ChatInfoSheet({
  open,
  onOpenChange,
  group,
  title,
  photo,
  groupIcon,
  uid,
  description,
  members,
  meUid,
  href,
  hrefLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: boolean
  title: string
  photo?: string
  groupIcon?: string
  uid?: string
  description?: string
  members: ChatPerson[]
  meUid: string
  href: string
  hrefLabel: string
}) {
  const sorted = [...members].sort(
    (a, b) =>
      Number(b.uid === meUid) - Number(a.uid === meUid) ||
      Number(b.role === "admin") - Number(a.role === "admin") ||
      a.name.localeCompare(b.name)
  )
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={group ? "Group info" : "Contact info"}
    >
      <div className="flex flex-col items-center gap-2 pt-1 pb-4 text-center">
        {group ? (
          <GroupIcon src={groupIcon} alt={title} size="xl" className="size-24 rounded-full" />
        ) : (
          <UserAvatar uid={uid} src={photo} name={title} size="xl" className="size-24 text-2xl" />
        )}
        <div className="min-w-0 max-w-full">
          <p className="truncate text-lg font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {group ? `Group · ${members.length} members` : "Friend on JoySplit"}
          </p>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>

      {group && (
        <section className="pb-2">
          <h3 className="px-1 pb-1 text-xs font-semibold text-muted-foreground">
            {members.length} members
          </h3>
          <ul className="flex flex-col">
            {sorted.map((m) => (
              <li key={m.uid} className="flex items-center gap-3 px-1 py-2">
                <UserAvatar uid={m.uid} src={m.photo} name={m.name} size="md" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {m.uid === meUid ? "You" : m.name}
                </span>
                {m.role === "admin" && (
                  <Badge variant="secondary" className="shrink-0 text-[11px]">
                    Admin
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href={href}
        className="mb-2 flex h-12 items-center justify-between rounded-xl border px-4 text-sm font-medium transition-colors hover:bg-subtle-hover active:bg-subtle-pressed"
      >
        {hrefLabel}
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-4 text-muted-foreground" />
      </Link>
    </BottomSheet>
  )
}
