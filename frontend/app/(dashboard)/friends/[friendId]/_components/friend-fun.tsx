"use client"

import * as React from "react"
import { Airplane01Icon, Calendar03Icon, Coffee01Icon, Film01Icon, NoodlesIcon, Restaurant01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { GiftArt } from "@/components/fun/gift-art"
import { MomentArt } from "@/components/fun/moment-art"
import { useSession } from "@/components/providers/session-provider"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useAnswerPlan, useSendMoment } from "@/hooks/use-fun-mutations"
import { useNow } from "@/hooks/use-now"
import { birthdayCountdown, formatBirthday, isBirthdayToday } from "@/lib/fun/birthday"
import { GIFTS, isGiftId, NUDGE_LABEL, type GiftId, type LoveNudge, type PlanKind } from "@/lib/fun/catalog"
import type { Friendship, Moment, UserProfile } from "@/lib/types"
import { burstFromMoment, playBurst } from "@/lib/fun/burst"
import { cn } from "@/lib/utils"

/* ── Birthday ─────────────────────────────────────────────────────────── */

const unit = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`

/**
 * Their birthday (when they share it): a live countdown — "3 months 5 days
 * 10 hours" — or, on the day, a button to wish them.
 */
export function BirthdayCard({
  friend,
  wishedToday,
  onWished,
}: {
  friend: UserProfile
  wishedToday: boolean
  onWished: () => void
}) {
  const send = useSendMoment()
  const now = useNow(Number.MAX_SAFE_INTEGER)
  const b = friend.birthday
  if (!b || !now) return null
  const first = friend.displayName.split(" ")[0]
  const today = isBirthdayToday(b, new Date(now))

  if (today) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-300/50 bg-amber-50/70 p-3 dark:border-amber-400/20 dark:bg-amber-500/10">
        <MomentArt kind="wish" animate className="size-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">It&apos;s {first}&apos;s birthday today</div>
          <div className="text-xs text-muted-foreground">{wishedToday ? "You sent your wish." : "Make their day."}</div>
        </div>
        {!wishedToday && (
          <Button
            size="sm"
            disabled={send.isPending}
            onClick={() => send.mutate({ friendUid: friend.uid, input: { type: "wish" } }, { onSuccess: onWished })}
          >
            {send.isPending && <Spinner />}
            Wish
          </Button>
        )}
      </div>
    )
  }

  const c = birthdayCountdown(b, new Date(now))
  const parts = [
    c.months > 0 && unit(c.months, "month"),
    (c.months > 0 || c.days > 0) && unit(c.days, "day"),
    unit(c.hours, "hour"),
    c.months === 0 && unit(c.minutes, "min"),
    c.months === 0 && c.days === 0 && unit(c.seconds, "sec"),
  ].filter(Boolean) as string[]

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <MomentArt kind="wish" className="size-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{first}&apos;s birthday · {formatBirthday(b)}</div>
        <div className="truncate text-sm font-semibold tabular-nums">{parts.join(" ")}</div>
      </div>
    </div>
  )
}

/* ── Between you two ──────────────────────────────────────────────────── */

const ORDER = ["hug", "kiss", "miss", "wish", ...Object.keys(GIFTS).map((g) => `g_${g}`)]

function CountChip({ k, n }: { k: string; n: number }) {
  const gift = k.startsWith("g_") ? k.slice(2) : null
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-card py-0.5 pr-2.5 pl-1">
      {gift && isGiftId(gift) ? (
        <GiftArt gift={gift} className="size-6" />
      ) : (
        <MomentArt kind={k as LoveNudge | "wish"} className="size-6" />
      )}
      <span className="text-xs font-semibold tabular-nums">×{n}</span>
    </span>
  )
}

/** What each of you has sent the other: hug ×4, rose ×2… */
export function BetweenYou({ friend, friendship }: { friend: UserProfile; friendship: Friendship | undefined }) {
  const { user } = useSession()
  if (!user || !friendship?.counts) return null
  const first = friend.displayName.split(" ")[0]
  const row = (from: string) =>
    ORDER.map((k) => ({ k, n: friendship.counts?.[from]?.[k] ?? 0 })).filter((x) => x.n > 0)
  const theirs = row(friend.uid)
  const mine = row(user.uid)
  if (theirs.length === 0 && mine.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      {[
        { label: `${first} sent you`, list: theirs },
        { label: `You sent ${first}`, list: mine },
      ]
        .filter((r) => r.list.length > 0)
        .map((r) => (
          <div key={r.label} className="flex flex-col gap-1.5">
            <div className="text-[11px] font-medium text-muted-foreground">{r.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {r.list.map((x) => (
                <CountChip key={x.k} k={x.k} n={x.n} />
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

const PLAN_ICON = {
  momos: NoodlesIcon,
  movie: Film01Icon,
  coffee: Coffee01Icon,
  dinner: Restaurant01Icon,
  trip: Airplane01Icon,
  other: Calendar03Icon,
} as const

/* ── Activity ─────────────────────────────────────────────────────────── */

const ago = (iso: string, now: number) => {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function momentLine(m: Moment, mine: boolean, first: string) {
  const who = mine ? "You" : first
  switch (m.type) {
    case "gift":
      return `${who} sent ${mine ? first : "you"} ${isGiftId(m.item) ? GIFTS[m.item].name.toLowerCase() : "a gift"}`
    case "wish":
      return mine ? `You wished ${first} a happy birthday` : `${first} wished you a happy birthday`
    case "plan":
      return mine ? `You asked ${first}` : `${first} asked you`
    case "miss":
      return mine ? `You told ${first} you miss them` : `${first} misses you`
    default:
      return `${who} sent ${mine ? first : "you"} a ${NUDGE_LABEL[m.type as LoveNudge].name.toLowerCase()}`
  }
}

/** Everything you two have sent each other, newest first; plans can be answered here. */
export function MomentFeed({ friend, moments }: { friend: UserProfile; moments: Moment[] | undefined }) {
  const { user } = useSession()
  const answer = useAnswerPlan()
  const now = useNow(0)
  const first = friend.displayName.split(" ")[0]

  if (!moments) {
    return (
      <div className="flex flex-col gap-3 py-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    )
  }
  if (moments.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
        Nothing here yet. Send {first} a gift or make a plan.
      </p>
    )
  }

  return (
    <ul className="flex flex-col">
      {moments.map((m) => {
        const mine = m.from === user?.uid
        const gift = m.type === "gift" && isGiftId(m.item) ? (m.item as GiftId) : null
        const replay = burstFromMoment(m, mine, first)
        return (
          <li
            key={m.id}
            // Tap a hug, kiss, wish or gift to watch it again
            {...(replay
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": `Play: ${momentLine(m, mine, first)}`,
                  onClick: () => playBurst(replay),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      playBurst(replay)
                    }
                  },
                }
              : {})}
            className={cn(
              "flex gap-3 border-b py-3 last:border-b-0",
              replay && "-mx-2 cursor-pointer rounded-md px-2 transition-colors hover:bg-muted/50 active:bg-muted"
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/60">
              {gift ? (
                <GiftArt gift={gift} className="size-8" />
              ) : m.type === "plan" ? (
                <HugeiconsIcon
                  icon={PLAN_ICON[(m.kind as PlanKind) in PLAN_ICON ? (m.kind as PlanKind) : "other"]}
                  className="size-4.5 text-primary"
                />
              ) : (
                <MomentArt kind={m.type as LoveNudge | "wish"} className="size-8" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{momentLine(m, mine, first)}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{now ? ago(m.createdAt, now) : ""}</span>
              </div>
              {(m.note || m.text) && (
                <p className="mt-0.5 text-sm break-words text-muted-foreground">
                  {m.type === "plan" ? m.text : `"${m.note}"`}
                </p>
              )}
              {m.type === "plan" && (
                <div className="mt-2">
                  {m.status === "PENDING" && !mine ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8"
                        disabled={answer.isPending}
                        onClick={() => answer.mutate({ plan: m, answer: "YES" })}
                      >
                        I&apos;m in
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={answer.isPending}
                        onClick={() => answer.mutate({ plan: m, answer: "NO" })}
                      >
                        Not now
                      </Button>
                    </div>
                  ) : (
                    <span
                      className={cn(
                        "text-xs font-medium",
                        m.status === "YES" ? "text-success" : m.status === "NO" ? "text-muted-foreground" : "text-warning"
                      )}
                    >
                      {m.status === "YES"
                        ? mine
                          ? `${first} is in`
                          : "You're in"
                        : m.status === "NO"
                          ? mine
                            ? `${first} can't make it`
                            : "You said not now"
                          : `Waiting for ${first}`}
                    </span>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
