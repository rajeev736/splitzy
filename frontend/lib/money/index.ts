/**
 * JoySplit Integer Paise Money Math & Balance Engine
 * Rules:
 * 1. 1 INR = 100 Paise.
 * 2. All persisted database values must be integer paise.
 * 3. Never use floating point math for balances or split shares.
 * 4. Remainder paise from division are distributed deterministically (+1 paise to first R members).
 * 5. Balances are derived authoritatively from valid expenses and confirmed settlements.
 */

import { Expense, Group, SplitType } from "../types";

export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === "string") {
    // Clean string: remove commas, whitespace, currency symbols
    const clean = rupees.replace(/[^0-9.-]/g, "").trim();
    const parsed = parseFloat(clean);
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  if (isNaN(rupees) || !isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return (paise || 0) / 100;
}

/**
 * Format integer paise into standard Indian Rupee string: e.g. ₹1,200 or ₹450.50
 */
export function formatPaise(paise: number, showDecimalsIfZero = false): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainingPaise = absPaise % 100;

  // Indian Numbering System formatting (e.g. 1,00,000)
  const rupeeString = rupees.toLocaleString("en-IN");

  let formatted = `₹${rupeeString}`;
  if (remainingPaise > 0 || showDecimalsIfZero) {
    formatted += `.${remainingPaise.toString().padStart(2, "0")}`;
  }

  return isNegative ? `-${formatted}` : formatted;
}

/**
 * Format paise for signed display: +₹600 or -₹320 or ₹0
 */
export function formatSignedPaise(paise: number): {
  text: string;
  sign: "+" | "-" | "";
  colorClass: string;
} {
  if (paise > 0) {
    return {
      text: `+${formatPaise(paise)}`,
      sign: "+",
      colorClass: "text-[#10B981]",
    };
  } else if (paise < 0) {
    return {
      text: formatPaise(paise), // already includes minus sign
      sign: "-",
      colorClass: "text-[#EF4444]",
    };
  }
  return {
    text: "₹0",
    sign: "",
    colorClass: "text-[#64748B]",
  };
}

export interface SplitShare {
  userId: string;
  userName: string;
  amountPaise: number;
}

/**
 * Deterministic Equal Split with remainder paise distribution
 * e.g., 1000 paise (₹10) split 3 ways:
 * Base = 333, Remainder = 1
 * Member 1 gets 334, Member 2 gets 333, Member 3 gets 333. Total = 1000 paise exact.
 */
export function calculateEqualSplit(
  totalPaise: number,
  participants: Array<{ id: string; name: string }>
): SplitShare[] {
  if (!participants || participants.length === 0) return [];
  if (totalPaise <= 0) {
    return participants.map((p) => ({
      userId: p.id,
      userName: p.name,
      amountPaise: 0,
    }));
  }

  const count = participants.length;
  const baseShare = Math.floor(totalPaise / count);
  const remainder = totalPaise % count;

  return participants.map((p, index) => {
    // Distribute remainder 1 paise each to the first 'remainder' participants
    const share = baseShare + (index < remainder ? 1 : 0);
    return {
      userId: p.id,
      userName: p.name,
      amountPaise: share,
    };
  });
}

/**
 * Validates manual split shares sum to total paise
 */
export function validateManualSplit(
  totalPaise: number,
  shares: SplitShare[]
): {
  isValid: boolean;
  differencePaise: number;
  message?: string;
} {
  const currentTotal = shares.reduce((acc, curr) => acc + (curr.amountPaise || 0), 0);
  const diff = totalPaise - currentTotal;

  if (diff === 0) {
    return { isValid: true, differencePaise: 0 };
  } else if (diff > 0) {
    return {
      isValid: false,
      differencePaise: diff,
      message: `${formatPaise(diff)} remaining to allocate`,
    };
  } else {
    return {
      isValid: false,
      differencePaise: diff,
      message: `${formatPaise(Math.abs(diff))} over total amount`,
    };
  }
}

/** One outstanding obligation produced by an expense: `fromUserId` owes `toUserId`. */
export interface Debt {
  fromUserId: string;
  toUserId: string;
  amountPaise: number;
}

/**
 * Single source of truth for "who owes whom" in an expense. Every balance
 * function below is built on this, so the dashboard, friend balances and group
 * balances can never disagree.
 *
 * - Personal expenses create no debts.
 * - Each unpaid share is owed to the expense's creditor: the recipient (where
 *   repayments go), falling back to the payer.
 * - If the unpaid share belongs to the recipient themself while someone else
 *   paid, it is owed to the payer instead (nobody owes themself).
 */
export function getExpenseDebts(exp: Expense): Debt[] {
  if (exp.deletedAt) return [];
  if (exp.isPersonal || exp.expenseType === "personal") return [];

  const creditor = exp.recipientId || exp.payerId;
  const debts: Debt[] = [];

  for (const share of exp.shares || []) {
    if (share.status === "PAID" || share.amountPaise <= 0) continue;
    const toUserId = share.userId === creditor ? exp.payerId : creditor;
    if (!toUserId || toUserId === share.userId) continue;
    debts.push({ fromUserId: share.userId, toUserId, amountPaise: share.amountPaise });
  }
  return debts;
}

