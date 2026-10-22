import { doc, updateDoc, writeBatch } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import { calculatePersonNetBreakdown, type SettlementScope } from "@/lib/money"
import type { Expense, ExpenseShare, SharePaymentStatus, UserProfile } from "@/lib/types"
import { updateNotificationAction } from "./notifications"
import { getDb, nowIso, rupees, sendNotification } from "./shared"

export interface ReportSettlementInput {
  creditorId: string
  creditorName?: string
  debtorId?: string
  debtorName?: string
  amountPaise: number
  scope?: SettlementScope
  note?: string
}

export interface ConfirmSettlementInput {
  debtorId: string
  notifId?: string
  scope?: SettlementScope
}

export interface DisputeSettlementInput {
  debtorId: string
  notifId?: string
  scope?: SettlementScope
}

export interface SettlementResult {
  updatedExpenses: Expense[]
  allocatedAmountPaise: number
}

/**
 * Payer reports a person-to-person settlement.
 * Allocates the settlement across the eligible outstanding obligations (oldest first),
 * marking contributing shares as PAYMENT_REPORTED and notifying the recipient.
 */
export async function reportPersonSettlement(
  user: UserProfile,
  expenses: Expense[],
  input: ReportSettlementInput
): Promise<SettlementResult> {
  const breakdown = calculatePersonNetBreakdown(user.uid, input.creditorId, expenses, input.scope)

  if (breakdown.netPayablePaise <= 0) {
    throw new AppError("You do not owe any outstanding balance to this person.")
  }

  const paymentAmount = Math.min(input.amountPaise, breakdown.netPayablePaise)
  if (paymentAmount <= 0) {
    throw new AppError("Settlement amount must be greater than zero.")
  }

  const now = nowIso()
  const note = input.note || `JoySplit Settlement to ${input.creditorName}`

  // Deterministic allocation: allocate payment across debtor's unpaid shares (oldest first)
  let remainingToAllocate = paymentAmount
  const modifiedMap = new Map<string, Expense>()

  for (const line of breakdown.aOwesBLines) {
    const exp = expenses.find((e) => e.id === line.expense.id)
    if (!exp) continue

    const existingShares = exp.shares || []
    const updatedShares = existingShares.map((s): ExpenseShare => {
      if (s.userId === user.uid && s.status !== "PAID") {
        return {
          ...s,
          status: "PAYMENT_REPORTED" as SharePaymentStatus,
          reportedAt: now,
          paymentProofNote: note,
        }
      }
      return s
    })

    modifiedMap.set(exp.id, { ...exp, shares: updatedShares, updatedAt: now })
    remainingToAllocate -= line.amountPaise
    if (remainingToAllocate <= 0) break
  }

  // Also include reciprocal offset lines if any, so they are linked
  for (const line of breakdown.bOwesALines) {
    const exp = expenses.find((e) => e.id === line.expense.id)
    if (!exp) continue
    // Mutual debts that offset each other are part of this settlement
    if (!modifiedMap.has(exp.id)) {
      modifiedMap.set(exp.id, exp)
    }
  }

  const firestore = getDb()
  if (firestore) {
    // Atomically persist all updated expenses
    const batch = writeBatch(firestore)
    for (const [expId, updatedExp] of modifiedMap.entries()) {
      batch.update(doc(firestore, "expenses", expId), {
        shares: updatedExp.shares,
        updatedAt: now,
      })
    }
    await batch.commit()

    // Notify the recipient/creditor
    const contextLabel =
      input.scope?.type === "group" && input.scope.groupName
        ? ` in ${input.scope.groupName}`
        : input.scope?.type === "direct"
          ? " for direct split"
          : input.scope?.type === "contexts"
            ? ` across selected splits`
            : ""
    await sendNotification({
      userId: input.creditorId,
      title: "Settlement Payment Reported",
      message: `${user.displayName} marked ₹${rupees(paymentAmount)} as paid to settle your balance${contextLabel}. Did you receive it?`,
      type: "PAYMENT_REPORTED",
      data: {
        actorId: user.uid,
        actorName: user.displayName,
        debtorId: user.uid,
        creditorId: input.creditorId,
        amountPaise: paymentAmount,
        ...(input.scope?.type === "group" ? { groupId: input.scope.groupId } : {}),
      },
      createdAt: now,
    })
  }

  return {
    updatedExpenses: Array.from(modifiedMap.values()),
    allocatedAmountPaise: paymentAmount,
  }
}

