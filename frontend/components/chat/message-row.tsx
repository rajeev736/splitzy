"use client"

import * as React from "react"
import {
  ArrowDown01Icon,
  ArrowTurnBackwardIcon,
  Image01Icon,
  UnavailableIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { PhotoThumb } from "@/components/chat/chat-photo"
import { MessageTicks } from "@/components/chat/message-ticks"
import { RichText } from "@/components/chat/rich-text"
import { UserAvatar } from "@/components/shared/user-avatar"
import {
  barColor,
  jumboEmoji,
  nameColor,
  timeLabel,
  type KeyedMessage,
  type MessageStatus,
  type ReplyRef,
} from "@/lib/chat"
import { cn } from "@/lib/utils"

/** Someone in the chat, as the bubbles need them. */
export interface ChatPerson {
  uid: string
  name: string
  photo?: string
  role?: "admin" | "member"
}

export type MenuVia = "touch" | "pointer"

export interface MessageRowProps {
  msg: KeyedMessage
  mine: boolean
  /** Group chats show names and avatars on others' messages. */
  group: boolean
  firstInRun: boolean
  sender?: ChatPerson
  status?: MessageStatus
  meUid: string
  selected?: boolean
  onReply: (msg: KeyedMessage) => void
  onMenu: (msg: KeyedMessage, anchor: HTMLElement, via: MenuVia) => void
  onReactions: (msg: KeyedMessage) => void
  onJump: (id: string) => void
  onOpenPhoto: (msg: KeyedMessage, src: string) => void
  loadPhoto: (msgId: string) => Promise<string | null>
}

/** How far (px) a bubble must be dragged right to reply. */
const SWIPE_REPLY = 56
const HOLD_MS = 420

/**
 * Touch gestures on a bubble: hold for the menu, drag right to reply. Moves
 * the bubble directly (no re-render per frame); vertical drags are left to the
 * list's scrolling (touch-action: pan-y).
 */
function useBubbleGestures(onHold: () => void, onSwipe: (() => void) | null) {
  /** The part that slides, and the reply arrow it uncovers. */
  const moving = React.useRef<HTMLDivElement>(null)
  const hint = React.useRef<HTMLSpanElement>(null)
  const g = React.useRef<{
    id: number
    x: number
    y: number
    dx: number
    swiping: boolean
    armed: boolean
    timer: number
  } | null>(null)

  const reset = () => {
    const el = moving.current
    if (el) {
      el.style.transition = "transform 180ms ease-out"
      el.style.transform = ""
    }
    if (hint.current) {
      hint.current.style.opacity = "0"
      hint.current.style.transform = "scale(0.6)"
    }
  }

  const end = () => {
    const s = g.current
    g.current = null
    if (!s) return
    window.clearTimeout(s.timer)
    if (s.swiping) {
      reset()
      if (s.armed) onSwipe?.()
    }
  }

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== "touch" || !e.isPrimary) return
      const timer = window.setTimeout(() => {
        if (!g.current || g.current.swiping) return
        g.current = null
        navigator.vibrate?.(12)
        onHold()
      }, HOLD_MS)
      g.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        dx: 0,
        swiping: false,
        armed: false,
        timer,
      }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = g.current
      if (!s || s.id !== e.pointerId) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (!s.swiping) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) window.clearTimeout(s.timer)
        if (onSwipe && dx > 12 && dx > Math.abs(dy) * 1.6) {
          s.swiping = true
          if (moving.current) moving.current.style.transition = "none"
        } else if (Math.abs(dy) > 10 || dx < -10) {
          g.current = null
          window.clearTimeout(s.timer)
          return
        } else return
      }
      // Rubber band: follows the finger, then resists
      const shift = Math.min(dx, 40) + Math.max(0, Math.min(dx - 40, 120)) * 0.35
      s.dx = shift
      if (moving.current) moving.current.style.transform = `translateX(${shift}px)`
      const armed = shift >= SWIPE_REPLY
      if (armed && !s.armed) navigator.vibrate?.(8)
      s.armed = armed
      if (hint.current) {
        const p = Math.min(1, shift / SWIPE_REPLY)
        hint.current.style.opacity = String(p)
        hint.current.style.transform = `scale(${0.6 + p * 0.4})`
      }
    },
    onPointerUp: end,
    onPointerCancel: end,
  }
  return { moving, hint, handlers }
}

