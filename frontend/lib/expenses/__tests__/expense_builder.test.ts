import {
  buildFirestoreExpense,
  validateExpenseInput,
  sanitizeForFirestore,
  BuildExpenseInput,
} from "../builder";
import { getFriendlyAuthErrorMessage } from "../../firebase/errors";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("Running JoySplit Expense Builder, Sanitization & Auth Error Tests...\n");

// 1. Group Expense: ₹100 with 2 participants (Rajeev & Abhijeet)
console.log("1. Testing Group Expense Creation (₹100 equal split with 2 members):");
const groupInput: BuildExpenseInput = {
  expenseType: "group",
  title: "paratha",
  amountPaise: 10000, // ₹100.00
  date: "2026-10-16",
  notes: "gareeb hoo de do",
  category: "Food",
  groupId: "grp_srm_food",
  groupName: "SRM FOOD SPLIT",
  groupIcon: "/assets/icon_food.jpg",
  payerId: "usr_rajeev",
  payerName: "Rajeev",
  recipientId: "usr_rajeev",
  recipientName: "Rajeev",
  recipientUpiId: "bcasrisant@upi",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 5000 },
    { userId: "usr_abhijeet", userName: "Abhijeet", amountPaise: 5000 },
  ],
  currentUserUid: "usr_rajeev",
  currentUserDisplayName: "Rajeev",
  currentUserUpiId: "bcasrisant@upi",
};

const groupResult = buildFirestoreExpense("exp_1792129431026", groupInput);
assert(groupResult.expenseDoc.id === "exp_1792129431026", "Expense ID must match");
assert(groupResult.expenseDoc.amountPaise === 10000, "Amount must be 10000 paise (₹100)");
assert(groupResult.expenseDoc.shares.length === 2, "Must have 2 shares");
assert(groupResult.expenseDoc.shares[0].amountPaise === 5000, "Rajeev share must be 5000 paise (₹50)");
assert(groupResult.expenseDoc.shares[1].amountPaise === 5000, "Abhijeet share must be 5000 paise (₹50)");
assert(groupResult.expenseDoc.shares[0].status === "PAID", "Payer share must be marked PAID");
assert(groupResult.expenseDoc.shares[1].status === "PENDING", "Participant share must be PENDING");
assert(groupResult.firestorePayload.groupId === "grp_srm_food", "Group ID must be preserved in payload");
assert(groupResult.firestorePayload.category === "Food", "Category must be preserved in payload");
assert(groupResult.firestorePayload.notes === "gareeb hoo de do", "Note must be preserved in payload");
console.log("✓ Group expense builder verified: ₹100 split equally into ₹50 + ₹50 with payer status PAID.");

// 2. Direct Friend Expense (Without Group ID)
console.log("\n2. Testing Direct Friend Expense (No group ID):");
const friendInput: BuildExpenseInput = {
  expenseType: "friend",
  title: "Coffee",
  amountPaise: 20000, // ₹200
  date: "2026-10-16",
  payerId: "usr_rajeev",
  payerName: "Rajeev",
  recipientId: "usr_rajeev",
  recipientName: "Rajeev",
  recipientUpiId: "rajeev@upi",
  splitType: "EQUAL",
  shares: [
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 10000 },
    { userId: "usr_sital", userName: "Sital", amountPaise: 10000 },
  ],
  currentUserUid: "usr_rajeev",
  currentUserDisplayName: "Rajeev",
};

const friendResult = buildFirestoreExpense("exp_friend_1", friendInput);
assert(friendResult.expenseDoc.isDirect === true, "Must be marked as direct");
assert(friendResult.expenseDoc.isPersonal === false, "Must not be personal");
assert(friendResult.firestorePayload.groupId === undefined, "Direct friend expense must NOT have groupId in firestorePayload");
assert(friendResult.firestorePayload.category === "Friend Split", "Default category for friend split must be used");
console.log("✓ Direct friend expense verified without groupId.");

// 3. Personal Expense (Private, no reimbursement, no other participants)
console.log("\n3. Testing Personal Expense (Strictly private):");
const personalInput: BuildExpenseInput = {
  expenseType: "personal",
  title: "Metro Recharge",
  amountPaise: 50000, // ₹500
  date: "2026-10-16",
  category: "Transport",
  currentUserUid: "usr_rajeev",
  currentUserDisplayName: "Rajeev",
};

const personalResult = buildFirestoreExpense("exp_personal_1", personalInput);
assert(personalResult.expenseDoc.isPersonal === true, "Must be personal");
assert(personalResult.expenseDoc.shares.length === 1, "Must have exactly 1 share (owner)");
assert(personalResult.expenseDoc.shares[0].amountPaise === 50000, "Share must equal total amount");
assert(personalResult.expenseDoc.shares[0].status === "PAID", "Personal share must be automatically PAID");
assert(personalResult.firestorePayload.groupId === undefined, "Personal expense must NOT have groupId");
assert(personalResult.firestorePayload.participantUids.length === 1, "Only owner UID in participants");
console.log("✓ Personal expense verified as strictly private.");

