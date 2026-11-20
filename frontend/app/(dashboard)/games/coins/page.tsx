"use client"

import { useRouter } from "nextjs-toploader/app"
import {
  Award01Icon,
  Backpack01Icon,
  CrownIcon,
  GameController03Icon,
  GiftIcon,
  RotateLeft01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { CoinIcon } from "@/components/fun/coin"
import { GameButton, GameNote, GameScreen, GameSectionTitle, GameTopBar } from "@/components/game-ui/kit"
import { GAME_ROUTES } from "@/components/game-nav/items"
import { Spinner } from "@/components/ui/spinner"
import { useCoinHistory, useWallet } from "@/hooks/use-fun"
import { useNow } from "@/hooks/use-now"
import type { CoinTx } from "@/lib/types"

const fmt = new Intl.NumberFormat("en-IN")

/** Each kind of line: its icon on a tile in its own game colour (face, deep base). */
const KIND: Record<CoinTx["kind"], { icon: typeof GiftIcon; face: string; base: string }> = {
  welcome: { icon: SparklesIcon, face: "#ffcd3c", base: "#d99a0b" },
  frame: { icon: CrownIcon, face: "#8b6cf6", base: "#5e41cc" },
  gift: { icon: GiftIcon, face: "#ff7aa8", base: "#d4447a" },
  stake: { icon: GameController03Icon, face: "#4f8ff7", base: "#2f63cf" },
  win: { icon: Award01Icon, face: "#2fd2a0", base: "#15a07a" },
  refund: { icon: RotateLeft01Icon, face: "#9aa6c8", base: "#6b789e" },
  theme: { icon: GameController03Icon, face: "#38bdf8", base: "#0e88c2" },
  throw: { icon: GameController03Icon, face: "#ff8a3d", base: "#d9601c" },
  avatar: { icon: SparklesIcon, face: "#e879f9", base: "#b23fc4" },
  level: { icon: Award01Icon, face: "#ffcd3c", base: "#d99a0b" },
}

function day(iso: string, now: number) {
  const d = new Date(iso)
  const today = new Date(now)
  const yesterday = new Date(now - 86_400_000)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" })
}

/**
 * Your coins, on the Games side (the coin chip on any Games screen opens it):
 * the balance, where coins come from and go, and every line of history.
 * (The old /profile/coins redirects here.)
 */
export default function GameCoinsPage() {
  const router = useRouter()
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

  // Opened from a Games screen: step back to it; from a link: to the hub
  const back = () => (window.history.length > 1 ? router.back() : router.replace(GAME_ROUTES.hub))

  return (
    <GameScreen>
      <GameTopBar title="Coins" subtitle="Win them in games, spend them on cool stuff" onBack={back} />
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-4 pt-1 pb-10">
        {/* Balance: coins claimed here fly into it */}
        <section className="gu-panel-flat flex flex-col items-center px-4 pt-5 pb-4 text-center">
          <span data-coin-target className="flex items-center gap-2.5">
            <CoinIcon className="size-11 drop-shadow-[0_3px_3px_rgba(120,60,0,.3)]" />
            <span className="text-[2.4rem] leading-none font-bold tracking-tight tabular-nums">
              {wallet ? fmt.format(wallet.balance) : wallet === null ? "0" : "—"}
            </span>
          </span>
          <span className="gu-label mt-1.5">coins</span>
          <div className="gu-well mt-4 grid w-full max-w-xs grid-cols-2 py-2.5">
            <div>
              <div className="text-base font-bold text-[var(--gu-green-deep)] tabular-nums">+{fmt.format(earned)}</div>
              <div className="text-[11px] font-bold text-[var(--gu-ink-soft)]">Earned</div>
            </div>
            <div className="border-l-2 border-[var(--gu-line)]">
              <div className="text-base font-bold text-[var(--gu-red-deep)] tabular-nums">−{fmt.format(spent)}</div>
              <div className="text-[11px] font-bold text-[var(--gu-ink-soft)]">Spent</div>
            </div>
          </div>
        </section>

        {/* Where coins come from and go */}
        <div className="grid grid-cols-2 gap-3">
          <GameButton tone="green" icon={GameController03Icon} onClick={() => router.push(`${GAME_ROUTES.hub}?tab=fun`)}>
            Earn
          </GameButton>
          <GameButton tone="purple" icon={Backpack01Icon} onClick={() => router.push(GAME_ROUTES.inventory)}>
            Spend
          </GameButton>
        </div>

        {/* History */}
        <section className="flex flex-col gap-3">
          <GameSectionTitle count={history?.length || undefined}>History</GameSectionTitle>
          {history === undefined ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-8 text-white" />
            </div>
          ) : history.length === 0 ? (
            <GameNote>No coin activity yet. Win a game to get some!</GameNote>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="flex flex-col gap-1.5">
                <div className="px-1 text-xs font-bold text-white [text-shadow:0_1px_0_rgba(20,40,110,.35)]">{g.label}</div>
                <ul className="gu-panel-flat flex flex-col divide-y divide-[var(--gu-line)] px-1">
                  {g.items.map((t) => {
                    const k = KIND[t.kind] ?? KIND.refund
                    return (
                      <li key={t.id} className="flex items-center gap-3 px-2 py-2.5">
                        <span
                          aria-hidden
                          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                          style={{ background: k.face, boxShadow: `inset 0 -3px 0 ${k.base}` }}
                        >
                          <HugeiconsIcon icon={k.icon} className="size-5" strokeWidth={2.3} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-bold">{t.label}</div>
                          <div className="text-[11px] font-semibold text-[var(--gu-ink-soft)]">
                            {new Date(t.createdAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                          </div>
                        </div>
                        <span
                          className="flex shrink-0 items-center gap-1 text-[15px] font-bold tabular-nums"
                          style={{
                            color: t.amount > 0 ? "var(--gu-green-deep)" : t.amount < 0 ? "var(--gu-red-deep)" : "var(--gu-ink-soft)",
                          }}
                        >
                          {t.amount !== 0 && <CoinIcon className="size-4" />}
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
      </div>
    </GameScreen>
  )
}
