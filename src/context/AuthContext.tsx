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
  sendEmailVerification,
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
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import {
  canRemoveFriend,
  canUserLeaveGroup,
  canDeleteGroup,
  calculateNetBalances,
} from "@/lib/money";
import { buildFirestoreExpense } from "@/lib/expenses/builder";

export type AuthState =
  | "initializing"
  | "signedOut"
  | "emailVerificationRequired"
  | "authenticatedProfileIncomplete"
  | "authenticatedProfileComplete"
  | "profileLoadError";

interface AuthContextValue {
  user: UserProfile | null;
  fbUser: any;
  isLoading: boolean;
  authState: AuthState;
  isEmailVerified: boolean;
  friends: UserProfile[];
  groups: Group[];
  expenses: Expense[];
  notifications: AppNotification[];
  friendRequests: FriendRequest[];
  settlements: Settlement[];
  login: (email: string, password?: string) => Promise<void>;
  signup: (name: string, email: string, password?: string, preferredSplitzyId?: string) => Promise<void>;
  loginWithGoogle: () => Promise<{ isNewUser: boolean; onboardingCompleted: boolean }>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  createGroup: (
    name: string,
    description: string,
    icon: string,
    memberIds: string[],
    pendingInviteUids?: string[]
  ) => Promise<string>;
  updateGroup: (groupId: string, updates: Partial<Group>) => Promise<void>;
  createExpense: (data: {
    groupId?: string;
    groupName?: string;
    groupIcon?: string;
    expenseType?: "group" | "friend" | "personal";
    isDirect?: boolean;
    isPersonal?: boolean;
    category?: string;
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
  cancelFriendRequest: (requestId: string) => Promise<void>;
  removeFriend: (friendUid: string) => Promise<{ success: boolean; message?: string }>;
  leaveGroup: (groupId: string) => Promise<{ success: boolean; message?: string }>;
  deleteGroup: (groupId: string) => Promise<{ success: boolean; message?: string }>;
  inviteGroupMember: (
    groupId: string,
    targetUidOrSplitzyId: string,
    option?: "GROUP_ONLY" | "FRIEND_ONLY" | "COMBINED"
  ) => Promise<{ success: boolean; message?: string }>;
  acceptGroupInvite: (
    groupId: string,
    options?: { acceptCombinedFriendship?: boolean; friendRequestId?: string }
  ) => Promise<{ success: boolean; message?: string }>;
  declineGroupInvite: (
    groupId: string,
    friendRequestId?: string
  ) => Promise<{ success: boolean; message?: string }>;
  deleteExpense: (expenseId: string) => Promise<{ success: boolean; message?: string }>;
  sendPaymentReminder: (expenseId: string, targetUserId: string) => Promise<void>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  searchUserBySplitzyId: (splitzyId: string) => Promise<{
    found: boolean;
    user?: Partial<UserProfile>;
    status?: "SELF" | "FRIENDS" | "REQUEST_SENT" | "REQUEST_RECEIVED" | "CAN_ADD";
    requestId?: string;
    message?: string;
  }>;
  getMutualFriendSuggestions: () => Promise<
    Array<{ user: UserProfile; mutualCount: number; mutualFriendNames: string[] }>
  >;
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
  const [fbUser, setFbUser] = useState<any>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);

  // Wipe any legacy mock or stale local storage data once on boot
  useEffect(() => {
    try {
      localStorage.removeItem("joysplit_friends_list");
      localStorage.removeItem("joysplit_groups_list");
      localStorage.removeItem("joysplit_expenses_list");
      localStorage.removeItem("joysplit_notifications_list");
      localStorage.removeItem("joysplit_friend_requests");
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.uid === "usr_rajeev_demo" || parsed?.splitzyId === "JOY-9B2K4L") {
          localStorage.removeItem(STORAGE_KEYS.USER);
          setUser(null);
        } else {
          setUser(parsed);
        }
      }
    } catch (e) {
      console.warn("Storage cleanup notice:", e);
      setUser(null);
    }
  }, []);

  const persistUser = (u: UserProfile | null) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const persistFriends = (list: UserProfile[]) => setFriends(list);
  const persistGroups = (list: Group[]) => setGroups(list);
  const persistExpenses = (list: Expense[]) => setExpenses(list);
  const persistNotifications = (list: AppNotification[]) => setNotifications(list);
  const persistFriendRequests = (list: FriendRequest[]) => setFriendRequests(list);

  // Firebase Auth State Listener
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      setFbUser(currentFbUser);
      setProfileLoadError(null);

      if (currentFbUser) {
        if (db) {
          try {
            let userDoc = await getDoc(doc(db, "users", currentFbUser.uid));
            if (!userDoc.exists()) {
              // Wait 800ms to allow signup() to write its own newUser document
              await new Promise((resolve) => setTimeout(resolve, 800));
              userDoc = await getDoc(doc(db, "users", currentFbUser.uid));
            }

            if (userDoc.exists()) {
              const uData = userDoc.data() as UserProfile;
              persistUser(uData);
            } else {
              // Clean initialization for fresh accounts only if not provisioned by signup
              const generatedId = generateRandomSplitzyId();
              const emailName = (currentFbUser.email || "user").split("@")[0];
              const autoUser: UserProfile = {
                uid: currentFbUser.uid,
                email: currentFbUser.email || "",
                displayName: currentFbUser.displayName || emailName || "JoySplit User",
                splitzyId: generatedId,
                upiId: `${emailName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
                photoURL: currentFbUser.photoURL || "/assets/avatar_boy.jpg",
                onboardingCompleted: false,
                createdAt: new Date().toISOString(),
              };
              try {
                await setDoc(doc(db, "splitzyIds", generatedId), {
                  uid: currentFbUser.uid,
                  createdAt: autoUser.createdAt,
                  displayName: autoUser.displayName,
                  email: autoUser.email,
                });
                await setDoc(doc(db, "users", currentFbUser.uid), autoUser);
              } catch (provisionErr) {
                console.warn("Auto-provisioning profile notice:", provisionErr);
              }
              persistUser(autoUser);
            }
          } catch (err: any) {
            console.warn("Firestore user fetch notice:", err);
            const emailName = (currentFbUser.email || "user").split("@")[0];
            const fallbackUser: UserProfile = {
              uid: currentFbUser.uid,
              email: currentFbUser.email || "",
              displayName: currentFbUser.displayName || emailName || "JoySplit User",
              splitzyId: generateRandomSplitzyId(),
              upiId: `${emailName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
              photoURL: currentFbUser.photoURL || "/assets/avatar_boy.jpg",
              onboardingCompleted: false,
              createdAt: new Date().toISOString(),
            };
            persistUser(fallbackUser);
          }
        }
      } else {
        // No authenticated Firebase user - completely wipe all cached in-memory and local storage data
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

  const authState: AuthState = (() => {
    if (isLoading) return "initializing";
    if (!fbUser) return "signedOut";
    if (profileLoadError) return "profileLoadError";
    const isPasswordUser = fbUser.providerData?.some((p: any) => p.providerId === "password");
    if (isPasswordUser && !fbUser.emailVerified) {
      return "emailVerificationRequired";
    }
    if (!user || !user.onboardingCompleted) {
      return "authenticatedProfileIncomplete";
    }
    return "authenticatedProfileComplete";
  })();

  const sendVerificationEmailAction = async () => {
    if (!auth?.currentUser) {
      throw new Error("No active account found. Please sign up or log in first.");
    }
    await sendEmailVerification(auth.currentUser);
  };

  const reloadUserAction = async (): Promise<boolean> => {
    if (!auth?.currentUser) return false;
    await auth.currentUser.reload();
    const updated = auth.currentUser;
    setFbUser({ ...updated });
    return !!updated.emailVerified;
  };

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
          return Array.from(map.values());
        });
      },
      onError
    );

    // 4. Groups sync - Listen to groups where user is a member OR invited
    const qGroupsMember = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );
    const qGroupsInvited = query(
      collection(db, "groups"),
      where("invitedMembers", "array-contains", user.uid)
    );

    let memberGroups: Group[] = [];
    let invitedGroups: Group[] = [];
    let allFirestoreExpenses: Expense[] = [];

    // 5. Expenses sync - Real-time cloud sync for user's expenses & group expenses
    const qExpenses = collection(db, "expenses");

    const syncExpenses = () => {
      const myActiveGroupIds = new Set([
        ...memberGroups.map((g) => g.id),
        ...invitedGroups.map((g) => g.id),
      ]);

      const expList: Expense[] = [];
      allFirestoreExpenses.forEach((exp) => {
        const isInvolved =
          exp.createdBy === user.uid ||
          exp.payerId === user.uid ||
          exp.recipientId === user.uid ||
          exp.participantUids?.includes(user.uid) ||
          exp.shares?.some((s) => s.userId === user.uid) ||
          (Boolean(exp.groupId) && (myActiveGroupIds.has(exp.groupId!) || groups.some((g) => g.id === exp.groupId)));

        if (isInvolved) {
          expList.push(exp);
        }
      });

      expList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setExpenses(expList);
    };

    const syncGroups = () => {
      const gMap = new Map<string, Group>();
      memberGroups.forEach((g) => {
        if (g.status !== "ARCHIVED" && g.status !== "DELETED") {
          gMap.set(g.id, g);
        }
      });
      invitedGroups.forEach((g) => {
        if (g.status !== "ARCHIVED" && g.status !== "DELETED") {
          gMap.set(g.id, g);
        }
      });
      const merged = Array.from(gMap.values());
      merged.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setGroups(merged);
      // Re-evaluate group expenses now that groups are known
      syncExpenses();
    };

    const unsubsGroupsMember = onSnapshot(
      qGroupsMember,
      (snap) => {
        memberGroups = [];
        snap.forEach((d) => memberGroups.push(d.data() as Group));
        syncGroups();
      },
      onError
    );

    const unsubsGroupsInvited = onSnapshot(
      qGroupsInvited,
      (snap) => {
        invitedGroups = [];
        snap.forEach((d) => invitedGroups.push(d.data() as Group));
        syncGroups();
      },
      onError
    );

    const unsubsExpenses = onSnapshot(
      qExpenses,
      (snap) => {
        allFirestoreExpenses = [];
        snap.forEach((d) => allFirestoreExpenses.push(d.data() as Expense));
        syncExpenses();
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
        setNotifications(nList);
      },
      onError
    );

    // 7. Canonical Friendships sync (Bidirectional friends with canonical user profiles)
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

        // Instantly purge removed friends from active state so both sides update without delay
        if (removedFriendUids.length > 0) {
          setFriends((prev) => {
            const next = prev.filter((f) => !removedFriendUids.includes(f.uid));
            persistFriends(next);
            return next;
          });
        }

        if (activeFriendUids.length === 0) {
          setFriends([]);
          persistFriends([]);
        } else {
          Promise.all(
            activeFriendUids.map(async (fUid) => {
              if (!db) return null;
              try {
                const uDoc = await getDoc(doc(db, "users", fUid));
                if (uDoc.exists()) {
                  return uDoc.data() as UserProfile;
                }
              } catch (e) {
                console.warn(`Failed to fetch friend profile ${fUid}:`, e);
              }
              return null;
            })
          ).then((fetchedList) => {
            const valid = fetchedList.filter((f): f is UserProfile => f !== null);
            setFriends(valid);
            persistFriends(valid);
          });
        }
      },
      onError
    );

    return () => {
      unsubsUser();
      unsubsReqRec();
      unsubsReqSend();
      unsubsGroupsMember();
      unsubsGroupsInvited();
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
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        
        // If password provider and email is not verified, signal verification requirement
        if (!cred.user.emailVerified) {
          const err: any = new Error("Please verify your email address before signing in. Check your inbox for the verification link.");
          err.code = "auth/email-not-verified";
          throw err;
        }

        if (db) {
          const userDoc = await getDoc(doc(db, "users", cred.user.uid));
          if (userDoc.exists()) {
            persistUser(userDoc.data() as UserProfile);
            return;
          } else {
            // Self-heal missing user profile doc
            const generatedId = generateRandomSplitzyId();
            const emailName = (cred.user.email || "user").split("@")[0];
            const autoUser: UserProfile = {
              uid: cred.user.uid,
              email: cred.user.email || "",
              displayName: cred.user.displayName || emailName || "JoySplit User",
              splitzyId: generatedId,
              upiId: `${emailName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
              photoURL: cred.user.photoURL || "/assets/avatar_boy.jpg",
              onboardingCompleted: false,
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(doc(db, "users", cred.user.uid), autoUser);
              await setDoc(doc(db, "splitzyIds", generatedId), {
                uid: cred.user.uid,
                createdAt: autoUser.createdAt,
                displayName: autoUser.displayName,
                email: autoUser.email,
              });
            } catch (healErr) {
              console.warn("Self-heal profile write error:", healErr);
            }
            persistUser(autoUser);
            return;
          }
        }
      }
      throw new Error("Firebase authentication is required to sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up handler
  const signup = async (name: string, email: string, password?: string, preferredSplitzyId?: string) => {
    setIsLoading(true);
    try {
      let uid = `usr_${Date.now()}`;

      if (isFirebaseConfigured && auth && password) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        uid = cred.user.uid;

        // Automatically trigger verification link
        try {
          await sendEmailVerification(cred.user);
        } catch (verErr) {
          console.warn("sendEmailVerification error during signup:", verErr);
        }
      }

      const generatedId = (preferredSplitzyId && /^(JOY|SPL)-[A-Z0-9]{6}$/.test(preferredSplitzyId))
        ? preferredSplitzyId
        : generateRandomSplitzyId();

      const newUser: UserProfile = {
        uid,
        email: email.trim(),
        displayName: name.trim(),
        splitzyId: generatedId,
        upiId: `${name.toLowerCase().replace(/\s+/g, "")}@upi`,
        photoURL: "/assets/avatar_boy.jpg",
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
      };

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(doc(db, "splitzyIds", generatedId), {
            uid,
            createdAt: newUser.createdAt,
            displayName: newUser.displayName,
            email: newUser.email,
          });
        } catch (sErr) {
          console.warn("Could not reserve splitzyId:", sErr);
        }

        await setDoc(doc(db, "users", uid), newUser, { merge: true });
      }

      persistUser(newUser);
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login handler
  const loginWithGoogle = async (): Promise<{ isNewUser: boolean; onboardingCompleted: boolean }> => {
    setIsLoading(true);
    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error("Firebase Authentication is not configured or available.");
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      const uid = cred.user.uid;

      if (db) {
        try {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            const uData = userDoc.data() as UserProfile;
            persistUser(uData);
            return {
              isNewUser: false,
              onboardingCompleted: !!uData.onboardingCompleted,
            };
          } else {
            const generatedId = generateRandomSplitzyId();
            const emailName = (cred.user.email || "user").split("@")[0];
            const newUser: UserProfile = {
              uid,
              email: cred.user.email || "",
              displayName: cred.user.displayName || emailName || "Google User",
              splitzyId: generatedId,
              upiId: `${emailName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
              photoURL: cred.user.photoURL || "/assets/avatar_boy.jpg",
              onboardingCompleted: false,
              createdAt: new Date().toISOString(),
            };
            try {
              await setDoc(doc(db, "splitzyIds", generatedId), {
                uid,
                createdAt: newUser.createdAt,
                displayName: newUser.displayName,
                email: newUser.email,
              });
              await setDoc(doc(db, "users", uid), newUser);
            } catch (initErr) {
              console.warn("Failed to provision new Google profile in Firestore:", initErr);
            }
            persistUser(newUser);
            return {
              isNewUser: true,
              onboardingCompleted: false,
            };
          }
        } catch (dbErr) {
          console.warn("Firestore access error during Google login:", dbErr);
          const emailName = (cred.user.email || "user").split("@")[0];
          const fallbackUser: UserProfile = {
            uid,
            email: cred.user.email || "",
            displayName: cred.user.displayName || emailName || "Google User",
            splitzyId: generateRandomSplitzyId(),
            upiId: `${emailName.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
            photoURL: cred.user.photoURL || "/assets/avatar_boy.jpg",
            onboardingCompleted: false,
            createdAt: new Date().toISOString(),
          };
          persistUser(fallbackUser);
          return {
            isNewUser: true,
            onboardingCompleted: false,
          };
        }
      }

      return { isNewUser: false, onboardingCompleted: false };
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
    setFbUser(null);
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
    const targetUid = user?.uid || auth?.currentUser?.uid;
    if (!targetUid) {
      throw new Error("No active user session found. Please log in again.");
    }

    // Clean updates:
    // 1. Maintain uid so Firestore rule validation passes
    // 2. Strip undefined values (Firestore rejects undefined). Null/empty string photoURL is stored as "" to clear old photos.
    const firestoreUpdates: Record<string, any> = {
      uid: targetUid,
    };
    for (const [key, val] of Object.entries(updates)) {
      if (key !== "uid" && key !== "splitzyId") {
        if (key === "photoURL") {
          firestoreUpdates[key] = val || "";
        } else if (val !== undefined) {
          firestoreUpdates[key] = val;
        }
      }
    }
    firestoreUpdates.updatedAt = new Date().toISOString();

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "users", targetUid), firestoreUpdates);
      } catch (updateErr: any) {
        console.warn("updateDoc failed, falling back to setDoc with merge:", updateErr);
        if (user?.splitzyId) {
          firestoreUpdates.splitzyId = user.splitzyId;
        }
        await setDoc(doc(db, "users", targetUid), firestoreUpdates, { merge: true });
      }

      // Propagate photo / name change to all active groups memberDetails
      const newPhoto = updates.photoURL !== undefined ? (updates.photoURL || "") : undefined;
      const newName = updates.displayName;

      if (newPhoto !== undefined || newName !== undefined) {
        for (const g of groups) {
          if (g.members?.includes(targetUid) && g.memberDetails?.[targetUid]) {
            try {
              const groupPatch: Record<string, any> = {};
              if (newPhoto !== undefined) {
                groupPatch[`memberDetails.${targetUid}.photoURL`] = newPhoto;
              }
              if (newName !== undefined) {
                groupPatch[`memberDetails.${targetUid}.name`] = newName;
              }
              await updateDoc(doc(db, "groups", g.id), groupPatch);
            } catch (err) {
              console.warn(`Could not sync memberDetails in group ${g.id}:`, err);
            }
          }
        }
      }
    }

    const baseUser = user || {
      uid: targetUid,
      email: auth?.currentUser?.email || "",
      displayName: updates.displayName || "User",
      splitzyId: updates.splitzyId || generateRandomSplitzyId(),
      createdAt: new Date().toISOString(),
    };

    const updated: UserProfile = {
      ...baseUser,
      ...updates,
      photoURL: updates.photoURL !== undefined ? (updates.photoURL || "") : baseUser.photoURL,
      uid: targetUid,
      splitzyId: baseUser.splitzyId, // Guarantee splitzyId is never altered
      updatedAt: firestoreUpdates.updatedAt,
    };
    persistUser(updated);
  };

  // Create group
  const createGroup = async (
    name: string,
    description: string,
    icon: string,
    memberIds: string[],
    pendingInviteUids: string[] = []
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
      invitedMembers: pendingInviteUids,
      memberDetails,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, "groups", groupId), newGroup);
    }

    persistGroups([newGroup, ...groups]);

    // Send notifications to directly added friends
    const directNotifs: AppNotification[] = memberIds.map((mId) => ({
      id: `notif_${Date.now()}_${mId}`,
      userId: mId,
      title: "Group Invitation",
      message: `${user.displayName} added you to group "${name}"`,
      type: "GROUP_INVITE",
      data: { groupId, actorId: user.uid, actorName: user.displayName },
      read: false,
      createdAt: new Date().toISOString(),
    }));

    // Combined friend request + group invitation for non-friend invitees
    const combinedNotifs: AppNotification[] = [];
    if (pendingInviteUids && pendingInviteUids.length > 0 && isFirebaseConfigured && db) {
      for (const pUid of pendingInviteUids) {
        const reqId = `freq_grp_${Date.now()}_${pUid}`;
        const newReq: FriendRequest = {
          id: reqId,
          senderId: user.uid,
          senderName: user.displayName,
          senderSplitzyId: user.splitzyId,
          senderPhoto: user.photoURL,
          receiverId: pUid,
          receiverName: "User",
          receiverSplitzyId: "",
          status: "PENDING",
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "friendRequests", reqId), newReq);

        combinedNotifs.push({
          id: `notif_${Date.now()}_${pUid}`,
          userId: pUid,
          title: "Group Invitation & Friend Request",
          message: `${user.displayName} invited you to join "${name}" and sent you a friend request. Accepting will connect you and add you to the group!`,
          type: "GROUP_INVITE",
          data: { groupId, actorId: user.uid, actorName: user.displayName, friendRequestId: reqId },
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (isFirebaseConfigured && db) {
      for (const n of [...directNotifs, ...combinedNotifs]) {
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
    expenseType?: "group" | "friend" | "personal";
    isDirect?: boolean;
    isPersonal?: boolean;
    category?: string;
    title: string;
    amountPaise: number;
    payerId: string;
    payerName: string;
    recipientId?: string;
    recipientName?: string;
    recipientUpiId?: string;
    date: string;
    notes?: string;
    splitType: SplitType;
    shares: Array<{ userId: string; userName: string; userPhoto?: string; amountPaise: number }>;
  }): Promise<string> => {
    if (!user) throw new Error("Must be logged in to create an expense");

    const expenseType =
      data.expenseType === "personal" || data.isPersonal
        ? "personal"
        : data.expenseType === "friend" || data.isDirect
        ? "friend"
        : "group";

    const expenseId = `exp_${Date.now()}`;

    // Construct and validate typed, sanitized Firestore document
    const { expenseDoc, firestorePayload } = buildFirestoreExpense(expenseId, {
      expenseType,
      title: data.title,
      amountPaise: data.amountPaise,
      date: data.date,
      notes: data.notes,
      category: data.category,
      groupId: data.groupId,
      groupName: data.groupName,
      groupIcon: data.groupIcon,
      payerId: data.payerId,
      payerName: data.payerName,
      recipientId: data.recipientId,
      recipientName: data.recipientName,
      recipientUpiId: data.recipientUpiId,
      splitType: data.splitType,
      shares: data.shares,
      currentUserUid: user.uid,
      currentUserDisplayName: user.displayName,
      currentUserPhotoURL: user.photoURL,
      currentUserUpiId: user.upiId,
    });

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, "expenses", expenseId), firestorePayload);
    }

    persistExpenses([expenseDoc, ...expenses]);

    // Send notifications to all participants except creator ONLY for shared expenses
    if (expenseDoc.expenseType !== "personal") {
      const notifs: AppNotification[] = (expenseDoc.shares || [])
        .filter((s) => s.userId !== user.uid)
        .map((s) => ({
          id: `notif_${Date.now()}_${s.userId}`,
          userId: s.userId,
          title: "New Expense Added",
          message: `${expenseDoc.payerName} added "${expenseDoc.title}" - your share is ₹${(s.amountPaise / 100).toFixed(0)}`,
          type: "NEW_EXPENSE",
          data: {
            expenseId,
            ...(expenseDoc.groupId ? { groupId: expenseDoc.groupId } : {}),
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
    }

    return expenseId;
  };

  // Report payment
  const reportPayment = async (expenseId: string, note?: string) => {
    if (!user) return;
    const now = new Date().toISOString();

    let targetExpense = expenses.find((e) => e.id === expenseId);
    if (!targetExpense && db) {
      try {
        const snap = await getDoc(doc(db, "expenses", expenseId));
        if (snap.exists()) {
          targetExpense = snap.data() as Expense;
        }
      } catch (e) {
        console.warn("Could not fetch expense in reportPayment:", e);
      }
    }

    if (!targetExpense) return;

    const myShare = targetExpense.shares.find((s) => s.userId === user.uid);
    const updatedShares = targetExpense.shares.map((share) => {
      if (share.userId === user.uid) {
        return {
          ...share,
          status: "PAYMENT_REPORTED" as SharePaymentStatus,
          reportedAt: now,
          paymentProofNote: note || "",
        };
      }
      return share;
    });

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "expenses", expenseId), {
        shares: updatedShares,
      });

      const recipientUid = targetExpense.recipientId || targetExpense.payerId;
      if (recipientUid && recipientUid !== user.uid) {
        const reportedNotif: AppNotification = {
          id: `notif_${Date.now()}_${recipientUid}`,
          userId: recipientUid,
          title: "Payment Received?",
          message: `${user.displayName} marked their share of ₹${((myShare?.amountPaise || 0) / 100).toFixed(0)} as paid for "${targetExpense.title}". Did you receive it?`,
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
        await setDoc(doc(db, "notifications", reportedNotif.id), reportedNotif);
      }
    }

    const updated = expenses.map((exp) =>
      exp.id === expenseId ? { ...exp, shares: updatedShares } : exp
    );
    persistExpenses(updated);
  };

  // Recipient confirms payment receipt
  const confirmPaymentReceipt = async (expenseId: string, memberUserId: string) => {
    if (!user) return;
    const now = new Date().toISOString();

    let targetExpense = expenses.find((e) => e.id === expenseId);
    if (!targetExpense && db) {
      try {
        const snap = await getDoc(doc(db, "expenses", expenseId));
        if (snap.exists()) {
          targetExpense = snap.data() as Expense;
        }
      } catch (e) {
        console.warn("Could not fetch expense in confirmPaymentReceipt:", e);
      }
    }

    if (!targetExpense) return;

    const memberShare = targetExpense.shares.find((s) => s.userId === memberUserId);
    const updatedShares = targetExpense.shares.map((share) => {
      if (share.userId === memberUserId) {
        return {
          ...share,
          status: "PAID" as SharePaymentStatus,
          confirmedAt: now,
        };
      }
      return share;
    });

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "expenses", expenseId), {
        shares: updatedShares,
      });

      const confirmedNotif: AppNotification = {
        id: `notif_${Date.now()}_${memberUserId}`,
        userId: memberUserId,
        title: "Payment Confirmed! 🎉",
        message: `${user.displayName} confirmed receiving ₹${((memberShare?.amountPaise || 0) / 100).toFixed(0)} for "${targetExpense.title}".`,
        type: "PAYMENT_CONFIRMED",
        data: {
          expenseId,
          actorId: user.uid,
          actorName: user.displayName,
          amountPaise: memberShare?.amountPaise || 0,
        },
        read: false,
        createdAt: now,
      };
      await setDoc(doc(db, "notifications", confirmedNotif.id), confirmedNotif);
    }

    const updated = expenses.map((exp) =>
      exp.id === expenseId ? { ...exp, shares: updatedShares } : exp
    );
    persistExpenses(updated);
  };

  // Recipient disputes payment receipt
  const disputePaymentReceipt = async (expenseId: string, memberUserId: string) => {
    if (!user) return;
    const now = new Date().toISOString();

    let targetExpense = expenses.find((e) => e.id === expenseId);
    if (!targetExpense && db) {
      try {
        const snap = await getDoc(doc(db, "expenses", expenseId));
        if (snap.exists()) {
          targetExpense = snap.data() as Expense;
        }
      } catch (e) {
        console.warn("Could not fetch expense in disputePaymentReceipt:", e);
      }
    }

    if (!targetExpense) return;

    const memberShare = targetExpense.shares.find((s) => s.userId === memberUserId);
    const updatedShares = targetExpense.shares.map((share) => {
      if (share.userId === memberUserId) {
        return {
          ...share,
          status: "DISPUTED" as SharePaymentStatus,
        };
      }
      return share;
    });

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "expenses", expenseId), {
        shares: updatedShares,
      });

      const disputedNotif: AppNotification = {
        id: `notif_${Date.now()}_${memberUserId}`,
        userId: memberUserId,
        title: "Payment Not Received ⚠️",
        message: `${user.displayName} reported that they did NOT receive your payment of ₹${((memberShare?.amountPaise || 0) / 100).toFixed(0)} for "${targetExpense.title}". Please verify.`,
        type: "PAYMENT_DISPUTED",
        data: {
          expenseId,
          actorId: user.uid,
          actorName: user.displayName,
          amountPaise: memberShare?.amountPaise || 0,
        },
        read: false,
        createdAt: now,
      };
      await setDoc(doc(db, "notifications", disputedNotif.id), disputedNotif);
    }

    const updated = expenses.map((exp) =>
      exp.id === expenseId ? { ...exp, shares: updatedShares } : exp
    );
    persistExpenses(updated);
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

  // Cancel outgoing friend request (by sender)
  const cancelFriendRequest = async (requestId: string) => {
    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "friendRequests", requestId), {
          status: "CANCELLED",
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("updateDoc cancel failed, attempting deleteDoc:", err);
        try {
          await deleteDoc(doc(db, "friendRequests", requestId));
        } catch (delErr) {
          console.error("deleteDoc cancel fallback failed:", delErr);
          throw delErr;
        }
      }
    }
    const updatedReqs = friendRequests.map((r) =>
      r.id === requestId ? { ...r, status: "CANCELLED" as const } : r
    );
    persistFriendRequests(updatedReqs);
  };

  // Reject friend request
  const rejectFriendRequest = async (requestId: string) => {
    const req = friendRequests.find((r) => r.id === requestId);
    // If current user is sender, route to cancelFriendRequest to obey Firestore rules
    if (req && user && req.senderId === user.uid) {
      return cancelFriendRequest(requestId);
    }

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, "friendRequests", requestId), {
          status: "REJECTED",
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("updateDoc reject failed, attempting deleteDoc:", err);
        try {
          await deleteDoc(doc(db, "friendRequests", requestId));
        } catch (delErr) {
          console.error("deleteDoc reject fallback failed:", delErr);
          throw delErr;
        }
      }
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
    const now = new Date().toISOString();
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, "friendships", canonicalId), {
        id: canonicalId,
        users: [user.uid, friendUid],
        status: "REMOVED",
        updatedAt: now,
      }, { merge: true });

      // Clean up any old friendRequests between these two users
      try {
        const qReqsA = query(
          collection(db, "friendRequests"),
          where("senderId", "==", user.uid),
          where("receiverId", "==", friendUid)
        );
        const qReqsB = query(
          collection(db, "friendRequests"),
          where("senderId", "==", friendUid),
          where("receiverId", "==", user.uid)
        );
        const [snapA, snapB] = await Promise.all([getDocs(qReqsA), getDocs(qReqsB)]);
        for (const d of [...snapA.docs, ...snapB.docs]) {
          await deleteDoc(d.ref).catch(() => {});
        }
      } catch (cleanErr) {
        console.warn("Notice: could not delete old friend requests on removal:", cleanErr);
      }
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
    const updatedInvited = (targetGroup.invitedMembers || []).filter((id) => id !== user.uid);
    const updatedFormer = Array.from(new Set([...(targetGroup.formerMembers || []), user.uid]));

    const leavingMemberDetail = targetGroup.memberDetails?.[user.uid] || {
      uid: user.uid,
      name: user.displayName,
      splitzyId: user.splitzyId,
      photoURL: user.photoURL,
      role: "member",
    };

    const updatedDetails = { ...targetGroup.memberDetails };
    delete updatedDetails[user.uid];

    const updatedFormerDetails = {
      ...(targetGroup.formerMemberDetails || {}),
      [user.uid]: leavingMemberDetail,
    };

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "groups", groupId), {
        members: updatedMembers,
        invitedMembers: updatedInvited,
        formerMembers: updatedFormer,
        memberDetails: updatedDetails,
        formerMemberDetails: updatedFormerDetails,
      });

      // Send GROUP_MEMBER_LEFT notification ONLY to remaining group members (excluding the departing user)
      const remainingMembers = targetGroup.members.filter((m) => m !== user.uid);
      const now = new Date().toISOString();
      for (const memberUid of remainingMembers) {
        const notifId = `notif_${Date.now()}_${memberUid}`;
        const notif: AppNotification = {
          id: notifId,
          userId: memberUid,
          title: "Member Left Group",
          message: `${user.displayName} left the group "${targetGroup.name}"`,
          type: "GROUP_MEMBER_LEFT",
          data: {
            groupId: targetGroup.id,
            groupName: targetGroup.name,
            actorId: user.uid,
            actorName: user.displayName,
          },
          read: false,
          createdAt: now,
        };
        try {
          await setDoc(doc(db, "notifications", notifId), notif);
        } catch (nErr) {
          console.warn("Failed to send leave notification:", nErr);
        }
      }
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
        members: [],
        formerMembers: Array.from(new Set([...(targetGroup.formerMembers || []), ...(targetGroup.members || [])])),
      });
    }

    const updatedGroups = groups.filter((g) => g.id !== groupId);
    persistGroups(updatedGroups);
    return { success: true };
  };

  // Invite Group Member
  // Supports Option A (Group invitation only), Option B (Friend request only), and Option C (Friend request + group invite)
  // Accepts target UID or Splitzy ID
  const inviteGroupMember = async (
    groupId: string,
    targetUidOrSplitzyId: string,
    option: "GROUP_ONLY" | "FRIEND_ONLY" | "COMBINED" = "GROUP_ONLY"
  ): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "Not logged in" };

    let targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup && isFirebaseConfigured && db) {
      const gDoc = await getDoc(doc(db, "groups", groupId));
      if (gDoc.exists()) {
        targetGroup = gDoc.data() as Group;
      }
    }
    if (!targetGroup) return { success: false, message: "Group not found" };

    // Resolve target user profile
    const cleanId = targetUidOrSplitzyId.trim();
    let targetProfile: UserProfile | null =
      friends.find((f) => f.uid === cleanId || f.splitzyId.toUpperCase() === cleanId.toUpperCase()) || null;

    if (!targetProfile && isFirebaseConfigured && db) {
      // Look up by UID first
      const uDoc = await getDoc(doc(db, "users", cleanId));
      if (uDoc.exists()) {
        targetProfile = uDoc.data() as UserProfile;
      } else {
        // Look up by splitzyId
        const idDoc = await getDoc(doc(db, "splitzyIds", cleanId.toUpperCase()));
        if (idDoc.exists()) {
          const idData = idDoc.data();
          const userDoc = await getDoc(doc(db, "users", idData.uid));
          if (userDoc.exists()) {
            targetProfile = userDoc.data() as UserProfile;
          }
        } else {
          const q = query(collection(db, "users"), where("splitzyId", "==", cleanId.toUpperCase()));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            targetProfile = qSnap.docs[0].data() as UserProfile;
          }
        }
      }
    }

    if (!targetProfile) {
      return { success: false, message: `User "${cleanId}" not found` };
    }

    if (targetProfile.uid === user.uid) {
      return { success: false, message: "You cannot invite yourself" };
    }

    // FRIEND_ONLY mode: only send a friend request, do not touch group
    if (option === "FRIEND_ONLY") {
      const res = await sendFriendRequest(targetProfile.splitzyId);
      return res;
    }

    if (targetGroup.members.includes(targetProfile.uid)) {
      return { success: false, message: `${targetProfile.displayName} is already a member of this group` };
    }

    if (targetGroup.invitedMembers?.includes(targetProfile.uid)) {
      return { success: false, message: `${targetProfile.displayName} has already been invited to this group` };
    }

    const invited = Array.from(new Set([...(targetGroup.invitedMembers || []), targetProfile.uid]));

    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, "groups", groupId), {
        invitedMembers: invited,
      });

      let friendReqId: string | undefined = undefined;

      // Option C: Combined friend request + group invitation
      if (option === "COMBINED") {
        friendReqId = `freq_grp_${Date.now()}_${targetProfile.uid}`;
        const newReq: FriendRequest = {
          id: friendReqId,
          senderId: user.uid,
          senderName: user.displayName,
          senderSplitzyId: user.splitzyId,
          senderPhoto: user.photoURL,
          receiverId: targetProfile.uid,
          receiverName: targetProfile.displayName,
          receiverSplitzyId: targetProfile.splitzyId,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, "friendRequests", friendReqId), newReq);
      }

      const notifId = `notif_${Date.now()}_${targetProfile.uid}`;
      const notifMessage =
        option === "COMBINED"
          ? `${user.displayName} invited you to join "${targetGroup.name}" and sent you a friend request. Accepting will connect you and add you to the group!`
          : `${user.displayName} invited you to join group "${targetGroup.name}"`;

      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        userId: targetProfile.uid,
        title: option === "COMBINED" ? "Group & Friend Invitation" : "Group Invitation",
        message: notifMessage,
        type: "GROUP_INVITE",
        data: {
          groupId,
          groupName: targetGroup.name,
          actorId: user.uid,
          actorName: user.displayName,
          inviteType: option,
          ...(friendReqId ? { friendRequestId: friendReqId } : {}),
        },
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    const updated = groups.map((g) => (g.id === groupId ? { ...g, invitedMembers: invited } : g));
    persistGroups(updated);
    return {
      success: true,
      message:
        option === "COMBINED"
          ? `Invitation and friend request sent to ${targetProfile.displayName}!`
          : `Group invitation sent to ${targetProfile.displayName}!`,
    };
  };

  // Accept Group Invite
  const acceptGroupInvite = async (
    groupId: string,
    options?: { acceptCombinedFriendship?: boolean; friendRequestId?: string }
  ): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "Not logged in" };

    let targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup && isFirebaseConfigured && db) {
      const gDoc = await getDoc(doc(db, "groups", groupId));
      if (gDoc.exists()) {
        targetGroup = gDoc.data() as Group;
      }
    }
    if (!targetGroup) return { success: false, message: "Group not found" };

    const updatedMembers = Array.from(new Set([...(targetGroup.members || []), user.uid]));
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

      // ONLY establish friendship if explicitly requested as part of a combined invite acceptance!
      if (options?.acceptCombinedFriendship && targetGroup.createdBy && targetGroup.createdBy !== user.uid) {
        const canonicalId = [user.uid, targetGroup.createdBy].sort().join("_");
        const now = new Date().toISOString();
        await setDoc(
          doc(db, "friendships", canonicalId),
          {
            id: canonicalId,
            users: [user.uid, targetGroup.createdBy],
            userA: user.uid < targetGroup.createdBy ? user.uid : targetGroup.createdBy,
            userB: user.uid < targetGroup.createdBy ? targetGroup.createdBy : user.uid,
            status: "ACTIVE",
            createdAt: now,
            updatedAt: now,
          },
          { merge: true }
        );

        if (options.friendRequestId) {
          await updateDoc(doc(db, "friendRequests", options.friendRequestId), {
            status: "ACCEPTED",
          });
        }
      }

      // Notify the group creator
      if (targetGroup.createdBy && targetGroup.createdBy !== user.uid) {
        const notifId = `notif_${Date.now()}`;
        await setDoc(doc(db, "notifications", notifId), {
          id: notifId,
          userId: targetGroup.createdBy,
          title: "Group Invitation Accepted",
          message: `${user.displayName} joined "${targetGroup.name}"!`,
          type: "GROUP_ACCEPTED",
          data: {
            groupId,
            actorId: user.uid,
            actorName: user.displayName,
          },
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
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
    return { success: true, message: `You have joined ${targetGroup.name}!` };
  };

  // Decline Group Invite
  const declineGroupInvite = async (
    groupId: string,
    friendRequestId?: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: "Not logged in" };

    let targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup && isFirebaseConfigured && db) {
      const gDoc = await getDoc(doc(db, "groups", groupId));
      if (gDoc.exists()) {
        targetGroup = gDoc.data() as Group;
      }
    }

    if (isFirebaseConfigured && db && targetGroup) {
      const updatedInvited = (targetGroup.invitedMembers || []).filter((id) => id !== user.uid);
      await updateDoc(doc(db, "groups", groupId), {
        invitedMembers: updatedInvited,
      });

      if (friendRequestId) {
        await updateDoc(doc(db, "friendRequests", friendRequestId), {
          status: "REJECTED",
        });
      }
    }

    return { success: true, message: "Invitation declined" };
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

  // Real user discovery using Splitzy ID (Safe lookup, exact match, privacy protected)
  const searchUserBySplitzyId = async (
    splitzyId: string
  ): Promise<{
    found: boolean;
    user?: Partial<UserProfile>;
    status?: "SELF" | "FRIENDS" | "REQUEST_SENT" | "REQUEST_RECEIVED" | "CAN_ADD";
    requestId?: string;
    message?: string;
  }> => {
    if (!user) return { found: false, message: "Please log in first" };
    const cleanId = splitzyId.trim().toUpperCase();
    if (!cleanId) return { found: false, message: "Please enter a Splitzy ID" };

    if (cleanId === user.splitzyId.toUpperCase()) {
      return {
        found: true,
        status: "SELF",
        user: {
          uid: user.uid,
          displayName: user.displayName,
          splitzyId: user.splitzyId,
          photoURL: user.photoURL,
        },
        message: "This is your own Splitzy ID",
      };
    }

    // Check existing friends
    const existingFriend = friends.find((f) => f.splitzyId.toUpperCase() === cleanId);
    if (existingFriend) {
      return {
        found: true,
        status: "FRIENDS",
        user: {
          uid: existingFriend.uid,
          displayName: existingFriend.displayName,
          splitzyId: existingFriend.splitzyId,
          photoURL: existingFriend.photoURL,
        },
        message: "You are already friends",
      };
    }

    // Check incoming/outgoing friend requests
    const outgoingReq = friendRequests.find(
      (r) =>
        r.status === "PENDING" &&
        r.senderId === user.uid &&
        r.receiverSplitzyId?.toUpperCase() === cleanId
    );
    if (outgoingReq) {
      return {
        found: true,
        status: "REQUEST_SENT",
        user: {
          uid: outgoingReq.receiverId,
          displayName: outgoingReq.receiverName,
          splitzyId: outgoingReq.receiverSplitzyId,
        },
        requestId: outgoingReq.id,
        message: "Friend request sent",
      };
    }

    const incomingReq = friendRequests.find(
      (r) =>
        r.status === "PENDING" &&
        r.receiverId === user.uid &&
        r.senderSplitzyId?.toUpperCase() === cleanId
    );
    if (incomingReq) {
      return {
        found: true,
        status: "REQUEST_RECEIVED",
        user: {
          uid: incomingReq.senderId,
          displayName: incomingReq.senderName,
          splitzyId: incomingReq.senderSplitzyId,
          photoURL: incomingReq.senderPhoto,
        },
        requestId: incomingReq.id,
        message: "This user sent you a friend request",
      };
    }

    // Search in Firestore: exact lookup via splitzyIds index or users collection
    if (isFirebaseConfigured && db) {
      try {
        const idDoc = await getDoc(doc(db, "splitzyIds", cleanId));
        let targetUid = idDoc.exists() ? idDoc.data().uid : null;

        if (!targetUid) {
          const q = query(collection(db, "users"), where("splitzyId", "==", cleanId));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            targetUid = qSnap.docs[0].id;
          }
        }

        if (targetUid) {
          const targetDoc = await getDoc(doc(db, "users", targetUid));
          if (targetDoc.exists()) {
            const targetData = targetDoc.data() as UserProfile;
            return {
              found: true,
              status: "CAN_ADD",
              user: {
                uid: targetData.uid,
                displayName: targetData.displayName,
                splitzyId: targetData.splitzyId,
                photoURL: targetData.photoURL,
              },
            };
          }
        }
      } catch (e) {
        console.warn("Firestore searchUserBySplitzyId error:", e);
      }
    }

    return {
      found: false,
      message: `No user found with Splitzy ID "${cleanId}". Make sure the ID is correct.`,
    };
  };

  // Mutual friends and People You May Know: Real relationship calculation
  const getMutualFriendSuggestions = async (): Promise<
    Array<{ user: UserProfile; mutualCount: number; mutualFriendNames: string[] }>
  > => {
    if (!user || !isFirebaseConfigured || !db) return [];

    try {
      const myFriendshipsSnap = await getDocs(
        query(
          collection(db, "friendships"),
          where("users", "array-contains", user.uid),
          where("status", "==", "ACTIVE")
        )
      );

      const directFriendUids = new Set<string>();
      const directFriendMap = new Map<string, string>();
      friends.forEach((f) => {
        directFriendUids.add(f.uid);
        directFriendMap.set(f.uid, f.displayName);
      });

      myFriendshipsSnap.forEach((d) => {
        const data = d.data();
        const otherUid = data.users?.find((u: string) => u !== user.uid);
        if (otherUid) directFriendUids.add(otherUid);
      });

      if (directFriendUids.size === 0) {
        return [];
      }

      const candidateMutuals = new Map<string, Set<string>>();
      const friendUidArray = Array.from(directFriendUids);

      for (const fUid of friendUidArray) {
        const friendName = directFriendMap.get(fUid) || "Friend";
        const friendSnap = await getDocs(
          query(
            collection(db, "friendships"),
            where("users", "array-contains", fUid),
            where("status", "==", "ACTIVE")
          )
        );

        friendSnap.forEach((d) => {
          const data = d.data();
          const candidateUid = data.users?.find((u: string) => u !== fUid);
          if (
            candidateUid &&
            candidateUid !== user.uid &&
            !directFriendUids.has(candidateUid)
          ) {
            if (!candidateMutuals.has(candidateUid)) {
              candidateMutuals.set(candidateUid, new Set());
            }
            candidateMutuals.get(candidateUid)!.add(friendName);
          }
        });
      }

      const pendingUids = new Set(
        friendRequests
          .filter((r) => r.status === "PENDING")
          .map((r) => (r.senderId === user.uid ? r.receiverId : r.senderId))
      );

      const suggestions: Array<{
        user: UserProfile;
        mutualCount: number;
        mutualFriendNames: string[];
      }> = [];

      for (const [candUid, mutualNamesSet] of candidateMutuals.entries()) {
        if (pendingUids.has(candUid)) continue;

        const candDoc = await getDoc(doc(db, "users", candUid));
        if (candDoc.exists()) {
          const candProfile = candDoc.data() as UserProfile;
          const mutualFriendNames = Array.from(mutualNamesSet);
          suggestions.push({
            user: candProfile,
            mutualCount: mutualFriendNames.length,
            mutualFriendNames,
          });
        }
      }

      return suggestions.sort((a, b) => b.mutualCount - a.mutualCount);
    } catch (e) {
      console.warn("getMutualFriendSuggestions error:", e);
      return [];
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
        fbUser,
        isLoading,
        authState,
        isEmailVerified:
          !fbUser ||
          !!fbUser.emailVerified ||
          !!fbUser.providerData?.some((p: any) => p.providerId === "google.com"),
        sendVerificationEmail: sendVerificationEmailAction,
        reloadUser: reloadUserAction,
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
        cancelFriendRequest,
        removeFriend,
        leaveGroup,
        deleteGroup,
        inviteGroupMember,
        acceptGroupInvite,
        declineGroupInvite,
        deleteExpense,
        sendPaymentReminder,
        markNotificationRead,
        markAllNotificationsRead,
        searchUserBySplitzyId,
        getMutualFriendSuggestions,
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
