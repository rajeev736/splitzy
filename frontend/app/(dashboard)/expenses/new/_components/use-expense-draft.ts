"use client"

import * as React from "react"
import { toast } from "sonner"

import { calculateEqualSplit, rupeesToPaise, validateManualSplit, type SplitShare } from "@/lib/money"
import type { Group, UserProfile } from "@/lib/types"
import { newExpenseId, type CreateExpenseInput } from "@/services/expenses"

export type ExpenseMode = "group" | "friend" | "personal"

export interface EligibleMember {
  uid: string
  displayName: string
  rawName: string
  photoURL?: string
  splitzyId: string
  upiId?: string
  isCurrentUser: boolean
}

export const PERSONAL_CATEGORIES = [
  { id: "Food & Dining", icon: "🍔", label: "Food & Dining" },
  { id: "Travel & Commute", icon: "🚕", label: "Travel & Commute" },
  { id: "Shopping", icon: "🛍️", label: "Shopping" },
  { id: "Bills & Utilities", icon: "⚡", label: "Bills & Utilities" },
  { id: "Entertainment", icon: "🎬", label: "Entertainment" },
  { id: "Health & Medical", icon: "💊", label: "Health & Medical" },
  { id: "Other", icon: "📌", label: "Other" },
] as const

const todayIso = () => new Date().toISOString().split("T")[0]

/** Paise → editable rupee string: 300 → "3", 333 → "3.33". */
const paiseToInput = (paise: number) => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2))

function selfMember(user: UserProfile): EligibleMember {
  return {
    uid: user.uid,
    displayName: `${user.displayName || "You"} (You)`,
    rawName: user.displayName || "You",
    photoURL: user.photoURL,
    splitzyId: user.splitzyId,
    upiId: user.upiId,
    isCurrentUser: true,
  }
}

interface DraftOptions {
  user: UserProfile | null
  groups: Group[]
  friends: UserProfile[]
  preselectedGroupId: string | null
  preselectedFriendId: string | null
}

/**
 * All state + business logic of the single-screen add-expense form.
 *
 * Splitting: everyone starts with an equal share. Typing an amount for a
 * person "locks" it; the rest of the total is re-split equally (to the paise)
 * among everyone not locked. e.g. ₹12 / 4 people = 3 each → set one to 0 →
 * the other three become 4, 4, 4.
 */
