import {
  rupeesToPaise,
  formatPaise,
  calculateEqualSplit,
  calculateNetBalances,
  calculateDirectBalance,
  canRemoveFriend,
  canUserLeaveGroup,
  canDeleteGroup,
  calculatePersonBalances,
  calculatePersonNetBreakdown,
  getExpenseShareSettlementStatus,
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

// Creator can leave while others remain (ownership passes to the next member)...
const creatorLeave = canUserLeaveGroup("usr_rajeev", mockGroup, mockExpenses);
assert(creatorLeave.canLeave === true, "Creator can hand the group over and leave");
// ...but a sole-member creator must delete the group instead
const soloLeave = canUserLeaveGroup("usr_rajeev", { ...mockGroup, members: ["usr_rajeev"] }, mockExpenses);
assert(soloLeave.canLeave === false, "Sole member cannot leave, only delete");

// Member with unpaid balance can now leave (debt tracked under People)
const sitalLeave = canUserLeaveGroup("usr_sital", mockGroup, mockExpenses);
assert(sitalLeave.canLeave === true, "Sital can leave freely, balance remains tracked in people");
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

// 10. PhonePe-style Person-to-Person Net Settlement Tests
console.log("\n10. Testing PhonePe-Style Person-to-Person Net Settlement:");

// Prompt Scenario 1:
// - Rajeev creates an expense of ₹100 for Paratha, split equally between Rajeev and Abhijeet (Abhijeet owes ₹50).
// - Abhijeet creates another ₹100 expense, also split equally between Rajeev and Abhijeet (Rajeev owes ₹50).
// Expected result: Both obligations cancel each other. Their final net balance is ₹0.
// Neither user should be asked to pay the other, and neither expense should create a remaining payment obligation.
const paratha100_rajeev: Expense = {
  id: "exp_paratha_100",
  groupId: "grp_roommates",
  groupName: "Roommates",
  title: "Paratha",
  amountPaise: 10000, // ₹100
  payerId: "usr_rajeev",
  payerName: "Rajeev",
  recipientId: "usr_rajeev",
  recipientName: "Rajeev",
  recipientUpiId: "rajeev@upi",
  date: "2026-10-22",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 5000, status: "PAID" },
    { userId: "usr_abhijeet", userName: "Abhijeet", amountPaise: 5000, status: "PENDING" },
  ],
  createdBy: "usr_rajeev",
  createdAt: "2026-10-22T10:00:00.000Z",
};

const grocery100_abhijeet: Expense = {
  id: "exp_grocery_100",
  groupId: "grp_roommates",
  groupName: "Roommates",
  title: "Groceries",
  amountPaise: 10000, // ₹100
  payerId: "usr_abhijeet",
  payerName: "Abhijeet",
  recipientId: "usr_abhijeet",
  recipientName: "Abhijeet",
  recipientUpiId: "abhijeet@upi",
  date: "2026-10-22",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_abhijeet", userName: "Abhijeet", amountPaise: 5000, status: "PAID" },
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 5000, status: "PENDING" },
  ],
  createdBy: "usr_abhijeet",
  createdAt: "2026-10-22T11:00:00.000Z",
};

const promptScenario1Expenses = [paratha100_rajeev, grocery100_abhijeet];

// Test from Rajeev's perspective
const rajeevVsAbhijeet = calculatePersonNetBreakdown("usr_rajeev", "usr_abhijeet", promptScenario1Expenses);
assert(rajeevVsAbhijeet.netBalancePaise === 0, "Rajeev and Abhijeet net balance must be ₹0");
assert(rajeevVsAbhijeet.netPayablePaise === 0, "Rajeev net payable to Abhijeet must be 0");
assert(rajeevVsAbhijeet.netReceivablePaise === 0, "Rajeev net receivable from Abhijeet must be 0");
assert(rajeevVsAbhijeet.offsetPaise === 5000, "Mutual offset must be exactly ₹50 (5000 paise)");
assert(rajeevVsAbhijeet.aOwesBTotalPaise === 5000, "Gross Rajeev owes Abhijeet = ₹50");
assert(rajeevVsAbhijeet.bOwesATotalPaise === 5000, "Gross Abhijeet owes Rajeev = ₹50");

// Check status of individual expense shares
const abhiStatusInParatha = getExpenseShareSettlementStatus(paratha100_rajeev, "usr_abhijeet", promptScenario1Expenses);
assert(abhiStatusInParatha.isOffsetSettled === true, "Abhijeet's share in Paratha must be marked isOffsetSettled");
assert(abhiStatusInParatha.canPayNet === false, "Abhijeet cannot be prompted to pay Paratha (net is 0)");

const rajeevStatusInGrocery = getExpenseShareSettlementStatus(grocery100_abhijeet, "usr_rajeev", promptScenario1Expenses);
assert(rajeevStatusInGrocery.isOffsetSettled === true, "Rajeev's share in Groceries must be marked isOffsetSettled");
assert(rajeevStatusInGrocery.canPayNet === false, "Rajeev cannot be prompted to pay Groceries (net is 0)");

console.log("✓ Prompt Scenario 1 (Mutual ₹50 obligations cancel to ₹0) passed.");