export const MessageRow = React.memo(function MessageRow({
  msg,
  mine,
  group,
  firstInRun,
  sender,
  status,
  meUid,
  selected,
  onReply,
  onMenu,
  onReactions,
  onJump,
  onOpenPhoto,
  loadPhoto,
}: MessageRowProps) {
  const bubble = React.useRef<HTMLDivElement>(null)
  const deleted = !!msg.deleted
  const { moving, hint, handlers } = useBubbleGestures(
    () => bubble.current && onMenu(msg, bubble.current, "touch"),
    deleted ? null : () => onReply(msg)
  )

  const isPhoto = msg.kind === "photo" && !deleted && !!msg.photo
  const jumbo = !deleted && !isPhoto && !msg.replyTo && jumboEmoji(msg.text)
  const showName = group && !mine && firstInRun
  const showAvatar = group && !mine
  const reactions = deleted ? [] : summarise(msg.reactions)
  const name = sender?.name ?? msg.name

  const meta = (
    <>
      {msg.editedAt && !deleted && <span>Edited</span>}
      <span>{timeLabel(msg.at)}</span>
      {mine && status && !deleted && <MessageTicks status={status} />}
    </>
  )
  // An invisible copy of the time at the end of the text keeps room for the real one
  const spacer = (
    <span
      aria-hidden
      className="pointer-events-none invisible ml-2 inline-flex items-center gap-1 align-bottom text-[11px] leading-none"
    >
      {meta}
    </span>
  )

  return (
    <div
      data-msg-id={msg.id}
      className={cn(
        "relative -mx-2 flex px-2 sm:-mx-3 sm:px-3",
        mine ? "justify-end" : "justify-start",
        firstInRun ? "mt-2" : "mt-0.5",
        reactions.length > 0 && "mb-3",
        selected && "rounded-lg bg-primary/10"
      )}
      style={{ touchAction: "pan-y" }}
      onContextMenu={(e) => {
        // Long-press on phones opens our menu instead of the browser's
        e.preventDefault()
        if (bubble.current && window.matchMedia("(hover: hover)").matches)
          onMenu(msg, bubble.current, "pointer")
      }}
      {...handlers}
    >
      {/* Revealed while swiping right to reply */}
      <span
        ref={hint}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-muted-foreground opacity-0 shadow-sm"
        style={{ transform: "scale(0.6)" }}
      >
        <HugeiconsIcon icon={ArrowTurnBackwardIcon} className="size-4" />
      </span>

      {showAvatar && (
        <div className="mr-1.5 w-7 shrink-0">
          {firstInRun && (
            <UserAvatar
              uid={msg.uid}
              src={sender?.photo}
              name={name}
              size="xs"
              className="mt-0.5 size-7"
            />
          )}
        </div>
      )}

      <div
        ref={moving}
        className={cn(
          "group/msg relative flex min-w-0 flex-col",
          mine ? "items-end" : "items-start",
          showAvatar ? "max-w-[min(80%,30rem)]" : "max-w-[min(85%,32rem)]"
        )}
      >
        {jumbo ? (
          <div ref={bubble} className="relative flex flex-col items-end">
            <p className="text-[2.6rem] leading-[1.15] select-none">
              {msg.text}
            </p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-chat-in/85 px-1.5 py-0.5 text-[11px] leading-none text-chat-meta shadow-xs">
              {meta}
            </span>
            <MenuChevron
              onOpen={(el) => onMenu(msg, el, "pointer")}
              className="top-0 right-0 bg-chat-in/90"
            />
          </div>
        ) : (
          <div
            ref={bubble}
            data-bubble
            className={cn(
              "relative min-w-0 rounded-[10px] text-foreground shadow-[0_1px_0.5px_rgb(0_0_0/0.12)]",
              mine ? "bg-chat-out" : "bg-chat-in",
              firstInRun && (mine ? "rounded-tr-none" : "rounded-tl-none"),
              isPhoto ? "p-[3px]" : "px-2 pt-1 pb-1.5"
            )}
          >
            {firstInRun && <Tail mine={mine} />}
            {showName && (
              <p
                className={cn(
                  "truncate text-[13px] leading-5 font-semibold",
                  isPhoto && "px-1.5 pt-0.5",
                  nameColor(msg.uid)
                )}
              >
                {name}
                {sender?.role === "admin" && (
                  <span className="ml-1.5 text-[11px] font-normal text-chat-meta">
                    Admin
                  </span>
                )}
              </p>
            )}
            {msg.replyTo && !deleted && (
              <button
                type="button"
                className={cn(
                  "mb-1 block w-full min-w-0 text-left",
                  isPhoto && "mb-[3px]"
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onJump(msg.replyTo!.id)
                }}
              >
                <QuoteBlock quote={msg.replyTo} meUid={meUid} />
              </button>
            )}

            {deleted ? (
              <p className="flex items-center gap-1.5 pr-1 text-[14.5px] leading-snug text-chat-meta italic">
                <HugeiconsIcon icon={UnavailableIcon} className="size-4 shrink-0" />
                <span>
                  {mine ? "You deleted this message" : "This message was deleted"}
                  {spacer}
                </span>
              </p>
            ) : isPhoto ? (
              <>
                <PhotoThumb
                  photo={msg.photo!}
                  load={() => loadPhoto(msg.id)}
                  onOpen={(src) => onOpenPhoto(msg, src)}
                >
                  {!msg.text && (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-end gap-1 bg-linear-to-t from-black/45 to-transparent px-2 pb-1.5 text-[11px] leading-none text-white [&_svg]:text-current [&_.text-chat-tick]:text-[#7cc8ff]">
                      {meta}
                    </span>
                  )}
                </PhotoThumb>
                {msg.text && (
                  <p className="max-w-[260px] px-1.5 pt-1 pb-1 text-[15px] leading-snug wrap-break-word whitespace-pre-wrap">
                    <RichText text={msg.text} trailing={spacer} />
                  </p>
                )}
              </>
            ) : (
              <p className="text-[15px] leading-snug wrap-break-word whitespace-pre-wrap [@media(hover:hover)]:select-text">
                <RichText text={msg.text} trailing={spacer} />
              </p>
            )}

            {!(isPhoto && !msg.text) && (
              <span
                className={cn(
                  "pointer-events-none absolute right-2 bottom-1 flex items-center gap-1 text-[11px] leading-none text-chat-meta",
                  isPhoto && "right-2.5 bottom-1.5"
                )}
              >
                {meta}
              </span>
            )}
            <MenuChevron
              onOpen={(el) => onMenu(msg, el, "pointer")}
              className={cn(
                "top-1 right-1",
                mine ? "bg-chat-out" : "bg-chat-in",
                isPhoto && "bg-black/30 text-white"
              )}
            />
          </div>
        )}

        {reactions.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onReactions(msg)
            }}
            className={cn(
              "absolute -bottom-3.5 z-[1] flex h-6 items-center gap-0.5 rounded-full border border-background bg-chat-in px-1.5 text-[13px] leading-none shadow-sm transition-transform active:scale-95",
              mine ? "right-2" : "left-2",
              msg.reactions?.[meUid] && "ring-1 ring-primary/40"
            )}
            aria-label={`Reactions: ${reactions.map((r) => `${r.emoji} ${r.count}`).join(", ")}`}
          >
            {reactions.slice(0, 3).map((r) => (
              <span key={r.emoji}>{r.emoji}</span>
            ))}
            {total(reactions) > 1 && (
              <span className="ml-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                {total(reactions)}
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
})

/** The corner nub on the first bubble of a run (WhatsApp-style). */
function Tail({ mine }: { mine: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 8 13"
      className={cn(
        "absolute top-0 h-[13px] w-2",
        mine ? "-right-2 text-chat-out" : "-left-2 text-chat-in"
      )}
    >
      {mine ? (
        <path
          fill="currentColor"
          d="M5.188 0H0v11.193l6.467-8.625C7.526 1.156 6.958 0 5.188 0z"
        />
      ) : (
        <path
          fill="currentColor"
          d="M2.812 0H8v11.193L1.533 2.568C.474 1.156 1.042 0 2.812 0z"
        />
      )}
    </svg>
  )
}

/** Desktop: the little chevron that appears on hover and opens the menu. */
function MenuChevron({
  onOpen,
  className,
}: {
  onOpen: (el: HTMLElement) => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label="Message options"
      onClick={(e) => {
        e.stopPropagation()
        onOpen(e.currentTarget)
      }}
      className={cn(
        "absolute z-[2] hidden size-6 items-center justify-center rounded-full text-chat-meta opacity-0 transition-opacity focus-visible:opacity-100 [@media(hover:hover)]:flex [@media(hover:hover)]:group-hover/msg:opacity-100",
        className
      )}
    >
      <HugeiconsIcon icon={ArrowDown01Icon} className="size-4" strokeWidth={2.2} />
    </button>
  )
}

/** A quoted message: coloured bar, who said it, the start of what they said. */
export function QuoteBlock({
  quote,
  meUid,
  className,
}: {
  quote: ReplyRef
  meUid: string
  className?: string
}) {
  const photo = quote.kind === "photo"
  return (
    <span
      className={cn(
        "flex min-w-0 overflow-hidden rounded-md bg-black/[0.05] dark:bg-white/[0.07]",
        className
      )}
    >
      <span className={cn("w-1 shrink-0", barColor(quote.uid))} />
      <span className="min-w-0 flex-1 px-2 py-1">
        <span
          className={cn(
            "block truncate text-[12.5px] leading-5 font-semibold",
            nameColor(quote.uid)
          )}
        >
          {quote.uid === meUid ? "You" : quote.name}
        </span>
        <span className="line-clamp-2 text-[13px] leading-snug wrap-break-word text-foreground/70">
          {photo && (
            <HugeiconsIcon
              icon={Image01Icon}
              className="mr-1 inline size-3.5 -translate-y-px"
            />
          )}
          {quote.text}
        </span>
      </span>
    </span>
  )
}

/** "This is a notice": a group event, centred. */
export function SystemNotice({ text }: { text: string }) {
  return (
    <div className="my-1.5 flex justify-center px-6">
      <p className="max-w-full rounded-lg bg-chat-in/90 px-3 py-1 text-center text-[12.5px] leading-snug text-muted-foreground shadow-[0_1px_0.5px_rgb(0_0_0/0.08)] backdrop-blur-sm">
        {text}
      </p>
    </div>
  )
}

function summarise(reactions: Record<string, string> | undefined) {
  if (!reactions) return []
  const counts = new Map<string, number>()
  for (const emoji of Object.values(reactions))
    counts.set(emoji, (counts.get(emoji) ?? 0) + 1)
  return [...counts.entries()]
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
}
const total = (r: { count: number }[]) => r.reduce((n, x) => n + x.count, 0)
