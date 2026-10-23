/**
 * Person-to-person settlement flow. Runs without Firebase configured, so the
 * services compute their share edits but skip the writes.
 *
 *   npx tsx services/__tests__/settlement.test.ts
 */
import {
  allocatePersonNetAcrossContexts,
  calculateMemberGroupBalance,
  calculateNetBalances,
  calculatePersonNetBreakdown,
  isCancelOutPending,
  payeeOf,
} from "../../lib/money"
import type { Expense, ExpenseShare, UserProfile } from "../../lib/types"
import { confirmPersonSettlement, disputePersonSettlement, reportPersonSettlement } from "../settlement"

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

const A: UserProfile = { uid: "usr_a", email: "", displayName: "Asha", splitzyId: "JOY-AAAAAA", createdAt: "" }
const B: UserProfile = { uid: "usr_b", email: "", displayName: "Bala", splitzyId: "JOY-BBBBBB", createdAt: "" }

function expense(id: string, payer: UserProfile, shares: [UserProfile, number][], groupId?: string): Expense {
  return {
    id,
    groupId,
    groupName: groupId ? "Trip" : undefined,
    expenseType: groupId ? "group" : "friend",
    title: id,
    amountPaise: shares.reduce((s, [, p]) => s + p, 0),
    payerId: payer.uid,
    payerName: payer.displayName,
    recipientId: payer.uid,
    recipientName: payer.displayName,
    recipientUpiId: "",
    date: "2026-10-01",
    splitType: "EQUAL",
    participantUids: shares.map(([u]) => u.uid),
    shares: shares.map(([u, p]) => ({
      userId: u.uid,
      userName: u.displayName,
      amountPaise: p,
      status: u.uid === payer.uid ? "PAID" : "PENDING",
    })),
    createdBy: payer.uid,
    createdAt: `2026-10-0${id.slice(-1)}T10:00:00Z`,
  }
}

/** Fresh fixture: A owes B ₹150 in a group, ₹100 directly; B owes A ₹50 directly. */
const fixture = () => [
  expense("exp1", B, [[A, 15000], [B, 15000]], "grp_trip"),
  expense("exp2", A, [[A, 5000], [B, 5000]]),
  expense("exp3", B, [[A, 10000], [B, 10000]]),
]

const apply = (base: Expense[], updated: Expense[]) => base.map((e) => updated.find((u) => u.id === e.id) ?? e)
const share = (list: Expense[], id: string, who: UserProfile): ExpenseShare =>
  list.find((e) => e.id === id)!.shares.find((s) => s.userId === who.uid)!

