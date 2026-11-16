"use client"

import * as React from "react"
import { Menu } from "@base-ui/react/menu"
import {
  Add01Icon,
  ArrowTurnBackwardIcon,
  Copy01Icon,
  Delete02Icon,
  InformationCircleIcon,
  PencilEdit02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import type { ChatPerson, MenuVia } from "@/components/chat/message-row"
import { MessageTicks } from "@/components/chat/message-ticks"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { UserAvatar } from "@/components/shared/user-avatar"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DELETE_WINDOW_MS,
  EDIT_WINDOW_MS,
  fullTimeLabel,
  isTextKind,
  MORE_REACTIONS,
  QUICK_REACTIONS,
  snippet,
  type KeyedMessage,
  type Receipts,
} from "@/lib/chat"
import { cn } from "@/lib/utils"

export interface MenuTarget {
  msg: KeyedMessage
  anchor: HTMLElement
  via: MenuVia
  /** When the menu opened, for the edit / unsend time limits. */
  at: number
}

export type MessageAction = "reply" | "copy" | "edit" | "info" | "delete"

/** What you can do with a message right now. */
export function actionsFor(
  msg: KeyedMessage,
  mine: boolean,
  now: number
): MessageAction[] {
  if (msg.kind === "system") return []
  if (msg.deleted) return ["delete"]
  const out: MessageAction[] = ["reply"]
  if (msg.text) out.push("copy")
  if (mine && isTextKind(msg) && now - msg.at < EDIT_WINDOW_MS) out.push("edit")
  if (mine) out.push("info")
  out.push("delete")
  return out
}

export const canDeleteForEveryone = (
  msg: KeyedMessage,
  mine: boolean,
  now: number
) => mine && !msg.deleted && now - msg.at < DELETE_WINDOW_MS

const ACTIONS: Record<
  MessageAction,
  { label: string; icon: IconSvgElement; destructive?: boolean }
> = {
  reply: { label: "Reply", icon: ArrowTurnBackwardIcon },
  copy: { label: "Copy", icon: Copy01Icon },
  edit: { label: "Edit", icon: PencilEdit02Icon },
  info: { label: "Info", icon: InformationCircleIcon },
  delete: { label: "Delete", icon: Delete02Icon, destructive: true },
}

/**
 * The menu for one message: a bottom sheet after a long-press on a phone, a
 * dropdown by the bubble on desktop. Quick reactions sit on top of both.
 */
