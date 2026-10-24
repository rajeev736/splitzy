import {
  deleteUser,
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth"
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
} from "firebase/firestore"

import { auth } from "@/lib/firebase/config"
import { AppError } from "@/lib/errors"
import { GRID_CELLS, isGridGame } from "@/lib/games"
import { calculateNetBalances } from "@/lib/money"
import type { Expense, Group, UserProfile } from "@/lib/types"
import { getDb, nowIso } from "./shared"

const DELETED_NAME = "Deleted user"

export interface AccountDeletionCheck {
  allowed: boolean
  reason?: string
}

/**
 * An account can only be deleted once every balance with other people is zero
 * and no payment is waiting on a confirmation — otherwise deleting would erase
 * money someone else is owed, or that you are owed.
 */
export function canDeleteAccount(uid: string, expenses: Expense[]): AccountDeletionCheck {
  const { totalOwedToYouPaise, totalYouOwePaise } = calculateNetBalances(uid, expenses)
  if (totalYouOwePaise > 0) {
    return { allowed: false, reason: "You still owe money to someone. Settle up before deleting your account." }
  }
  if (totalOwedToYouPaise > 0) {
    return {
      allowed: false,
      reason: "Someone still owes you money. Settle or cancel those balances before deleting your account.",
    }
  }
  const pending = expenses.some(
    (e) =>
      !e.deletedAt &&
      e.expenseType !== "personal" &&
      !e.isPersonal &&
      e.shares?.some(
        (s) =>
          (s.status === "PAYMENT_REPORTED" || s.status === "DISPUTED") &&
          (s.userId === uid || e.payerId === uid || e.recipientId === uid)
      )
  )
  if (pending) {
    return { allowed: false, reason: "A payment involving you is still awaiting confirmation or disputed." }
  }
  return { allowed: true }
}

/** Firebase requires a recent sign-in before an account can be deleted. */
async function reauthenticate(password?: string) {
  const current = auth?.currentUser
  if (!current) throw new AppError("Please sign in again to delete your account.")
  const usesPassword = current.providerData.some((p) => p.providerId === "password")
  if (usesPassword) {
    if (!password) throw new AppError("Enter your password to confirm.")
    await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email || "", password))
  } else {
    await reauthenticateWithPopup(current, new GoogleAuthProvider())
  }
  return current
}

async function deleteRefs(refs: DocumentReference[]) {
  const firestore = getDb()
  if (!firestore) return
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(firestore)
    refs.slice(i, i + 450).forEach((r) => batch.delete(r))
    await batch.commit()
  }
}

/**
 * Permanently deletes the signed-in account and everything that belongs only
 * to it, without changing anything other people rely on:
 *
 * - Deleted: personal expenses, your notifications, friend requests and
 *   friendships, games you hosted, groups where you are the only member (with their expenses),
 *   your JoySplit ID reservation, your profile, and the login itself.
 * - Kept for others: shared expenses (already fully settled — they stay in the
 *   other people's history, shown as "Deleted user") and shared groups (you
 *   leave them; ownership passes to the next member).
 */
