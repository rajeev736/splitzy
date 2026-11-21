"use client"

import * as React from "react"
import { toast } from "sonner"
import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Coins } from "@/components/fun/coin"
import { GiftArt } from "@/components/fun/gift-art"
import { StockBadge } from "@/components/fun/stock-badge"
import { GameButton } from "@/components/game-ui/kit"
import { ThrowableArt } from "@/components/live/throwables"
import { BottomSheet } from "@/components/shared/bottom-sheet"
import { Spinner } from "@/components/ui/spinner"
import { useBuyStock } from "@/hooks/use-fun-mutations"
import { getErrorMessage } from "@/lib/errors"
import { GIFT_IDS } from "@/lib/fun/catalog"
import { STOCK_BUY_MAX, STOCK_PACKS, stockKey, stockName, stockOf, stockPrice, type StockItem } from "@/lib/fun/stock"
import { THROWABLE_IDS, THROWABLES } from "@/lib/live/throwables"
import type { Wallet } from "@/lib/types"
import { cn } from "@/lib/utils"

const fmt = new Intl.NumberFormat("en-IN")

/**
 * Throwables and gifts: buy as many as you like ahead, they wait here (the
 * count on each) and are used before any coins — in a game, or for a friend.
 * With none left, they're paid for as they're used, as before.
 */
export function MoreTab({ wallet }: { wallet: Wallet | null | undefined }) {
  const [picked, setPicked] = React.useState<StockItem | null>(null)
  // Keep the sheet's item while it slides away
  const [shown, setShown] = React.useState<StockItem | null>(null)
  if (picked && picked !== shown) setShown(picked)

  const throwables = THROWABLE_IDS.map((id) => ({ kind: "t", id }) as const)
  return (
    <div className="flex flex-col gap-6">
      <ItemGrid
        title="Throwables"
        where="Throw one at a player in a live game: tap their photo. The ones you have go first, no coins."
        items={throwables.filter((it) => !THROWABLES[it.id].vip)}
        wallet={wallet}
        onPick={setPicked}
      />
      <ItemGrid
        title="VIP throwables"
        where="Big, loud, and seen by everyone in the room."
        items={throwables.filter((it) => THROWABLES[it.id].vip)}
        wallet={wallet}
        onPick={setPicked}
        vip
      />
      <ItemGrid
        title="Gifts"
        where="For friends: send one from their profile. The ones you have go first, no coins."
        items={GIFT_IDS.map((id) => ({ kind: "g", id }) as const)}
        wallet={wallet}
        onPick={setPicked}
      />
      {shown && <BuySheet item={shown} open={!!picked} onOpenChange={(o) => !o && setPicked(null)} wallet={wallet} />}
    </div>
  )
}

function ItemArt({ item, className }: { item: StockItem; className?: string }) {
  return item.kind === "t" ? <ThrowableArt id={item.id} className={className} /> : <GiftArt gift={item.id} className={className} />
}

