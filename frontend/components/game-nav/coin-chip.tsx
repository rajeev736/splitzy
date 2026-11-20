"use client"

import Link from "next/link"

import { Coins } from "@/components/fun/coin"
import { useWallet } from "@/hooks/use-fun"
import { cn } from "@/lib/utils"

/**
 * Your coins on a Games page, to the coin history. Marked `data-coin-target`:
 * claimed coins fly into it — so show only one per page.
 */
export function GameCoinChip({ className }: { className?: string }) {
  const wallet = useWallet()
  return (
    <Link
      href="/profile/coins"
      data-coin-target
      aria-label={wallet ? `${wallet.balance} coins` : "Coins"}
      className={cn("gu-chip h-9 !px-3 text-sm active:translate-y-px", className)}
    >
      <Coins amount={wallet?.balance ?? 0} iconClassName="size-4" />
    </Link>
  )
}
