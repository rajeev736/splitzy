import {
  rupeesToPaise,
  paiseToRupees,
  formatPaise,
  calculateEqualSplit,
  validateManualSplit,
  calculateNetBalances,
  calculateDirectBalance,
  canRemoveFriend,
  canUserLeaveGroup,
  canDeleteGroup,
  calculatePersonBalances,
} from "../index";
import { Expense, Group } from "../../types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("Running JoySplit Financial & Business Logic Tests...\n");

// 1. Conversion tests
console.log("1. Testing Rupees to Paise conversion:");
assert(rupeesToPaise(10) === 1000, "10 rupees should equal 1000 paise");
assert(rupeesToPaise("2400") === 240000, "2400 rupees string should equal 240000 paise");
assert(rupeesToPaise("₹ 1,200.50") === 120050, "Formatted string with symbol and comma should parse to 120050 paise");
assert(rupeesToPaise(0.01) === 1, "0.01 rupees should equal 1 paise");
assert(rupeesToPaise(0) === 0, "0 rupees should equal 0 paise");
console.log("✓ Rupees to Paise conversion tests passed.");

// 2. Formatting tests
console.log("\n2. Testing Indian Currency formatPaise:");
assert(formatPaise(240000) === "₹2,400", "240000 paise should format to ₹2,400");
assert(formatPaise(120050) === "₹1,200.50", "120050 paise should format to ₹1,200.50");
assert(formatPaise(10000000) === "₹1,00,000", "10000000 paise should format to ₹1,00,000");
console.log("✓ Currency formatting tests passed.");

// 3. Deterministic Equal Split & Remainder Distribution
console.log("\n3. Testing Deterministic Equal Split & Remainder Paise Distribution:");
const participants3 = [
  { id: "p1", name: "User 1" },
  { id: "p2", name: "User 2" },
  { id: "p3", name: "User 3" },
];
const split3 = calculateEqualSplit(1000, participants3);
assert(split3.length === 3, "Split should have 3 members");
assert(split3[0].amountPaise === 334, "First member should get base + 1 remainder paise (334)");
assert(split3[1].amountPaise === 333, "Second member should get base share (333)");
assert(split3[2].amountPaise === 333, "Third member should get base share (333)");
const totalSum3 = split3.reduce((acc, curr) => acc + curr.amountPaise, 0);
assert(totalSum3 === 1000, `Sum of shares (${totalSum3}) must equal totalPaise (1000)`);
console.log("✓ 1000 paise 3-way split passed: 334 + 333 + 333 = 1000 paise exact.");

// 4. Net Balances calculation
console.log("\n4. Testing Authoritative Net Balances Calculation:");
const mockExpenses: Expense[] = [
  {
    id: "exp_1",
    groupId: "grp_alpha",
    title: "Dinner",
    amountPaise: 300000, // ₹3,000
    payerId: "usr_rajeev",
    payerName: "Rajeev",
    recipientId: "usr_rajeev",
    recipientName: "Rajeev",
    recipientUpiId: "rajeev@upi",
    date: "2026-10-15",
    splitType: "EQUAL",
    shares: [
      { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 100000, status: "PAID" },
      { userId: "usr_sital", userName: "Sital", amountPaise: 100000, status: "PENDING" },
      { userId: "usr_friendC", userName: "Friend C", amountPaise: 100000, status: "PENDING" },
    ],
    createdBy: "usr_rajeev",
    createdAt: "2026-10-15T12:00:00Z",
  },
];

const rajeevBalances = calculateNetBalances("usr_rajeev", mockExpenses);
assert(rajeevBalances.totalOwedToYouPaise === 200000, "Rajeev should be owed ₹2,000 (200000 paise)");
assert(rajeevBalances.totalYouOwePaise === 0, "Rajeev owes 0");
assert(rajeevBalances.netBalancePaise === 200000, "Rajeev net balance should be +200000");

