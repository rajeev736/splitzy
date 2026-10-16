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
  | "PAYMENT_REPORTED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_DISPUTED"
  | "PAYMENT_REMINDER";

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
  };
  read: boolean;
  createdAt: string;
}
