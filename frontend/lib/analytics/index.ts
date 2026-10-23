import { calculatePersonBalances } from "@/lib/money"
import type { Expense, Group, UserProfile } from "@/lib/types"

/**
 * Spending analytics. Pure functions over integer paise — no floats are ever
 * summed, so every total matches the money engine exactly.
 *
 * "Spend" is the signed-in user's own share of each expense (what it cost
 * them). Personal expenses count in full. "Paid" is what the user fronted as
 * payer — a separate measure, never mixed into spend.
 */

export type ExpenseKind = "group" | "friend" | "personal"
export const EXPENSE_KINDS: ExpenseKind[] = ["group", "friend", "personal"]
export const KIND_LABELS: Record<ExpenseKind, string> = {
  group: "Group",
  friend: "Friends",
  personal: "Personal",
}

export type Period = "month" | "3m" | "year" | "all"
export const PERIOD_LABELS: Record<Period, string> = {
  month: "This month",
  "3m": "3 months",
  year: "This year",
  all: "All time",
}

export function kindOf(exp: Expense): ExpenseKind {
  if (exp.expenseType === "personal" || exp.isPersonal) return "personal"
  if (exp.expenseType === "friend" || exp.isDirect || !exp.groupId) return "friend"
  return "group"
}

/** The user's own cost for an expense, in paise. */
export function mySpendPaise(exp: Expense, uid: string): number {
  if (kindOf(exp) === "personal") {
    return exp.createdBy === uid || exp.payerId === uid ? exp.amountPaise : 0
  }
  return exp.shares?.find((s) => s.userId === uid)?.amountPaise ?? 0
}

/** What the user paid up front for an expense, in paise. */
export function myPaidPaise(exp: Expense, uid: string): number {
  return exp.payerId === uid ? exp.amountPaise : 0
}

/**
 * Expense date as a local date. Date-only strings ("2026-10-05") are parsed
 * as local midnight so they never shift a day/month across time zones.
 */
export function expenseDate(exp: Expense): Date {
  const raw = exp.date || exp.createdAt
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? new Date(exp.createdAt) : d
}

export function periodStart(period: Period, now = new Date()): Date | null {
  switch (period) {
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case "3m":
      return new Date(now.getFullYear(), now.getMonth() - 2, 1)
    case "year":
      return new Date(now.getFullYear(), 0, 1)
    default:
      return null
  }
}

/** Live expenses in the period that cost or were paid by the user. */
export function expensesInPeriod(expenses: Expense[], uid: string, period: Period, now = new Date()): Expense[] {
  const start = periodStart(period, now)
  return expenses.filter((e) => {
    if (e.deletedAt) return false
    if (mySpendPaise(e, uid) <= 0 && myPaidPaise(e, uid) <= 0) return false
    if (!start) return true
    const d = expenseDate(e)
    return d >= start && d <= now
  })
}

export interface Summary {
  spendPaise: number
  paidPaise: number
  count: number
  avgSpendPaise: number
  byKind: Record<ExpenseKind, number>
}

export function summarize(expenses: Expense[], uid: string): Summary {
  const byKind: Record<ExpenseKind, number> = { group: 0, friend: 0, personal: 0 }
  let spendPaise = 0
  let paidPaise = 0
  for (const e of expenses) {
    const spend = mySpendPaise(e, uid)
    spendPaise += spend
    paidPaise += myPaidPaise(e, uid)
    byKind[kindOf(e)] += spend
  }
  const count = expenses.length
  return { spendPaise, paidPaise, count, avgSpendPaise: count ? Math.round(spendPaise / count) : 0, byKind }
}