// 4. Missing required field validation
console.log("\n4. Testing Validation on Missing Required Fields:");
const emptyTitleRes = validateExpenseInput({
  ...groupInput,
  title: "   ",
});
assert(emptyTitleRes.isValid === false, "Empty title must fail validation");

const zeroAmountRes = validateExpenseInput({
  ...groupInput,
  amountPaise: 0,
});
assert(zeroAmountRes.isValid === false, "Zero amount must fail validation");

const negativeAmountRes = validateExpenseInput({
  ...groupInput,
  amountPaise: -500,
});
assert(negativeAmountRes.isValid === false, "Negative amount must fail validation");

const nonIntegerRes = validateExpenseInput({
  ...groupInput,
  amountPaise: 100.5,
});
assert(nonIntegerRes.isValid === false, "Non-integer paise must fail validation");
console.log("✓ Title, positive integer amount validation passed.");

// 5. Manual Split Shares inequality validation
console.log("\n5. Testing Manual Split Share Sum Mismatch Validation:");
const unequalSharesRes = validateExpenseInput({
  ...groupInput,
  amountPaise: 10000,
  shares: [
    { userId: "usr_rajeev", userName: "Rajeev", amountPaise: 4000 },
    { userId: "usr_abhijeet", userName: "Abhijeet", amountPaise: 5000 },
  ], // Total 9000 != 10000
});
assert(unequalSharesRes.isValid === false, "Shares sum (₹90) not matching total (₹100) must fail validation");
assert(Boolean(unequalSharesRes.error?.includes("must exactly equal")), "Error message must explain mismatch");
console.log("✓ Mismatched manual shares rejected with informative error.");

// 6. Optional notes testing
console.log("\n6. Testing Optional Notes Handling:");
const noNotesInput = { ...groupInput, notes: undefined };
const noNotesResult = buildFirestoreExpense("exp_no_notes", noNotesInput);
assert(noNotesResult.firestorePayload.notes === undefined, "Missing notes must not be present in firestorePayload");

const withNotesInput = { ...groupInput, notes: "Dinner at roadside stall" };
const withNotesResult = buildFirestoreExpense("exp_with_notes", withNotesInput);
assert(withNotesResult.firestorePayload.notes === "Dinner at roadside stall", "Provided notes must be preserved");
console.log("✓ Optional notes properly omitted when missing and preserved when present.");

// 7. Sanitization - Never allow undefined in Firestore
console.log("\n7. Testing sanitizeForFirestore:");
const dirtyPayload = {
  id: "test_1",
  title: "Test",
  category: undefined,
  groupName: undefined,
  metadata: {
    tag: "abc",
    extra: undefined,
  },
  items: [
    { name: "item1", discount: undefined },
    { name: "item2", price: 100 },
  ],
};
const cleaned = sanitizeForFirestore(dirtyPayload);
assert("category" in cleaned === false, "undefined property category must be stripped");
assert("groupName" in cleaned === false, "undefined property groupName must be stripped");
assert("extra" in cleaned.metadata === false, "nested undefined property extra must be stripped");
assert("discount" in cleaned.items[0] === false, "array item undefined property discount must be stripped");
assert(cleaned.items[1].price === 100, "valid values must be retained");
console.log("✓ sanitizeForFirestore successfully removes all undefined values recursively.");

// 8. Authentication Error Message Mapping
console.log("\n8. Testing Authentication Error Code Mapping (Friendly & Account Protection):");
const credErr = { code: "auth/invalid-credential" };
const userNotFoundErr = { code: "auth/user-not-found" };
const wrongPwErr = { code: "auth/wrong-password" };
const tooManyErr = { code: "auth/too-many-requests" };
const networkErr = { code: "auth/network-request-failed" };
const disabledErr = { code: "auth/user-disabled" };

const credMsg = getFriendlyAuthErrorMessage(credErr);
assert(!credMsg.includes("Firebase"), "Must not contain raw Firebase prefix");
assert(!credMsg.includes("auth/"), "Must not contain raw auth error code");
assert(credMsg.includes("Check your email and password"), "Invalid credential must give neutral security message");

const userNotFoundMsg = getFriendlyAuthErrorMessage(userNotFoundErr);
assert(userNotFoundMsg.includes("create an account"), "User not found must suggest creating an account or checking email");

const wrongPwMsg = getFriendlyAuthErrorMessage(wrongPwErr);
assert(wrongPwMsg.includes("email or password is incorrect"), "Wrong password must state email or password is incorrect");

const tooManyMsg = getFriendlyAuthErrorMessage(tooManyErr);
assert(tooManyMsg.includes("Too many unsuccessful attempts"), "Too many requests must advise waiting");

const networkMsg = getFriendlyAuthErrorMessage(networkErr);
assert(networkMsg.includes("connection"), "Network error must mention connection");

const disabledMsg = getFriendlyAuthErrorMessage(disabledErr);
assert(disabledMsg.includes("unavailable"), "Disabled account error must notify account is unavailable");

console.log("✓ Authentication error messages verified: raw codes eliminated, enumeration-protected.");

console.log("\n🎉 ALL EXPENSE BUILDER, SANITIZATION & AUTH ERROR TESTS PASSED SUCCESSFULLY!");