/**
 * Authoritatively calculates net balances for a given user across a list of expenses.
 */
export function calculateNetBalances(
  userId: string,
  expenses: Expense[]
): {
  netBalancePaise: number;
  totalOwedToYouPaise: number;
  totalYouOwePaise: number;
} {
  if (!userId || !expenses) {
    return { netBalancePaise: 0, totalOwedToYouPaise: 0, totalYouOwePaise: 0 };
  }

  // Member-by-member net balances so mutual reciprocal debts cancel out (split-to-split cancel)
  const personBalances = calculatePersonBalances(userId, expenses);
  let totalOwedToYouPaise = 0;
  let totalYouOwePaise = 0;

  for (const pb of personBalances) {
    if (pb.netBalancePaise > 0) totalOwedToYouPaise += pb.netBalancePaise;
    else if (pb.netBalancePaise < 0) totalYouOwePaise += Math.abs(pb.netBalancePaise);
  }

  return {
    netBalancePaise: totalOwedToYouPaise - totalYouOwePaise,
    totalOwedToYouPaise,
    totalYouOwePaise,
  };
}

export interface PersonBalance {
  userId: string;
  name: string;
  photoURL?: string;
  /** positive: they owe you; negative: you owe them */
  netBalancePaise: number;
}

/**
 * Net balance with every person the user shares an expense with — friends or
 * not (e.g. group members). Sums to `calculateNetBalances(...).netBalancePaise`.
 */
export function calculatePersonBalances(userId: string, expenses: Expense[]): PersonBalance[] {
  const people = new Map<string, PersonBalance>();
  const names = new Map<string, { name: string; photoURL?: string }>();

  for (const exp of expenses) {
    if (!names.has(exp.payerId)) names.set(exp.payerId, { name: exp.payerName });
    if (exp.recipientId && !names.has(exp.recipientId)) names.set(exp.recipientId, { name: exp.recipientName });
    for (const s of exp.shares || []) names.set(s.userId, { name: s.userName, photoURL: s.userPhoto });

    for (const debt of getExpenseDebts(exp)) {
      const other =
        debt.toUserId === userId ? debt.fromUserId : debt.fromUserId === userId ? debt.toUserId : null;
      if (!other) continue;
      const signed = debt.toUserId === userId ? debt.amountPaise : -debt.amountPaise;
      const row = people.get(other) ?? { userId: other, name: "", netBalancePaise: 0 };
      row.netBalancePaise += signed;
      people.set(other, row);
    }
  }

  return Array.from(people.values())
    .map((row) => ({ ...row, name: names.get(row.userId)?.name || "Member", photoURL: names.get(row.userId)?.photoURL }))
    .filter((row) => row.netBalancePaise !== 0)
    .sort((a, b) => Math.abs(b.netBalancePaise) - Math.abs(a.netBalancePaise));
}

/**
 * Calculates direct net balance between two users.
 * Returns positive if userB owes userA, negative if userA owes userB.
 */
export function calculateDirectBalance(
  userA: string,
  userB: string,
  expenses: Expense[]
): {
  netBalancePaise: number; // positive: userB owes userA; negative: userA owes userB
  userBOwesUserAPaise: number;
  userAOwesUserBPaise: number;
} {
  let userBOwesUserAPaise = 0;
  let userAOwesUserBPaise = 0;

  for (const exp of expenses) {
    for (const debt of getExpenseDebts(exp)) {
      if (debt.fromUserId === userB && debt.toUserId === userA) userBOwesUserAPaise += debt.amountPaise;
      if (debt.fromUserId === userA && debt.toUserId === userB) userAOwesUserBPaise += debt.amountPaise;
    }
  }

  return {
    netBalancePaise: userBOwesUserAPaise - userAOwesUserBPaise,
    userBOwesUserAPaise,
    userAOwesUserBPaise,
  };
}

/**
 * Checks whether a user can safely remove a friend.
 * Blocks if there are any unsettled direct or shared balances between them.
 */
export function canRemoveFriend(
  userA: string,
  userB: string,
  expenses: Expense[]
): {
  allowed: boolean;
  canRemove: boolean;
  reason?: string;
  warning?: string;
  unsettledPaise: number;
} {
  const direct = calculateDirectBalance(userA, userB, expenses);

  // If current user owes the friend net money -> Strictly block removal!
  if (direct.netBalancePaise < 0) {
    const amount = Math.abs(direct.netBalancePaise);
    return {
      allowed: false,
      canRemove: false,
      reason: `You owe ${formatPaise(amount)} to this friend. You must settle this debt before removing them.`,
      unsettledPaise: amount,
    };
  }

  // If friend owes current user net money -> Allow removal but clearly warn that the receivable remains outstanding!
  if (direct.netBalancePaise > 0) {
    return {
      allowed: true,
      canRemove: true,
      warning: `This friend still owes you ${formatPaise(direct.netBalancePaise)}. Historical records will be preserved and you can still track or settle this balance later.`,
      unsettledPaise: direct.netBalancePaise,
    };
  }

  return { allowed: true, canRemove: true, unsettledPaise: 0 };
}