export function MessageMenu({
  target,
  mine,
  myReaction,
  onClose,
  onReact,
  onMoreReactions,
  onAction,
}: {
  target: MenuTarget | null
  mine: boolean
  myReaction?: string
  onClose: () => void
  onReact: (emoji: string | null) => void
  onMoreReactions: () => void
  onAction: (action: MessageAction) => void
}) {
  // Keep the last target while the closing animation plays
  const [shown, setShown] = React.useState(target)
  if (target && target !== shown) setShown(target)
  const current = target ?? shown
  const actions = current ? actionsFor(current.msg, mine, current.at) : []
  const canReact = !!current && !current.msg.deleted && current.msg.kind !== "system"

  const emojiBar = canReact && (
    <QuickReactions
      mine={myReaction}
      onPick={(e) => onReact(e === myReaction ? null : e)}
      onMore={onMoreReactions}
    />
  )

  if (current?.via === "pointer")
    return (
      <Menu.Root
        open={!!target}
        onOpenChange={(open) => !open && onClose()}
      >
        <Menu.Portal>
          <Menu.Positioner
            anchor={current.anchor}
            side="bottom"
            align={mine ? "end" : "start"}
            sideOffset={6}
            collisionPadding={12}
            className="isolate z-50 outline-none"
          >
            <Menu.Popup className="min-w-52 origin-(--transform-origin) rounded-xl bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 outline-none data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
              {emojiBar && <div className="mb-1 border-b pb-1.5">{emojiBar}</div>}
              {actions.map((a) => (
                <Menu.Item
                  key={a}
                  onClick={() => onAction(a)}
                  className={cn(
                    "flex cursor-default items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-hidden select-none data-highlighted:bg-accent",
                    ACTIONS[a].destructive && "text-destructive"
                  )}
                >
                  <HugeiconsIcon icon={ACTIONS[a].icon} className="size-4" />
                  {ACTIONS[a].label}
                </Menu.Item>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    )

  return (
    <Sheet open={!!target} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto w-full max-w-xl gap-0 rounded-t-3xl pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <SheetTitle className="sr-only">Message options</SheetTitle>
        <SheetDescription className="sr-only">
          {current ? snippet(current.msg).slice(0, 80) : ""}
        </SheetDescription>
        {emojiBar && <div className="px-4 pt-4 pb-2">{emojiBar}</div>}
        <ul className={cn("px-2", !emojiBar && "pt-3")}>
          {actions.map((a) => (
            <li key={a}>
              <button
                type="button"
                onClick={() => onAction(a)}
                className={cn(
                  "flex h-12 w-full items-center gap-4 rounded-xl px-3 text-[15px] transition-colors active:bg-subtle-pressed",
                  ACTIONS[a].destructive && "text-destructive"
                )}
              >
                <HugeiconsIcon icon={ACTIONS[a].icon} className="size-5" />
                {ACTIONS[a].label}
              </button>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  )
}

/** ❤️ 😂 😮 😢 🙏 👍 and a "+" for the rest. */
function QuickReactions({
  mine,
  onPick,
  onMore,
}: {
  mine?: string
  onPick: (emoji: string) => void
  onMore: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-1" role="group" aria-label="React">
      {QUICK_REACTIONS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onPick(e)}
          aria-label={`React ${e}`}
          aria-pressed={mine === e}
          className={cn(
            "flex size-10 items-center justify-center rounded-full text-[1.55rem] leading-none transition-transform hover:scale-110 active:scale-95",
            mine === e && "bg-primary/15 ring-1 ring-primary/30"
          )}
        >
          {e}
        </button>
      ))}
      <button
        type="button"
        onClick={onMore}
        aria-label="More reactions"
        className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-subtle-pressed"
      >
        <HugeiconsIcon icon={Add01Icon} className="size-5" />
      </button>
    </div>
  )
}

/** Every reaction emoji, in a sheet. */
export function EmojiPickerSheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (emoji: string) => void
}) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="React with">
      <div className="grid grid-cols-6 gap-1 pb-2 min-[400px]:grid-cols-8">
        {[...QUICK_REACTIONS, ...MORE_REACTIONS].map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onPick(e)}
            aria-label={e}
            className="flex aspect-square items-center justify-center rounded-xl text-[1.6rem] leading-none transition-colors hover:bg-subtle-hover active:bg-subtle-pressed"
          >
            {e}
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

/** WhatsApp's choice: for everyone (your own, within the hour) or just for you. */
export function DeleteMessageDialog({
  target,
  forEveryone,
  onClose,
  onDeleteForMe,
  onDeleteForEveryone,
}: {
  target: KeyedMessage | null
  forEveryone: boolean
  onClose: () => void
  onDeleteForMe: () => void
  onDeleteForEveryone: () => void
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete message?</AlertDialogTitle>
          <AlertDialogDescription>
            {forEveryone
              ? "Delete it for everyone in this chat, or only from this device."
              : "It'll disappear from this device. Others can still see it."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          {forEveryone && (
            <Button variant="destructive" onClick={onDeleteForEveryone}>
              Delete for everyone
            </Button>
          )}
          <Button
            variant={forEveryone ? "outline" : "destructive"}
            onClick={onDeleteForMe}
          >
            Delete for me
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Who reacted with what; tap your own to take it back. */
export function ReactionsSheet({
  msg,
  meUid,
  people,
  onClose,
  onRemoveMine,
}: {
  msg: KeyedMessage | null
  meUid: string
  people: Record<string, ChatPerson>
  onClose: () => void
  onRemoveMine: () => void
}) {
  const [shown, setShown] = React.useState(msg)
  if (msg && msg !== shown) setShown(msg)
  const entries = Object.entries((msg ?? shown)?.reactions ?? {}).sort(
    ([a], [b]) => (a === meUid ? -1 : b === meUid ? 1 : 0)
  )
  return (
    <BottomSheet
      open={!!msg}
      onOpenChange={(open) => !open && onClose()}
      title={`${entries.length} ${entries.length === 1 ? "reaction" : "reactions"}`}
    >
      <ul className="flex flex-col pb-2">
        {entries.map(([uid, emoji]) => {
          const person = people[uid]
          const mine = uid === meUid
          const row = (
            <>
              <UserAvatar uid={uid} src={person?.photo} name={person?.name ?? "Someone"} size="md" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium">
                  {mine ? "You" : (person?.name ?? "Former member")}
                </span>
                {mine && (
                  <span className="block text-xs text-muted-foreground">
                    Tap to remove
                  </span>
                )}
              </span>
              <span className="text-2xl leading-none">{emoji}</span>
            </>
          )
          return (
            <li key={uid}>
              {mine ? (
                <button
                  type="button"
                  onClick={onRemoveMine}
                  className="flex w-full items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-subtle-hover active:bg-subtle-pressed"
                >
                  {row}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-1 py-2">{row}</div>
              )}
            </li>
          )
        })}
      </ul>
    </BottomSheet>
  )
}

/**
 * Message info: in a DM when it was delivered / read; in a group who has
 * read it and who has only received it. Times are when that person's app
 * last caught up, so a read time can be a little later than the moment they saw it.
 */
export function MessageInfoSheet({
  msg,
  group,
  others,
  people,
  receipts,
  now,
  onClose,
}: {
  msg: KeyedMessage | null
  group: boolean
  others: string[]
  people: Record<string, ChatPerson>
  receipts: Receipts
  now: number
  onClose: () => void
}) {
  const [shown, setShown] = React.useState(msg)
  if (msg && msg !== shown) setShown(msg)
  const m = msg ?? shown
  const at = m?.at ?? 0
  const readBy = others.filter((u) => (receipts[u]?.read ?? 0) >= at)
  const deliveredTo = others.filter(
    (u) => !readBy.includes(u) && (receipts[u]?.delivered ?? 0) >= at
  )
  const waiting = others.filter(
    (u) => !readBy.includes(u) && !deliveredTo.includes(u)
  )

  const person = (uid: string, when?: number) => (
    <li key={uid} className="flex items-center gap-3 py-2">
      <UserAvatar uid={uid} src={people[uid]?.photo} name={people[uid]?.name ?? "Member"} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {people[uid]?.name ?? "Member"}
        </span>
        {when ? (
          <span className="block text-xs text-muted-foreground">
            {fullTimeLabel(when, now)}
          </span>
        ) : null}
      </span>
    </li>
  )

  return (
    <BottomSheet
      open={!!msg}
      onOpenChange={(open) => !open && onClose()}
      title="Message info"
      description={m ? `Sent ${fullTimeLabel(m.at, now)}` : undefined}
    >
      {m && (
        <div className="flex flex-col gap-4 pb-3">
          <p className="line-clamp-3 rounded-xl bg-chat-out px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap">
            {snippet(m)}
          </p>
          {group ? (
            <>
              <InfoSection title="Read by" status="read" empty="No one yet">
                {readBy.map((u) => person(u, receipts[u]?.read))}
              </InfoSection>
              <InfoSection title="Delivered to" status="delivered" empty={readBy.length === others.length ? "Everyone has read it" : "No one else yet"}>
                {deliveredTo.map((u) => person(u, receipts[u]?.delivered))}
              </InfoSection>
              {waiting.length > 0 && (
                <InfoSection title="Not delivered yet" status="sent">
                  {waiting.map((u) => person(u))}
                </InfoSection>
              )}
            </>
          ) : (
            <ul className="flex flex-col divide-y rounded-xl border">
              <InfoLine
                status="read"
                label="Read"
                value={readBy.length ? fullTimeLabel(receipts[others[0]]!.read!, now) : "—"}
              />
              <InfoLine
                status="delivered"
                label="Delivered"
                value={
                  readBy.length || deliveredTo.length
                    ? fullTimeLabel(
                        Math.min(
                          receipts[others[0]]?.delivered ?? Infinity,
                          receipts[others[0]]?.read ?? Infinity
                        ),
                        now
                      )
                    : "—"
                }
              />
            </ul>
          )}
        </div>
      )}
    </BottomSheet>
  )
}

function InfoSection({
  title,
  status,
  empty,
  children,
}: {
  title: string
  status: "read" | "delivered" | "sent"
  empty?: string
  children: React.ReactNode[]
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <MessageTicks status={status} className={status !== "read" ? "text-muted-foreground" : undefined} />
        {title}
      </h3>
      {children.length > 0 ? (
        <ul className="mt-1 flex flex-col">{children}</ul>
      ) : (
        <p className="mt-1.5 text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  )
}

function InfoLine({
  status,
  label,
  value,
}: {
  status: "read" | "delivered"
  label: string
  value: string
}) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <MessageTicks status={status} className={status !== "read" ? "text-muted-foreground" : undefined} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{value}</span>
    </li>
  )
}
