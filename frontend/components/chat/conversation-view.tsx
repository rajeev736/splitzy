"use client"

import * as React from "react"
import { ArrowDown01Icon, SquareLock02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { PhotoDraft, PhotoViewer } from "@/components/chat/chat-photo"
import { Composer } from "@/components/chat/composer"
import {
  canDeleteForEveryone,
  DeleteMessageDialog,
  EmojiPickerSheet,
  MessageInfoSheet,
  MessageMenu,
  ReactionsSheet,
  type MenuTarget,
  type MessageAction,
} from "@/components/chat/message-actions"
import {
  MessageRow,
  QuoteBlock,
  SystemNotice,
  type ChatPerson,
  type MenuVia,
} from "@/components/chat/message-row"
import { UserAvatar } from "@/components/shared/user-avatar"
import { Spinner } from "@/components/ui/spinner"
import { useNow } from "@/hooks/use-now"
import {
  dayLabel,
  fullTimeLabel,
  isSystem,
  messageStatus,
  type ChatKind,
  type KeyedMessage,
  type ReplyRef,
  type Receipts,
} from "@/lib/chat"
import type { CompressedPhoto } from "@/lib/chat-photo"
import { replyRefOf } from "@/services/chat"

/** Everything a conversation shows, already loaded (see the chat page). */
export interface ConversationModel {
  chatId: string
  kind: ChatKind
  me: ChatPerson
  /** Everyone who is (or was) in the chat, you included, by uid. */
  people: Record<string, ChatPerson>
  /** The other current members: whose receipts make your ticks. */
  others: string[]
  messages: KeyedMessage[]
  loaded: boolean
  error: string | null
  hasMore: boolean
  loadingMore: boolean
  receipts: Receipts
  /** Others typing right now. */
  typing: string[]
  /** Your messages the server hasn't confirmed yet. */
  pending: ReadonlySet<string>
  /** Deleted just for you. */
  hidden: ReadonlySet<string>
  /** Your read marker from before this visit (undefined while it loads). */
  initialLastRead: number | undefined
}

export interface ConversationActions {
  loadMore: () => void
  send: (text: string, replyTo?: ReplyRef) => void
  sendPhoto: (photo: CompressedPhoto, caption: string, replyTo?: ReplyRef) => void
  edit: (msg: KeyedMessage, text: string) => Promise<void>
  deleteForEveryone: (msg: KeyedMessage) => Promise<void>
  deleteForMe: (msg: KeyedMessage) => void
  react: (msg: KeyedMessage, emoji: string | null) => Promise<void>
  typing: (active: boolean) => void
  markRead: () => void
  loadPhoto: (msgId: string) => Promise<string | null>
}

/** Consecutive messages from one person within this gap share a run (one tail). */
const RUN_GAP_MS = 10 * 60_000
/** Closer than this to the bottom counts as "at the bottom". */
const BOTTOM_SLACK = 80

interface Row {
  msg: KeyedMessage
  firstInRun: boolean
  divider: boolean
}

/** Messages grouped by day, each knowing whether it starts a run. */
function buildSections(
  messages: KeyedMessage[],
  today: number,
  dividerId: string | undefined
) {
  const sections: { key: string; label: string; rows: Row[] }[] = []
  messages.forEach((msg, i) => {
    const prev = messages[i - 1]
    const label = dayLabel(msg.at, today)
    let section = sections.at(-1)
    const newDay = !section || section.label !== label
    if (newDay) {
      section = { key: msg.id, label, rows: [] }
      sections.push(section)
    }
    const divider = msg.id === dividerId
    const firstInRun =
      newDay ||
      divider ||
      !prev ||
      isSystem(prev) ||
      prev.uid !== msg.uid ||
      msg.at - prev.at > RUN_GAP_MS
    section!.rows.push({ msg, firstInRun, divider })
  })
  return sections
}

export function ConversationView({
  model,
  actions,
  safeBottom = true,
}: {
  model: ConversationModel
  actions: ConversationActions
  /** Pad the composer for the home indicator (off while the keyboard is up). */
  safeBottom?: boolean
}) {
  const { me, people, others, receipts, pending } = model
  const group = model.kind === "group"
  const messages = React.useMemo(
    () =>
      model.hidden.size
        ? model.messages.filter((m) => !model.hidden.has(m.id))
        : model.messages,
    [model.messages, model.hidden]
  )
  const last = messages.at(-1)
  const now = useNow(0)
  const today = Math.max(now, last?.at ?? 0)

  // "N unread messages": fixed when the chat opens, so reading doesn't move it
  const [divider, setDivider] = React.useState<
    { id: string; count: number } | null | undefined
  >(undefined)
  if (
    divider === undefined &&
    model.loaded &&
    model.initialLastRead !== undefined
  ) {
    const since = model.initialLastRead
    const unread = messages.filter(
      (m) => m.uid !== me.uid && !isSystem(m) && m.at > since
    )
    setDivider(
      unread.length > 0 && since > 0
        ? { id: unread[0].id, count: unread.length }
        : null
    )
  }
  const ready = model.loaded && divider !== undefined

  const sections = React.useMemo(
    () => buildSections(messages, today, divider?.id),
    [messages, today, divider?.id]
  )

  /* ── Scrolling ─────────────────────────────────────────────────── */

  const scroller = React.useRef<HTMLDivElement>(null)
  const content = React.useRef<HTMLDivElement>(null)
  const atBottom = React.useRef(true)
  const initialised = React.useRef(false)
  // Where we were before older messages were added on top
  const anchor = React.useRef<{ height: number; top: number } | null>(null)
  const prevLast = React.useRef<string | undefined>(undefined)
  const jumpTarget = React.useRef<{ id: string; tries: number } | null>(null)
  const reachedBottom = React.useRef(false)
  const [fab, setFab] = React.useState({ show: false, since: 0 })

  const measure = () => {
    const el = scroller.current
    if (el)
      atBottom.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_SLACK
  }
  const toBottom = React.useCallback((smooth: boolean) => {
    const el = scroller.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" })
    atBottom.current = true
  }, [])

  const loadOlder = () => {
    const el = scroller.current
    if (!el || anchor.current || !model.hasMore || model.loadingMore) return
    anchor.current = { height: el.scrollHeight, top: el.scrollTop }
    actions.loadMore()
  }

  const findRow = (id: string) =>
    scroller.current?.querySelector<HTMLElement>(
      `[data-msg-id="${CSS.escape(id)}"]`
    ) ?? null
  const reveal = (id: string) => {
    const row = findRow(id)
    if (!row) return
    row.scrollIntoView({ block: "center", behavior: "smooth" })
    row.classList.remove("chat-flash")
    void row.offsetWidth // restart the animation
    row.classList.add("chat-flash")
    window.setTimeout(() => row.classList.remove("chat-flash"), 1700)
  }

  // A new message at the end: follow it if you were at the bottom, or sent it
  const lastId = last?.id
  const lastMine = last?.uid === me.uid
  React.useLayoutEffect(() => {
    const before = prevLast.current
    prevLast.current = lastId
    if (!initialised.current || !lastId || before === lastId) return
    if (atBottom.current || lastMine) toBottom(!lastMine)
  }, [lastId, lastMine, toBottom])

  // First paint: at the unread divider if there is one, else the bottom.
  // After loading older messages: stay exactly where you were.
  const firstId = messages[0]?.id
  React.useLayoutEffect(() => {
    const el = scroller.current
    if (!el || !ready) return
    if (!initialised.current) {
      initialised.current = true
      prevLast.current = lastId
      const mark = el.querySelector<HTMLElement>("[data-unread-divider]")
      if (mark) {
        el.scrollTop +=
          mark.getBoundingClientRect().top - el.getBoundingClientRect().top - 56
        measure()
      } else toBottom(false)
      return
    }
    if (anchor.current && !model.loadingMore) {
      el.scrollTop = anchor.current.top + (el.scrollHeight - anchor.current.height)
      anchor.current = null
      measure()
    }
    // Still looking for a quoted message further up
    const jump = jumpTarget.current
    if (jump && !model.loadingMore) {
      if (findRow(jump.id)) {
        jumpTarget.current = null
        reveal(jump.id)
      } else if (model.hasMore && jump.tries < 10) {
        jump.tries++
        loadOlder()
      } else {
        jumpTarget.current = null
        toast("That message is too far back to show")
      }
    }
    // reveal / loadOlder / findRow only touch refs and the DOM
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, firstId, model.loadingMore])

  // Keyboard opening, the composer growing, reactions arriving: keep the bottom in view
  React.useEffect(() => {
    const el = scroller.current
    const inner = content.current
    if (!el || !inner) return
    const ro = new ResizeObserver(() => {
      if (initialised.current && atBottom.current)
        el.scrollTop = el.scrollHeight
    })
    ro.observe(el)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [ready])

  /** Day chips stuck to the top float over the messages only while you scroll, then fade (like WhatsApp). */
  const chipIdle = React.useRef<number | undefined>(undefined)
  const markStuckChips = (el: HTMLElement) => {
    const top = el.getBoundingClientRect().top
    el.querySelectorAll<HTMLElement>("[data-daychip]").forEach((chip) => {
      const at = chip.getBoundingClientRect().top
      const home = chip.parentElement!.getBoundingClientRect().top + 6
      chip.toggleAttribute("data-stuck", at - top <= 9 && at > home + 1)
    })
  }

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    el.setAttribute("data-scrolling", "")
    markStuckChips(el)
    window.clearTimeout(chipIdle.current)
    chipIdle.current = window.setTimeout(() => el.removeAttribute("data-scrolling"), 1000)
    measure()
    if (atBottom.current) reachedBottom.current = true
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    const show = dist > 320
    if (show !== fab.show)
      setFab({
        show,
        // New arrivals after this point count on the button
        // (until you first reach the bottom, everything after your last visit)
        since: show
          ? reachedBottom.current
            ? (last?.at ?? 0)
            : (model.initialLastRead ?? last?.at ?? 0)
          : 0,
      })
    if (el.scrollTop < 400) loadOlder()
  }

  const jumpTo = React.useCallback((id: string) => {
    if (findRow(id)) return reveal(id)
    jumpTarget.current = { id, tries: 0 }
    loadOlder()
    // Nothing older to load: say so right away
    if (!anchor.current) {
      jumpTarget.current = null
      toast("That message is too far back to show")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.hasMore, model.loadingMore])

  /* ── Read receipts ─────────────────────────────────────────────── */

  const markRead = actions.markRead
  React.useEffect(() => {
    if (!ready) return
    if (document.visibilityState === "visible") markRead()
    const onVisible = () =>
      document.visibilityState === "visible" && markRead()
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [ready, lastId, markRead])

  /* ── Menus and sheets ──────────────────────────────────────────── */

  const [replyTo, setReplyTo] = React.useState<ReplyRef | null>(null)
  const [editing, setEditing] = React.useState<KeyedMessage | null>(null)
  const [menu, setMenu] = React.useState<MenuTarget | null>(null)
  const [moreFor, setMoreFor] = React.useState<KeyedMessage | null>(null)
  const [infoFor, setInfoFor] = React.useState<KeyedMessage | null>(null)
  const [reactionsFor, setReactionsFor] = React.useState<string | null>(null)
  const [deleteFor, setDeleteFor] = React.useState<{
    msg: KeyedMessage
    forEveryone: boolean
  } | null>(null)
  const [viewer, setViewer] = React.useState<{
    src: string
    msg: KeyedMessage
  } | null>(null)
  const [draft, setDraft] = React.useState<File | null>(null)

  const live = (id: string | undefined) =>
    id ? messages.find((m) => m.id === id) ?? null : null
  const menuMsg = menu ? (live(menu.msg.id) ?? menu.msg) : null

  const onReply = React.useCallback((msg: KeyedMessage) => {
    setEditing(null)
    setReplyTo(replyRefOf(msg))
  }, [])
  const onMenu = React.useCallback(
    (msg: KeyedMessage, anchorEl: HTMLElement, via: MenuVia) => {
      if (isSystem(msg)) return
      setMenu({ msg, anchor: anchorEl, via, at: Date.now() })
    },
    []
  )
  const onReactions = React.useCallback(
    (msg: KeyedMessage) => setReactionsFor(msg.id),
    []
  )
  const onOpenPhoto = React.useCallback(
    (msg: KeyedMessage, src: string) => setViewer({ src, msg }),
    []
  )
  const loadPhoto = actions.loadPhoto

  const react = (msg: KeyedMessage, emoji: string | null) => {
    actions
      .react(msg, emoji)
      .catch(() => toast.error("Couldn't react. Check your connection."))
  }

  const runAction = (action: MessageAction) => {
    const target = menu
    setMenu(null)
    if (!target) return
    const msg = live(target.msg.id) ?? target.msg
    const mine = msg.uid === me.uid
    switch (action) {
      case "reply":
        onReply(msg)
        break
      case "copy":
        navigator.clipboard
          ?.writeText(msg.text)
          .then(() => toast.success("Copied"))
          .catch(() => toast.error("Couldn't copy"))
        break
      case "edit":
        setReplyTo(null)
        setEditing(msg)
        break
      case "info":
        setInfoFor(msg)
        break
      case "delete":
        setDeleteFor({
          msg,
          forEveryone: canDeleteForEveryone(msg, mine, target.at),
        })
        break
    }
  }

  /* ── Render ────────────────────────────────────────────────────── */

  const newSince = fab.since
  const newCount = fab.show
    ? messages.filter(
        (m) => m.uid !== me.uid && !isSystem(m) && m.at > newSince
      ).length
    : 0
  const typingPeople = model.typing.map((u) => people[u]).filter(Boolean)

  return (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="chat-wallpaper min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [overflow-anchor:none]"
        >
          <div
            ref={content}
            className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-3 pt-1 pb-3 sm:px-5"
          >
            {model.error ? (
              <p className="m-auto max-w-xs rounded-xl bg-chat-in px-4 py-3 text-center text-sm text-muted-foreground shadow-xs">
                Couldn&apos;t load messages: {model.error}
              </p>
            ) : !ready ? (
              <div className="m-auto">
                <Spinner />
              </div>
            ) : messages.length === 0 ? (
              <EmptyChat
                group={group}
                other={group ? undefined : people[others[0]]}
                onWave={() => actions.send("👋")}
              />
            ) : (
              <>
                {/* Pushes a short conversation to the bottom, like a messenger */}
                <div className="flex-1" />
                {model.hasMore ? (
                  <div className="flex justify-center py-3" aria-label="Loading older messages">
                    <Spinner className="size-4" />
                  </div>
                ) : (
                  <StartNotice group={group} />
                )}
                {sections.map((s) => (
                  <section key={s.key} className="relative">
                    <div data-daychip className="chat-daychip pointer-events-none sticky top-2 z-[3] my-1.5 flex justify-center">
                      <span className="rounded-lg bg-chat-in px-2.5 py-1 text-[12px] leading-4 font-medium text-muted-foreground shadow-[0_1px_0.5px_rgb(0_0_0/0.1)]">
                        {s.label}
                      </span>
                    </div>
                    {s.rows.map(({ msg, firstInRun, divider: here }) => (
                      <React.Fragment key={msg.id}>
                        {here && divider && (
                          <div
                            data-unread-divider
                            className="-mx-3 my-2 bg-chat-in/70 py-1 text-center text-[12px] font-semibold text-muted-foreground sm:-mx-5"
                          >
                            {divider.count} unread {divider.count === 1 ? "message" : "messages"}
                          </div>
                        )}
                        {isSystem(msg) ? (
                          <div data-msg-id={msg.id} className="rounded-lg">
                            <SystemNotice text={msg.text} />
                          </div>
                        ) : (
                          <MessageRow
                            msg={msg}
                            mine={msg.uid === me.uid}
                            group={group}
                            firstInRun={firstInRun}
                            sender={people[msg.uid]}
                            status={
                              msg.uid !== me.uid
                                ? undefined
                                : pending.has(msg.id)
                                  ? "pending"
                                  : messageStatus(msg.at, others, receipts)
                            }
                            meUid={me.uid}
                            selected={menu?.via === "touch" && menu.msg.id === msg.id}
                            onReply={onReply}
                            onMenu={onMenu}
                            onReactions={onReactions}
                            onJump={jumpTo}
                            onOpenPhoto={onOpenPhoto}
                            loadPhoto={loadPhoto}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </section>
                ))}
                {typingPeople.length > 0 && (
                  <TypingBubble people={group ? typingPeople : []} />
                )}
              </>
            )}
          </div>
        </div>

        {fab.show && (
          <button
            type="button"
            onClick={() => toBottom(true)}
            aria-label={newCount ? `${newCount} new messages, scroll to bottom` : "Scroll to bottom"}
            className="absolute right-3 bottom-3 z-10 flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_2px_6px_rgb(0_0_0/0.2)] duration-150 animate-in fade-in-0 zoom-in-90 hover:text-foreground sm:right-5"
          >
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-5" strokeWidth={2.2} />
            {newCount > 0 && (
              <span className="absolute -top-1.5 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground tabular-nums">
                {newCount > 99 ? "99+" : newCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="chat-wallpaper">
        <Composer
          meUid={me.uid}
          replyTo={replyTo}
          editing={editing}
          safeBottom={safeBottom}
          onCancel={() => {
            setReplyTo(null)
            setEditing(null)
          }}
          onSend={(text) => {
            actions.send(text, replyTo ?? undefined)
            setReplyTo(null)
          }}
          onSaveEdit={(text) => {
            const msg = editing
            setEditing(null)
            if (!msg || text === msg.text) return
            if (Date.now() - msg.at > 16 * 60_000) {
              toast.error("It's too late to edit that message")
              return
            }
            actions
              .edit(msg, text)
              .catch(() => toast.error("Couldn't save the edit"))
          }}
          onPickPhoto={setDraft}
          onTyping={actions.typing}
        />
      </div>

      <MessageMenu
        target={menu}
        mine={menuMsg?.uid === me.uid}
        myReaction={menuMsg?.reactions?.[me.uid]}
        onClose={() => setMenu(null)}
        onReact={(emoji) => {
          if (menuMsg) react(menuMsg, emoji)
          setMenu(null)
        }}
        onMoreReactions={() => {
          setMoreFor(menuMsg)
          setMenu(null)
        }}
        onAction={runAction}
      />
      <EmojiPickerSheet
        open={!!moreFor}
        onOpenChange={(open) => !open && setMoreFor(null)}
        onPick={(emoji) => {
          if (moreFor) react(moreFor, emoji)
          setMoreFor(null)
        }}
      />
      <ReactionsSheet
        msg={live(reactionsFor ?? undefined)}
        meUid={me.uid}
        people={people}
        onClose={() => setReactionsFor(null)}
        onRemoveMine={() => {
          const msg = live(reactionsFor ?? undefined)
          if (msg) react(msg, null)
          setReactionsFor(null)
        }}
      />
      <MessageInfoSheet
        msg={infoFor}
        group={group}
        others={others}
        people={people}
        receipts={receipts}
        now={today}
        onClose={() => setInfoFor(null)}
      />
      <DeleteMessageDialog
        target={deleteFor?.msg ?? null}
        forEveryone={!!deleteFor?.forEveryone}
        onClose={() => setDeleteFor(null)}
        onDeleteForMe={() => {
          if (deleteFor) actions.deleteForMe(deleteFor.msg)
          setDeleteFor(null)
        }}
        onDeleteForEveryone={() => {
          const msg = deleteFor?.msg
          setDeleteFor(null)
          if (!msg) return
          if (replyTo?.id === msg.id) setReplyTo(null)
          actions
            .deleteForEveryone(msg)
            .catch(() =>
              toast.error("Couldn't delete it for everyone. It may be too old now.")
            )
        }}
      />
      <PhotoViewer
        src={viewer?.src ?? null}
        title={
          viewer
            ? viewer.msg.uid === me.uid
              ? "You"
              : (people[viewer.msg.uid]?.name ?? viewer.msg.name)
            : ""
        }
        subtitle={viewer ? fullTimeLabel(viewer.msg.at, today) : undefined}
        onClose={() => setViewer(null)}
      />
      <PhotoDraft
        file={draft}
        onCancel={() => setDraft(null)}
        replyBar={
          replyTo && (
            <QuoteBlock
              quote={replyTo}
              meUid={me.uid}
              className="mb-2 bg-white/10 text-white [&_.text-foreground\/70]:text-white/70"
            />
          )
        }
        onSend={(photo, caption) => {
          actions.sendPhoto(photo, caption, replyTo ?? undefined)
          setReplyTo(null)
          setDraft(null)
        }}
      />
    </>
  )
}

/** The first thing in a chat's history. */
function StartNotice({ group }: { group: boolean }) {
  return (
    <div className="my-3 flex justify-center px-4">
      <p className="flex max-w-sm items-start gap-1.5 rounded-lg bg-[#fdf3c4] px-3 py-1.5 text-center text-[12px] leading-snug text-[#54471b] shadow-[0_1px_0.5px_rgb(0_0_0/0.08)] dark:bg-[#3a3520] dark:text-[#e9dca6]">
        <HugeiconsIcon icon={SquareLock02Icon} className="mt-px size-3.5 shrink-0" />
        {group
          ? "Only members of this group can see these messages."
          : "Only the two of you can see these messages."}
      </p>
    </div>
  )
}

/** No messages yet: a nudge, and a one-tap wave. */
function EmptyChat({
  group,
  other,
  onWave,
}: {
  group: boolean
  other?: ChatPerson
  onWave: () => void
}) {
  return (
    <div className="m-auto flex max-w-xs flex-col items-center gap-3 rounded-2xl bg-chat-in/90 px-6 py-6 text-center shadow-[0_1px_0.5px_rgb(0_0_0/0.08)]">
      {other && (
        <UserAvatar uid={other.uid} src={other.photo} name={other.name} size="lg" />
      )}
      <div>
        <p className="text-sm font-semibold">No messages yet</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {group
            ? "Start the conversation with your group."
            : `Say hi to ${other?.name.split(" ")[0] ?? "your friend"}.`}
        </p>
      </div>
      <button
        type="button"
        onClick={onWave}
        className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/15 active:scale-[0.98]"
      >
        <span className="text-lg leading-none">👋</span> Wave
      </button>
    </div>
  )
}

/** Three bouncing dots at the bottom while someone types (with avatars in groups). */
function TypingBubble({ people }: { people: ChatPerson[] }) {
  return (
    <div className="mt-2 flex items-end gap-1.5" aria-live="polite">
      {people.length > 0 && (
        <div className="flex">
          {/* One face (the header names everyone typing): stacked initials read as broken letters */}
          {people.slice(0, 1).map((p) => (
            <UserAvatar
              key={p.uid}
              uid={p.uid}
              src={p.photo}
              name={p.name}
              size="xs"
              className="size-7 ring-2 ring-chat-wall"
            />
          ))}
        </div>
      )}
      <div
        className="flex h-9 items-center gap-1 rounded-[10px] rounded-tl-none bg-chat-in px-3.5 shadow-[0_1px_0.5px_rgb(0_0_0/0.12)]"
        aria-label="Typing"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70"
            style={{ animationDelay: `${i * 140}ms`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  )
}