const sitalBalances = calculateNetBalances("usr_sital", mockExpenses);
assert(sitalBalances.totalOwedToYouPaise === 0, "Sital is owed 0");
assert(sitalBalances.totalYouOwePaise === 100000, "Sital owes ₹1,000");
assert(sitalBalances.netBalancePaise === -100000, "Sital net balance should be -100000");
console.log("✓ Net balance calculations passed.");

// 5. Direct Balance between two users
console.log("\n5. Testing Direct Balance Calculation:");
const direct = calculateDirectBalance("usr_rajeev", "usr_sital", mockExpenses);
assert(direct.netBalancePaise === 100000, "Sital owes Rajeev ₹1,000");
assert(direct.userBOwesUserAPaise === 100000, "userBOwesUserA should be 100000");
assert(direct.userAOwesUserBPaise === 0, "userAOwesUserB should be 0");
console.log("✓ Direct balance calculation passed.");

// 6. canRemoveFriend Invariant Rule
console.log("\n6. Testing canRemoveFriend Invariant Rule:");
// Sital owes Rajeev, so if Sital tries to remove Rajeev, it should be strictly blocked:
const removeCheckBlocked = canRemoveFriend("usr_sital", "usr_rajeev", mockExpenses);
assert(removeCheckBlocked.canRemove === false, "Removal should be blocked while Sital owes Rajeev");
assert(removeCheckBlocked.unsettledPaise === 100000, "Unsettled paise should be 100000");

// Rajeev is owed by Sital, so Rajeev can remove with warning under product policy:
const removeCheckWarned = canRemoveFriend("usr_rajeev", "usr_sital", mockExpenses);
assert(removeCheckWarned.canRemove === true, "Removal allowed when friend owes current user");
assert(!!removeCheckWarned.warning, "Warning message must be provided");

// Mark as paid and recheck
const settledExpenses: Expense[] = [
  {
    ...mockExpenses[0],
    shares: mockExpenses[0].shares.map((s) => ({ ...s, status: "PAID" })),
  },
];
const removeCheckAllowed = canRemoveFriend("usr_sital", "usr_rajeev", settledExpenses);
assert(removeCheckAllowed.canRemove === true, "Removal should be allowed once balance is 0");
console.log("✓ canRemoveFriend rule enforced successfully.");

// 7. canUserLeaveGroup Invariant Rule
console.log("\n7. Testing canUserLeaveGroup Invariant Rule:");
const mockGroup: Group = {
  id: "grp_alpha",
  name: "Group Alpha",
  icon: "/assets/icon_food.jpg",
  createdBy: "usr_rajeev",
  members: ["usr_rajeev", "usr_sital", "usr_friendC"],
  memberDetails: {
    usr_rajeev: { uid: "usr_rajeev", name: "Rajeev", splitzyId: "JOY-1", role: "admin" },
    usr_sital: { uid: "usr_sital", name: "Sital", splitzyId: "JOY-2", role: "member" },
    usr_friendC: { uid: "usr_friendC", name: "Friend C", splitzyId: "JOY-3", role: "member" },
  },
  createdAt: "2026-10-15T10:00:00Z",
};

// Creator attempt
const creatorLeave = canUserLeaveGroup("usr_rajeev", mockGroup, mockExpenses);
assert(creatorLeave.canLeave === false, "Creator cannot leave the group");

// Member with unpaid balance attempt
const sitalLeave = canUserLeaveGroup("usr_sital", mockGroup, mockExpenses);
assert(sitalLeave.canLeave === false, "Sital cannot leave while owing ₹1,000");
assert(sitalLeave.userOwesPaise === 100000, "Sital owes 100000 paise");

// Member after settling
const sitalLeaveAfterSettled = canUserLeaveGroup("usr_sital", mockGroup, settledExpenses);
assert(sitalLeaveAfterSettled.canLeave === true, "Sital can leave once all group expenses are settled");
console.log("✓ canUserLeaveGroup rule enforced successfully.");

