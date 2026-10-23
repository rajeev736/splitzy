import { Expense, ExpenseShare, SplitType } from "@/lib/types";

export interface BuildExpenseInput {
  expenseType: "group" | "friend" | "personal";
  title: string;
  amountPaise: number;
  date: string;
  notes?: string;
  category?: string;
  
  // Group Expense fields
  groupId?: string;
  groupName?: string;
  groupIcon?: string;

  // Shared Expense fields (Group & Friend)
  payerId?: string;
  payerName?: string;
  recipientId?: string;
  recipientName?: string;
  recipientUpiId?: string;
  splitType?: SplitType;
  shares?: Array<{
    userId: string;
    userName: string;
    userPhoto?: string;
    amountPaise: number;
  }>;

  // Context & Audit
  currentUserUid: string;
  currentUserDisplayName: string;
  currentUserPhotoURL?: string;
  currentUserUpiId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates expense input parameters before document construction.
 */
export function validateExpenseInput(input: BuildExpenseInput): ValidationResult {
  if (!input.title || !input.title.trim()) {
    return { isValid: false, error: "Expense title is required." };
  }

  if (typeof input.amountPaise !== "number" || input.amountPaise <= 0 || !Number.isInteger(input.amountPaise)) {
    return { isValid: false, error: "Total amount must be a valid positive integer in paise." };
  }

  if (!input.date) {
    return { isValid: false, error: "Expense date is required." };
  }

  if (input.expenseType === "group") {
    if (!input.groupId || !input.groupId.trim()) {
      return { isValid: false, error: "A valid group must be selected for group expenses." };
    }
  }

  if (input.expenseType !== "personal") {
    if (!input.payerId) {
      return { isValid: false, error: "Payer information is required for shared expenses." };
    }

    if (!input.shares || input.shares.length === 0) {
      return { isValid: false, error: "At least one participant share is required." };
    }

    let shareSum = 0;
    for (const share of input.shares) {
      if (typeof share.amountPaise !== "number" || share.amountPaise < 0 || !Number.isInteger(share.amountPaise)) {
        return { isValid: false, error: `Invalid share amount for participant ${share.userName}.` };
      }
      shareSum += share.amountPaise;
    }

    if (shareSum !== input.amountPaise) {
      return {
        isValid: false,
        error: `Sum of participant shares (₹${(shareSum / 100).toFixed(2)}) must exactly equal the total expense amount (₹${(input.amountPaise / 100).toFixed(2)}).`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Cleanly strips any undefined properties from an object so Firestore setDoc never encounters undefined.
 */
export function sanitizeForFirestore<T extends object>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;

    if (Array.isArray(val)) {
      sanitized[key] = val.map((item) =>
        item !== null && typeof item === "object"
          ? sanitizeForFirestore(item)
          : item
      );
    } else if (val !== null && typeof val === "object") {
      sanitized[key] = sanitizeForFirestore(val);
    } else {
      sanitized[key] = val;
    }
  }

  // Only undefined-valued keys are dropped, so the result still satisfies T
  return sanitized as T;
}

/** An Expense as written by the builder: participantUids is always populated. */
export type BuiltExpense = Expense & { participantUids: string[] };

/**
 * Builds a validated, clean Firestore Expense document with no undefined fields.
 */
export function buildFirestoreExpense(
  expenseId: string,
  input: BuildExpenseInput
): { expenseDoc: Expense; firestorePayload: BuiltExpense } {
  const validation = validateExpenseInput(input);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const now = new Date().toISOString();
  const trimmedTitle = input.title.trim();
  const trimmedNotes = input.notes?.trim() || "";

  if (input.expenseType === "personal") {
    // Mode C: Personal Expense
    const personalDoc: BuiltExpense = {
      id: expenseId,
      expenseType: "personal",
      isPersonal: true,
      isDirect: false,
      category: input.category?.trim() || "Other",
      title: trimmedTitle,
      amountPaise: input.amountPaise,
      payerId: input.currentUserUid,
      payerName: input.currentUserDisplayName || "You",
      recipientId: input.currentUserUid,
      recipientName: input.currentUserDisplayName || "You",
      recipientUpiId: input.currentUserUpiId || "",
      date: input.date,
      notes: trimmedNotes || undefined,
      splitType: "EQUAL",
      shares: [
        {
          userId: input.currentUserUid,
          userName: input.currentUserDisplayName || "You",
          userPhoto: input.currentUserPhotoURL || undefined,
          amountPaise: input.amountPaise,
          status: "PAID",
        },
      ],
      participantUids: [input.currentUserUid],
      createdBy: input.currentUserUid,
      createdAt: now,
    };

    return {
      expenseDoc: personalDoc,
      firestorePayload: sanitizeForFirestore(personalDoc),
    };
  }

  const isDirect = input.expenseType === "friend";
  const participantUids = Array.from(new Set((input.shares || []).map((s) => s.userId)));

  const cleanShares: ExpenseShare[] = (input.shares || []).map((s) => ({
    userId: s.userId,
    userName: s.userName,
    userPhoto: s.userPhoto || undefined,
    amountPaise: s.amountPaise,
    status: s.userId === input.payerId ? "PAID" : "PENDING",
  }));

  const sharedDoc: BuiltExpense = {
    id: expenseId,
    expenseType: isDirect ? "friend" : "group",
    isPersonal: false,
    isDirect,
    groupId: isDirect ? undefined : input.groupId,
    groupName: isDirect ? undefined : input.groupName || undefined,
    groupIcon: isDirect ? undefined : input.groupIcon || undefined,
    category: input.category?.trim() || (isDirect ? "Friend Split" : "Group Bill"),
    title: trimmedTitle,
    amountPaise: input.amountPaise,
    payerId: input.payerId!,
    payerName: input.payerName || "Payer",
    recipientId: input.recipientId || input.payerId!,
    recipientName: input.recipientName || input.payerName || "Recipient",
    recipientUpiId: input.recipientUpiId?.trim() || "",
    date: input.date,
    notes: trimmedNotes || undefined,
    splitType: input.splitType || "EQUAL",
    shares: cleanShares,
    participantUids,
    createdBy: input.currentUserUid,
    createdAt: now,
  };

  return {
    expenseDoc: sharedDoc,
    firestorePayload: sanitizeForFirestore(sharedDoc),
  };
}