async function main() {
  console.log("Running settlement flow tests...\n")

  // payeeOf mirrors the security rules
  const exp = fixture()[0]
  assert(payeeOf(exp, A.uid) === B.uid, "A's share is owed to the payer B")
  assert(payeeOf({ ...exp, recipientId: A.uid }, A.uid) === B.uid, "recipient's own share goes back to the payer")

  // 1. Direct-only settlement: net ₹50, offsets B's ₹50, leaves the group expense alone
  let list = fixture()
  const direct = { type: "contexts" as const, contextKeys: ["direct"] }
  const report = await reportPersonSettlement(A, list, { creditorId: B.uid, scope: direct })
  list = apply(list, report.updatedExpenses)
  assert(report.allocatedAmountPaise === 5000, "net payable for direct splits is ₹50")
  const settlementId = share(list, "exp3", A).settlementId!
  assert(share(list, "exp3", A).status === "PAYMENT_REPORTED" && !!settlementId, "A's direct share reported")
  assert(
    share(list, "exp2", B).status === "PENDING" &&
      share(list, "exp2", B).offsetApprovedBy === A.uid &&
      share(list, "exp2", B).settlementId === settlementId,
    "B's reciprocal share is approved for cancelling out by A (its payee), but stays open until confirmed"
  )
  assert(share(list, "exp1", A).status === "PENDING", "group expense outside the scope is untouched")
  assert(calculatePersonNetBreakdown(A.uid, B.uid, list).netPayablePaise === 20000,
    "while pending, balances don't jump (A still owes ₹150 group + ₹50 net direct)")
  console.log("✓ Report covers exactly the selected scope")

  // 2. Confirm by settlement id: only that settlement's shares become PAID
  const confirmed = await confirmPersonSettlement(B, list, { debtorId: A.uid, settlementId })
  list = apply(list, confirmed.updatedExpenses)
  assert(share(list, "exp3", A).status === "PAID", "reported share confirmed")
  assert(share(list, "exp2", B).status === "PAID" && !share(list, "exp2", B).offsetApprovedBy,
    "B's approved share closes in the same confirmation")
  assert(share(list, "exp1", A).status === "PENDING", "regression: confirm must not settle the unreported group share")
  assert(calculatePersonNetBreakdown(A.uid, B.uid, list).netPayablePaise === 15000, "A still owes ₹150 in the group")
  console.log("✓ Confirm settles only the reported settlement")

  // 3. Dispute: reported shares become DISPUTED and the offset is reopened
  list = fixture()
  const r2 = await reportPersonSettlement(A, list, { creditorId: B.uid, scope: direct })
  list = apply(list, r2.updatedExpenses)
  const id2 = share(list, "exp3", A).settlementId!
  const disputed = await disputePersonSettlement(B, list, { debtorId: A.uid, settlementId: id2 })
  list = apply(list, disputed.updatedExpenses)
  assert(share(list, "exp3", A).status === "DISPUTED", "A's reported share is disputed")
  assert(
    share(list, "exp2", B).status === "PENDING" &&
      !share(list, "exp2", B).settlementId &&
      !share(list, "exp2", B).offsetApprovedBy,
    "B's cancel-out approval is withdrawn"
  )
  console.log("✓ Dispute reverts the offset")

  // 4. Legacy confirmation (no settlement id) never touches PENDING shares
  list = fixture()
  const legacy = await confirmPersonSettlement(B, list, { debtorId: A.uid, scope: { type: "all" } }).catch((e) => e)
  assert(legacy instanceof Error, "nothing reported → nothing to confirm")
  assert(share(list, "exp1", A).status === "PENDING", "pending shares stay pending")
  console.log("✓ Legacy confirmation only acts on reported shares")

  // 5. The reported scenario: Rajeev (A) owes Abhijeet (B) ₹50 in a group,
  //    Abhijeet owes Rajeev ₹50 on a direct split → overall ₹0
  list = [
    expense("exp4", B, [[A, 5000], [B, 5000]], "grp_trip"),
    expense("exp5", A, [[A, 5000], [B, 5000]]),
  ]
  assert(calculateNetBalances(A.uid, list).netBalancePaise === 0, "overall balance is ₹0")
  const groupView = calculateMemberGroupBalance(A.uid, "grp_trip", list)
  assert(groupView.userOwesPaise === 0 && groupView.owedToUserPaise === 0,
    "group no longer asks Rajeev to pay what the direct split cancels")
  assert(groupView.offsetPaise === 5000, "group shows ₹50 cancelled out")
  const counterpart = calculateMemberGroupBalance(B.uid, "grp_trip", list)
  assert(counterpart.owedToUserPaise === 0 && counterpart.offsetPaise === 5000, "same picture for Abhijeet")

  const cancel = await reportPersonSettlement(A, list, { creditorId: B.uid })
  list = apply(list, cancel.updatedExpenses)
  assert(cancel.allocatedAmountPaise === 0, "nothing to pay when balances cancel")
  assert(isCancelOutPending(A.uid, B.uid, list), "cancel-out shows as awaiting confirmation")
  assert(calculateNetBalances(A.uid, list).netBalancePaise === 0, "still ₹0 while pending")
  const id5 = share(list, "exp4", A).settlementId
  const closed = await confirmPersonSettlement(B, list, { debtorId: A.uid, settlementId: id5 })
  list = apply(list, closed.updatedExpenses)
  assert(share(list, "exp4", A).status === "PAID" && share(list, "exp5", B).status === "PAID",
    "one confirmation closes both sides")
  assert(calculateMemberGroupBalance(A.uid, "grp_trip", list).offsetPaise === 0, "group is fully settled")
  const closedList = list
  console.log("✓ Split-to-split cancel-out: group view matches people view, closes in one confirmation")

  // 6. Allocation: net is shared across same-direction contexts, never exceeding it
  list = [
    expense("exp6", B, [[A, 5000], [B, 5000]], "grp_trip"),
    expense("exp7", B, [[A, 5000], [B, 5000]], "grp_flat"),
    expense("exp8", A, [[A, 5000], [B, 5000]]),
  ]
  const allocated = allocatePersonNetAcrossContexts(A.uid, B.uid, list)
  const owedTotal = allocated.reduce((s, c) => s + Math.max(0, -c.effectivePaise), 0)
  assert(owedTotal === 5000, "two groups of ₹50 minus ₹50 direct → only ₹50 to pay in total")
  assert(allocated.find((c) => c.contextKey === "direct")!.effectivePaise === 0, "direct side fully cancelled")
  console.log("✓ Net is allocated across contexts without double counting")

  // 7. Confirming never reports success when nothing changed
  const nothing = await confirmPersonSettlement(B, fixture(), { debtorId: A.uid, settlementId: "stl_missing" }).catch((e) => e)
  assert(nothing instanceof Error, "unknown settlement → clear error, not a silent 'confirmed'")
  const again = await confirmPersonSettlement(B, closedList, { debtorId: A.uid, settlementId: id5 }).catch((e) => e)
  assert(!(again instanceof Error), "confirming an already-closed settlement is a no-op, not an error")
  console.log("✓ Confirm reports missing / already-closed settlements correctly")

  // 8. A creditor can't report a settlement
  const wrongWay = await reportPersonSettlement(B, fixture(), { creditorId: A.uid }).catch((e) => e)
  assert(wrongWay instanceof Error, "the person who is owed overall can't report paying")
  console.log("✓ Net creditor is blocked from reporting")

  console.log("\n🎉 ALL SETTLEMENT FLOW TESTS PASSED!")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