// 8. canDeleteGroup Invariant Rule
console.log("\n8. Testing canDeleteGroup Invariant Rule:");
// Non-creator attempt
const nonCreatorDelete = canDeleteGroup("usr_sital", mockGroup, settledExpenses);
assert(nonCreatorDelete.canDelete === false, "Non-creator cannot delete group");

// Creator with unsettled expenses
const creatorDeleteWithBalances = canDeleteGroup("usr_rajeev", mockGroup, mockExpenses);
assert(creatorDeleteWithBalances.canDelete === false, "Creator cannot delete group with pending balances");

// Creator with all settled expenses
const creatorDeleteSettled = canDeleteGroup("usr_rajeev", mockGroup, settledExpenses);
assert(creatorDeleteSettled.canDelete === true, "Creator can delete group when all balances are settled");
console.log("✓ canDeleteGroup rule enforced successfully.");

// 9. Regression: payer ≠ recipient must not make net and direct balances disagree.
// Codium paid ₹560; repayments were routed to Abhi (recipient), whose own ₹280 share is unpaid.
console.log("\n9. Testing payer ≠ recipient consistency:");
const crossedExpenses: Expense[] = [
  {
    id: "exp_chap",
    title: "Chap Party",
    amountPaise: 56000,
    payerId: "usr_codium",
    payerName: "Codium",
    recipientId: "usr_abhi",
    recipientName: "Abhi",
    recipientUpiId: "abhi@upi",
    date: "2026-10-17",
    splitType: "EQUAL",
    shares: [
      { userId: "usr_codium", userName: "Codium", amountPaise: 28000, status: "PAID" },
      { userId: "usr_abhi", userName: "Abhi", amountPaise: 28000, status: "PENDING" },
    ],
    createdBy: "usr_codium",
    createdAt: "2026-10-17T00:00:00.000Z",
  },
];
const abhiNet = calculateNetBalances("usr_abhi", crossedExpenses);
const abhiDirect = calculateDirectBalance("usr_abhi", "usr_codium", crossedExpenses);
assert(abhiNet.totalYouOwePaise === 28000, "Recipient with an unpaid share still owes the payer ₹280");
assert(abhiNet.netBalancePaise === -28000, "Net balance should be -₹280");
assert(abhiDirect.netBalancePaise === abhiNet.netBalancePaise, "Direct and net balances must agree");
assert(calculateNetBalances("usr_codium", crossedExpenses).netBalancePaise === 28000, "Payer is owed ₹280");
console.log("✓ Net and direct balances agree when payer ≠ recipient.");

// Soft-deleted expenses stay in history but never affect balances
console.log("\nTesting deleted expenses and per-person balances:");
const mkExpense = (id: string, extra: Partial<Expense> = {}): Expense => ({
  id,
  groupId: "grp_trip",
  title: id,
  amountPaise: 30000,
  payerId: "usr_me",
  payerName: "Me",
  recipientId: "usr_me",
  recipientName: "Me",
  recipientUpiId: "me@upi",
  date: "2026-10-17",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_me", userName: "Me", amountPaise: 10000, status: "PAID" },
    { userId: "usr_friend", userName: "Friend", amountPaise: 10000, status: "PENDING" },
    { userId: "usr_stranger", userName: "Group Member", amountPaise: 10000, status: "PENDING" },
  ],
  createdBy: "usr_me",
  createdAt: "2026-10-17T00:00:00.000Z",
  ...extra,
});
const mixed = [mkExpense("exp_live"), mkExpense("exp_deleted", { deletedAt: "2026-10-17T01:00:00.000Z" })];
assert(calculateNetBalances("usr_me", mixed).netBalancePaise === 20000, "Deleted expense must not count");
const people = calculatePersonBalances("usr_me", mixed);
assert(people.length === 2, "Both the friend and the non-friend group member are listed");
assert(
  people.reduce((sum, p) => sum + p.netBalancePaise, 0) === calculateNetBalances("usr_me", mixed).netBalancePaise,
  "Per-person balances add up to the net balance"
);
assert(people.find((p) => p.userId === "usr_stranger")?.name === "Group Member", "Names come from the shares");
assert(
  canDeleteGroup("usr_me", { ...mockGroup, id: "grp_trip", createdBy: "usr_me" }, [mkExpense("x", { deletedAt: "t" })]).allowed,
  "Deleted expenses don't block group deletion"
);
console.log("\nTesting PhonePe-style split-to-split cancel mutual netting:");
// Scenario 1: Rajeev pays ₹100 for lassi (Mohit owes ₹50), Mohit pays ₹100 for paratha (Rajeev owes ₹50)
const lassi100: Expense = {
  id: "exp_lassi",
  title: "Lassi",
  amountPaise: 10000,
  payerId: "usr_rajeev",
  payerName: "Rajeev",
  recipientId: "usr_rajeev",
  recipientName: "Rajeev",
  recipientUpiId: "rajeev@upi",
  date: "2026-10-21",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 5000, status: "PAID" },
    { userId: "usr_mohit", userName: "Mohit", amountPaise: 5000, status: "PENDING" },
  ],
  createdBy: "usr_rajeev",
  createdAt: "2026-10-21T10:00:00.000Z",
};