/**
 * Calculates a member's net balance within a specific group.
 */
export function calculateMemberGroupBalance(
  userId: string,
  groupId: string,
  expenses: Expense[]
): {
  owedToUserPaise: number; // what others in group owe this user
  userOwesPaise: number;   // what this user owes others in group
  netPaise: number;
  allSettled: boolean;
} {
  let owedToUserPaise = 0;
  let userOwesPaise = 0;

  for (const exp of expenses) {
    if (exp.groupId !== groupId) continue;
    for (const debt of getExpenseDebts(exp)) {
      if (debt.toUserId === userId) owedToUserPaise += debt.amountPaise;
      if (debt.fromUserId === userId) userOwesPaise += debt.amountPaise;
    }
  }

  return {
    owedToUserPaise,
    userOwesPaise,
    netPaise: owedToUserPaise - userOwesPaise,
    allSettled: owedToUserPaise === 0 && userOwesPaise === 0,
  };
}

/**
 * Checks whether a user can safely leave a group.
 * Creator cannot leave without transfer/delete.
 * Non-zero balance in either direction blocks leaving.
 */
export function canUserLeaveGroup(
  userId: string,
  group: Group,
  expenses: Expense[]
): {
  allowed: boolean;
  canLeave: boolean;
  reason?: string;
  owedToUserPaise: number;
  userOwesPaise: number;
} {
  if (group.createdBy === userId) {
    return {
      allowed: false,
      canLeave: false,
      reason: "As the group creator, you cannot leave the group. You must transfer group ownership or delete the group.",
      owedToUserPaise: 0,
      userOwesPaise: 0,
    };
  }

  const { owedToUserPaise, userOwesPaise } = calculateMemberGroupBalance(
    userId,
    group.id,
    expenses
  );

  if (owedToUserPaise > 0 || userOwesPaise > 0) {
    const reasonParts = [];
    if (userOwesPaise > 0) {
      reasonParts.push(`You owe ${formatPaise(userOwesPaise)} in this group`);
    }
    if (owedToUserPaise > 0) {
      reasonParts.push(`You are owed ${formatPaise(owedToUserPaise)} by group members`);
    }

    return {
      allowed: false,
      canLeave: false,
      reason: `Cannot leave group while balances remain. ${reasonParts.join(" and ")}. Please settle all balances before leaving.`,
      owedToUserPaise,
      userOwesPaise,
    };
  }

  return {
    allowed: true,
    canLeave: true,
    owedToUserPaise: 0,
    userOwesPaise: 0,
  };
}

/**
 * Checks whether the creator can delete a group.
 * Blocks if any member has an unsettled amount or pending payment dispute.
 */
export function canDeleteGroup(
  userId: string,
  group: Group,
  expenses: Expense[]
): {
  allowed: boolean;
  canDelete: boolean;
  reason?: string;
  unsettledExpensesCount: number;
  unsettledPaiseTotal: number;
} {
  if (group.createdBy !== userId) {
    return {
      allowed: false,
      canDelete: false,
      reason: "Only the group creator can delete this group.",
      unsettledExpensesCount: 0,
      unsettledPaiseTotal: 0,
    };
  }

  const groupExpenses = expenses.filter((e) => e.groupId === group.id && !e.deletedAt);
  let unsettledExpensesCount = 0;
  let unsettledPaiseTotal = 0;
  let hasPendingDispute = false;

  groupExpenses.forEach((exp) => {
    let expUnsettled = false;
    exp.shares.forEach((share) => {
      if (share.status !== "PAID") {
        expUnsettled = true;
        unsettledPaiseTotal += share.amountPaise;
      }
      if (share.status === "DISPUTED" || share.status === "PAYMENT_REPORTED") {
        hasPendingDispute = true;
      }
    });
    if (expUnsettled) {
      unsettledExpensesCount++;
    }
  });

  if (unsettledPaiseTotal > 0 || hasPendingDispute) {
    return {
      allowed: false,
      canDelete: false,
      reason: `Cannot delete group: There are ${unsettledExpensesCount} unsettled expenses totaling ${formatPaise(unsettledPaiseTotal)}${
        hasPendingDispute ? " and unresolved payment reports/disputes" : ""
      }. All members must settle up before deleting.`,
      unsettledExpensesCount,
      unsettledPaiseTotal,
    };
  }

  return {
    allowed: true,
    canDelete: true,
    unsettledExpensesCount: 0,
    unsettledPaiseTotal: 0,
  };
}
