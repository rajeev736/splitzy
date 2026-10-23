/**
 * JoySplit Integer Paise Money Math & Balance Engine
 * Rules:
 * 1. 1 INR = 100 Paise.
 * 2. All persisted database values must be integer paise.
 * 3. Never use floating point math for balances or split shares.
 * 4. Remainder paise from division are distributed deterministically (+1 paise to first R members).
 * 5. Balances are derived authoritatively from valid expenses and confirmed settlements.
 */

import { Expense, Group, SharePaymentStatus } from "../types";

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
 * Who a share is owed to: the expense's creditor (recipient, falling back to
 * the payer), or the payer when the share belongs to the recipient themself.
 * Only this person may confirm or dispute the share — Firestore rules mirror it.
 */
export function payeeOf(exp: Pick<Expense, "recipientId" | "payerId">, shareUserId: string): string {
  const creditor = exp.recipientId || exp.payerId;
  return shareUserId === creditor ? exp.payerId : creditor;
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

  const debts: Debt[] = [];

  for (const share of exp.shares || []) {
    if (share.status === "PAID" || share.amountPaise <= 0) continue;
    const toUserId = payeeOf(exp, share.userId);
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

export type SettlementScope =
  | { type: "all" }
  | { type: "group"; groupId: string; groupName?: string }
  | { type: "direct" }
  | { type: "contexts"; contextKeys: string[] }

export function filterExpensesByScope(expenses: Expense[], scope?: SettlementScope): Expense[] {
  if (!scope || scope.type === "all") return expenses.filter((e) => !e.deletedAt)
  if (scope.type === "group") return expenses.filter((e) => !e.deletedAt && e.groupId === scope.groupId)
  if (scope.type === "direct") {
    return expenses.filter((e) => !e.deletedAt && (!e.groupId || e.expenseType === "friend" || e.isDirect))
  }
  if (scope.type === "contexts") {
    return expenses.filter((e) => !e.deletedAt && scope.contextKeys.includes(e.groupId || "direct"))
  }
  return expenses.filter((e) => !e.deletedAt)
}

export interface PersonBalance {
  userId: string;
  name: string;
  photoURL?: string;
  upiId?: string;
  subtitle?: string;
  /** positive: they owe you; negative: you owe them */
  netBalancePaise: number;
}

/**
 * Net balance with every person the user shares an expense with — friends or
 * not (e.g. group members). Sums to `calculateNetBalances(...).netBalancePaise`.
 * Optionally scoped to a specific group or direct splits.
 */
export function calculatePersonBalances(
  userId: string,
  expenses: Expense[],
  scope?: SettlementScope
): PersonBalance[] {
  const scopedExpenses = filterExpensesByScope(expenses, scope);
  const people = new Map<string, PersonBalance>();
  const names = new Map<string, { name: string; photoURL?: string; upiId?: string }>();

  for (const exp of scopedExpenses) {
    if (!names.has(exp.payerId)) {
      names.set(exp.payerId, {
        name: exp.payerName,
        upiId: exp.recipientId === exp.payerId ? exp.recipientUpiId : undefined,
      });
    }
    if (exp.recipientId && !names.has(exp.recipientId)) {
      names.set(exp.recipientId, { name: exp.recipientName, upiId: exp.recipientUpiId });
    }
    for (const s of exp.shares || []) {
      const existing = names.get(s.userId);
      names.set(s.userId, {
        name: s.userName || existing?.name || "Member",
        photoURL: s.userPhoto || existing?.photoURL,
        upiId: existing?.upiId,
      });
    }

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
    .map((row) => {
      const info = names.get(row.userId);
      return {
        ...row,
        name: info?.name || "Member",
        photoURL: info?.photoURL,
        upiId: info?.upiId,
      };
    })
    .filter((row) => row.netBalancePaise !== 0)
    .sort((a, b) => Math.abs(b.netBalancePaise) - Math.abs(a.netBalancePaise));
}

/**
 * Calculates direct net balance between two users within a given scope.
 * Returns positive if userB owes userA, negative if userA owes userB.
 */
export function calculateDirectBalance(
  userA: string,
  userB: string,
  expenses: Expense[],
  scope?: SettlementScope
): {
  netBalancePaise: number; // positive: userB owes userA; negative: userA owes userB
  userBOwesUserAPaise: number;
  userAOwesUserBPaise: number;
} {
  const scopedExpenses = filterExpensesByScope(expenses, scope);
  let userBOwesUserAPaise = 0;
  let userAOwesUserBPaise = 0;

  for (const exp of scopedExpenses) {
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

export interface ExpenseDebtDetail {
  expense: Expense;
  amountPaise: number;
  status: SharePaymentStatus;
  isOffset?: boolean;
  label?: string;
}

export interface PersonNetBreakdown {
  userA: string;
  userB: string;
  userBName: string;
  userBPhoto?: string;
  userBUpiId?: string;
  /** Gross obligations userA owes to userB */
  aOwesBTotalPaise: number;
  /** Gross obligations userB owes to userA */
  bOwesATotalPaise: number;
  /** Reciprocal mutual offset that cancels out automatically */
  offsetPaise: number;
  /**
   * Net balance from userA's perspective:
   * > 0: userB owes userA
   * < 0: userA owes userB
   * == 0: balanced
   */
  netBalancePaise: number;
  /** Positive number: net amount userA needs to pay userB */
  netPayablePaise: number;
  /** Positive number: net amount userB needs to pay userA */
  netReceivablePaise: number;
  /** Breakdown lines of expenses userA owes to userB */
  aOwesBLines: ExpenseDebtDetail[];
  /** Breakdown lines of expenses userB owes to userA */
  bOwesALines: ExpenseDebtDetail[];
  /** Context breakdown by group / direct */
  contexts: {
    key: string;
    label: string;
    groupId?: string;
    netPaise: number;
    aOwesBPaise: number;
    bOwesAPaise: number;
  }[];
  hasPendingReport: boolean;
  pendingReportedAmountPaise: number;
}

/**
 * Authoritative PhonePe-style person-to-person net settlement breakdown.
 * Offsets reciprocal obligations between userA and userB, producing one
 * final net obligation and complete itemized audit trail.
 */
export function calculatePersonNetBreakdown(
  userA: string,
  userB: string,
  expenses: Expense[],
  scope?: SettlementScope
): PersonNetBreakdown {
  const scopedExpenses = filterExpensesByScope(expenses, scope);
  const aOwesBLines: ExpenseDebtDetail[] = [];
  const bOwesALines: ExpenseDebtDetail[] = [];

  let userBName = "Member";
  let userBPhoto: string | undefined;
  let userBUpiId: string | undefined;
  let hasPendingReport = false;
  let pendingReportedAmountPaise = 0;

  const contextMap = new Map<
    string,
    { key: string; label: string; groupId?: string; aOwesBPaise: number; bOwesAPaise: number }
  >();

  for (const exp of scopedExpenses) {
    if (exp.payerId === userB) {
      userBName = exp.payerName;
      if (exp.recipientId === userB && exp.recipientUpiId) userBUpiId = exp.recipientUpiId;
    }
    if (exp.recipientId === userB) {
      userBName = exp.recipientName;
      if (exp.recipientUpiId) userBUpiId = exp.recipientUpiId;
    }

    const shareB = exp.shares?.find((s) => s.userId === userB);
    if (shareB) {
      if (shareB.userName) userBName = shareB.userName;
      if (shareB.userPhoto) userBPhoto = shareB.userPhoto;
    }

    const debts = getExpenseDebts(exp);
    for (const debt of debts) {
      const isAtoB = debt.fromUserId === userA && debt.toUserId === userB;
      const isBtoA = debt.fromUserId === userB && debt.toUserId === userA;

      if (!isAtoB && !isBtoA) continue;

      const matchingShare = exp.shares?.find((s) => s.userId === debt.fromUserId);
      const shareStatus = matchingShare?.status || "PENDING";

      if (shareStatus === "PAYMENT_REPORTED") {
        hasPendingReport = true;
        if (isAtoB) pendingReportedAmountPaise += debt.amountPaise;
      }

      const ctxKey = exp.groupId || "direct";
      const ctxLabel = exp.groupName || (exp.groupId ? "Group Expense" : "Direct Split");
      const ctxEntry = contextMap.get(ctxKey) ?? {
        key: ctxKey,
        label: ctxLabel,
        groupId: exp.groupId,
        aOwesBPaise: 0,
        bOwesAPaise: 0,
      };

      if (isAtoB) {
        aOwesBLines.push({
          expense: exp,
          amountPaise: debt.amountPaise,
          status: shareStatus,
        });
        ctxEntry.aOwesBPaise += debt.amountPaise;
      } else {
        bOwesALines.push({
          expense: exp,
          amountPaise: debt.amountPaise,
          status: shareStatus,
        });
        ctxEntry.bOwesAPaise += debt.amountPaise;
      }

      contextMap.set(ctxKey, ctxEntry);
    }
  }

  // Sort debts oldest first for deterministic allocation and display
  aOwesBLines.sort(
    (a, b) => new Date(a.expense.createdAt).getTime() - new Date(b.expense.createdAt).getTime()
  );
  bOwesALines.sort(
    (a, b) => new Date(a.expense.createdAt).getTime() - new Date(b.expense.createdAt).getTime()
  );

  const aOwesBTotalPaise = aOwesBLines.reduce((sum, line) => sum + line.amountPaise, 0);
  const bOwesATotalPaise = bOwesALines.reduce((sum, line) => sum + line.amountPaise, 0);
  const offsetPaise = Math.min(aOwesBTotalPaise, bOwesATotalPaise);
  const netBalancePaise = bOwesATotalPaise - aOwesBTotalPaise;
  const netPayablePaise = netBalancePaise < 0 ? Math.abs(netBalancePaise) : 0;
  const netReceivablePaise = netBalancePaise > 0 ? netBalancePaise : 0;

  const contexts = Array.from(contextMap.values()).map((c) => ({
    ...c,
    netPaise: c.bOwesAPaise - c.aOwesBPaise,
  }));

  return {
    userA,
    userB,
    userBName,
    userBPhoto,
    userBUpiId,
    aOwesBTotalPaise,
    bOwesATotalPaise,
    offsetPaise,
    netBalancePaise,
    netPayablePaise,
    netReceivablePaise,
    aOwesBLines,
    bOwesALines,
    contexts,
    hasPendingReport,
    pendingReportedAmountPaise,
  };
}

/**
 * Checks an individual expense share against the pair's net balance.
 * Determines whether this share is already offset by reciprocal debts (net balance <= 0),
 * or requires paying a net balance.
 */
export function getExpenseShareSettlementStatus(
  expense: Expense,
  userUid: string,
  expenses: Expense[],
  scope?: SettlementScope
) {
  const isPayer = expense.payerId === userUid;
  const creditorId = expense.recipientId || expense.payerId;
  const isCreditor = creditorId === userUid;
  const creditorName = expense.recipientId === expense.payerId ? expense.payerName : expense.recipientName;
  const creditorUpiId = expense.recipientUpiId || "";

  const myShare = expense.shares?.find((s) => s.userId === userUid);
  const mySharePaise = myShare?.amountPaise || 0;
  const shareStatus: SharePaymentStatus = myShare?.status || "PENDING";
  const isPaid = shareStatus === "PAID";
  const isReported = shareStatus === "PAYMENT_REPORTED";
  const isDisputed = shareStatus === "DISPUTED";

  if (isPayer || isCreditor || !myShare || isPaid) {
    return {
      isPayer,
      isCreditor,
      creditorId,
      creditorName,
      creditorUpiId,
      creditorPhoto: undefined,
      mySharePaise,
      shareStatus,
      isPaid,
      isReported,
      isDisputed,
      netBalanceWithCreditorPaise: 0,
      isOffsetSettled: isPaid,
      netPayablePaise: 0,
      canPayNet: false,
    };
  }

  // Calculate true person-to-person net balance with creditor across all mutual expenses (group + personal)
  const breakdown = calculatePersonNetBreakdown(userUid, creditorId, expenses, scope);
  const netPayablePaise = breakdown.netPayablePaise;
  // If user doesn't owe net money to the creditor (e.g. netBalance >= 0),
  // this obligation is completely balanced out by reciprocal splits!
  const isOffsetSettled = netPayablePaise === 0;

  return {
    isPayer,
    isCreditor,
    creditorId,
    creditorName: breakdown.userBName || creditorName,
    creditorUpiId: breakdown.userBUpiId || creditorUpiId,
    creditorPhoto: breakdown.userBPhoto,
    mySharePaise,
    shareStatus,
    isPaid,
    isReported,
    isDisputed,
    netBalanceWithCreditorPaise: breakdown.netBalancePaise,
    isOffsetSettled,
    netPayablePaise,
    canPayNet: !isPaid && netPayablePaise > 0,
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

/** One person's balance with you inside one context (a group, or "direct"). */
export interface ContextBalance {
  userId: string;
  contextKey: string;
  /** What this context alone says (> 0: they owe you). */
  grossPaise: number;
  /**
   * The part of `grossPaise` that is real money after netting across every
   * context with this person — what actually has to be paid here.
   */
  effectivePaise: number;
  /** The part cancelled out by opposite balances in other contexts. */
  offsetPaise: number;
}

/**
 * PhonePe-style single source of truth: money only moves for the *overall*
 * net between two people. That net is shared out across the contexts that
 * point the same way (largest first); contexts pointing the other way are
 * fully cancelled out. So a group never asks you to pay what your direct
 * splits with the same person already cancel.
 *
 * e.g. Abhijeet owes Rajeev ₹50 directly, Rajeev owes Abhijeet ₹50 in a group
 * → overall ₹0 → the group shows ₹0 to pay, ₹50 cancelled out.
 */
export function allocatePersonNetAcrossContexts(
  userId: string,
  otherId: string,
  expenses: Expense[]
): ContextBalance[] {
  const breakdown = calculatePersonNetBreakdown(userId, otherId, expenses);
  const overall = breakdown.netBalancePaise;
  const sign = Math.sign(overall);
  let remaining = Math.abs(overall);

  const sameWay = breakdown.contexts
    .filter((c) => sign !== 0 && Math.sign(c.netPaise) === sign)
    .sort((a, b) => Math.abs(b.netPaise) - Math.abs(a.netPaise) || a.key.localeCompare(b.key));
  const effective = new Map<string, number>();
  for (const c of sameWay) {
    const take = Math.min(Math.abs(c.netPaise), remaining);
    effective.set(c.key, take * sign);
    remaining -= take;
  }

  return breakdown.contexts.map((c) => {
    const eff = effective.get(c.key) ?? 0;
    return {
      userId: otherId,
      contextKey: c.key,
      grossPaise: c.netPaise,
      effectivePaise: eff,
      offsetPaise: Math.abs(c.netPaise) - Math.abs(eff),
    };
  });
}

/**
 * You've reported paying everything you owe this person (in scope) and are
 * waiting for them to confirm — show "Waiting for confirmation" instead of Pay.
 */
export function isAwaitingConfirmation(
  userId: string,
  creditorId: string,
  expenses: Expense[],
  scope?: SettlementScope
): boolean {
  const lines = calculatePersonNetBreakdown(userId, creditorId, expenses, scope).aOwesBLines;
  return lines.length > 0 && lines.every((l) => l.status === "PAYMENT_REPORTED");
}

/**
 * True while a cancel-out between the two is waiting for confirmation: a share
 * is reported or approved for cancelling out under a settlement.
 */
export function isCancelOutPending(userId: string, otherId: string, expenses: Expense[]): boolean {
  return expenses.some(
    (e) =>
      !e.deletedAt &&
      e.shares?.some(
        (s) =>
          !!s.settlementId &&
          s.status !== "PAID" &&
          (s.status === "PAYMENT_REPORTED" || !!s.offsetApprovedBy) &&
          ((s.userId === userId && payeeOf(e, s.userId) === otherId) ||
            (s.userId === otherId && payeeOf(e, s.userId) === userId))
      )
  );
}

/** Everyone you have an open balance with inside a group, netted across all contexts. */
export function calculateGroupCounterpartyBalances(
  userId: string,
  groupId: string,
  expenses: Expense[]
): ContextBalance[] {
  const counterparties = new Set<string>();
  for (const exp of expenses) {
    if (exp.deletedAt || exp.groupId !== groupId) continue;
    for (const debt of getExpenseDebts(exp)) {
      if (debt.toUserId === userId && debt.fromUserId !== userId) counterparties.add(debt.fromUserId);
      if (debt.fromUserId === userId && debt.toUserId !== userId) counterparties.add(debt.toUserId);
    }
  }

  const rows: ContextBalance[] = [];
  for (const other of counterparties) {
    const row = allocatePersonNetAcrossContexts(userId, other, expenses).find((c) => c.contextKey === groupId);
    if (row && row.grossPaise !== 0) rows.push(row);
  }
  return rows;
}

/**
 * A member's balance within a group. Amounts are what really has to be paid
 * after netting with the same people's other splits; `offsetPaise` is the
 * group balance that other splits cancel out (closed with "Cancel out").
 * Pass every expense you have, not just the group's, so netting can happen.
 */
export function calculateMemberGroupBalance(
  userId: string,
  groupId: string,
  expenses: Expense[]
): {
  owedToUserPaise: number; // what others in group really owe this user
  userOwesPaise: number;   // what this user really owes others in group
  netPaise: number;
  /** Group balance cancelled out by the same people's other splits. */
  offsetPaise: number;
  allSettled: boolean;
} {
  let owedToUserPaise = 0;
  let userOwesPaise = 0;
  let offsetPaise = 0;

  for (const row of calculateGroupCounterpartyBalances(userId, groupId, expenses)) {
    if (row.effectivePaise > 0) owedToUserPaise += row.effectivePaise;
    else userOwesPaise += -row.effectivePaise;
    offsetPaise += row.offsetPaise;
  }

  return {
    owedToUserPaise,
    userOwesPaise,
    netPaise: owedToUserPaise - userOwesPaise,
    offsetPaise,
    allSettled: owedToUserPaise === 0 && userOwesPaise === 0,
  };
}

/**
 * Checks whether a user can safely leave a group.
 * A creator who leaves hands ownership to the next member; a sole member must delete instead.
 * Non-creator members can leave freely even with unsettled balances
 * (debts remain tracked in person-to-person split summary).
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
  // The creator can leave when someone else can take the group over
  if (group.createdBy === userId && group.members.filter((m) => m !== userId).length === 0) {
    return {
      allowed: false,
      canLeave: false,
      reason: "You are the only member. Delete the group instead.",
      owedToUserPaise: 0,
      userOwesPaise: 0,
    };
  }

  const { owedToUserPaise, userOwesPaise } = calculateMemberGroupBalance(
    userId,
    group.id,
    expenses
  );

  return {
    allowed: true,
    canLeave: true,
    owedToUserPaise,
    userOwesPaise,
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
