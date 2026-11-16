"use client"

import { Coins } from "@/components/fun/coin"
import { GiftArt } from "@/components/fun/gift-art"
import { ThrowableArt } from "@/components/live/throwables"
import { GIFT_IDS, GIFTS } from "@/lib/fun/catalog"
import { THROWABLE_IDS, THROWABLES } from "@/lib/live/throwables"
import { cn } from "@/lib/utils"

/**
 * Things paid for each time they're used (never kept), listed so their prices
 * are known up front. Nothing to buy here: they're spent where they're used.
 */
export function MoreTab() {
  return (
    <div className="flex flex-col gap-6">
      <PriceList
        title="Throwables"
        where="In live games: tap a player's photo and throw one. Paid each time."
        items={THROWABLE_IDS.map((id) => ({
          id,
          name: THROWABLES[id].name,
          price: THROWABLES[id].price,
          vip: !!THROWABLES[id].vip,
          art: <ThrowableArt id={id} className="size-10" />,
        }))}
      />
      <PriceList
        title="Gifts"
        where="For friends: send one from their profile. Paid each time."
        items={GIFT_IDS.map((id) => ({
          id,
          name: GIFTS[id].name,
          price: GIFTS[id].price,
          art: <GiftArt gift={id} className="size-10" />,
        }))}
      />
    </div>
  )
}

function PriceList({
  title,
  where,
  items,
}: {
  title: string
  where: string
  items: { id: string; name: string; price: number; vip?: boolean; art: React.ReactNode }[]
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="px-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{where}</p>
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {items.map((it) => (
          <li
            key={it.id}
            className={cn(
              "relative flex min-w-0 flex-col items-center gap-1 rounded-xl border border-card-stroke bg-card px-1 pt-2.5 pb-2 shadow-xs",
              it.vip && "border-amber-400/50 bg-amber-50/60 dark:border-amber-400/30 dark:bg-amber-500/10"
            )}
          >
            {it.vip && (
              <span className="absolute top-1 right-1 rounded-sm bg-amber-500 px-1 text-[8px] leading-3.5 font-bold tracking-wide text-white">
                VIP
              </span>
            )}
            {it.art}
            <span className="w-full truncate text-center text-[11px] font-medium">{it.name}</span>
            <Coins amount={it.price} className="text-[11px]" iconClassName="size-3" />
          </li>
        ))}
      </ul>
    </section>
  )
}