export function useExpenseDraft({ user, groups, friends, preselectedGroupId, preselectedFriendId }: DraftOptions) {
  const [isDone, setIsDone] = React.useState(false)

  // 3 distinct modes: "group" | "friend" | "personal"
  const [expenseMode, setExpenseMode] = React.useState<ExpenseMode>(preselectedFriendId ? "friend" : "group")

  // Common fields
  const [title, setTitle] = React.useState("")
  const [amountRupees, setAmountRupees] = React.useState("")
  // Date is always today; the description is enough context (no date/note fields)
  const [date] = React.useState(todayIso)

  // Mode A (group)
  const [selectedGroupId, setSelectedGroupId] = React.useState(preselectedGroupId || groups[0]?.id || "")

  // Mode B (direct friends)
  const [selectedFriendIds, setSelectedFriendIds] = React.useState<string[]>(
    preselectedFriendId ? [preselectedFriendId] : friends[0]?.uid ? [friends[0].uid] : []
  )

  // Mode C (personal)
  const [personalCategory, setPersonalCategory] = React.useState<string>("Food & Dining")

  // Shared expense specific (modes A & B)
  const [payerId, setPayerId] = React.useState(user?.uid || "")
  const [recipientId, setRecipientId] = React.useState(user?.uid || "")
  const [recipientUpiId, setRecipientUpiId] = React.useState(user?.upiId || "")
  /** Amounts the user typed, as rupee strings keyed by uid. Everyone else shares the rest equally. */
  const [lockedShares, setLockedShares] = React.useState<Record<string, string>>({})

  const [createdExpenseId, setCreatedExpenseId] = React.useState("")
  /** One id per form: a repeated submit rewrites the same expense instead of duplicating it. */
  const [draftId, setDraftId] = React.useState(newExpenseId)

  // Fallback group for mode A
  const uid = user?.uid
  const fallbackGroup = React.useMemo<Group>(
    () => ({
      id: "grp_default",
      name: "General Split",
      description: "General group",
      icon: "/assets/icon_food.jpg",
      members: uid ? [uid] : ["usr_me"],
      createdBy: uid || "usr_me",
      createdAt: new Date().toISOString(),
      memberDetails: {},
    }),
    [uid]
  )

  const currentGroup = React.useMemo(
    () => groups.find((g) => g.id === selectedGroupId) || groups[0] || fallbackGroup,
    [groups, selectedGroupId, fallbackGroup]
  )

  // Eligible participants for mode A (group only)
  const groupEligibleMembers = React.useMemo<EligibleMember[]>(
    () =>
      currentGroup.members.map((mId) => {
        if (user?.uid && mId === user.uid) return selfMember(user)
        const fr = friends.find((f) => f.uid === mId)
        const det = currentGroup.memberDetails?.[mId]
        return {
          uid: mId,
          displayName: det?.name || fr?.displayName || `Member ${mId.slice(-4)}`,
          rawName: det?.name || fr?.displayName || `Member`,
          photoURL: det?.photoURL || fr?.photoURL || "/assets/avatar_boy.jpg",
          splitzyId: det?.splitzyId || fr?.splitzyId || mId,
          upiId: fr?.upiId || `${(det?.name || "user").toLowerCase().replace(/\s+/g, "")}@upi`,
          isCurrentUser: false,
        }
      }),
    [currentGroup, user, friends]
  )

  // Eligible participants for mode B (direct friends)
  const friendEligibleMembers = React.useMemo<EligibleMember[]>(() => {
    const list: EligibleMember[] = []
    if (user) list.push(selfMember(user))
    selectedFriendIds.forEach((fId) => {
      const f = friends.find((fr) => fr.uid === fId)
      if (f && f.uid !== user?.uid) {
        list.push({
          uid: f.uid,
          displayName: f.displayName,
          rawName: f.displayName,
          photoURL: f.photoURL,
          splitzyId: f.splitzyId,
          upiId: f.upiId,
          isCurrentUser: false,
        })
      }
    })
    return list
  }, [user, friends, selectedFriendIds])

  const activeEligibleParticipants = React.useMemo<EligibleMember[]>(() => {
    if (expenseMode === "group") return groupEligibleMembers
    if (expenseMode === "friend") return friendEligibleMembers
    return []
  }, [expenseMode, groupEligibleMembers, friendEligibleMembers])

  // Keep payer/recipient valid when the group or friend selection changes
  React.useEffect(() => {
    if (expenseMode === "personal") return
    const uids = activeEligibleParticipants.map((m) => m.uid)
    const fallback = user?.uid && uids.includes(user.uid) ? user.uid : uids[0] || ""
    /* eslint-disable react-hooks/set-state-in-effect -- reconciles with an external selection change */
    if (!uids.includes(payerId)) setPayerId(fallback)
    if (!uids.includes(recipientId)) setRecipientId(fallback)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [expenseMode, activeEligibleParticipants, payerId, recipientId, user?.uid])

  // Auto-sync recipient UPI ID
  React.useEffect(() => {
    if (expenseMode === "personal") return
    const found = activeEligibleParticipants.find((p) => p.uid === recipientId)
    const targetUpi = found?.upiId || (recipientId === user?.uid ? user?.upiId || "" : "")
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the original sync semantics
    if (targetUpi) setRecipientUpiId((prev) => (prev !== targetUpi ? targetUpi : prev))
  }, [recipientId, activeEligibleParticipants, user?.uid, user?.upiId, expenseMode])

  const findMember = (memberUid: string) => activeEligibleParticipants.find((m) => m.uid === memberUid)

  /* ── Split: locked amounts + equal remainder ────────────────────────── */

  const totalPaise = rupeesToPaise(amountRupees)

  /** One share per participant (including ₹0 ones), always derived — never stale. */
  const splitShares = React.useMemo<SplitShare[]>(() => {
    const isLocked = (m: EligibleMember) => lockedShares[m.uid] !== undefined
    const lockedPaise = activeEligibleParticipants
      .filter(isLocked)
      .reduce((sum, m) => sum + rupeesToPaise(lockedShares[m.uid] || 0), 0)
    const free = activeEligibleParticipants.filter((m) => !isLocked(m))
    const equal = calculateEqualSplit(
      Math.max(0, totalPaise - lockedPaise),
      free.map((m) => ({ id: m.uid, name: m.rawName }))
    )

    return activeEligibleParticipants.map((m) =>
      isLocked(m)
        ? { userId: m.uid, userName: m.rawName, amountPaise: rupeesToPaise(lockedShares[m.uid] || 0) }
        : (equal.find((s) => s.userId === m.uid) ?? { userId: m.uid, userName: m.rawName, amountPaise: 0 })
    )
  }, [activeEligibleParticipants, lockedShares, totalPaise])

  /** Paise not yet covered by the shares (negative = over the total). */
  const remainingPaise = totalPaise - splitShares.reduce((sum, s) => sum + s.amountPaise, 0)
  const isCustomSplit = activeEligibleParticipants.some((m) => lockedShares[m.uid] !== undefined)
  /** People actually paying something — these become the expense shares. */
  const selectedParticipants = splitShares.filter((s) => s.amountPaise > 0).map((s) => s.userId)

  const isShareLocked = (memberUid: string) => lockedShares[memberUid] !== undefined

  /** Value shown in a person's amount input. */
  const shareInputValue = (memberUid: string) =>
    isShareLocked(memberUid)
      ? lockedShares[memberUid]
      : paiseToInput(splitShares.find((s) => s.userId === memberUid)?.amountPaise ?? 0)

  /** Typing an amount locks it; everyone not locked is re-split automatically. */
  const setShareAmount = (memberUid: string, value: string) =>
    setLockedShares((prev) => ({ ...prev, [memberUid]: value }))

  /** An emptied input goes back to the automatic equal share. */
  const releaseShareIfEmpty = (memberUid: string) =>
    setLockedShares((prev) => {
      if (prev[memberUid] === undefined || prev[memberUid].trim() !== "") return prev
      const next = { ...prev }
      delete next[memberUid]
      return next
    })

  const resetSplit = () => setLockedShares({})

  /* ── Toggles ─────────────────────────────────────────────────────────── */

  const toggleFriendSelection = (fId: string) => {
    if (selectedFriendIds.includes(fId)) {
      if (selectedFriendIds.length <= 1) {
        toast.error("Please keep at least one friend selected for direct split")
        return
      }
      setSelectedFriendIds(selectedFriendIds.filter((id) => id !== fId))
    } else {
      setSelectedFriendIds([...selectedFriendIds, fId])
    }
  }

  const changePayer = (memberUid: string) => {
    setPayerId(memberUid)
    setRecipientId(memberUid)
  }

  /* ── Validation (all at save time) ──────────────────────────────────── */

  /** Shared title/amount validation used by every mode. */
  const validateBasics = () => {
    if (!title.trim()) {
      toast.error("Please enter an expense title")
      return false
    }
    if (totalPaise <= 0) {
      toast.error("Please enter a valid amount greater than ₹0")
      return false
    }
    return true
  }

  /** Every check the old wizard ran. Returns the final (non-zero) shares, or null. */
  const validateShared = (): SplitShare[] | null => {
    if (!validateBasics()) return null
    if (expenseMode === "friend" && selectedFriendIds.length === 0) {
      toast.error("Please select at least one friend to split with")
      return null
    }
    const shares = splitShares.filter((s) => s.amountPaise > 0)
    if (shares.length === 0) {
      toast.error("Select at least 1 participant")
      return null
    }
    const validation = validateManualSplit(totalPaise, shares)
    if (!validation.isValid) {
      toast.error(validation.message || "Split total does not match bill total")
      return null
    }
    return shares
  }

  /* ── Payload builders ───────────────────────────────────────────────── */

  const buildPersonalInput = (): CreateExpenseInput => ({
    clientId: draftId,
    expenseType: "personal",
    isPersonal: true,
    category: personalCategory,
    title: title.trim(),
    amountPaise: totalPaise,
    payerId: user?.uid || "",
    payerName: user?.displayName || "You",
    recipientId: user?.uid || "",
    recipientName: user?.displayName || "You",
    recipientUpiId: user?.upiId || "",
    date,
    notes: "",
    splitType: "EQUAL",
    shares: [
      {
        userId: user?.uid || "",
        userName: user?.displayName || "You",
        userPhoto: user?.photoURL,
        amountPaise: totalPaise,
      },
    ],
  })

  const buildSharedInput = (shares: SplitShare[]): CreateExpenseInput => {
    const payerObj = findMember(payerId)
    const recipientObj = findMember(recipientId)
    const isGroup = expenseMode === "group"

    return {
      clientId: draftId,
      groupId: isGroup ? selectedGroupId : undefined,
      groupName: isGroup ? currentGroup?.name : undefined,
      groupIcon: isGroup ? currentGroup?.icon : undefined,
      expenseType: isGroup ? "group" : "friend",
      isDirect: expenseMode === "friend",
      isPersonal: false,
      title: title.trim(),
      amountPaise: totalPaise,
      payerId,
      payerName: payerObj?.rawName || payerObj?.displayName || user?.displayName || "Payer",
      recipientId,
      recipientName: recipientObj?.rawName || recipientObj?.displayName || user?.displayName || "Recipient",
      recipientUpiId: recipientUpiId.trim(),
      date,
      notes: "",
      splitType: isCustomSplit ? "MANUAL" : "EQUAL",
      shares: shares.map((s) => ({
        userId: s.userId,
        userName: s.userName,
        userPhoto: findMember(s.userId)?.photoURL,
        amountPaise: s.amountPaise,
      })),
    }
  }

  const markCreated = (expenseId: string) => {
    setCreatedExpenseId(expenseId)
    setIsDone(true)
  }

  const resetForAnother = () => {
    setIsDone(false)
    setTitle("")
    setAmountRupees("")
    setLockedShares({})
    setDraftId(newExpenseId())
  }

  return {
    isDone,
    expenseMode,
    setExpenseMode,
    title,
    setTitle,
    amountRupees,
    setAmountRupees,
    date,
    setSelectedGroupId,
    currentGroup,
    selectedFriendIds,
    toggleFriendSelection,
    personalCategory,
    setPersonalCategory,
    payerId,
    changePayer,
    recipientUpiId,
    setRecipientUpiId,
    activeEligibleParticipants,
    findMember,
    splitShares,
    remainingPaise,
    isCustomSplit,
    selectedParticipants,
    isShareLocked,
    shareInputValue,
    setShareAmount,
    releaseShareIfEmpty,
    resetSplit,
    createdExpenseId,
    validateBasics,
    validateShared,
    buildPersonalInput,
    buildSharedInput,
    markCreated,
    resetForAnother,
  }
}

export type ExpenseDraft = ReturnType<typeof useExpenseDraft>