/**
 * Recipient confirms receiving a person-to-person settlement.
 * Marks all reported shares and reciprocal offset shares between this debtor and creditor as PAID.
 */
export async function confirmPersonSettlement(
  user: UserProfile,
  expenses: Expense[],
  input: ConfirmSettlementInput
): Promise<SettlementResult> {
  const breakdown = calculatePersonNetBreakdown(user.uid, input.debtorId, expenses, input.scope)
  const now = nowIso()
  const modifiedMap = new Map<string, Expense>()

  // Debtor's shares reported for payment -> mark PAID
  for (const line of breakdown.bOwesALines) {
    const exp = expenses.find((e) => e.id === line.expense.id)
    if (!exp) continue

    const updatedShares = (exp.shares || []).map((s): ExpenseShare => {
      if (s.userId === input.debtorId && s.status !== "PAID") {
        return {
          ...s,
          status: "PAID" as SharePaymentStatus,
          confirmedAt: now,
        }
      }
      return s
    })

    modifiedMap.set(exp.id, { ...exp, shares: updatedShares, updatedAt: now })
  }

  // Reciprocal mutual offset shares -> also mark PAID
  for (const line of breakdown.aOwesBLines) {
    const exp = expenses.find((e) => e.id === line.expense.id)
    if (!exp) continue

    const updatedShares = (exp.shares || []).map((s): ExpenseShare => {
      if (s.userId === user.uid && s.status !== "PAID") {
        return {
          ...s,
          status: "PAID" as SharePaymentStatus,
          confirmedAt: now,
        }
      }
      return s
    })

    modifiedMap.set(exp.id, { ...exp, shares: updatedShares, updatedAt: now })
  }

  const firestore = getDb()
  if (firestore) {
    const batch = writeBatch(firestore)
    for (const [expId, updatedExp] of modifiedMap.entries()) {
      batch.update(doc(firestore, "expenses", expId), {
        shares: updatedExp.shares,
        updatedAt: now,
      })
    }
    await batch.commit()

    // Notify the payer that settlement was confirmed
    await sendNotification({
      userId: input.debtorId,
      title: "Settlement Confirmed! 🎉",
      message: `${user.displayName} confirmed receiving your settlement payment! Your balances are all settled.`,
      type: "PAYMENT_CONFIRMED",
      data: {
        actorId: user.uid,
        actorName: user.displayName,
        debtorId: input.debtorId,
        creditorId: user.uid,
      },
      createdAt: now,
    })

    if (input.notifId) {
      await updateNotificationAction(input.notifId, "CONFIRMED").catch(console.warn)
    }
  }

  return {
    updatedExpenses: Array.from(modifiedMap.values()),
    allocatedAmountPaise: breakdown.offsetPaise + breakdown.netReceivablePaise,
  }
}

/**
 * Recipient disputes a reported person-to-person settlement.
 */
export async function disputePersonSettlement(
  user: UserProfile,
  expenses: Expense[],
  input: DisputeSettlementInput
): Promise<SettlementResult> {
  const breakdown = calculatePersonNetBreakdown(user.uid, input.debtorId, expenses, input.scope)
  const now = nowIso()
  const modifiedMap = new Map<string, Expense>()

  for (const line of breakdown.bOwesALines) {
    const exp = expenses.find((e) => e.id === line.expense.id)
    if (!exp) continue

    const updatedShares = (exp.shares || []).map((s): ExpenseShare => {
      if (s.userId === input.debtorId && s.status === "PAYMENT_REPORTED") {
        return {
          ...s,
          status: "DISPUTED" as SharePaymentStatus,
        }
      }
      return s
    })

    modifiedMap.set(exp.id, { ...exp, shares: updatedShares, updatedAt: now })
  }

  const firestore = getDb()
  if (firestore) {
    const batch = writeBatch(firestore)
    for (const [expId, updatedExp] of modifiedMap.entries()) {
      batch.update(doc(firestore, "expenses", expId), {
        shares: updatedExp.shares,
        updatedAt: now,
      })
    }
    await batch.commit()

    // Notify the payer of dispute
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
      },
      createdAt: now,
    })

    if (input.notifId) {
      await updateNotificationAction(input.notifId, "DISPUTED").catch(console.warn)
    }
  }

  return {
    updatedExpenses: Array.from(modifiedMap.values()),
    allocatedAmountPaise: 0,
  }
}
