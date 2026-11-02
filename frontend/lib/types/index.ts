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
  /** Equipped profile frame (lib/fun/catalog FrameId); free or bought with coins. */
  frame?: string;
  /** What they're up to, set by them. */
  mood?: { id: string; at: string };
  /** Shown only when they choose to share it (the year stays private). */
  birthday?: { month: number; day: number };
}

/** Coins (wallets/{uid}). Every change is checked by the security rules. */
export interface Wallet {
  uid: string;
  balance: number;
  /** Premium frames bought. */
  frames: string[];
  /** Reason for the last change, e.g. "frame:laurel", "gift:{friendshipId}:{momentId}". */
  lastTx: string;
  /** Claimed the 10,000-coin welcome bonus. */
  welcomed?: boolean;
  /** Claimed the free welcome frame. */
  welcomeFrame?: boolean;
  /** Lifetime stats for milestone frames (each step checked by the rules). */
  wins?: number;
  played?: number;
  /** Coins won from other players in staked games (net). */
  coinsWon?: number;
  createdAt: string;
}

/** One line of coin history (wallets/{uid}/txs/{id}). */
export interface CoinTx {
  id: string;
  kind: "welcome" | "frame" | "gift" | "stake" | "win" | "refund";
  /** Coins in (+) or out (−). */
  amount: number;
  label: string;
  ref?: string;
  createdAt: string;
}

/** Something one friend sends another (friendships/{id}/moments/{id}). */
export interface Moment {
  id: string;
  type: "hug" | "kiss" | "miss" | "gift" | "wish" | "plan";
  from: string;
  to: string;
  fromName?: string;
  /** Gifts: which one and what it cost. */
  item?: string;
  price?: number;
  note?: string;
  /** Plans: what they're asking for, and the answer. */
  text?: string;
  kind?: string;
  status?: "PENDING" | "YES" | "NO";
  respondedAt?: string;
  createdAt: string;
}

/** One earned achievement (users/{uid}/badges/{type_ref}). */
export interface BadgeEvent {
  id: string;
  type: "swift" | "champ" | "bigheart" | "earlybird";
  ref: string;
  /** Swift Payer: the share index. Early Bird: the member number. */
  i?: number;
  createdAt: string;
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
  lastActivityAt?: string;
  /** The relationship both agreed on (buddy, bestie, love…). */
  bond?: { type: string; since: string };
  /** One asked for a bond; the other can accept. */
  bondRequest?: { type: string; from: string; at: string };
  /** Moments each one has sent: counts[uid][type], gifts as "g_<gift>". */
  counts?: Record<string, Record<string, number>>;
  lastMoment?: { id: string; key: string; by: string; at: string };
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
  | "CHALLENGE_RESULT"
  | "MOMENT"
  | "PLAN"
  | "PLAN_REPLY"
  | "BOND_REQUEST"
  | "BOND_ACCEPTED"
  | "BADGE";

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
  game:
    | "rps"
    | "lucky_number"
    | "coin_toss"
    | "treasure"
    | "minefield"
    | "gold_rush"
    | "penalty"
    | "hilo"
    | "number_hunt";
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
   * Penalty Shootout: 5 shots ("L"/"C"/"R"). Higher or Lower: 5 calls
   * ("H"/"L"). Number Hunt: the numbers guessed, in order.
   */
  moves: Record<string, string[] | number[] | number>;
  /**
   * Grid games and Number Hunt: each player's digs / guesses so far
   * (append-only, one at a time).
   */
  progress?: Record<string, number[]>;
  /**
   * Round games (Stone Paper Scissors, Penalty Shootout, Higher or Lower):
   * each player's picks so far, one round at a time (append-only). Where the
   * host's side has a doc per round, each round's result shows as it's played.
   */
  roundPlays?: Record<string, string[]>;
  result?: {
    winners: string[];
    /** Revealed secret, for showing the outcome. */
    hostMoves?: string[];
    number?: number;
    flips?: string[];
    boxes?: number[];
    /** Grid games: where the bombs / gold were. */
    cells?: number[];
    /** Penalty Shootout: where the keeper dived for each kick. */
    dives?: string[];
    /** Higher or Lower: the 6 cards, in order. */
    cards?: number[];
    winningDistance?: number;
  };
  /** ISO time of the result (stored as a server timestamp). */
  resolvedAt?: string;
  /** Discount each winner actually used when paying (paise). */
  redeemed?: Record<string, number>;
  /** 1-on-1 games for fun: coins each side puts in; the winner takes both. */
  stake?: number;
  /** Who has put their stake in (the host, as the game is created). */
  staked?: string[];
  /** Who has collected their winnings or refund. */
  paidOut?: string[];
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
    /** UPI transaction reference the payer gave for a reported payment. */
    utr?: string;
    /** How a reported payment was made, when not by UPI. */
    method?: "cash";
    /** A reminder to confirm a payment you were told about. */
    awaitingConfirm?: boolean;
    /** Moments, plans and bonds between friends. */
    friendshipId?: string;
    momentId?: string;
    momentType?: string;
    gift?: string;
    bond?: string;
    /** A badge you unlocked, and its tier. */
    badge?: string;
    tier?: number;
    /** A milestone frame you unlocked. */
    frame?: string;
  };
  read: boolean;
  actionTaken?: "CONFIRMED" | "DISPUTED";
  createdAt: string;
}
