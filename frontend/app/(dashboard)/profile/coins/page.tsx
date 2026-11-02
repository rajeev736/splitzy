"use client"

import Link from "next/link"
import {
  ArrowRight01Icon,
  CrownIcon,
  GameController03Icon,
  GiftIcon,
  RotateLeft01Icon,
  SparklesIcon,
  Award01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CoinIcon } from "@/components/fun/coin"
import { AppHeader } from "@/components/layout/app-header"
import { PageContainer } from "@/components/layout/app-shell"
import { useCoinHistory, useWallet } from "@/hooks/use-fun"
import { useNow } from "@/hooks/use-now"
import type { CoinTx } from "@/lib/types"
import { cn } from "@/lib/utils"

const fmt = new Intl.NumberFormat("en-IN")

const KIND: Record<CoinTx["kind"], { icon: typeof GiftIcon; tone: string }> = {
  welcome: { icon: SparklesIcon, tone: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  frame: { icon: CrownIcon, tone: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  gift: { icon: GiftIcon, tone: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" },
  stake: { icon: GameController03Icon, tone: "bg-muted text-muted-foreground" },
  win: { icon: Award01Icon, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  refund: { icon: RotateLeft01Icon, tone: "bg-muted text-muted-foreground" },
}

function day(iso: string, now: number) {
  const d = new Date(iso)
  const today = new Date(now)
  const yesterday = new Date(now - 86_400_000)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" })
}

export default function CoinsPage() {
  const wallet = useWallet()
  const history = useCoinHistory()
  const now = useNow(0)

  const earned = (history ?? []).filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const spent = (history ?? []).filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0)

  // Group lines by day, newest first
  const groups: { label: string; items: CoinTx[] }[] = []
  if (now) {
    for (const t of history ?? []) {
      const label = day(t.createdAt, now)
      const last = groups[groups.length - 1]
      if (last?.label === label) last.items.push(t)
      else groups.push({ label, items: [t] })
    }
  }

  return (
    <>
      <AppHeader title="Coins" showBack rightAction={<span />} />
      <PageContainer className="max-w-xl gap-5">
        {/* Balance */}
        <section className="flex flex-col items-center gap-1 rounded-2xl border bg-card px-4 py-6 text-center">
          <CoinIcon className="size-10" />
          <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
            {wallet ? fmt.format(wallet.balance) : "—"}
          </div>
          <div className="text-xs text-muted-foreground">coins</div>
          <div className="mt-3 grid w-full max-w-xs grid-cols-2 divide-x text-center">
            <div>
              <div className="text-sm font-semibold text-success tabular-nums">+{fmt.format(earned)}</div>
              <div className="text-[11px] text-muted-foreground">Earned</div>
            </div>
            <div>
              <div className="text-sm font-semibold text-destructive tabular-nums">−{fmt.format(spent)}</div>
              <div className="text-[11px] text-muted-foreground">Spent</div>
            </div>
          </div>
        </section>

        {/* Where coins come from and go */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/challenges?tab=fun"
            className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-muted/60"
          >
            <HugeiconsIcon icon={GameController03Icon} className="size-5 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold">Earn</span>
              <span className="block truncate text-[11px] text-muted-foreground">Win coin games</span>
            </span>
          </Link>
          <Link
            href="/profile/frames"
            className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 transition-colors hover:bg-muted/60"
          >
            <HugeiconsIcon icon={CrownIcon} className="size-5 shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold">Spend</span>
              <span className="block truncate text-[11px] text-muted-foreground">Frames & gifts</span>
            </span>
            <HugeiconsIcon icon={ArrowRight01Icon} className="ml-auto size-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>

        {/* History */}
        <section className="flex flex-col gap-3">
          <h2 className="px-1 text-sm font-semibold">History</h2>
          {history === undefined ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="size-9 animate-pulse rounded-full bg-muted" />
                  <div className="h-3 w-40 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">
              No coin activity yet.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="flex flex-col">
                <div className="px-1 pb-1 text-[11px] font-medium text-muted-foreground">{g.label}</div>
                <ul className="divide-y rounded-xl border bg-card">
                  {g.items.map((t) => {
                    const k = KIND[t.kind] ?? KIND.refund
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", k.tone)}>
                          <HugeiconsIcon icon={k.icon} className="size-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{t.label}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(t.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-sm font-semibold tabular-nums",
                            t.amount > 0 ? "text-success" : t.amount < 0 ? "text-destructive" : "text-muted-foreground"
                          )}
                        >
                          {t.amount > 0 ? "+" : t.amount < 0 ? "−" : ""}
                          {t.amount === 0 ? "Free" : fmt.format(Math.abs(t.amount))}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </section>
      </PageContainer>
    </>
  )
}
