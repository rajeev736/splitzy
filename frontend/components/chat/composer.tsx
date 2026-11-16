"use client"

import * as React from "react"
import {
  Attachment01Icon,
  Camera01Icon,
  Cancel01Icon,
  PencilEdit02Icon,
  SentIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { QuoteBlock } from "@/components/chat/message-row"
import { MESSAGE_MAX, type KeyedMessage, type ReplyRef } from "@/lib/chat"
import { cn } from "@/lib/utils"

/** Tallest the box grows before it scrolls (about six lines). */
const MAX_HEIGHT = 148

/**
 * The bottom bar: a growing text box with photo buttons, the reply / edit
 * preview above it, and a round send button. Enter sends with a keyboard;
 * on phones the return key adds a line, like WhatsApp.
 */
export function Composer({
  meUid,
  replyTo,
  editing,
  onCancel,
  onSend,
  onSaveEdit,
  onPickPhoto,
  onTyping,
  safeBottom = true,
}: {
  meUid: string
  replyTo: ReplyRef | null
  editing: KeyedMessage | null
  /** Drops the reply / edit. */
  onCancel: () => void
  onSend: (text: string) => void
  onSaveEdit: (text: string) => void
  onPickPhoto: (file: File) => void
  onTyping: (active: boolean) => void
  /** Pad for the home indicator (off while the keyboard is up). */
  safeBottom?: boolean
}) {
  const [text, setText] = React.useState("")
  const box = React.useRef<HTMLTextAreaElement>(null)
  const gallery = React.useRef<HTMLInputElement>(null)
  const camera = React.useRef<HTMLInputElement>(null)

  // Starting an edit fills the box with the message; leaving it clears the box
  const [editingId, setEditingId] = React.useState<string | null>(null)
  if ((editing?.id ?? null) !== editingId) {
    setEditingId(editing?.id ?? null)
    setText(editing ? editing.text : "")
  }

  // Grow with the text, up to MAX_HEIGHT
  React.useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden"
  }, [text])

  // Replying or editing puts the cursor in the box
  React.useEffect(() => {
    if (!replyTo && !editing) return
    const el = box.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
  }, [replyTo, editing])

  const submit = () => {
    const clean = text.trim()
    if (!clean) return
    if (editing) onSaveEdit(clean)
    else onSend(clean)
    setText("")
    onTyping(false)
  }

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) onPickPhoto(file)
  }

  const empty = !text.trim()

  return (
    <div
      className={cn(
        "relative z-10 px-2 pt-1.5 sm:px-3",
        safeBottom ? "pb-safe" : "pb-2"
      )}
    >
      <form
        className="mx-auto flex w-full max-w-3xl items-end gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-card shadow-[0_1px_1.5px_rgb(0_0_0/0.14)]">
          {(replyTo || editing) && (
            <div className="flex items-start gap-1 px-1.5 pt-1.5 duration-150 animate-in fade-in-0 slide-in-from-bottom-1">
              {editing ? (
                <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl bg-black/[0.05] dark:bg-white/[0.07]">
                  <span className="w-1 shrink-0 bg-primary" />
                  <div className="min-w-0 flex-1 px-2 py-1">
                    <p className="flex items-center gap-1 text-[12.5px] leading-5 font-semibold text-primary">
                      <HugeiconsIcon icon={PencilEdit02Icon} className="size-3.5" />
                      Edit message
                    </p>
                    <p className="truncate text-[13px] text-foreground/70">
                      {editing.text}
                    </p>
                  </div>
                </div>
              ) : (
                replyTo && (
                  <QuoteBlock
                    quote={replyTo}
                    meUid={meUid}
                    className="flex-1 rounded-xl"
                  />
                )
              )}
              <button
                type="button"
                aria-label={editing ? "Cancel edit" : "Cancel reply"}
                onClick={onCancel}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-subtle-hover"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
              </button>
            </div>
          )}
          <div className="flex items-end">
            <textarea
              ref={box}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                onTyping(!!e.target.value.trim())
              }}
              onBlur={() => onTyping(false)}
              onKeyDown={(e) => {
                // Enter sends on a keyboard; Shift+Enter (and phones' return key) add a line
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  window.matchMedia("(pointer: fine)").matches
                ) {
                  e.preventDefault()
                  submit()
                }
                if (e.key === "Escape" && (replyTo || editing)) onCancel()
              }}
              placeholder="Message"
              aria-label="Message"
              maxLength={MESSAGE_MAX}
              rows={1}
              autoComplete="off"
              autoCorrect="on"
              spellCheck
              enterKeyHint="enter"
              className="max-h-[148px] min-h-11 min-w-0 flex-1 resize-none bg-transparent py-[11px] pr-1 pl-4 text-[15px] leading-[22px] outline-none placeholder:text-muted-foreground"
            />
            {!editing && (
              <div className="flex shrink-0 items-center pr-1 pb-1">
                <IconButton label="Attach a photo" onClick={() => gallery.current?.click()}>
                  <HugeiconsIcon icon={Attachment01Icon} className="size-[21px] -rotate-45" />
                </IconButton>
                {empty && (
                  <IconButton
                    label="Take a photo"
                    onClick={() => camera.current?.click()}
                    className="[@media(hover:hover)_and_(pointer:fine)]:hidden"
                  >
                    <HugeiconsIcon icon={Camera01Icon} className="size-[21px]" />
                  </IconButton>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          type="submit"
          aria-label={editing ? "Save edit" : "Send"}
          disabled={empty}
          // Keeps the keyboard up: the box doesn't lose focus to the button
          onPointerDown={(e) => e.preventDefault()}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-[transform,opacity,background-color] hover:bg-primary-hover active:scale-95",
            empty && "opacity-60"
          )}
        >
          <HugeiconsIcon
            icon={editing ? Tick02Icon : SentIcon}
            className="size-5"
            strokeWidth={editing ? 2.4 : 1.8}
          />
        </button>
      </form>
      <input ref={gallery} type="file" accept="image/*" hidden onChange={pick} />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={pick}
      />
    </div>
  )
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string
  onClick: () => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-subtle-hover hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}