export interface TrendBucket {
  key: string
  /** Short axis label, e.g. "Oct" or "12". */
  label: string
  /** Full label for tooltips / table, e.g. "October 2026" or "12 Oct". */
  fullLabel: string
  values: Record<ExpenseKind, number>
  total: number
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const MAX_MONTHS = 24

const emptyValues = (): Record<ExpenseKind, number> => ({ group: 0, friend: 0, personal: 0 })

/**
 * Spend over time, segmented by kind. "This month" is bucketed by day;
 * every other period by month (all time: up to the last 24 months).
 */
export function spendTrend(expenses: Expense[], uid: string, period: Period, now = new Date()): TrendBucket[] {
  const buckets: TrendBucket[] = []
  const index = new Map<string, TrendBucket>()
  const add = (key: string, label: string, fullLabel: string) => {
    const b = { key, label, fullLabel, values: emptyValues(), total: 0 }
    buckets.push(b)
    index.set(key, b)
  }

  const daily = period === "month"
  if (daily) {
    for (let d = 1; d <= now.getDate(); d++) {
      add(`${d}`, `${d}`, `${d} ${MONTH_SHORT[now.getMonth()]}`)
    }
  } else {
    let start = periodStart(period, now)
    if (!start) {
      const earliest = expenses.reduce<Date | null>((min, e) => {
        const d = expenseDate(e)
        return !min || d < min ? d : min
      }, null)
      start = earliest ? new Date(earliest.getFullYear(), earliest.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth(), 1)
      const floor = new Date(now.getFullYear(), now.getMonth() - (MAX_MONTHS - 1), 1)
      if (start < floor) start = floor
    }
    for (let d = new Date(start); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const y = d.getFullYear()
      const m = d.getMonth()
      add(`${y}-${m}`, MONTH_SHORT[m], `${MONTH_LONG[m]} ${y}`)
    }
  }

  for (const e of expenses) {
    const d = expenseDate(e)
    const b = index.get(daily ? `${d.getDate()}` : `${d.getFullYear()}-${d.getMonth()}`)
    if (!b) continue
    const spend = mySpendPaise(e, uid)
    b.values[kindOf(e)] += spend
    b.total += spend
  }
  return buckets
}

export interface RankedRow {
  id: string
  label: string
  /** Image / avatar source when available. */
  image?: string
  valuePaise: number
  count: number
}

/** Spend per group, largest first. */
export function spendByGroup(expenses: Expense[], uid: string, groups: Group[]): RankedRow[] {
  const rows = new Map<string, RankedRow>()
  for (const e of expenses) {
    if (kindOf(e) !== "group" || !e.groupId) continue
    const group = groups.find((g) => g.id === e.groupId)
    const row = rows.get(e.groupId) ?? {
      id: e.groupId,
      label: group?.name || e.groupName || "Group",
      image: group?.icon || e.groupIcon,
      valuePaise: 0,
      count: 0,
    }
    row.valuePaise += mySpendPaise(e, uid)
    row.count += 1
    rows.set(e.groupId, row)
  }
  return Array.from(rows.values())
    .filter((r) => r.valuePaise > 0)
    .sort((a, b) => b.valuePaise - a.valuePaise)
}

export interface FriendRow extends RankedRow {
  /** Your share of the direct splits with this person in the period. */
  mySpendPaise: number
  /** Current overall balance (all time): positive = they owe you. */
  netBalancePaise: number
}

/**
 * Direct (friend) splits per person: total split together in the period, your
 * share of it, and the current net balance across everything you share.
 */
export function spendByFriend(
  periodExpenses: Expense[],
  allExpenses: Expense[],
  uid: string,
  friends: UserProfile[]
): FriendRow[] {
  const rows = new Map<string, FriendRow>()
  for (const e of periodExpenses) {
    if (kindOf(e) !== "friend") continue
    const others = new Set<string>()
    e.shares?.forEach((s) => s.userId !== uid && others.add(s.userId))
    if (e.payerId && e.payerId !== uid) others.add(e.payerId)
    for (const other of others) {
      const friend = friends.find((f) => f.uid === other)
      const share = e.shares?.find((s) => s.userId === other)
      const row = rows.get(other) ?? {
        id: other,
        label: friend?.displayName || share?.userName || (e.payerId === other ? e.payerName : "Friend"),
        image: friend?.photoURL || share?.userPhoto,
        valuePaise: 0,
        count: 0,
        mySpendPaise: 0,
        netBalancePaise: 0,
      }
      row.valuePaise += e.amountPaise
      row.mySpendPaise += mySpendPaise(e, uid)
      row.count += 1
      rows.set(other, row)
    }
  }

  const balances = new Map(calculatePersonBalances(uid, allExpenses).map((b) => [b.userId, b.netBalancePaise]))
  return Array.from(rows.values())
    .map((r) => ({ ...r, netBalancePaise: balances.get(r.id) ?? 0 }))
    .sort((a, b) => b.valuePaise - a.valuePaise)
}

/** Spend per category, top `limit` with the rest folded into "Other". */
export function spendByCategory(expenses: Expense[], uid: string, limit = 6): RankedRow[] {
  const rows = new Map<string, RankedRow>()
  for (const e of expenses) {
    const key = e.category?.trim()
    if (!key) continue
    const row = rows.get(key.toLowerCase()) ?? { id: key.toLowerCase(), label: key, valuePaise: 0, count: 0 }
    row.valuePaise += mySpendPaise(e, uid)
    row.count += 1
    rows.set(row.id, row)
  }
  const sorted = Array.from(rows.values())
    .filter((r) => r.valuePaise > 0)
    .sort((a, b) => b.valuePaise - a.valuePaise)
  if (sorted.length <= limit) return sorted
  const rest = sorted.slice(limit - 1)
  return [
    ...sorted.slice(0, limit - 1),
    {
      id: "__other",
      label: "Other",
      valuePaise: rest.reduce((s, r) => s + r.valuePaise, 0),
      count: rest.reduce((s, r) => s + r.count, 0),
    },
  ]
}

/** Compact rupee label for axes: ₹950, ₹1.2k, ₹3.4L. */
export function formatCompactPaise(paise: number): string {
  const rupees = Math.round(paise / 100)
  if (rupees >= 100000) return `₹${trim(rupees / 100000)}L`
  if (rupees >= 1000) return `₹${trim(rupees / 1000)}k`
  return `₹${rupees}`
}

const trim = (n: number) => (n >= 10 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ""))

/** A "nice" axis maximum ≥ value: 1, 2 or 5 × 10ⁿ rupees, in paise. */
export function niceMaxPaise(paise: number): number {
  if (paise <= 0) return 100 * 100
  const rupees = paise / 100
  const pow = 10 ** Math.floor(Math.log10(rupees))
  const step = [1, 2, 5, 10].find((m) => m * pow >= rupees) ?? 10
  return step * pow * 100
}