function ItemGrid({
  title,
  where,
  items,
  wallet,
  onPick,
  vip = false,
}: {
  title: string
  where: string
  items: StockItem[]
  wallet: Wallet | null | undefined
  onPick: (item: StockItem) => void
  vip?: boolean
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="px-1">
        <h3 className={cn("text-sm font-semibold", vip && "text-amber-600 dark:text-amber-400")}>{title}</h3>
        <p className="text-xs text-muted-foreground">{where}</p>
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {items.map((it) => {
          const have = stockOf(wallet, it)
          return (
            <li key={stockKey(it)} className="min-w-0">
              <button
                type="button"
                onClick={() => onPick(it)}
                aria-label={`${stockName(it)}${have ? `, you have ${have}` : ""}. Buy more`}
                className={cn(
                  "relative flex w-full min-w-0 flex-col items-center gap-1 rounded-xl border border-card-stroke bg-card px-1 pt-2.5 pb-2 shadow-xs transition-transform active:scale-95",
                  vip && "border-amber-400/50 bg-gradient-to-b from-amber-100 to-amber-50 dark:border-amber-400/30 dark:from-amber-500/20 dark:to-amber-500/5"
                )}
              >
                <StockBadge count={have} className="top-1 left-1" />
                <ItemArt item={it} className="size-10" />
                <span className="w-full truncate text-center text-[11px] font-medium">{stockName(it)}</span>
                <Coins amount={stockPrice(it)} className="text-[11px]" iconClassName="size-3" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Pick how many (a stepper and quick packs), see the total, buy them in one go. */
function BuySheet({
  item,
  open,
  onOpenChange,
  wallet,
}: {
  item: StockItem
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet | null | undefined
}) {
  const buy = useBuyStock()
  const [count, setCount] = React.useState(1)
  // Back to one for each item opened
  const [forItem, setForItem] = React.useState(stockKey(item))
  if (forItem !== stockKey(item)) {
    setForItem(stockKey(item))
    setCount(1)
  }
  const price = stockPrice(item)
  const have = stockOf(wallet, item)
  const balance = wallet?.balance ?? 0
  const total = price * count
  const short = !!wallet && balance < total
  // The most you can pay for (at least one, so the stepper still shows the price)
  const affordable = Math.max(1, Math.min(STOCK_BUY_MAX, Math.floor(balance / price)))
  const set = (n: number) => setCount(Math.max(1, Math.min(STOCK_BUY_MAX, n)))

  const submit = () =>
    buy.mutate(
      { item, count },
      {
        onSuccess: () => {
          toast.success(`${count} × ${stockName(item)} added`, { description: `You have ${have + count} now` })
          setCount(1)
        },
        onError: (e) => toast.error(getErrorMessage(e, "Couldn't buy that")),
      }
    )

  return (
    <BottomSheet
      className="gu"
      open={open}
      onOpenChange={onOpenChange}
      title={`Buy ${stockName(item)}`}
      description={
        <span className="inline-flex items-center gap-1.5">
          Your coins: <Coins amount={balance} iconClassName="size-3.5" />
        </span>
      }
      footer={
        <GameButton
          tone="green"
          size="lg"
          className="w-full"
          disabled={buy.isPending || short || !wallet}
          onClick={submit}
        >
          {buy.isPending ? (
            <Spinner />
          ) : short ? (
            `${fmt.format(total - balance)} more coins needed`
          ) : (
            <>
              Buy {count} · <Coins amount={total} iconClassName="size-4" />
            </>
          )}
        </GameButton>
      }
    >
      <div className="flex flex-col items-center gap-4 pb-3">
        <div className="relative mt-1 flex size-28 items-center justify-center rounded-3xl bg-gradient-to-b from-white to-[var(--gu-cream,#fff6e0)] shadow-[inset_0_-4px_0_rgb(0_0_0/0.06),0_6px_16px_rgb(0_0_0/0.12)] ring-1 ring-black/5">
          <ItemArt key={stockKey(item)} item={item} className="size-20 animate-in zoom-in-75 duration-300" />
          <StockBadge count={have} className="-top-2 -left-2 h-6 min-w-6 text-xs" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {have > 0 ? (
            <>
              You have <span className="font-bold text-foreground tabular-nums">{have}</span> · each{" "}
              <Coins amount={price} iconClassName="size-3.5" />
            </>
          ) : (
            <>
              You have none yet · each <Coins amount={price} iconClassName="size-3.5" />
            </>
          )}
        </p>

        {/* How many */}
        <div className="flex items-center gap-4" role="group" aria-label="How many">
          <StepButton label="One less" icon={MinusSignIcon} disabled={count <= 1} onClick={() => set(count - 1)} />
          <output aria-live="polite" className="w-16 text-center text-4xl font-extrabold tabular-nums">
            {count}
          </output>
          <StepButton label="One more" icon={PlusSignIcon} disabled={count >= STOCK_BUY_MAX} onClick={() => set(count + 1)} />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {[1, ...STOCK_PACKS].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set(n)}
              aria-pressed={count === n}
              className={cn(
                "h-8 min-w-12 rounded-full border px-3 text-xs font-bold tabular-nums transition-colors",
                count === n ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted/60"
              )}
            >
              ×{n}
            </button>
          ))}
          {affordable > 1 && !STOCK_PACKS.includes(affordable as (typeof STOCK_PACKS)[number]) && (
            <button
              type="button"
              onClick={() => set(affordable)}
              aria-pressed={count === affordable}
              className={cn(
                "h-8 rounded-full border px-3 text-xs font-bold transition-colors",
                count === affordable ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted/60"
              )}
            >
              Max ×{affordable}
            </button>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}

function StepButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string
  icon: typeof PlusSignIcon
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-full border bg-card shadow-xs transition-transform active:scale-90 disabled:opacity-40"
    >
      <HugeiconsIcon icon={icon} className="size-5" strokeWidth={2.4} />
    </button>
  )
}
