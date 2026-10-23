import { doc, getDoc, updateDoc, writeBatch } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import { activeDiscountPaise } from "@/lib/games"
import { calculatePersonNetBreakdown, formatPaise, payeeOf, type SettlementScope } from "@/lib/money"
import type { Expense, ExpenseShare, UserProfile } from "@/lib/types"
import { updateNotificationAction } from "./notifications"
import { toChallenge } from "./challenges"
import { getDb, nowIso, rupees, sendNotification } from "./shared"

export interface ReportSettlementInput {
  creditorId: string
  creditorName?: string
  /** Informational: the UI's net amount. The settlement always covers the full net for the scope. */
  amountPaise?: number
  scope?: SettlementScope
  note?: string
  /** A game you won against the creditor; its discount applies if still active. */
  challengeId?: string
}

export interface ConfirmSettlementInput {
  debtorId: string
  /** Settlement to confirm. Older notifications without one fall back to `scope`. */
  settlementId?: string
  notifId?: string
  scope?: SettlementScope
}

export type DisputeSettlementInput = ConfirmSettlementInput

export interface SettlementResult {
  updatedExpenses: Expense[]
  allocatedAmountPaise: number
}

export const newSettlementId = () => `stl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

/**
 * Accumulates share edits across expenses so several edits to the same expense
 * compose instead of overwriting each other.
 */
function shareEditor(expenses: Expense[]) {
  const modified = new Map<string, Expense>()
  return {
    edit(expenseId: string, match: (exp: Expense, s: ExpenseShare) => boolean, patch: (s: ExpenseShare) => ExpenseShare) {
      const exp = modified.get(expenseId) ?? expenses.find((e) => e.id === expenseId)
      if (!exp) return
      let changed = false
      const shares = (exp.shares || []).map((s) => {
        if (!match(exp, s)) return s
        changed = true
        return patch(s)
      })
      if (changed) modified.set(exp.id, { ...exp, shares })
    },
    result: () => Array.from(modified.values()),
  }
}

async function commitShares(updated: Expense[], now: string) {
  const firestore = getDb()
  if (!firestore || updated.length === 0) return
  // Firestore batches cap at 500 writes
  for (let i = 0; i < updated.length; i += 450) {
    const batch = writeBatch(firestore)
    for (const exp of updated.slice(i, i + 450)) {
      batch.update(doc(firestore, "expenses", exp.id), { shares: exp.shares.map(stripUndefined), updatedAt: now })
    }
    await batch.commit()
  }
}

/** Firestore rejects `undefined` fields. */
const stripUndefined = (s: ExpenseShare): ExpenseShare =>
  Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)) as unknown as ExpenseShare


/**
 * Debtor reports a person-to-person (PhonePe-style net) settlement.
 *
 * - Every unpaid share the debtor owes the creditor in scope becomes
 *   PAYMENT_REPORTED, tagged with a new `settlementId`.
 * - Reciprocal shares the creditor owes the debtor are *approved* for
 *   cancelling out (`offsetApprovedBy`): the debtor is their payee, so only
 *   they can approve. They stay open — and keep counting — until confirmed,
 *   so balances never jump while the settlement is pending.
 * - The creditor confirms (both sides close together) or disputes (both
 *   sides reopen) the whole settlement by its id.
 */
export async function reportPersonSettlement(
  user: UserProfile,
  expenses: Expense[],
  input: ReportSettlementInput
): Promise<SettlementResult> {
  const breakdown = calculatePersonNetBreakdown(user.uid, input.creditorId, expenses, input.scope)
  const owed = breakdown.aOwesBLines.filter((l) => l.status !== "PAYMENT_REPORTED")

  if (breakdown.netReceivablePaise > 0) {
    throw new AppError("They owe you overall here — ask them to settle up instead.")
  }
  if (owed.length === 0) {
    throw new AppError(
      breakdown.hasPendingReport
        ? "You already reported this payment. Waiting for them to confirm."
        : "You do not owe any outstanding balance to this person."
    )
  }

  const discountPaise = input.challengeId
    ? Math.min(await gameDiscountFor(user.uid, input.creditorId, input.challengeId), breakdown.netPayablePaise)
    : 0

  const settlementId = newSettlementId()
  const now = nowIso()
  const note = input.note || `JoySplit settlement to ${input.creditorName || breakdown.userBName}`
  const editor = shareEditor(expenses)

  for (const line of breakdown.aOwesBLines) {
    editor.edit(
      line.expense.id,
      (exp, s) => s.userId === user.uid && s.status !== "PAID" && payeeOf(exp, s.userId) === input.creditorId,
      (s) => ({ ...s, status: "PAYMENT_REPORTED", reportedAt: now, paymentProofNote: note, settlementId })
    )
  }
  for (const line of breakdown.bOwesALines) {
    editor.edit(
      line.expense.id,
      (exp, s) => s.userId === input.creditorId && s.status !== "PAID" && payeeOf(exp, s.userId) === user.uid,
      (s) => ({ ...s, settlementId, offsetApprovedBy: user.uid })
    )
  }

  const updatedExpenses = editor.result()
  // Claim the discount first: the server rejects it once the 10 minutes are up
  if (discountPaise > 0 && input.challengeId) await redeemGameDiscount(user.uid, input.challengeId, discountPaise)
  await commitShares(updatedExpenses, now)

  const contextLabel =
    input.scope?.type === "group" && input.scope.groupName
      ? ` in ${input.scope.groupName}`
      : input.scope?.type === "direct"
        ? " for direct splits"
        : input.scope?.type === "contexts"
          ? " across selected splits"
          : ""
  const net = breakdown.netPayablePaise
  const paid = net - discountPaise
  await sendNotification({
    userId: input.creditorId,
    title: net > 0 ? "Settlement Payment Reported" : "Balances Cancelled Out",
    message:
      net > 0
        ? discountPaise > 0
          ? `${user.displayName} marked ₹${rupees(paid)} as paid to settle your ₹${rupees(net)} balance${contextLabel} — ${formatPaise(discountPaise)} off for winning your game. Did you receive ₹${rupees(paid)}?`
          : `${user.displayName} marked ₹${rupees(net)} as paid to settle your balance${contextLabel}. Did you receive it?`
        : `${user.displayName} cancelled out your mutual splits${contextLabel} (₹${rupees(breakdown.offsetPaise)} each way). Please confirm.`,
    type: "PAYMENT_REPORTED",
    data: {
      actorId: user.uid,
      actorName: user.displayName,
      debtorId: user.uid,
      creditorId: input.creditorId,
      settlementId,
      amountPaise: paid,
      offsetPaise: breakdown.offsetPaise,
      ...(discountPaise > 0 ? { challengeId: input.challengeId, discountPaise } : {}),
      ...(input.scope?.type === "group" ? { groupId: input.scope.groupId } : {}),
    },
    createdAt: now,
  })

  return { updatedExpenses, allocatedAmountPaise: paid }
}

/**
 * The discount a won game gives against this creditor right now. Throws a
 * clear message when it can't be used (lost, someone else's game, expired).
 */
async function gameDiscountFor(uid: string, creditorId: string, challengeId: string): Promise<number> {
  const firestore = getDb()
  if (!firestore) return 0
  const snap = await getDoc(doc(firestore, "challenges", challengeId))
  if (!snap.exists()) throw new AppError("That game no longer exists")
  const challenge = toChallenge(snap.data())
  if (challenge.hostId !== creditorId) throw new AppError("That game's discount is for a different person")
  const discount = activeDiscountPaise(challenge, uid)
  if (discount <= 0) {
    throw new AppError(
      challenge.result?.winners.includes(uid)
        ? "Your game discount has expired — pay the full amount instead."
        : "There's no game discount for you here."
    )
  }
  return discount
}

/** Shares of `debtorId` that belong to this settlement and are owed to `creditorId`. */
function reportedShareMatcher(creditorId: string, input: ConfirmSettlementInput, expenses: Expense[]) {
  if (input.settlementId) {
    return (exp: Expense, s: ExpenseShare) =>
      s.userId === input.debtorId &&
      s.settlementId === input.settlementId &&
      s.status === "PAYMENT_REPORTED" &&
      payeeOf(exp, s.userId) === creditorId
  }
  // Legacy notifications (no settlement id): only shares actually reported in scope
  const inScope = new Set(
    calculatePersonNetBreakdown(creditorId, input.debtorId, expenses, input.scope).bOwesALines.map((l) => l.expense.id)
  )
  return (exp: Expense, s: ExpenseShare) =>
    inScope.has(exp.id) &&
    s.userId === input.debtorId &&
    s.status === "PAYMENT_REPORTED" &&
    payeeOf(exp, s.userId) === creditorId
}

/** The confirmer's own shares the debtor approved for cancelling out in this settlement. */
const approvedOffsetMatcher = (confirmerId: string, input: ConfirmSettlementInput) => (exp: Expense, s: ExpenseShare) =>
  !!input.settlementId &&
  s.userId === confirmerId &&
  s.settlementId === input.settlementId &&
  s.offsetApprovedBy === input.debtorId &&
  s.status !== "PAID" &&
  payeeOf(exp, s.userId) === input.debtorId

const NOT_FOUND_MESSAGE =
  "We couldn't find an open payment for this request. It may have been withdrawn or changed — check your balance with them."

/** Every share of this settlement is already PAID (confirmed earlier, e.g. on another device). */
function isSettlementClosed(expenses: Expense[], input: ConfirmSettlementInput): boolean {
  if (!input.settlementId) return false
  const shares = expenses.flatMap((e) => (e.deletedAt ? [] : e.shares || []))
    .filter((s) => s.settlementId === input.settlementId)
  return shares.length > 0 && shares.every((s) => s.status === "PAID")
}

/**
 * Creditor confirms a settlement: exactly its reported shares become PAID,
 * and their own shares the debtor cancelled out close in the same write.
 */
export async function confirmPersonSettlement(
  user: UserProfile,
  expenses: Expense[],
  input: ConfirmSettlementInput
): Promise<SettlementResult> {
  const now = nowIso()
  const editor = shareEditor(expenses)
  const matches = reportedShareMatcher(user.uid, input, expenses)
  const offsets = approvedOffsetMatcher(user.uid, input)
  let allocated = 0

  for (const exp of expenses) {
    editor.edit(exp.id, matches, (s) => {
      allocated += s.amountPaise
      return { ...s, status: "PAID", confirmedAt: now }
    })
    editor.edit(exp.id, offsets, (s) => ({
      ...s,
      status: "PAID",
      confirmedAt: now,
      offsetApprovedBy: undefined,
      paymentProofNote: "Cancelled out by mutual split",
    }))
  }

  const updatedExpenses = editor.result()
  if (updatedExpenses.length === 0) {
    // Never report success for a confirmation that changed nothing
    if (isSettlementClosed(expenses, input)) {
      if (input.notifId) await updateNotificationAction(input.notifId, "CONFIRMED").catch(console.warn)
      return { updatedExpenses, allocatedAmountPaise: 0 }
    }
    throw new AppError(NOT_FOUND_MESSAGE)
  }
  await commitShares(updatedExpenses, now)

  if (updatedExpenses.length > 0) {
    await sendNotification({
      userId: input.debtorId,
      title: "Settlement Confirmed! 🎉",
      message: `${user.displayName} confirmed your settlement. Those balances are now settled.`,
      type: "PAYMENT_CONFIRMED",
      data: {
        actorId: user.uid,
        actorName: user.displayName,
        debtorId: input.debtorId,
        creditorId: user.uid,
        ...(input.settlementId ? { settlementId: input.settlementId } : {}),
      },
      createdAt: now,
    })
  }
  if (input.notifId) await updateNotificationAction(input.notifId, "CONFIRMED").catch(console.warn)

  return { updatedExpenses, allocatedAmountPaise: allocated }
}

/**
 * Creditor disputes a settlement: its reported shares become DISPUTED and any
 * of the creditor's own shares that were cancelled out by it are reopened.
 */
export async function disputePersonSettlement(
  user: UserProfile,
  expenses: Expense[],
  input: DisputeSettlementInput
): Promise<SettlementResult> {
  const now = nowIso()
  const editor = shareEditor(expenses)
  const matches = reportedShareMatcher(user.uid, input, expenses)
  const offsets = approvedOffsetMatcher(user.uid, input)

  for (const exp of expenses) {
    editor.edit(exp.id, matches, (s) => ({ ...s, status: "DISPUTED" }))
    // Withdraw the cancel-out on your own shares too: they simply stay open
    editor.edit(exp.id, offsets, (s) => ({ ...s, status: "PENDING", settlementId: undefined, offsetApprovedBy: undefined }))
  }

  const updatedExpenses = editor.result()
  if (updatedExpenses.length === 0) throw new AppError(NOT_FOUND_MESSAGE)
  await commitShares(updatedExpenses, now)

  if (updatedExpenses.length > 0) {
    await sendNotification({
      userId: input.debtorId,
      title: "Payment Not Received ⚠️",
      message: `${user.displayName} reported that they did NOT receive your settlement payment. Please verify.`,
      type: "PAYMENT_DISPUTED",
      data: {
        actorId: user.uid,
        actorName: user.displayName,
        debtorId: input.debtorId,
        creditorId: user.uid,
        ...(input.settlementId ? { settlementId: input.settlementId } : {}),
      },
      createdAt: now,
    })
  }
  if (input.notifId) await updateNotificationAction(input.notifId, "DISPUTED").catch(console.warn)

  return { updatedExpenses, allocatedAmountPaise: 0 }
}

/** Records the discount on the game (once). Security rules check it against server time. */
async function redeemGameDiscount(uid: string, challengeId: string, discountPaise: number) {
  const firestore = getDb()
  if (!firestore) return
  try {
    await updateDoc(doc(firestore, "challenges", challengeId), { [`redeemed.${uid}`]: discountPaise })
  } catch (e) {
    if ((e as { code?: string })?.code === "permission-denied") {
      throw new AppError("Your game discount has expired or was already used — pay the full amount instead.")
    }
    throw e
  }
}
