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
  let totalOwedToYouPaise = 0;
  let totalYouOwePaise = 0;

  if (!userId || !expenses) {
    return { netBalancePaise: 0, totalOwedToYouPaise: 0, totalYouOwePaise: 0 };
  }

  expenses.forEach((exp) => {
    // Personal expenses are private and do not affect shared balances
    if (exp.isPersonal || exp.expenseType === "personal") {
      return;
    }

    const isPayerOrRecipient = exp.payerId === userId || exp.recipientId === userId;

    if (isPayerOrRecipient) {
      // Others owe user for their unpaid shares
      exp.shares.forEach((share) => {
        if (share.userId !== userId && share.status !== "PAID") {
          totalOwedToYouPaise += share.amountPaise;
        }
      });
    } else {
      // User may owe the payer for their share
      const myShare = exp.shares.find((s) => s.userId === userId);
      if (myShare && myShare.status !== "PAID") {
        totalYouOwePaise += myShare.amountPaise;
      }
    }
  });

  return {
    netBalancePaise: totalOwedToYouPaise - totalYouOwePaise,
    totalOwedToYouPaise,
    totalYouOwePaise,
  };
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

  expenses.forEach((exp) => {
    // Skip personal expenses
    if (exp.isPersonal || exp.expenseType === "personal") {
      return;
    }
    // Check if userA was payer/recipient and userB had an unpaid share
    if (exp.payerId === userA || exp.recipientId === userA) {
      const shareB = exp.shares.find((s) => s.userId === userB);
      if (shareB && shareB.status !== "PAID") {
        userBOwesUserAPaise += shareB.amountPaise;
      }
    }

    // Check if userB was payer/recipient and userA had an unpaid share
    if (exp.payerId === userB || exp.recipientId === userB) {
      const shareA = exp.shares.find((s) => s.userId === userA);
      if (shareA && shareA.status !== "PAID") {
        userAOwesUserBPaise += shareA.amountPaise;
      }
    }
  });

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

  // If current user owes the friend money -> Strictly block removal!
  if (direct.userAOwesUserBPaise > 0) {
    return {
      allowed: false,
      canRemove: false,
      reason: `You owe ${formatPaise(direct.userAOwesUserBPaise)} to this friend. You must settle this debt before removing them.`,
      unsettledPaise: direct.userAOwesUserBPaise,
    };
  }

  // If friend owes current user money -> Allow removal but clearly warn that the receivable remains outstanding!
  if (direct.userBOwesUserAPaise > 0) {
    return {
      allowed: true,
      canRemove: true,
      warning: `This friend still owes you ${formatPaise(direct.userBOwesUserAPaise)}. Historical records will be preserved and you can still track or settle this balance later.`,
      unsettledPaise: direct.userBOwesUserAPaise,
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

  const groupExpenses = expenses.filter((e) => e.groupId === groupId);

  groupExpenses.forEach((exp) => {
    if (exp.payerId === userId || exp.recipientId === userId) {
      exp.shares.forEach((s) => {
        if (s.userId !== userId && s.status !== "PAID") {
          owedToUserPaise += s.amountPaise;
        }
      });
    } else {
      const myShare = exp.shares.find((s) => s.userId === userId);
      if (myShare && myShare.status !== "PAID") {
        userOwesPaise += myShare.amountPaise;
      }
    }
  });

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

  const groupExpenses = expenses.filter((e) => e.groupId === group.id);
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
