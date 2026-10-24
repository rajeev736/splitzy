"use client"

import * as React from "react"
import { toast } from "sonner"

import { useQueryTab } from "@/hooks/use-query-tab"
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

/** The most one expense can be, in rupees (₹10,00,000). */
export const MAX_EXPENSE_RUPEES = 1_000_000

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
const VALID_EXPENSE_MODES: ExpenseMode[] = ["group", "friend", "personal"]

export function useExpenseDraft({ user, groups, friends, preselectedGroupId, preselectedFriendId }: DraftOptions) {
  const initialMode: ExpenseMode = preselectedFriendId ? "friend" : "group"

  // 3 distinct modes: "group" | "friend" | "personal", synced with URL query param `?tab=...`
  const [expenseMode, setExpenseMode] = useQueryTab<ExpenseMode>({
    defaultValue: initialMode,
    validValues: VALID_EXPENSE_MODES,
    param: "tab",
  })

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

  // Shared expenses: whoever creates the expense paid it, and is repaid on their UPI ID
  const payerId = user?.uid || ""
  const recipientId = payerId
  const [recipientUpiId, setRecipientUpiId] = React.useState(user?.upiId || "")
  /** Amounts the user typed, as rupee strings keyed by uid. Everyone else shares the rest equally. */
  const [lockedShares, setLockedShares] = React.useState<Record<string, string>>({})

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
          // Only a real UPI id — never guess one (money could reach a stranger)
          upiId: fr?.upiId,
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

  // Included participants in the split (defaults to everyone in the group)
  const [includedMemberIds, setIncludedMemberIds] = React.useState<string[]>([])

  // Default all active members to be included whenever group or mode changes
  // (adjusted during render when the selection key changes, rather than in an effect)
  const [syncedSelection, setSyncedSelection] = React.useState<{
    groupId: string
    mode: ExpenseMode
    friendIds: string[]
  } | null>(null)
  if (
    !syncedSelection ||
    syncedSelection.groupId !== currentGroup.id ||
    syncedSelection.mode !== expenseMode ||
    syncedSelection.friendIds !== selectedFriendIds
  ) {
    setSyncedSelection({ groupId: currentGroup.id, mode: expenseMode, friendIds: selectedFriendIds })
    if (activeEligibleParticipants.length > 0) {
      setIncludedMemberIds(activeEligibleParticipants.map((m) => m.uid))
      setLockedShares({})
    }
  }

  const findMember = (memberUid: string) => activeEligibleParticipants.find((m) => m.uid === memberUid)

  /* ── Split: locked amounts + equal remainder ────────────────────────── */

  const totalPaise = rupeesToPaise(amountRupees)

  /** One share per participant (including ₹0 ones), always derived — never stale. */
  const splitShares = React.useMemo<SplitShare[]>(() => {
    const included = activeEligibleParticipants.filter((m) => includedMemberIds.includes(m.uid))
    const isLocked = (m: EligibleMember) => lockedShares[m.uid] !== undefined
    const lockedPaise = included
      .filter(isLocked)
      .reduce((sum, m) => sum + rupeesToPaise(lockedShares[m.uid] || 0), 0)
    const free = included.filter((m) => !isLocked(m))
    const equal = calculateEqualSplit(
      Math.max(0, totalPaise - lockedPaise),
      free.map((m) => ({ id: m.uid, name: m.rawName }))
    )

    return activeEligibleParticipants.map((m) => {
      if (!includedMemberIds.includes(m.uid)) {
        return { userId: m.uid, userName: m.rawName, amountPaise: 0 }
      }
      return isLocked(m)
        ? { userId: m.uid, userName: m.rawName, amountPaise: rupeesToPaise(lockedShares[m.uid] || 0) }
        : (equal.find((s) => s.userId === m.uid) ?? { userId: m.uid, userName: m.rawName, amountPaise: 0 })
    })
  }, [activeEligibleParticipants, includedMemberIds, lockedShares, totalPaise])

  /** Paise not yet covered by the shares (negative = over the total). */
  const remainingPaise = totalPaise - splitShares.reduce((sum, s) => sum + s.amountPaise, 0)
  const isCustomSplit =
    activeEligibleParticipants.some(
      (m) => includedMemberIds.includes(m.uid) && lockedShares[m.uid] !== undefined
    ) || (includedMemberIds.length > 0 && includedMemberIds.length < activeEligibleParticipants.length)

  /** People actually paying something — these become the expense shares. */
  const selectedParticipants = splitShares.filter((s) => s.amountPaise > 0).map((s) => s.userId)

  const isMemberIncluded = (memberUid: string) => includedMemberIds.includes(memberUid)

  const toggleMemberIncluded = (memberUid: string) => {
    setIncludedMemberIds((prev) => {
      if (prev.includes(memberUid)) {
        if (prev.length <= 1) {
          toast.error("Please keep at least one person in the split")
          return prev
        }
        setLockedShares((locked) => {
          const next = { ...locked }
          delete next[memberUid]
          return next
        })
        return prev.filter((id) => id !== memberUid)
      } else {
        return [...prev, memberUid]
      }
    })
  }

  const isShareLocked = (memberUid: string) => lockedShares[memberUid] !== undefined

  /** Value shown in a person's amount input. */
  const shareInputValue = (memberUid: string) => {
    if (!includedMemberIds.includes(memberUid)) return "0"
    return isShareLocked(memberUid)
      ? lockedShares[memberUid]
      : paiseToInput(splitShares.find((s) => s.userId === memberUid)?.amountPaise ?? 0)
  }

  /** Typing an amount locks it; everyone not locked is re-split automatically. */
  const setShareAmount = (memberUid: string, value: string) => {
    if (!includedMemberIds.includes(memberUid)) {
      setIncludedMemberIds((prev) => [...prev, memberUid])
    }
    setLockedShares((prev) => ({ ...prev, [memberUid]: value }))
  }

  /** An emptied input goes back to the automatic equal share. */
  const releaseShareIfEmpty = (memberUid: string) =>
    setLockedShares((prev) => {
      if (prev[memberUid] === undefined || prev[memberUid].trim() !== "") return prev
      const next = { ...prev }
      delete next[memberUid]
      return next
    })

  const resetSplit = () => {
    setLockedShares({})
    setIncludedMemberIds(activeEligibleParticipants.map((m) => m.uid))
  }

  /* ── Toggles ─────────────────────────────────────────────────────────── */

  /** Split with exactly this friend (the quick picker); the sheet allows several. */
  const selectOnlyFriend = (fId: string) => setSelectedFriendIds([fId])

  /**
   * Amount input: digits with up to 2 decimals, capped at ₹10,00,000.
   * Leading zeros collapse ("000" → "0", "007" → "7", ".5" → "0.5").
   * Returns false if the keystroke was rejected.
   */
  const changeAmount = (raw: string) => {
    let next = raw.replace(/,/g, "").trim()
    if (!/^\d*(\.\d{0,2})?$/.test(next)) return false
    next = next.replace(/^0+(?=\d)/, "")
    if (next.startsWith(".")) next = `0${next}`
    if (Number(next) > MAX_EXPENSE_RUPEES) {
      toast.error("An expense can be at most ₹10,00,000", { id: "amount-max" })
      return false
    }
    setAmountRupees(next)
    return true
  }

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

  /**
   * Clears the form after a save. The page can stay mounted across visits, so
   * without this the next expense would open pre-filled — and reuse this id,
   * overwriting the expense just saved.
   */
  const reset = () => {
    setTitle("")
    setAmountRupees("")
    setLockedShares({})
    setDraftId(newExpenseId())
  }

  /* ── Validation (all at save time) ──────────────────────────────────── */

  /** The description is optional: fall back to where the money went. */
  const resolvedTitle = () => {
    if (title.trim()) return title.trim()
    if (expenseMode === "personal") return personalCategory
    if (expenseMode === "group") return `${currentGroup.name} expense`
    const picked = friends.filter((f) => selectedFriendIds.includes(f.uid))
    return picked.length === 1 ? `Split with ${picked[0].displayName}` : "Split with friends"
  }

  /** Shared amount validation used by every mode. */
  const validateBasics = () => {
    if (totalPaise <= 0) {
      toast.error("Please enter a valid amount greater than ₹0")
      return false
    }
    if (totalPaise > MAX_EXPENSE_RUPEES * 100) {
      toast.error("An expense can be at most ₹10,00,000")
      return false
    }
    return true
  }

  /** Every check the old wizard ran. Returns the final (non-zero) shares, or null. */
  const validateShared = (): SplitShare[] | null => {
    if (!validateBasics()) return null
    if (expenseMode === "group" && !groups.some((g) => g.id === currentGroup.id)) {
      toast.error("Create or pick a group first")
      return null
    }
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
    title: resolvedTitle(),
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
      groupId: isGroup ? currentGroup.id : undefined,
      groupName: isGroup ? currentGroup?.name : undefined,
      groupIcon: isGroup ? currentGroup?.icon : undefined,
      expenseType: isGroup ? "group" : "friend",
      isDirect: expenseMode === "friend",
      isPersonal: false,
      title: resolvedTitle(),
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

  return {
    expenseMode,
    setExpenseMode,
    title,
    setTitle,
    amountRupees,
    changeAmount,
    date,
    setSelectedGroupId,
    currentGroup,
    selectedFriendIds,
    selectOnlyFriend,
    toggleFriendSelection,
    personalCategory,
    setPersonalCategory,
    payerId,
    recipientUpiId,
    setRecipientUpiId,
    activeEligibleParticipants,
    findMember,
    includedMemberIds,
    isMemberIncluded,
    toggleMemberIncluded,
    splitShares,
    remainingPaise,
    isCustomSplit,
    selectedParticipants,
    isShareLocked,
    shareInputValue,
    setShareAmount,
    releaseShareIfEmpty,
    resetSplit,
    validateBasics,
    validateShared,
    buildPersonalInput,
    buildSharedInput,
    reset,
  }
}

export type ExpenseDraft = ReturnType<typeof useExpenseDraft>
