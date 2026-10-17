import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

import { AppError } from "@/lib/errors"
import { buildFirestoreExpense } from "@/lib/expenses/builder"
import type { Expense, ExpenseShare, SharePaymentStatus, SplitType, UserProfile } from "@/lib/types"
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

  await setDoc(doc(firestore, "expenses", expenseId), firestorePayload)

  // Notify all participants except creator ONLY for shared expenses
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
      })
    }
  }

  return expenseDoc
}

/** Shared mechanics for every share-status transition. Returns the updated shares. */
async function updateShareStatus(
  expenses: Expense[],
  expenseId: string,
  memberUserId: string,
  patch: (share: ExpenseShare) => ExpenseShare,
  notify: (expense: Expense, share: ExpenseShare | undefined) => Promise<void>
): Promise<ExpenseShare[]> {
  const expense = await resolveExpense(expenseId, expenses)
  if (!expense) throw new AppError("Expense not found")

  const share = expense.shares.find((s) => s.userId === memberUserId)
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
export function confirmPaymentReceipt(user: UserProfile, expenses: Expense[], expenseId: string, memberUserId: string) {
  const now = nowIso()
  return updateShareStatus(
    expenses,
    expenseId,
    memberUserId,
    (s) => ({ ...s, status: "PAID" as SharePaymentStatus, confirmedAt: now }),
    (expense, share) =>
      sendNotification({
        userId: memberUserId,
        title: "Payment Confirmed! 🎉",
        message: `${user.displayName} confirmed receiving ₹${rupees(share?.amountPaise)} for "${expense.title}".`,
        type: "PAYMENT_CONFIRMED",
        data: { expenseId, actorId: user.uid, actorName: user.displayName, amountPaise: share?.amountPaise || 0 },
        createdAt: now,
      })
  )
}

/** Recipient disputes a reported payment. */
export function disputePaymentReceipt(user: UserProfile, expenses: Expense[], expenseId: string, memberUserId: string) {
  const now = nowIso()
  return updateShareStatus(
    expenses,
    expenseId,
    memberUserId,
    (s) => ({ ...s, status: "DISPUTED" as SharePaymentStatus }),
    (expense, share) =>
      sendNotification({
        userId: memberUserId,
        title: "Payment Not Received ⚠️",
        message: `${user.displayName} reported that they did NOT receive your payment of ₹${rupees(share?.amountPaise)} for "${expense.title}". Please verify.`,
        type: "PAYMENT_DISPUTED",
        data: { expenseId, actorId: user.uid, actorName: user.displayName, amountPaise: share?.amountPaise || 0 },
        createdAt: now,
      })
  )
}

/** Delete an expense (payer/creator only, no confirmed member payments). */
export async function deleteExpense(user: UserProfile, expenses: Expense[], expenseId: string) {
  const exp = expenses.find((e) => e.id === expenseId)
  if (!exp) throw new AppError("Expense not found")
  if (exp.payerId !== user.uid && exp.createdBy !== user.uid) {
    throw new AppError("Only the payer or creator can delete this expense")
  }
  if (exp.shares.some((s) => s.userId !== user.uid && s.status === "PAID")) {
    throw new AppError("Cannot delete an expense that already has confirmed member payments.")
  }

  const firestore = getDb()
  if (firestore) await deleteDoc(doc(firestore, "expenses", expenseId))
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
    },
    { scoped: false }
  )
}
