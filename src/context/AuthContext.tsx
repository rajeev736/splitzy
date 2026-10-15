"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  UserProfile,
  Group,
  Expense,
  AppNotification,
  FriendRequest,
  Settlement,
  SplitType,
  SharePaymentStatus,
} from "@/lib/types";
import { generateRandomSplitzyId } from "@/lib/firebase/splitzyId";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase/config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  canRemoveFriend,
  canUserLeaveGroup,
  canDeleteGroup,
  calculateNetBalances,
} from "@/lib/money";

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  friends: UserProfile[];
  groups: Group[];
  expenses: Expense[];
  notifications: AppNotification[];
  friendRequests: FriendRequest[];
  settlements: Settlement[];
  login: (email: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  createGroup: (name: string, description: string, icon: string, memberIds: string[]) => Promise<string>;
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<void>;
  createExpense: (data: {
    groupId?: string;
    groupName?: string;
    groupIcon?: string;
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
    shares: Array<{ userId: string; userName: string; userPhoto?: string; amountPaise: number }>;
  }) => Promise<string>;
  reportPayment: (expenseId: string, note?: string) => Promise<void>;
  confirmPaymentReceipt: (expenseId: string, memberUserId: string) => Promise<void>;
  disputePaymentReceipt: (expenseId: string, memberUserId: string) => Promise<void>;
  sendFriendRequest: (splitzyId: string) => Promise<{ success: boolean; message: string }>;
  acceptFriendRequest: (requestId: string) => Promise<void>;
  rejectFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendUid: string) => Promise<{ success: boolean; message?: string }>;
  leaveGroup: (groupId: string) => Promise<{ success: boolean; message?: string }>;
  deleteGroup: (groupId: string) => Promise<{ success: boolean; message?: string }>;
  inviteGroupMember: (groupId: string, friendUid: string) => Promise<{ success: boolean; message?: string }>;
  acceptGroupInvite: (groupId: string) => Promise<{ success: boolean; message?: string }>;
  deleteExpense: (expenseId: string) => Promise<{ success: boolean; message?: string }>;
  sendPaymentReminder: (expenseId: string, targetUserId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  // Computed balances
  netBalancePaise: number;
  totalOwedToYouPaise: number;
  totalYouOwePaise: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEYS = {
  USER: "joysplit_user_profile",
  FRIENDS: "joysplit_friends_list",
  GROUPS: "joysplit_groups_list",
  EXPENSES: "joysplit_expenses_list",
  NOTIFICATIONS: "joysplit_notifications_list",
  FRIEND_REQUESTS: "joysplit_friend_requests",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Initialize and Hydrate from storage or clean state
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        // Clean out legacy demo user if found
        if (parsed?.uid === "usr_rajeev_demo" || parsed?.splitzyId === "JOY-9B2K4L") {
          localStorage.removeItem(STORAGE_KEYS.USER);
          localStorage.removeItem(STORAGE_KEYS.FRIENDS);
          localStorage.removeItem(STORAGE_KEYS.GROUPS);
          localStorage.removeItem(STORAGE_KEYS.EXPENSES);
          localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
          localStorage.removeItem(STORAGE_KEYS.FRIEND_REQUESTS);
          setUser(null);
        } else {
          setUser(parsed);
          const storedFriends = localStorage.getItem(STORAGE_KEYS.FRIENDS);
          if (storedFriends) setFriends(JSON.parse(storedFriends));

          const storedGroups = localStorage.getItem(STORAGE_KEYS.GROUPS);
          if (storedGroups) setGroups(JSON.parse(storedGroups));

          const storedExpenses = localStorage.getItem(STORAGE_KEYS.EXPENSES);
          if (storedExpenses) setExpenses(JSON.parse(storedExpenses));

          const storedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
          if (storedNotifs) setNotifications(JSON.parse(storedNotifs));

          const storedReqs = localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS);
          if (storedReqs) setFriendRequests(JSON.parse(storedReqs));
        }
      }
    } catch (e) {
      console.warn("Storage hydration warning:", e);
      setUser(null);
    }
  }, []);

  // Save changes to localStorage
  const persistUser = (u: UserProfile | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const persistFriends = (f: UserProfile[]) => {
    setFriends(f);
    localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(f));
  };

  const persistGroups = (g: Group[]) => {
    setGroups(g);
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(g));
  };

  const persistExpenses = (e: Expense[]) => {
    setExpenses(e);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(e));
  };

  const persistNotifications = (n: AppNotification[]) => {
    setNotifications(n);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(n));
  };

  const persistFriendRequests = (r: FriendRequest[]) => {
    setFriendRequests(r);
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(r));
  };

  // Firebase Auth State Listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        if (db) {
          try {
            const userDoc = await getDoc(doc(db, "users", fbUser.uid));
            if (userDoc.exists()) {
              const uData = userDoc.data() as UserProfile;
              persistUser(uData);
            } else {
              // User exists in Firebase Auth but profile doc in Firestore was deleted or not completed
              console.warn("Auth user found without Firestore profile doc:", fbUser.uid);
              persistUser(null);
            }
          } catch (err) {
            console.error("Firestore user fetch error:", err);
            persistUser(null);
          }
        }
      } else {
        // No authenticated Firebase user
        persistUser(null);
        setFriends([]);
        setGroups([]);
        setExpenses([]);
        setNotifications([]);
        setFriendRequests([]);
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.FRIENDS);
        localStorage.removeItem(STORAGE_KEYS.GROUPS);
        localStorage.removeItem(STORAGE_KEYS.EXPENSES);
        localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
        localStorage.removeItem(STORAGE_KEYS.FRIEND_REQUESTS);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore Sync Listeners
  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user?.uid) return;

    const onError = (err: any) => {
      console.warn("Firestore sync notice (Database may not be created yet in console):", err?.message || err);
    };

    // 1. Profile real-time sync
    const unsubsUser = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const uData = snap.data() as UserProfile;
          setUser((prev) => (prev ? { ...prev, ...uData } : uData));
        }
      },
      onError
    );

    // 2. Incoming friend requests
    const qReqReceiver = query(
      collection(db, "friendRequests"),
      where("receiverId", "==", user.uid)
    );
    const unsubsReqRec = onSnapshot(
      qReqReceiver,
      (snap) => {
        const recList: FriendRequest[] = [];
        snap.forEach((d) => recList.push(d.data() as FriendRequest));
        setFriendRequests((prev) => {
          const outgoing = prev.filter((r) => r.senderId === user.uid);
          const map = new Map<string, FriendRequest>();
          [...recList, ...outgoing].forEach((r) => map.set(r.id, r));
          const combined = Array.from(map.values());
          persistFriendRequests(combined);
          return combined;
        });
      },
      onError
    );

    // 3. Outgoing friend requests
    const qReqSender = query(
      collection(db, "friendRequests"),
      where("senderId", "==", user.uid)
    );
    const unsubsReqSend = onSnapshot(
      qReqSender,
      (snap) => {
        const sendList: FriendRequest[] = [];
        snap.forEach((d) => sendList.push(d.data() as FriendRequest));
        setFriendRequests((prev) => {
          const incoming = prev.filter((r) => r.receiverId === user.uid);
          const map = new Map<string, FriendRequest>();
          [...incoming, ...sendList].forEach((r) => map.set(r.id, r));
          const combined = Array.from(map.values());
          persistFriendRequests(combined);
          return combined;
        });
      },
      onError
    );

    // 4. Groups sync
    const qGroups = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );
    const unsubsGroups = onSnapshot(
      qGroups,
      (snap) => {
        const gList: Group[] = [];
        snap.forEach((d) => gList.push(d.data() as Group));
        persistGroups(gList);
      },
      onError
    );

    // 5. Expenses sync
    const qExpenses = collection(db, "expenses");
    const unsubsExpenses = onSnapshot(
      qExpenses,
      (snap) => {
        const expList: Expense[] = [];
        snap.forEach((d) => {
          const exp = d.data() as Expense;
          if (
            exp.createdBy === user.uid ||
            exp.payerId === user.uid ||
            exp.recipientId === user.uid ||
            exp.shares?.some((s) => s.userId === user.uid)
          ) {
            expList.push(exp);
          }
        });
        expList.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        persistExpenses(expList);
      },
      onError
    );

    // 6. Notifications sync
    const qNotifs = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid)
    );
    const unsubsNotifs = onSnapshot(
      qNotifs,
      (snap) => {
        const nList: AppNotification[] = [];
        snap.forEach((d) => nList.push(d.data() as AppNotification));
        nList.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        persistNotifications(nList);
      },
      onError
    );

    // 7. Canonical Friendships sync (Bidirectional friends)
    const qFriendships = query(
      collection(db, "friendships"),
      where("users", "array-contains", user.uid)
    );
    const unsubsFriendships = onSnapshot(
      qFriendships,
      (snap) => {
        const activeFriendUids: string[] = [];
        const removedFriendUids: string[] = [];
        snap.forEach((d) => {
          const data = d.data();
          const otherUid = data.users?.find((u: string) => u !== user.uid);
          if (!otherUid) return;
          if (data.status === "ACTIVE") {
            activeFriendUids.push(otherUid);
          } else if (data.status === "REMOVED") {
            removedFriendUids.push(otherUid);
          }
        });

        if (activeFriendUids.length === 0) {
          persistFriends([]);
        } else {
          setFriends((prevFriends) => {
            let updated = prevFriends.filter(
              (f) => activeFriendUids.includes(f.uid) && !removedFriendUids.includes(f.uid)
            );
            activeFriendUids.forEach((fUid) => {
              if (!updated.some((f) => f.uid === fUid) && db) {
                getDoc(doc(db, "users", fUid))
                  .then((uDoc) => {
                    if (uDoc.exists()) {
                      const uData = uDoc.data() as UserProfile;
                      setFriends((curr) => {
                        if (!curr.some((c) => c.uid === fUid)) {
                          const next = [...curr, uData];
                          persistFriends(next);
                          return next;
                        }
                        return curr;
                      });
                    }
                  })
                  .catch(() => {});
              }
            });
            persistFriends(updated);
            return updated;
          });
        }
      },
      onError
    );

    return () => {
      unsubsUser();
      unsubsReqRec();
      unsubsReqSend();
      unsubsGroups();
      unsubsExpenses();
      unsubsNotifs();
      unsubsFriendships();
    };
  }, [user?.uid]);

  // Login handler
  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && auth && password) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = db ? await getDoc(doc(db, "users", cred.user.uid)) : null;
        if (userDoc && userDoc.exists()) {
          persistUser(userDoc.data() as UserProfile);
          return;
        } else {
          throw new Error("User account exists but profile was not found. Please complete registration.");
        }
      }
      throw new Error("Firebase authentication is required to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up handler
  const signup = async (name: string, email: string, password?: string) => {
    setIsLoading(true);
    try {
      const generatedId = generateRandomSplitzyId();
      let uid = `usr_${Date.now()}`;

      if (isFirebaseConfigured && auth && password) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
      }

      const newUser: UserProfile = {
        uid,
        email,
        displayName: name,
        splitzyId: generatedId,
        upiId: `${name.toLowerCase().replace(/\s+/g, "")}@upi`,
        photoURL: "/assets/avatar_boy.jpg",
        createdAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, "users", uid), newUser);
        await setDoc(doc(db, "splitzyIds", generatedId), {
          uid,
          createdAt: newUser.createdAt,
          displayName: newUser.displayName,
          email: newUser.email,
        });
      }

      persistUser(newUser);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login handler
  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        const uid = cred.user.uid;

        if (db) {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            persistUser(userDoc.data() as UserProfile);
            return;
          } else {
            const generatedId = generateRandomSplitzyId();
            const emailName = (cred.user.email || "user").split("@")[0];
            const newUser: UserProfile = {
              uid,
              email: cred.user.email || "",
              displayName: cred.user.displayName || "Google User",
              splitzyId: generatedId,
              upiId: `${emailName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
              photoURL: cred.user.photoURL || "/assets/avatar_boy.jpg",
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, "users", uid), newUser);
            await setDoc(doc(db, "splitzyIds", generatedId), {
              uid,
              createdAt: newUser.createdAt,
              displayName: newUser.displayName,
              email: newUser.email,
            });
            persistUser(newUser);
            return;
          }
        }
      }

      throw new Error("Firebase Authentication is not configured or available.");
    } finally {
      setIsLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Firebase signOut error", e);
      }
    }
    persistUser(null);
    setFriends([]);
    setGroups([]);
    setExpenses([]);
    setNotifications([]);
    setFriendRequests([]);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.FRIENDS);
    localStorage.removeItem(STORAGE_KEYS.GROUPS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.FRIEND_REQUESTS);
  };

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = { ...user, ...updates, updatedAt: new Date().toISOString() };
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "users", user.uid), updates);
    }
    persistUser(updated);
  };

  // Create group
  const createGroup = async (
    name: string,
    description: string,
    icon: string,
    memberIds: string[]
  ): Promise<string> => {
    if (!user) throw new Error("Must be logged in to create a group");

    const groupId = `grp_${Date.now()}`;
    const allMembers = Array.from(new Set([user.uid, ...memberIds]));

    const memberDetails: Record<string, any> = {
      [user.uid]: {
        uid: user.uid,
        name: user.displayName,
        splitzyId: user.splitzyId,
        photoURL: user.photoURL,
        role: "admin",
      },
    };

    allMembers.forEach((mId) => {
      if (mId !== user.uid) {
        const f = friends.find((fr) => fr.uid === mId);
        if (f) {
          memberDetails[mId] = {
            uid: f.uid,
            name: f.displayName,
            splitzyId: f.splitzyId,
            photoURL: f.photoURL,
            role: "member",
          };
        }
      }
    });

    const newGroup: Group = {
      id: groupId,
      name,
      description,
      icon,
      createdBy: user.uid,
      members: allMembers,
      memberDetails,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, "groups", groupId), newGroup);
    }

    persistGroups([newGroup, ...groups]);

    // Add in-app notification for invited members
    const newNotifs: AppNotification[] = memberIds.map((mId) => ({
      id: `notif_${Date.now()}_${mId}`,
      userId: mId,
      title: "Group Invitation",
      message: `${user.displayName} added you to group "${name}"`,
      type: "GROUP_INVITE",
      data: { groupId, actorId: user.uid, actorName: user.displayName },
      read: false,
      createdAt: new Date().toISOString(),
    }));

    if (isFirebaseConfigured && db) {
      for (const n of newNotifs) {
        await setDoc(doc(db, "notifications", n.id), n);
      }
    }

    return groupId;
  };

  // Update existing group (name, description, icon)
  const updateGroup = async (groupId: string, updates: Partial<Group>) => {
    if (!user) return;
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "groups", groupId), updates);
    }
    const updated = groups.map((g) => (g.id === groupId ? { ...g, ...updates } : g));
    persistGroups(updated);

    // Also sync groupName/groupIcon in related expenses
    if (updates.name || updates.icon) {
      const updatedExpenses = expenses.map((exp) => {
        if (exp.groupId === groupId) {
          return {
            ...exp,
            groupName: updates.name || exp.groupName,
            groupIcon: updates.icon || exp.groupIcon,
          };
        }
        return exp;
      });
      persistExpenses(updatedExpenses);
    }
  };

  // Create expense
  const createExpense = async (data: {
    groupId?: string;
    groupName?: string;
    groupIcon?: string;
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
    shares: Array<{ userId: string; userName: string; userPhoto?: string; amountPaise: number }>;
  }): Promise<string> => {
    if (!user) throw new Error("Must be logged in");

    const expenseId = `exp_${Date.now()}`;
    const newExpense: Expense = {
      id: expenseId,
      groupId: data.groupId,
      groupName: data.groupName,
      groupIcon: data.groupIcon,
      title: data.title,
      amountPaise: data.amountPaise,
      payerId: data.payerId,
      payerName: data.payerName,
      recipientId: data.recipientId,
      recipientName: data.recipientName,
      recipientUpiId: data.recipientUpiId,
      date: data.date,
      notes: data.notes,
      splitType: data.splitType,
      shares: data.shares.map((s) => ({
        ...s,
        status: s.userId === data.payerId ? "PAID" : "PENDING",
      })),
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, "expenses", expenseId), newExpense);
    }

    persistExpenses([newExpense, ...expenses]);

    // Send notifications to all participants (except creator)
    const notifs: AppNotification[] = data.shares
      .filter((s) => s.userId !== user.uid)
      .map((s) => ({
        id: `notif_${Date.now()}_${s.userId}`,
        userId: s.userId,
        title: "New Expense Added",
        message: `${data.payerName} added "${data.title}" - your share is ₹${(s.amountPaise / 100).toFixed(0)}`,
        type: "NEW_EXPENSE",
        data: {
          expenseId,
          groupId: data.groupId,
          actorId: user.uid,
          actorName: user.displayName,
          amountPaise: s.amountPaise,
        },
        read: false,
        createdAt: new Date().toISOString(),
      }));

    if (isFirebaseConfigured && db) {
      for (const n of notifs) {
        await setDoc(doc(db, "notifications", n.id), n);
      }
    }

    return expenseId;
  };

  // Report payment
  const reportPayment = async (expenseId: string, note?: string) => {
    if (!user) return;
    const now = new Date().toISOString();

    const updated = expenses.map((exp) => {
      if (exp.id === expenseId) {
        const updatedShares = exp.shares.map((share) => {
          if (share.userId === user.uid) {
            return {
              ...share,
              status: "PAYMENT_REPORTED" as SharePaymentStatus,
              reportedAt: now,
              paymentProofNote: note,
            };
          }
          return share;
        });
        return { ...exp, shares: updatedShares };
      }
      return exp;
    });

    const expense = expenses.find((e) => e.id === expenseId);
    if (isFirebaseConfigured && db && expense) {
      const currentTargetExpense = updated.find((e) => e.id === expenseId);
      if (currentTargetExpense) {
        await updateDoc(doc(db, "expenses", expenseId), {
          shares: currentTargetExpense.shares,
        });
      }
    }

    persistExpenses(updated);

    if (expense) {
      const myShare = expense.shares.find((s) => s.userId === user.uid);
      const reportedNotif: AppNotification = {
        id: `notif_${Date.now()}`,
        userId: expense.recipientId || expense.payerId,
        title: "Payment Reported",
        message: `${user.displayName} marked their share of ₹${((myShare?.amountPaise || 0) / 100).toFixed(0)} as paid for "${expense.title}"`,
        type: "PAYMENT_REPORTED",
        data: {
          expenseId,
          actorId: user.uid,
          actorName: user.displayName,
          amountPaise: myShare?.amountPaise || 0,
        },
        read: false,
        createdAt: now,
      };

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, "notifications", reportedNotif.id), reportedNotif);
      }
    }
  };

  // Recipient confirms payment receipt
  const confirmPaymentReceipt = async (expenseId: string, memberUserId: string) => {
    if (!user) return;
    const now = new Date().toISOString();

    const updated = expenses.map((exp) => {
      if (exp.id === expenseId) {
        const updatedShares = exp.shares.map((share) => {
          if (share.userId === memberUserId) {
            return {
              ...share,
              status: "PAID" as SharePaymentStatus,
              confirmedAt: now,
            };
          }
          return share;
        });
        return { ...exp, shares: updatedShares };
      }
      return exp;
    });

    if (isFirebaseConfigured && db) {
      const targetExp = updated.find((e) => e.id === expenseId);
      if (targetExp) {
        await updateDoc(doc(db, "expenses", expenseId), { shares: targetExp.shares });
      }
    }

    persistExpenses(updated);

    const expense = expenses.find((e) => e.id === expenseId);
    if (expense) {
      const confirmedNotif: AppNotification = {
        id: `notif_${Date.now()}`,
        userId: memberUserId,
        title: "Payment Confirmed!",
        message: `${user.displayName} confirmed receipt for "${expense.title}"`,
        type: "PAYMENT_CONFIRMED",
        data: {
          expenseId,
          actorId: user.uid,
          actorName: user.displayName,
        },
        read: false,
        createdAt: now,
      };

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, "notifications", confirmedNotif.id), confirmedNotif);
      }
    }
  };

  // Recipient disputes payment receipt
  const disputePaymentReceipt = async (expenseId: string, memberUserId: string) => {
    if (!user) return;
    const now = new Date().toISOString();

    const updated = expenses.map((exp) => {
      if (exp.id === expenseId) {
        const updatedShares = exp.shares.map((share) => {
          if (share.userId === memberUserId) {
            return {
              ...share,
              status: "DISPUTED" as SharePaymentStatus,
            };
          }
          return share;
        });
        return { ...exp, shares: updatedShares };
      }
      return exp;
    });

    if (isFirebaseConfigured && db) {
      const targetExp = updated.find((e) => e.id === expenseId);
      if (targetExp) {
        await updateDoc(doc(db, "expenses", expenseId), { shares: targetExp.shares });
      }
    }

    persistExpenses(updated);

    const expense = expenses.find((e) => e.id === expenseId);
    if (expense) {
      const disputedNotif: AppNotification = {
        id: `notif_${Date.now()}`,
        userId: memberUserId,
        title: "Payment Disputed",
        message: `${user.displayName} disputed the payment reported for "${expense.title}"`,
        type: "PAYMENT_DISPUTED",
        data: {
          expenseId,
          actorId: user.uid,
          actorName: user.displayName,
        },
        read: false,
        createdAt: now,
      };

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, "notifications", disputedNotif.id), disputedNotif);
      }
    }
  };

  // Send friend request by Splitzy ID
  const sendFriendRequest = async (
    targetSplitzyId: string
  ): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: "Please log in first" };

    const cleanId = targetSplitzyId.trim().toUpperCase();
    if (cleanId === user.splitzyId.toUpperCase()) {
      return { success: false, message: "You cannot add yourself as a friend!" };
    }

    // Check existing friends
    if (friends.some((f) => f.splitzyId.toUpperCase() === cleanId)) {
      return { success: false, message: "This user is already in your friends list" };
    }

    // Check existing pending request
    if (
      friendRequests.some(
        (r) =>
          r.status === "PENDING" &&
          ((r.senderSplitzyId === user.splitzyId && r.receiverSplitzyId === cleanId) ||
            (r.receiverSplitzyId === user.splitzyId && r.senderSplitzyId === cleanId))
      )
    ) {
      return { success: false, message: "A friend request is already pending with this user" };
    }

    let target: UserProfile | null = null;

    if (isFirebaseConfigured && db) {
      // Find in Firestore by splitzyId index
      const idDoc = await getDoc(doc(db, "splitzyIds", cleanId));
      if (idDoc.exists()) {
        const idData = idDoc.data();
        const uDoc = await getDoc(doc(db, "users", idData.uid));
        if (uDoc.exists()) {
          target = uDoc.data() as UserProfile;
        }
      } else {
        const q = query(collection(db, "users"), where("splitzyId", "==", cleanId));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          target = qSnap.docs[0].data() as UserProfile;
        }
      }
    }

    if (!target) {
      return {
        success: false,
        message: `No user found with JoySplit ID "${cleanId}". Make sure the ID is correct.`,
      };
    }

    const reqId = `freq_${Date.now()}`;
    const newReq: FriendRequest = {
      id: reqId,
      senderId: user.uid,
      senderName: user.displayName,
      senderSplitzyId: user.splitzyId,
      senderPhoto: user.photoURL,
      receiverId: target.uid,
      receiverName: target.displayName,
      receiverSplitzyId: target.splitzyId,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, "friendRequests", reqId), newReq);
      const notifId = `notif_${Date.now()}`;
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        userId: target.uid,
        title: "New Friend Request",
        message: `${user.displayName} (${user.splitzyId}) sent you a friend request`,
        type: "FRIEND_REQUEST",
        data: { requestId: reqId, actorId: user.uid, actorName: user.displayName },
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    persistFriendRequests([newReq, ...friendRequests]);
    return { success: true, message: `Friend request sent to ${target.displayName}!` };
  };

  // Accept friend request
  const acceptFriendRequest = async (requestId: string) => {
    if (!user) return;
    const req = friendRequests.find((r) => r.id === requestId);
    if (!req) return;
    const now = new Date().toISOString();

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "friendRequests", requestId), { status: "ACCEPTED" });

      // Create canonical bidirectional friendship record
      const canonicalId = [user.uid, req.senderId].sort().join("_");
      await setDoc(doc(db, "friendships", canonicalId), {
        id: canonicalId,
        users: [user.uid, req.senderId],
        userA: user.uid < req.senderId ? user.uid : req.senderId,
        userB: user.uid < req.senderId ? req.senderId : user.uid,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });

      const notifId = `notif_${Date.now()}`;
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        userId: req.senderId,
        title: "Friend Request Accepted",
        message: `${user.displayName} accepted your friend request!`,
        type: "FRIEND_ACCEPTED",
        data: { actorId: user.uid, actorName: user.displayName },
        read: false,
        createdAt: now,
      });
    }

    const updatedReqs = friendRequests.map((r) =>
      r.id === requestId ? { ...r, status: "ACCEPTED" as const } : r
    );
    persistFriendRequests(updatedReqs);

    // Add friend to local list
    const newFriend: UserProfile = {
      uid: req.senderId,
      displayName: req.senderName,
      splitzyId: req.senderSplitzyId,
      email: `${req.senderSplitzyId.toLowerCase()}@joysplit.app`,
      upiId: `${req.senderName.toLowerCase().replace(/\s+/g, "")}@upi`,
      photoURL: req.senderPhoto || "/assets/avatar_glasses.jpg",
      createdAt: now,
    };

    if (!friends.some((f) => f.uid === newFriend.uid)) {
      persistFriends([...friends, newFriend]);
    }
  };

  // Reject friend request
  const rejectFriendRequest = async (requestId: string) => {
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "friendRequests", requestId), { status: "REJECTED" });
    }
    const updatedReqs = friendRequests.map((r) =>
      r.id === requestId ? { ...r, status: "REJECTED" as const } : r
    );
    persistFriendRequests(updatedReqs);
  };

  // Remove Friend with invariant check
  const removeFriend = async (friendUid: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "Not logged in" };
    const check = canRemoveFriend(user.uid, friendUid, expenses);
    if (!check.allowed) {
      return { success: false, message: check.reason };
    }

    const canonicalId = [user.uid, friendUid].sort().join("_");
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, "friendships", canonicalId), {
        id: canonicalId,
        users: [user.uid, friendUid],
        status: "REMOVED",
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }

    const updatedFriends = friends.filter((f) => f.uid !== friendUid);
    persistFriends(updatedFriends);
    return { success: true };
  };

  // Leave Group with invariant check
  const leaveGroup = async (groupId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "Not logged in" };
    const targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup) return { success: false, message: "Group not found" };

    const check = canUserLeaveGroup(user.uid, targetGroup, expenses);
    if (!check.allowed) {
      return { success: false, message: check.reason };
    }

    const updatedMembers = targetGroup.members.filter((m) => m !== user.uid);
    const updatedDetails = { ...targetGroup.memberDetails };
    delete updatedDetails[user.uid];

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "groups", groupId), {
        members: updatedMembers,
        memberDetails: updatedDetails,
      });
    }

    const updatedGroups = groups.filter((g) => g.id !== groupId);
    persistGroups(updatedGroups);
    return { success: true };
  };

  // Delete Group with invariant check (creator only, zero unsettled balances)
  const deleteGroup = async (groupId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "Not logged in" };
    const targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup) return { success: false, message: "Group not found" };

    const check = canDeleteGroup(user.uid, targetGroup, expenses);
    if (!check.allowed) {
      return { success: false, message: check.reason };
    }

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "groups", groupId), {
        status: "ARCHIVED",
        archivedAt: new Date().toISOString(),
      });
    }

    const updatedGroups = groups.filter((g) => g.id !== groupId);
    persistGroups(updatedGroups);
    return { success: true };
  };

  // Invite Group Member
  const inviteGroupMember = async (groupId: string, friendUid: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "Not logged in" };
    const targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup) return { success: false, message: "Group not found" };

    if (targetGroup.members.includes(friendUid)) {
      return { success: false, message: "User is already a member of this group" };
    }

    const invited = Array.from(new Set([...(targetGroup.invitedMembers || []), friendUid]));

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "groups", groupId), {
        invitedMembers: invited,
      });

      const notifId = `notif_${Date.now()}_${friendUid}`;
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        userId: friendUid,
        title: "Group Invitation",
        message: `${user.displayName} invited you to join "${targetGroup.name}"`,
        type: "GROUP_INVITE",
        data: { groupId, actorId: user.uid, actorName: user.displayName },
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    const updated = groups.map((g) => (g.id === groupId ? { ...g, invitedMembers: invited } : g));
    persistGroups(updated);
    return { success: true };
  };

  // Accept Group Invite
  const acceptGroupInvite = async (groupId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "Not logged in" };
    const targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup) return { success: false, message: "Group not found" };

    const updatedMembers = Array.from(new Set([...targetGroup.members, user.uid]));
    const updatedInvited = (targetGroup.invitedMembers || []).filter((id) => id !== user.uid);
    const updatedDetails = {
      ...targetGroup.memberDetails,
      [user.uid]: {
        uid: user.uid,
        name: user.displayName,
        splitzyId: user.splitzyId,
        photoURL: user.photoURL,
        role: "member" as const,
      },
    };

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "groups", groupId), {
        members: updatedMembers,
        invitedMembers: updatedInvited,
        memberDetails: updatedDetails,
      });
    }

    const updated = groups.map((g) =>
      g.id === groupId
        ? {
            ...g,
            members: updatedMembers,
            invitedMembers: updatedInvited,
            memberDetails: updatedDetails,
          }
        : g
    );
    persistGroups(updated);
    return { success: true };
  };

  // Delete Expense with invariant check
  const deleteExpense = async (expenseId: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "Not logged in" };
    const exp = expenses.find((e) => e.id === expenseId);
    if (!exp) return { success: false, message: "Expense not found" };

    if (exp.payerId !== user.uid && exp.createdBy !== user.uid) {
      return { success: false, message: "Only the payer or creator can delete this expense" };
    }

    const hasPaid = exp.shares.some((s) => s.userId !== user.uid && s.status === "PAID");
    if (hasPaid) {
      return {
        success: false,
        message: "Cannot delete an expense that already has confirmed member payments.",
      };
    }

    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, "expenses", expenseId));
    }

    const updated = expenses.filter((e) => e.id !== expenseId);
    persistExpenses(updated);
    return { success: true };
  };

  // Send payment reminder
  const sendPaymentReminder = async (expenseId: string, targetUserId: string) => {
    if (!user) return;
    const exp = expenses.find((e) => e.id === expenseId);
    if (!exp) return;

    const notifId = `notif_${Date.now()}`;
    const remNotif: AppNotification = {
      id: notifId,
      userId: targetUserId,
      title: "Payment Reminder",
      message: `${user.displayName} sent a gentle reminder for "${exp.title}"`,
      type: "PAYMENT_REMINDER",
      data: { expenseId, actorId: user.uid, actorName: user.displayName },
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, "notifications", notifId), remNotif);
    }
  };

  // Notifications read handlers
  const markNotificationRead = async (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    persistNotifications(updated);
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "notifications", id), { read: true });
      } catch (e) {
        console.warn("Failed to mark notification read in Firestore:", e);
      }
    }
  };

  const markAllNotificationsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    persistNotifications(updated);
    if (isFirebaseConfigured && db && user) {
      try {
        const unread = notifications.filter((n) => !n.read);
        for (const notif of unread) {
          await updateDoc(doc(db, "notifications", notif.id), { read: true });
        }
      } catch (e) {
        console.warn("Failed to mark all notifications read in Firestore:", e);
      }
    }
  };

  // Authoritative Balances calculation using centralized integer paise math engine
  const { netBalancePaise, totalOwedToYouPaise, totalYouOwePaise } = user
    ? calculateNetBalances(user.uid, expenses)
    : { netBalancePaise: 0, totalOwedToYouPaise: 0, totalYouOwePaise: 0 };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        friends,
        groups,
        expenses,
        notifications,
        friendRequests,
        settlements: [],
        login,
        signup,
        loginWithGoogle,
        logout,
        updateProfile,
        createGroup,
        updateGroup,
        createExpense,
        reportPayment,
        confirmPaymentReceipt,
        disputePaymentReceipt,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        removeFriend,
        leaveGroup,
        deleteGroup,
        inviteGroupMember,
        acceptGroupInvite,
        deleteExpense,
        sendPaymentReminder,
        markNotificationRead,
        markAllNotificationsRead,
        netBalancePaise,
        totalOwedToYouPaise,
        totalYouOwePaise,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
