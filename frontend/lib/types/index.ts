export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  splitzyId: string; // e.g. JOY-7K9M2Q or SPL-7K9M2Q
  upiId?: string;    // e.g. rajeev@upi
  photoURL?: string;
  onboardingCompleted?: boolean;
  createdAt: string;
  updatedAt?: string;
  /** Friends list only: last activity between you two (or when you became friends). */
  friendActivityAt?: string;
}

export type FriendRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED";

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderSplitzyId: string;
  senderPhoto?: string;
  receiverId: string;
  receiverName: string;
  receiverSplitzyId: string;
  status: FriendRequestStatus;
  /** Set when the request was sent together with a group invitation. */
  groupId?: string;
  groupName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Friendship {
  id: string; // deterministic: [uidA, uidB].sort().join("_")
  userA: string;
  userB: string;
  users: [string, string];
  userProfiles: Record<string, {
    displayName: string;
    splitzyId: string;
    photoURL?: string;
    upiId?: string;
    email?: string;
  }>;
  status: "ACTIVE" | "REMOVED";
  createdAt: string;
  updatedAt?: string;
}

export interface GroupMemberInfo {
  uid: string;
  name: string;
  splitzyId: string;
  photoURL?: string;
  role: "admin" | "member";
}

/** A pending group invitation for one user. */
export interface GroupInviteInfo {
  uid: string;
  name: string;
  splitzyId: string;
  photoURL?: string;
  invitedBy: string;
  invitedByName: string;
  invitedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  icon: string; // icon identifier or asset path
  createdBy: string;
  creatorName?: string;
  members: string[]; // active member UIDs
  formerMembers?: string[]; // departed former member UIDs (preserved for history)
  invitedMembers?: string[]; // pending invited member UIDs
  invitedMemberDetails?: Record<string, GroupInviteInfo>; // who was invited, by whom
  memberDetails: Record<string, GroupMemberInfo>;
  formerMemberDetails?: Record<string, GroupMemberInfo>;
  status?: "ACTIVE" | "ARCHIVED" | "DELETED";
  createdAt: string;
  updatedAt?: string;
}

export type SplitType = "EQUAL" | "MANUAL";
export type SharePaymentStatus = "PENDING" | "PAYMENT_REPORTED" | "PAID" | "DISPUTED";

export interface ExpenseShare {
  userId: string;
  userName: string;
  userPhoto?: string;
  amountPaise: number;
  status: SharePaymentStatus;
  reportedAt?: string;
  confirmedAt?: string;
  paymentProofNote?: string;
  utr?: string;
  /** Person-to-person settlement this share was reported or offset in. */
  settlementId?: string;
  /**
   * Set by the person this share is owed to when they cancel it out against
   * what they owe the share's owner. The owner may then close it (PAID) while
   * confirming that settlement. Security rules enforce who may set it.
   */
  offsetApprovedBy?: string;
  /**
   * Closed for free: the owner won a 100%-off game against the person it's
   * owed to (the challenge id). Security rules check the game.
   */
  waivedByGame?: string;
}

export interface Expense {
  id: string;
  groupId?: string;
  groupName?: string;
  groupIcon?: string;
  expenseType?: "group" | "friend" | "personal";
  isDirect?: boolean;
  isPersonal?: boolean;
  category?: string;
  participantUids?: string[];
  title: string;
  amountPaise: number;
  payerId: string;
  payerName: string;
  recipientId: string;
  recipientName: string;
  recipientUpiId: string;
  date: string;
  notes?: string;
  splitType: SplitType;
  shares: ExpenseShare[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  /** Soft delete: the record stays in history but no longer affects balances. */
  deletedAt?: string;
  deletedBy?: string;
}

export interface Settlement {
  id: string;
  expenseId: string;
  expenseTitle: string;
  groupId?: string;
  groupName?: string;
  payerId: string;
  payerName: string;
  recipientId: string;
  recipientName: string;
  recipientUpiId?: string;
  amountPaise: number;
  status: SharePaymentStatus;
  reportedAt?: string;
  confirmedAt?: string;
  createdAt: string;
}

export type NotificationType =
  | "FRIEND_REQUEST"
  | "FRIEND_ACCEPTED"
  | "FRIEND_REMOVED"
  | "GROUP_INVITE"
  | "GROUP_INVITE_ACCEPTED"
  | "GROUP_ACCEPTED"
  | "GROUP_MEMBER_LEFT"
  | "NEW_EXPENSE"
  | "EXPENSE_DELETED"
  | "PAYMENT_REPORTED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_DISPUTED"
  | "PAYMENT_REMINDER"
  | "CHALLENGE_RECEIVED"
  | "CHALLENGE_RESULT";

/**
 * A game between friends. For a discount game the host is owed money by every
 * player, and winners get `discountPercent` off their `bases` amount if they pay
 * right after the result; `discountPercent` 0 means it's just for fun.
 * The host's secret (RPS moves / lucky number / coin flips / treasure boxes /
 * grid cells) lives in `challenges/{id}/secret/value`, readable by players only
 * once they've played. Grid games also keep one doc per tile in
 * `challenges/{id}/tiles/{n}`, readable once that player has dug it.
 */
export interface Challenge {
  id: string;
  kind: "friend" | "group";
  game: "rps" | "lucky_number" | "coin_toss" | "treasure" | "minefield" | "gold_rush";
  hostId: string;
  hostName: string;
  players: string[];
  playerNames: Record<string, string>;
  /** hostId + players, for queries and read access. */
  participants: string[];
  /** 0 = just for fun. */
  discountPercent: number;
  /** What each player owed the host when the game was set up (paise); 0 in games for fun. */
  bases: Record<string, number>;
  /** Group games: the expense the game was attached to. */
  expenseId?: string;
  expenseTitle?: string;
  groupId?: string;
  groupName?: string;
  status: "OPEN" | "DONE" | "CANCELLED";
  /**
   * RPS: 3 moves. Coin toss: 5 calls ("H"/"T"). Treasure: a box 0–8. Lucky
   * number: a guess. Grid games: the cells dug, in order (set when finished).
   */
  moves: Record<string, string[] | number[] | number>;
  /** Grid games: each player's digs so far (append-only, one tile at a time). */
  progress?: Record<string, number[]>;
  result?: {
    winners: string[];
    /** Revealed secret, for showing the outcome. */
    hostMoves?: string[];
    number?: number;
    flips?: string[];
    boxes?: number[];
    /** Grid games: where the bombs / gold were. */
    cells?: number[];
    winningDistance?: number;
  };
  /** ISO time of the result (stored as a server timestamp). */
  resolvedAt?: string;
  /** Discount each winner actually used when paying (paise). */
  redeemed?: Record<string, number>;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string; // recipient of notification
  title: string;
  message: string;
  type: NotificationType;
  data?: {
    groupId?: string;
    groupName?: string;
    expenseId?: string;
    friendRequestId?: string;
    inviteType?: string;
    actorId?: string;
    actorName?: string;
    amountPaise?: number;
    debtorId?: string;
    creditorId?: string;
    settlementId?: string;
    offsetPaise?: number;
    challengeId?: string;
    /** Game discount applied to a reported settlement. */
    discountPaise?: number;
  };
  read: boolean;
  actionTaken?: "CONFIRMED" | "DISPUTED";
  createdAt: string;
}