export async function deleteAccount(
  user: UserProfile,
  ctx: { expenses: Expense[]; groups: Group[] },
  { password }: { password?: string }
) {
  const check = canDeleteAccount(user.uid, ctx.expenses)
  if (!check.allowed) throw new AppError(check.reason || "Your account can't be deleted yet")

  const current = await reauthenticate(password)
  const firestore = getDb()

  if (firestore) {
    const uid = user.uid
    const col = (name: string) => collection(firestore, name)
    const docsWhere = async (name: string, field: string, op: "==" | "array-contains", value: string) =>
      (await getDocs(query(col(name), where(field, op, value)))).docs

    // 1. Groups: leave shared ones, remove solo ones
    const [memberGroups, invitedGroups] = await Promise.all([
      docsWhere("groups", "members", "array-contains", uid),
      docsWhere("groups", "invitedMembers", "array-contains", uid),
    ])
    for (const snap of memberGroups) {
      const group = snap.data() as Group
      const remaining = group.members.filter((m) => m !== uid)

      if (remaining.length === 0) {
        const groupExpenses = await docsWhere("expenses", "groupId", "==", group.id)
        const othersInvolved =
          (group.formerMembers || []).some((m) => m !== uid) ||
          groupExpenses.some((d) => (d.data() as Expense).shares?.some((s) => s.userId !== uid))
        if (othersInvolved) {
          // Former members still see this group in their history: archive and anonymise
          await updateDoc(snap.ref, {
            members: [],
            status: "ARCHIVED",
            archivedAt: nowIso(),
            formerMembers: Array.from(new Set([...(group.formerMembers || []), uid])),
            [`memberDetails.${uid}`]: deleteField(),
            [`formerMemberDetails.${uid}`]: { uid, name: DELETED_NAME, splitzyId: "", role: "member" },
          })
        } else {
          await deleteRefs(groupExpenses.map((d) => d.ref))
          await deleteDoc(snap.ref)
        }
        continue
      }

      const newOwner = group.createdBy === uid ? remaining[0] : undefined
      await updateDoc(snap.ref, {
        members: remaining,
        formerMembers: Array.from(new Set([...(group.formerMembers || []), uid])),
        [`memberDetails.${uid}`]: deleteField(),
        [`formerMemberDetails.${uid}`]: { uid, name: DELETED_NAME, splitzyId: "", role: "member" },
        ...(newOwner ? { createdBy: newOwner, [`memberDetails.${newOwner}.role`]: "admin" } : {}),
      })
    }
    for (const snap of invitedGroups) {
      await updateDoc(snap.ref, {
        invitedMembers: ((snap.data() as Group).invitedMembers || []).filter((id) => id !== uid),
        [`invitedMemberDetails.${uid}`]: deleteField(),
      }).catch(() => undefined)
    }

    // 2. Expenses: delete personal ones, anonymise your name in shared ones
    const expenseDocs = new Map<string, Awaited<ReturnType<typeof docsWhere>>[number]>()
    for (const [field, op] of [
      ["participantUids", "array-contains"],
      ["createdBy", "=="],
      ["payerId", "=="],
      ["recipientId", "=="],
    ] as const) {
      ;(await docsWhere("expenses", field, op, uid)).forEach((d) => expenseDocs.set(d.id, d))
    }
    const personalRefs: DocumentReference[] = []
    for (const d of expenseDocs.values()) {
      const exp = d.data() as Expense
      if ((exp.expenseType === "personal" || exp.isPersonal) && exp.createdBy === uid) {
        personalRefs.push(d.ref)
        continue
      }
      const patch: Record<string, unknown> = {}
      if (exp.shares?.some((s) => s.userId === uid)) {
        patch.shares = exp.shares.map((s) => {
          if (s.userId !== uid) return s
          const anonymous = { ...s, userName: DELETED_NAME }
          delete anonymous.userPhoto
          return anonymous
        })
      }
      if (exp.payerId === uid) patch.payerName = DELETED_NAME
      if (exp.recipientId === uid) patch.recipientName = DELETED_NAME
      if (Object.keys(patch).length > 0) await updateDoc(d.ref, patch).catch(() => undefined)
    }
    await deleteRefs(personalRefs)

    // 3. Social graph and inbox
    const [sentReqs, receivedReqs, friendships, notifications] = await Promise.all([
      docsWhere("friendRequests", "senderId", "==", uid),
      docsWhere("friendRequests", "receiverId", "==", uid),
      docsWhere("friendships", "users", "array-contains", uid),
      docsWhere("notifications", "userId", "==", uid),
    ])
    await deleteRefs([...sentReqs, ...receivedReqs, ...friendships, ...notifications].map((d) => d.ref))

    // 4. Games you hosted (with their hidden secret and, for grid games, their tiles)
    // (queried by participant: read access is granted per participant)
    const hosted = (await docsWhere("challenges", "participants", "array-contains", uid)).filter(
      (d) => d.data().hostId === uid
    )
    await deleteRefs(
      hosted.flatMap((d) => [
        doc(firestore, "challenges", d.id, "secret", "value"),
        ...(isGridGame(d.data().game)
          ? Array.from({ length: GRID_CELLS }, (_, n) => doc(firestore, "challenges", d.id, "tiles", String(n)))
          : []),
        d.ref,
      ])
    )

    // 5. Identity: free the JoySplit ID, then remove the profile
    if (user.splitzyId) await deleteDoc(doc(firestore, "splitzyIds", user.splitzyId)).catch(() => undefined)
    await deleteDoc(doc(firestore, "users", uid))
  }

  // 6. The login itself (last, so a failure above leaves a working account)
  await deleteUser(current)
}
