"use client"

import * as React from "react"
import { SentIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRoomChildren, type Keyed } from "@/hooks/use-live-room"
import type { ChatMessage } from "@/lib/live/types"
import { cn } from "@/lib/utils"
import { sendChat } from "@/services/live-rooms"

type Msg = ChatMessage & { for?: string }

/**
 * The room's chat: messages oldest first, newest in view, and a box to type in.
 * Games can take over sending (Scribble turns messages into guesses) and
 * render a message their own way.
 */
export function RoomChat({
  code,
  placeholder = "Say something…",
  onSend,
  disabled,
  renderMessage,
  className,
  autoFocus,
}: {
  code: string
  placeholder?: string
  /** Replaces the default send (e.g. to check a guess first). Return false to keep the text in the box. */
  onSend?: (text: string) => Promise<boolean | void> | boolean | void
  disabled?: boolean
  renderMessage?: (msg: Keyed<Msg>, mine: boolean) => React.ReactNode
  className?: string
  autoFocus?: boolean
}) {
  const { user } = useSession()
  const uid = user?.uid ?? ""
  const all = useRoomChildren<Msg>(code, "chat", 200)
  // "close!" hints are for one person only
  const messages = all.filter((m) => !m.value.for || m.value.for === uid)
  const [text, setText] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)
  const stickToBottom = React.useRef(true)

  // Follow new messages unless the reader scrolled up to look at older ones
  React.useEffect(() => {
    const el = listRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages.length])
  // …and keep the newest in view when the list shrinks (the keyboard opening)
  React.useEffect(() => {
    const el = listRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (stickToBottom.current) el.scrollTop = el.scrollHeight
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const submit = async () => {
    const clean = text.trim()
    if (!clean || !user || sending) return
    setSending(true)
    try {
      if (onSend) {
        const keep = (await onSend(clean)) === false
        if (!keep) setText("")
      } else {
        await sendChat(code, user, clean)
        setText("")
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget
          stickToBottom.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 40
        }}
        className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-2"
      >
        {messages.length === 0 && (
          <p className="my-auto text-center text-xs text-muted-foreground">
            No messages yet.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.value.uid === uid
          if (renderMessage)
            return (
              <React.Fragment key={m.key}>
                {renderMessage(m, mine)}
              </React.Fragment>
            )
          return <DefaultMessage key={m.key} msg={m.value} mine={mine} />
        })}
      </div>
      <form
        className="flex gap-2 border-t p-2"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          maxLength={200}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="send"
          className="h-11 bg-card"
          data-no-swipe
        />
        <Button
          type="submit"
          size="icon-lg"
          aria-label="Send"
          // Keep the keyboard up: tapping Send mustn't take focus from the box
          onPointerDown={(e) => e.preventDefault()}
          disabled={disabled || !text.trim() || sending}
        >
          <HugeiconsIcon icon={SentIcon} />
        </Button>
      </form>
    </div>
  )
}

/** A plain chat line; system / correct / close kinds read as notices. */
export function DefaultMessage({ msg, mine }: { msg: Msg; mine: boolean }) {
  if (msg.kind === "system") {
    return (
      <p className="py-0.5 text-center text-[11px] text-muted-foreground">
        {msg.text}
      </p>
    )
  }
  if (msg.kind === "correct") {
    return (
      <p className="py-0.5 text-center text-xs font-medium text-success">
        {msg.name.split(" ")[0]} guessed the word!
      </p>
    )
  }
  if (msg.kind === "close") {
    return (
      <p className="py-0.5 text-center text-xs font-medium text-warning">
        &ldquo;{msg.text}&rdquo; is close!
      </p>
    )
  }
  return (
    <p className="text-sm leading-snug break-words">
      <span
        className={cn(
          "font-semibold",
          mine ? "text-primary" : "text-foreground"
        )}
      >
        {msg.name.split(" ")[0]}
      </span>
      <span className="text-muted-foreground">: </span>
      {msg.text}
    </p>
  )
}