const paratha100: Expense = {
  id: "exp_paratha100",
  title: "Paratha",
  amountPaise: 10000,
  payerId: "usr_mohit",
  payerName: "Mohit",
  recipientId: "usr_mohit",
  recipientName: "Mohit",
  recipientUpiId: "mohit@upi",
  date: "2026-10-21",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_mohit", userName: "Mohit", amountPaise: 5000, status: "PAID" },
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 5000, status: "PENDING" },
  ],
  createdBy: "usr_mohit",
  createdAt: "2026-10-21T11:00:00.000Z",
};

const equalMutual = [lassi100, paratha100];
const rajeevEqualNet = calculateNetBalances("usr_rajeev", equalMutual);
assert(rajeevEqualNet.netBalancePaise === 0, "Equal mutual splits cancel out to ₹0");
assert(rajeevEqualNet.totalOwedToYouPaise === 0, "Nothing owed after split cancel");
assert(rajeevEqualNet.totalYouOwePaise === 0, "Nothing to pay after split cancel");

// Scenario 2: Mohit pays ₹200 for paratha (Rajeev owes ₹100), Rajeev paid ₹100 for lassi (Mohit owes ₹50)
const paratha200: Expense = {
  id: "exp_paratha200",
  title: "Paratha 200",
  amountPaise: 20000,
  payerId: "usr_mohit",
  payerName: "Mohit",
  recipientId: "usr_mohit",
  recipientName: "Mohit",
  recipientUpiId: "mohit@upi",
  date: "2026-10-21",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_mohit", userName: "Mohit", amountPaise: 10000, status: "PAID" },
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 10000, status: "PENDING" },
  ],
  createdBy: "usr_mohit",
  createdAt: "2026-10-21T11:00:00.000Z",
};

const unequalMutual = [lassi100, paratha200];
const rajeevUnequalNet = calculateNetBalances("usr_rajeev", unequalMutual);
assert(rajeevUnequalNet.netBalancePaise === -5000, "Rajeev net owes ₹50 after adjusting ₹50 lassi against ₹100 paratha");
assert(rajeevUnequalNet.totalYouOwePaise === 5000, "Rajeev owes net ₹50");
assert(rajeevUnequalNet.totalOwedToYouPaise === 0, "Rajeev is owed ₹0 net");

const mohitUnequalNet = calculateNetBalances("usr_mohit", unequalMutual);
assert(mohitUnequalNet.netBalancePaise === 5000, "Mohit is owed net ₹50 after split cancel");
assert(mohitUnequalNet.totalOwedToYouPaise === 5000, "Mohit is owed ₹50 net");
assert(mohitUnequalNet.totalYouOwePaise === 0, "Mohit owes ₹0 net");

console.log("✓ Split-to-split cancel tests passed.");

console.log("\n🎉 ALL FINANCIAL & INVARIANT BUSINESS LOGIC TESTS PASSED!");
