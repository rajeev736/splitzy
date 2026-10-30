import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import { buildFirestoreExpense } from "@/lib/expenses/builder"
import { payeeOf } from "@/lib/money"
import type { Expense, ExpenseShare, SharePaymentStatus, SplitType, UserProfile } from "@/lib/types"
import { updateNotificationAction } from "./notifications"
import { getDb, nowIso, resolveExpense, rupees, sendNotification } from "./shared"

export interface CreateExpenseInput {
  /**
   * Idempotency key: the document id to write. Generate it once per form so a
   * double-submit overwrites the same expense instead of creating a duplicate.
   */
  clientId?: string
  groupId?: string
  groupName?: string
  groupIcon?: string
  expenseType?: "group" | "friend" | "personal"
  isDirect?: boolean
  isPersonal?: boolean
  category?: string
  title: string
  amountPaise: number
  payerId: string
  payerName: string
  recipientId?: string
  recipientName?: string
  recipientUpiId?: string
  date: string
  notes?: string
  splitType: SplitType
  shares: Array<{ userId: string; userName: string; userPhoto?: string; amountPaise: number }>
}

/** Same `exp_<timestamp>` shape as before, plus a random suffix so ids never collide. */
export const newExpenseId = () => `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

export async function fetchExpenseById(expenseId: string): Promise<Expense | null> {
  const firestore = getDb()
  if (!firestore) return null
  const snap = await getDoc(doc(firestore, "expenses", expenseId))
  return snap.exists() ? (snap.data() as Expense) : null
}

export async function createExpense(user: UserProfile, data: CreateExpenseInput): Promise<Expense> {
  const expenseType =
    data.expenseType === "personal" || data.isPersonal
      ? "personal"
      : data.expenseType === "friend" || data.isDirect
        ? "friend"
        : "group"

  const expenseId = data.clientId || newExpenseId()
  if (expenseType === "friend" && new Set((data.shares ?? []).map((s) => s.userId)).size > 10) {
    throw new AppError("Split directly with up to 9 friends at a time — make a group for more")
  }

  // Construct and validate typed, sanitized Firestore document
  const { expenseDoc, firestorePayload } = buildFirestoreExpense(expenseId, {
    expenseType,
    title: data.title,
    amountPaise: data.amountPaise,
    date: data.date,
    notes: data.notes,
    category: data.category,
    groupId: data.groupId,
    groupName: data.groupName,
    groupIcon: data.groupIcon,
    payerId: data.payerId,
    payerName: data.payerName,
    recipientId: data.recipientId,
    recipientName: data.recipientName,
    recipientUpiId: data.recipientUpiId,
    splitType: data.splitType,
    shares: data.shares,
    currentUserUid: user.uid,
    currentUserDisplayName: user.displayName,
    currentUserPhotoURL: user.photoURL,
    currentUserUpiId: user.upiId,
  })

  const firestore = getDb()
  if (!firestore) return expenseDoc

  // Saving the same form twice (a retry, a double tap) must not fail: the first
  // save already created it, and a second write would count as an edit, which
  // the security rules don't allow for these fields
  const ref = doc(firestore, "expenses", expenseId)
  const existing = await getDoc(ref).catch(() => null)
  if (existing?.exists()) return existing.data() as Expense

  await setDoc(ref, firestorePayload)

  // Notify everyone else, for shared expenses. Best effort: the expense is
  // saved either way, so a failed notification never fails the save.
  if (expenseDoc.expenseType !== "personal") {
    for (const s of (expenseDoc.shares || []).filter((s) => s.userId !== user.uid)) {
      await sendNotification({
        userId: s.userId,
        title: "New Expense Added",
        message: `${expenseDoc.payerName} added "${expenseDoc.title}" - your share is ₹${rupees(s.amountPaise)}`,
        type: "NEW_EXPENSE",
        data: {
          expenseId,
          ...(expenseDoc.groupId ? { groupId: expenseDoc.groupId } : {}),
          actorId: user.uid,
          actorName: user.displayName,
          amountPaise: s.amountPaise,
        },
      }).catch((e) => console.warn("Expense notification failed:", e))
    }
  }

  return expenseDoc
}

/** Shared mechanics for every share-status transition. Returns the updated shares. */
async function updateShareStatus(
  expenses: Expense[],
  expenseId: string,
  memberUserId: string,
  actor: { uid: string; role: "debtor" | "payee" },
  patch: (share: ExpenseShare) => ExpenseShare,
  notify: (expense: Expense, share: ExpenseShare | undefined) => Promise<void>
): Promise<ExpenseShare[]> {
  const expense = await resolveExpense(expenseId, expenses)
  if (!expense) throw new AppError("Expense not found")
  if (expense.deletedAt) throw new AppError("This expense was deleted")

  const share = expense.shares.find((s) => s.userId === memberUserId)
  if (!share) throw new AppError("This person is not part of the expense")
  if (actor.role === "debtor" && memberUserId !== actor.uid) throw new AppError("You can only report your own share")
  if (actor.role === "payee" && payeeOf(expense, memberUserId) !== actor.uid) {
    throw new AppError("Only the person who is owed this share can confirm or dispute it")
  }
  const shares = expense.shares.map((s) => (s.userId === memberUserId ? patch(s) : s))

  const firestore = getDb()
  if (firestore) {
    await updateDoc(doc(firestore, "expenses", expenseId), { shares })
    await notify(expense, share)
  }
  return shares
}

/** Member reports they paid their share. */
export function reportPayment(user: UserProfile, expenses: Expense[], expenseId: string, note?: string) {
  const now = nowIso()
  return updateShareStatus(
    expenses,
    expenseId,
    user.uid,
    { uid: user.uid, role: "debtor" },
    (s) => ({ ...s, status: "PAYMENT_REPORTED" as SharePaymentStatus, reportedAt: now, paymentProofNote: note || "" }),
    async (expense, share) => {
      const recipientUid = expense.recipientId || expense.payerId
      if (!recipientUid || recipientUid === user.uid) return
      await sendNotification({
        userId: recipientUid,
        title: "Payment Received?",
        message: `${user.displayName} marked their share of ₹${rupees(share?.amountPaise)} as paid for "${expense.title}". Did you receive it?`,
        type: "PAYMENT_REPORTED",
        data: { expenseId, actorId: user.uid, actorName: user.displayName, amountPaise: share?.amountPaise || 0 },
        createdAt: now,
      })
    }
  )
}

/** Recipient confirms they received a member's payment. */
export async function confirmPaymentReceipt(
  user: UserProfile,
  expenses: Expense[],
  expenseId: string,
  memberUserId: string,
  notifId?: string
) {
  const expense = await resolveExpense(expenseId, expenses)
  const existingShare = expense?.shares.find((s) => s.userId === memberUserId)
  const alreadyPaid = existingShare?.status === "PAID"

  const now = nowIso()
  const shares = await updateShareStatus(
    expenses,
    expenseId,
    memberUserId,
    { uid: user.uid, role: "payee" },
    (s) => ({ ...s, status: "PAID" as SharePaymentStatus, confirmedAt: s.confirmedAt || now }),
    async (expense, share) => {
      if (alreadyPaid) return
      await sendNotification({
        userId: memberUserId,
        title: "Payment Confirmed! 🎉",
        message: `${user.displayName} confirmed receiving ₹${rupees(share?.amountPaise)} for "${expense.title}".`,
        type: "PAYMENT_CONFIRMED",
        data: { expenseId, actorId: user.uid, actorName: user.displayName, amountPaise: share?.amountPaise || 0 },
        createdAt: now,
      })
    }
  )

  if (notifId) {
    await updateNotificationAction(notifId, "CONFIRMED").catch(console.warn)
  }

  return shares
}

/** Recipient disputes a reported payment. */
export async function disputePaymentReceipt(
  user: UserProfile,
  expenses: Expense[],
  expenseId: string,
  memberUserId: string,
  notifId?: string
) {
  const expense = await resolveExpense(expenseId, expenses)
  const existingShare = expense?.shares.find((s) => s.userId === memberUserId)
  const alreadyDisputed = existingShare?.status === "DISPUTED"

  const now = nowIso()
  const shares = await updateShareStatus(
    expenses,
    expenseId,
    memberUserId,
    { uid: user.uid, role: "payee" },
    (s) => ({ ...s, status: "DISPUTED" as SharePaymentStatus }),
    async (expense, share) => {
      if (alreadyDisputed) return
      await sendNotification({
        userId: memberUserId,
        title: "Payment Not Received ⚠️",
        message: `${user.displayName} reported that they did NOT receive your payment of ₹${rupees(share?.amountPaise)} for "${expense.title}". Please verify.`,
        type: "PAYMENT_DISPUTED",
        data: { expenseId, actorId: user.uid, actorName: user.displayName, amountPaise: share?.amountPaise || 0 },
        createdAt: now,
      })
    }
  )

  if (notifId) {
    await updateNotificationAction(notifId, "DISPUTED").catch(console.warn)
  }

  return shares
}

/**
 * Delete an expense (payer/creator only, no confirmed or reported member payments).
 * Soft delete: the document stays so history keeps the record, but it no
 * longer counts towards any balance.
 */
export async function deleteExpense(user: UserProfile, expenses: Expense[], expenseId: string) {
  const exp = expenses.find((e) => e.id === expenseId)
  if (!exp) throw new AppError("Expense not found")
  if (exp.deletedAt) throw new AppError("This expense has already been deleted")
  if (exp.payerId !== user.uid && exp.createdBy !== user.uid) {
    throw new AppError("Only the payer or creator can delete this expense")
  }
  if (exp.shares.some((s) => s.userId !== exp.payerId && s.status === "PAID")) {
    throw new AppError("Cannot delete an expense that already has confirmed member payments.")
  }
  if (exp.shares.some((s) => s.status === "PAYMENT_REPORTED")) {
    throw new AppError("A member has reported a payment for this expense. Confirm or dispute it before deleting.")
  }

  const now = nowIso()
  const patch = { deletedAt: now, deletedBy: user.uid, updatedAt: now }
  const firestore = getDb()
  if (!firestore) return patch

  await updateDoc(doc(firestore, "expenses", expenseId), patch)

  if (exp.expenseType !== "personal" && !exp.isPersonal) {
    for (const s of exp.shares.filter((s) => s.userId !== user.uid)) {
      await sendNotification({
        userId: s.userId,
        title: "Expense Deleted",
        message: `${user.displayName} deleted "${exp.title}" (₹${rupees(exp.amountPaise)}). It no longer counts towards your balance.`,
        type: "EXPENSE_DELETED",
        data: {
          expenseId,
          ...(exp.groupId ? { groupId: exp.groupId } : {}),
          actorId: user.uid,
          actorName: user.displayName,
        },
        createdAt: now,
      }).catch((e) => console.warn("Failed to send delete notification:", e))
    }
  }
  return patch
}

export async function sendPaymentReminder(user: UserProfile, expenses: Expense[], expenseId: string, targetUserId: string) {
  const exp = expenses.find((e) => e.id === expenseId)
  if (!exp) throw new AppError("Expense not found")
  await sendNotification(
    {
      userId: targetUserId,
      title: "Payment Reminder",
      message: `${user.displayName} sent a gentle reminder for "${exp.title}"`,
      type: "PAYMENT_REMINDER",
      data: { expenseId, actorId: user.uid, actorName: user.displayName },
    }
  )
}
