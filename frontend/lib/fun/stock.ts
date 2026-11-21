import { GIFTS, type GiftId } from "@/lib/fun/catalog"
import { THROWABLES, type ThrowableId } from "@/lib/live/throwables"
import type { Wallet } from "@/lib/types"

/**
 * Throwables and gifts bought ahead, from the inventory: wallet.stock maps
 * "<t|g>_<id>" to how many are left. Using one takes it from there (no coins);
 * with none left, it's paid in coins as it's used, as before. The security
 * rules check every move (stockMoved / stockBuyOk in firestore.rules).
 */
export type StockItem = { kind: "t"; id: ThrowableId } | { kind: "g"; id: GiftId }

/** At most this many bought at once (the rules allow 1–99). */
export const STOCK_BUY_MAX = 99
/** Quick picks in the buy sheet. */
export const STOCK_PACKS = [5, 10, 25] as const

export const stockKey = (item: StockItem) => `${item.kind}_${item.id}`

/** How many of it are left. */
export const stockOf = (wallet: Pick<Wallet, "stock"> | null | undefined, item: StockItem) =>
  Math.max(0, wallet?.stock?.[stockKey(item)] ?? 0)

export const stockPrice = (item: StockItem) => (item.kind === "t" ? THROWABLES[item.id].price : GIFTS[item.id].price)

export const stockName = (item: StockItem) => (item.kind === "t" ? THROWABLES[item.id].name : GIFTS[item.id].name)