// Prompt Scenario 2:
// - Rajeev owes Abhijeet ₹150.
// - Abhijeet owes Rajeev ₹100.
// System should calculate net result as:
// - Rajeev needs to pay Abhijeet ₹50.
// - Abhijeet does not need to pay Rajeev anything.
const exp_abhijeet_paid_300: Expense = {
  id: "exp_abhi_300",
  groupId: "grp_roommates",
  groupName: "Roommates",
  title: "Dinner 300",
  amountPaise: 30000, // ₹300, split equally between Rajeev and Abhijeet -> Rajeev owes ₹150
  payerId: "usr_abhijeet",
  payerName: "Abhijeet",
  recipientId: "usr_abhijeet",
  recipientName: "Abhijeet",
  recipientUpiId: "abhijeet@upi",
  date: "2026-10-22",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_abhijeet", userName: "Abhijeet", amountPaise: 15000, status: "PAID" },
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 15000, status: "PENDING" },
  ],
  createdBy: "usr_abhijeet",
  createdAt: "2026-10-22T10:00:00.000Z",
};

const exp_rajeev_paid_200: Expense = {
  id: "exp_rajeev_200",
  groupId: "grp_roommates",
  groupName: "Roommates",
  title: "Cab 200",
  amountPaise: 20000, // ₹200, split equally between Rajeev and Abhijeet -> Abhijeet owes ₹100
  payerId: "usr_rajeev",
  payerName: "Rajeev",
  recipientId: "usr_rajeev",
  recipientName: "Rajeev",
  recipientUpiId: "rajeev@upi",
  date: "2026-10-22",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 10000, status: "PAID" },
    { userId: "usr_abhijeet", userName: "Abhijeet", amountPaise: 10000, status: "PENDING" },
  ],
  createdBy: "usr_rajeev",
  createdAt: "2026-10-22T11:00:00.000Z",
};

const promptScenario2Expenses = [exp_abhijeet_paid_300, exp_rajeev_paid_200];

// From Rajeev's perspective:
const scenario2Rajeev = calculatePersonNetBreakdown("usr_rajeev", "usr_abhijeet", promptScenario2Expenses);
assert(scenario2Rajeev.netBalancePaise === -5000, "Rajeev net balance should be -₹50 (-5000 paise)");
assert(scenario2Rajeev.netPayablePaise === 5000, "Rajeev needs to pay Abhijeet ₹50 (5000 paise)");
assert(scenario2Rajeev.netReceivablePaise === 0, "Rajeev does not receive anything from Abhijeet");
assert(scenario2Rajeev.offsetPaise === 10000, "Mutual offset is ₹100 (10000 paise)");

// From Abhijeet's perspective:
const scenario2Abhijeet = calculatePersonNetBreakdown("usr_abhijeet", "usr_rajeev", promptScenario2Expenses);
assert(scenario2Abhijeet.netBalancePaise === 5000, "Abhijeet net balance should be +₹50 (+5000 paise)");
assert(scenario2Abhijeet.netPayablePaise === 0, "Abhijeet does not need to pay Rajeev anything");
assert(scenario2Abhijeet.netReceivablePaise === 5000, "Abhijeet needs to receive ₹50 from Rajeev");

// Rajeev checking his share on the ₹300 expense:
const rajeevShareStatus = getExpenseShareSettlementStatus(exp_abhijeet_paid_300, "usr_rajeev", promptScenario2Expenses);
assert(rajeevShareStatus.canPayNet === true, "Rajeev can pay net");
assert(rajeevShareStatus.netPayablePaise === 5000, "Payable amount is the net ₹50, not gross ₹150");
assert(rajeevShareStatus.isOffsetSettled === false, "Rajeev still has a remaining net obligation of ₹50");

// Abhijeet checking his share on the ₹200 expense:
const abhijeetShareStatus = getExpenseShareSettlementStatus(exp_rajeev_paid_200, "usr_abhijeet", promptScenario2Expenses);
assert(abhijeetShareStatus.canPayNet === false, "Abhijeet does not owe any net amount");
assert(abhijeetShareStatus.isOffsetSettled === true, "Abhijeet's ₹100 share was fully offset by Rajeev's ₹150 debt");

console.log("✓ Prompt Scenario 2 (₹150 vs ₹100 netting to final ₹50 obligation) passed.");

// Test Scope Isolation (Group vs Direct):
const directExpense: Expense = {
  id: "exp_direct_50",
  title: "Direct Lunch",
  amountPaise: 10000,
  payerId: "usr_rajeev",
  payerName: "Rajeev",
  recipientId: "usr_rajeev",
  recipientName: "Rajeev",
  recipientUpiId: "rajeev@upi",
  date: "2026-10-22",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 5000, status: "PAID" },
    { userId: "usr_abhijeet", userName: "Abhijeet", amountPaise: 5000, status: "PENDING" },
  ],
  createdBy: "usr_rajeev",
  createdAt: "2026-10-22T12:00:00.000Z",
};

const mixedExpenses = [...promptScenario2Expenses, directExpense];

// Scoped to group "grp_roommates": direct expense must NOT be included
const groupOnlyBreakdown = calculatePersonNetBreakdown("usr_rajeev", "usr_abhijeet", mixedExpenses, {
  type: "group",
  groupId: "grp_roommates",
});
assert(groupOnlyBreakdown.netPayablePaise === 5000, "Group scope should ignore direct expense: net payable is still ₹50");

// Scoped to "direct": only direct expense should be included
const directOnlyBreakdown = calculatePersonNetBreakdown("usr_rajeev", "usr_abhijeet", mixedExpenses, {
  type: "direct",
});
assert(directOnlyBreakdown.netPayablePaise === 0, "Direct scope: Rajeev is owed ₹50, owes 0");
assert(directOnlyBreakdown.netReceivablePaise === 5000, "Direct scope: Abhijeet owes Rajeev ₹50");

console.log("✓ Settlement Scope Isolation passed.");

console.log("\n🎉 ALL FINANCIAL & INVARIANT BUSINESS LOGIC TESTS PASSED!");
