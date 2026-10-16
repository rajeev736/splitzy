"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit2,
  Users,
  PlusCircle,
  TrendingUp,
  Share2,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  LogOut,
  Trash2,
  UserPlus,
  AlertTriangle,
  Receipt,
  Crown,
  Check,
  Search,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  formatPaise,
  calculateMemberGroupBalance,
  canUserLeaveGroup,
  canDeleteGroup,
} from "@/lib/money";
import { Suspense } from "react";
import { db, isFirebaseConfigured } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, getDoc, doc } from "firebase/firestore";
import { Expense, Group } from "@/lib/types";

const GROUP_ICONS = [
  { label: "Food", src: "/assets/icon_food.jpg" },
  { label: "Beach", src: "/assets/icon_beach.jpg" },
  { label: "Home", src: "/assets/icon_house.jpg" },
  { label: "Movie", src: "/assets/icon_movie.jpg" },
];

function GroupDashboardContent() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const {
    groups,
    expenses,
    friends,
    user,
    friendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    searchUserBySplitzyId,
    updateGroup,
    leaveGroup,
    deleteGroup,
    inviteGroupMember,
  } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "members">("overview");

  const [directGroupExpenses, setDirectGroupExpenses] = useState<Expense[]>([]);
  const [fetchedGroup, setFetchedGroup] = useState<Group | null>(null);

  // Real-time direct Firestore listener for group expenses
  useEffect(() => {
    if (!groupId || !isFirebaseConfigured || !db) return;
    const q = query(collection(db, "expenses"), where("groupId", "==", groupId));
    const unsubs = onSnapshot(
      q,
      (snap) => {
        const list: Expense[] = [];
        snap.forEach((d) => list.push(d.data() as Expense));
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDirectGroupExpenses(list);
      },
      (err) => console.warn("Direct group expenses sync notice:", err)
    );
    return () => unsubs();
  }, [groupId]);

  useEffect(() => {
    if (groupId && !groups.some((g) => g.id === groupId) && isFirebaseConfigured && db) {
      getDoc(doc(db, "groups", groupId))
        .then((snap) => {
          if (snap.exists()) setFetchedGroup(snap.data() as Group);
        })
        .catch((e) => console.warn("Direct group fetch notice:", e));
    }
  }, [groupId, groups]);

  const fallbackGroup: Group = {
    id: groupId || "grp_default",
    name: "Group",
    description: "",
    icon: "/assets/icon_food.jpg",
    members: user?.uid ? [user.uid] : ["usr_me"],
    invitedMembers: [],
    formerMembers: [],
    formerMemberDetails: {},
    createdBy: user?.uid || "usr_me",
    createdAt: new Date().toISOString(),
    memberDetails: {},
  };

  const group = groups.find((g) => g.id === groupId) || fetchedGroup || fallbackGroup;

  // Merge direct group expenses with context expenses for complete coverage
  const groupExpensesMap = new Map<string, Expense>();
  expenses.filter((e) => e.groupId === (group?.id || groupId)).forEach((e) => groupExpensesMap.set(e.id, e));
  directGroupExpenses.forEach((e) => groupExpensesMap.set(e.id, e));
  const groupExpenses = Array.from(groupExpensesMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalExpensePaise = groupExpenses.reduce((acc, curr) => acc + curr.amountPaise, 0);

  // User's actual calculated share in this group's expenses
  const myTotalGroupSharePaise = groupExpenses.reduce((acc, exp) => {
    const myShare = exp.shares?.find((s) => s.userId === user?.uid);
    return acc + (myShare ? myShare.amountPaise : 0);
  }, 0);

  // 3-dot Header Menu
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Edit Group Modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState(group?.name || "");
  const [editDesc, setEditDesc] = useState(group?.description || "");
  const [editIcon, setEditIcon] = useState(group?.icon || "/assets/icon_food.jpg");
  const [isSaving, setIsSaving] = useState(false);

  // Leave Group Modal state
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Delete Group Modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invite Modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    if (group) {
      setEditName(group.name);
      setEditDesc(group.description || "");
      setEditIcon(group.icon);
    }
  }, [group?.id, group?.name, group?.description, group?.icon]);

  const handleSaveGroup = async () => {
    if (!editName.trim()) {
      toastError("Group name is required");
      return;
    }
    setIsSaving(true);
    try {
      await updateGroup(group.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        icon: editIcon,
      });
      toastSuccess("Group updated successfully!");
      setIsEditOpen(false);
    } catch (e) {
      toastError("Failed to update group");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmLeaveGroup = async () => {
    setIsLeaving(true);
    try {
      const res = await leaveGroup(group.id);
      if (res.success) {
        toastSuccess("You have left the group");
        setIsLeaveOpen(false);
        router.push("/groups");
      } else {
        toastError(res.message || "Failed to leave group");
      }
    } catch (e: any) {
      toastError(e?.message || "Failed to leave group");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleConfirmDeleteGroup = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteGroup(group.id);
      if (res.success) {
        toastSuccess("Group deleted successfully");
        setIsDeleteOpen(false);
        router.push("/groups");
      } else {
        toastError(res.message || "Failed to delete group");
      }
    } catch (e: any) {
      toastError(e?.message || "Failed to delete group");
    } finally {
      setIsDeleting(false);
    }
  };

  const [splitzyIdSearch, setSplitzyIdSearch] = useState("");
  const [isSearchingId, setIsSearchingId] = useState(false);
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [isInvitingTarget, setIsInvitingTarget] = useState(false);
  const [sendGroupInviteChecked, setSendGroupInviteChecked] = useState(true);
  const [sendFriendRequestChecked, setSendFriendRequestChecked] = useState(false);

  const handleSearchSplitzyId = async () => {
    const clean = splitzyIdSearch.trim().toUpperCase();
    if (!clean) return;
    setIsSearchingId(true);
    setSearchedUser(null);
    setSendGroupInviteChecked(true);
    setSendFriendRequestChecked(false);
    try {
      const res = await searchUserBySplitzyId(clean);
      setSearchedUser(res);
    } catch (e: any) {
      toastError(e?.message || "Error searching user");
    } finally {
      setIsSearchingId(false);
    }
  };

  const handleInviteUserWithOptions = async (
    targetUidOrId: string,
    option: "GROUP_ONLY" | "FRIEND_ONLY" | "COMBINED"
  ) => {
    setIsInvitingTarget(true);
    try {
      const res = await inviteGroupMember(group.id, targetUidOrId, option);
      if (res.success) {
        toastSuccess(res.message || "Invitation sent!");
        setSearchedUser(null);
        setSplitzyIdSearch("");
      } else {
        toastError(res.message || "Failed to invite user");
      }
    } catch (e: any) {
      toastError(e?.message || "Failed to invite user");
    } finally {
      setIsInvitingTarget(false);
    }
  };

  const handleAddFriendFromMember = async (
    targetSplitzyIdOrUid: string,
    targetName: string
  ) => {
    try {
      const res = await sendFriendRequest(targetSplitzyIdOrUid);
      if (res.success) {
        toastSuccess(res.message || `Friend request sent to ${targetName}!`);
      } else {
        toastError(res.message || "Failed to send friend request");
      }
    } catch (e: any) {
      toastError(e?.message || "Failed to send friend request");
    }
  };

  const handleAcceptFriendFromMember = async (reqId: string) => {
    try {
      await acceptFriendRequest(reqId);
      toastSuccess("Friend request accepted!");
    } catch (e: any) {
      toastError(e?.message || "Failed to accept friend request");
    }
  };

  const isCreator = user?.uid === group.createdBy;
  const leaveCheck = user ? canUserLeaveGroup(user.uid, group, expenses) : { allowed: false, reason: "" };
  const deleteCheck = user ? canDeleteGroup(user.uid, group, expenses) : { allowed: false, reason: "" };

  const nonMemberFriends = friends.filter((f) => !group.members.includes(f.uid));

  return (
    <AppShell>
      <AppHeader
        title={group.name}
        showBack={true}
        rightAction={
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Group options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Contextual Dropdown */}
            {isMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push(`/groups/${group.id}/members`);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  View Members
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsInviteOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                  Invite Members
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsEditOpen(true);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                  Edit Group
                </button>

                <div className="border-t border-slate-100 my-1" />

                {!isCreator ? (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsLeaveOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                    Leave Group
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsDeleteOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    Delete Group
                  </button>
                )}
              </div>
            )}
          </div>
        }
      />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 pb-24">
        {/* Screen 16: Group Header Hero Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-md mb-3">
            <Image src={group.icon} alt={group.name} fill className="object-cover" />
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0F172A]">{group.name}</h1>
            <button
              onClick={() => setIsEditOpen(true)}
              className="text-slate-400 hover:text-[#2563EB] p-1.5 hover:bg-slate-100 rounded-full transition-all"
              title="Edit Group"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#64748B] mt-0.5">
            <span>{group.members.length} members</span>
            {isCreator && (
              <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                You are Creator 👑
              </span>
            )}
          </div>
          {group.description && (
            <p className="text-xs text-[#64748B] mt-1 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
              {group.description}
            </p>
          )}

          {/* Segmented Control Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl w-full max-w-sm mt-5 text-xs font-bold">
            {(["overview", "expenses", "members"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-xl capitalize transition-all ${
                  activeTab === tab
                    ? "bg-white text-[#2563EB] shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-5">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B]">Total Expenses</span>
                <div className="text-lg font-extrabold text-[#0F172A] mt-1">
                  {formatPaise(totalExpensePaise)}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-[#64748B]">Your Share</span>
                <div className="text-lg font-extrabold text-[#0F172A] mt-1">
                  {formatPaise(myTotalGroupSharePaise)}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-[#10B981]">You are Owed</span>
                <div className="text-lg font-extrabold text-[#10B981] mt-1">
                  {user ? formatPaise(calculateMemberGroupBalance(user.uid, group.id, groupExpenses).owedToUserPaise) : "₹0"}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-[#EF4444]">You Owe</span>
                <div className="text-lg font-extrabold text-[#EF4444] mt-1">
                  {user ? formatPaise(calculateMemberGroupBalance(user.uid, group.id, groupExpenses).userOwesPaise) : "₹0"}
                </div>
              </div>
            </div>

            {/* Recent Expenses in Group */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F172A]">Recent Group Expenses</h3>
                <button
                  onClick={() => setActiveTab("expenses")}
                  className="text-xs font-bold text-[#2563EB] hover:underline"
                >
                  View All ({groupExpenses.length})
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {groupExpenses.slice(0, 4).map((exp) => (
                  <Link
                    key={exp.id}
                    href={`/expenses/${exp.id}`}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">{exp.title}</div>
                        <div className="text-[11px] text-[#64748B]">Paid by {exp.payerName} • {exp.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#0F172A]">{formatPaise(exp.amountPaise)}</div>
                      <Badge variant={exp.shares.every((s) => s.status === "PAID") ? "paid" : "pending"} size="sm" />
                    </div>
                  </Link>
                ))}

                {groupExpenses.length === 0 && (
                  <div className="p-8 text-center text-xs text-[#64748B]">
                    No expenses recorded in this group yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "expenses" && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[#0F172A]">All Expenses</h3>
            <div className="divide-y divide-slate-100">
              {groupExpenses.map((exp) => (
                <Link
                  key={exp.id}
                  href={`/expenses/${exp.id}`}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors"
                >
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">{exp.title}</div>
                    <div className="text-[11px] text-[#64748B]">Paid by {exp.payerName} • {exp.date}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-[#0F172A]">{formatPaise(exp.amountPaise)}</div>
                    <Badge variant={exp.shares.every((s) => s.status === "PAID") ? "paid" : "pending"} size="sm" />
                  </div>
                </Link>
              ))}

              {groupExpenses.length === 0 && (
                <div className="p-8 text-center text-xs text-[#64748B]">
                  No expenses added yet.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "members" && (
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Group Members</h3>
                <p className="text-xs text-[#64748B]">Authoritative group membership and balances</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsInviteOpen(true)}
                leftIcon={<UserPlus className="w-3.5 h-3.5" />}
              >
                Invite
              </Button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {group.members.map((mId) => {
                const info = (group.memberDetails as Record<string, any> | undefined)?.[mId];
                const fr = friends.find((f) => f.uid === mId);
                const isMemberCreator = mId === group.createdBy;
                const mBalance = calculateMemberGroupBalance(mId, group.id, groupExpenses);
                const isCurrent = mId === user?.uid;
                const isFriend = friends.some((f) => f.uid === mId);
                const outgoingReq = friendRequests.find(
                  (r) => r.status === "PENDING" && r.senderId === user?.uid && r.receiverId === mId
                );
                const incomingReq = friendRequests.find(
                  (r) => r.status === "PENDING" && r.receiverId === user?.uid && r.senderId === mId
                );
                const memberSplitzyId = info?.splitzyId || fr?.splitzyId || "";

                return (
                  <div key={mId} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={info?.photoURL || fr?.photoURL}
                        name={info?.name || fr?.displayName || "Member"}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0F172A] dark:text-white flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{info?.name || fr?.displayName || `User ${mId.slice(-4)}`}</span>
                          {isMemberCreator && (
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5" /> Creator
                            </span>
                          )}
                          {!isMemberCreator && info?.role === "admin" && (
                            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B] dark:text-slate-400 mt-0.5 truncate">
                          {memberSplitzyId || mId}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Friendship status & actions relative to viewer */}
                      {isCurrent ? (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-2 py-0.5 rounded-full">
                          You
                        </span>
                      ) : isFriend ? (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Friends
                        </span>
                      ) : outgoingReq ? (
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold px-2 py-0.5 rounded-full">
                          Request Sent
                        </span>
                      ) : incomingReq ? (
                        <Button
                          size="sm"
                          onClick={() => handleAcceptFriendFromMember(incomingReq.id)}
                        >
                          Accept Request
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleAddFriendFromMember(
                              memberSplitzyId || mId,
                              info?.name || fr?.displayName || "Member"
                            )
                          }
                          leftIcon={<UserPlus className="w-3 h-3" />}
                        >
                          Add Friend
                        </Button>
                      )}

                      {/* Net group balance */}
                      <div className="text-right min-w-[65px]">
                        {mBalance.netPaise > 0 ? (
                          <span className="text-xs font-bold text-emerald-600">
                            +{formatPaise(mBalance.netPaise)}
                          </span>
                        ) : mBalance.netPaise < 0 ? (
                          <span className="text-xs font-bold text-red-600">
                            -{formatPaise(Math.abs(mBalance.netPaise))}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Settled</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty state when group has only 1 member (creator) */}
            {group.members.length === 1 && (
              <div className="p-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 space-y-2 mt-3">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No other members yet
                </div>
                <p className="text-[11px] text-slate-500">
                  Invite friends or search by Splitzy ID to split expenses together.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsInviteOpen(true)}
                  leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                >
                  Invite Members
                </Button>
              </div>
            )}

            {/* Former Members Section */}
            {group.formerMembers && group.formerMembers.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Former Members ({group.formerMembers.length})
                  </div>
                  <span className="text-[11px] text-slate-400">Past activity preserved</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/60 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                  {group.formerMembers.map((mId: string) => {
                    const info = (group.formerMemberDetails as Record<string, any> | undefined)?.[mId] || (group.memberDetails as Record<string, any> | undefined)?.[mId];
                    const name = info?.name || "Former Member";
                    const photo = info?.photoURL;
                    const splitzyId = info?.splitzyId || mId;

                    return (
                      <div key={mId} className="p-3 flex items-center justify-between opacity-80">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar src={photo} name={name} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              {splitzyId}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-200/60 dark:bg-slate-800 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
                          Left Group
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 md:static md:bg-transparent md:border-0 md:p-0">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Button
              fullWidth
              size="lg"
              variant="outline"
              onClick={() => router.push(`/expenses/new?groupId=${group.id}`)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Add Expense
            </Button>
            <Button
              fullWidth
              size="lg"
              onClick={() => router.push(`/expenses/new?groupId=${group.id}`)}
              rightIcon={<TrendingUp className="w-4 h-4" />}
            >
              Split Bill
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Group Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Group"
      >
        <div className="space-y-4">
          <Input
            label="Group Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g. Goa Trip, Flat 402"
            required
          />

          <Input
            label="Description (Optional)"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="e.g. Goa trip with college gang"
          />

          <div>
            <label className="text-xs font-semibold text-[#0F172A] mb-2 block">
              Group Category Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {GROUP_ICONS.map((ic) => {
                const isSelected = editIcon === ic.src;
                return (
                  <button
                    key={ic.src}
                    type="button"
                    onClick={() => setEditIcon(ic.src)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
                      isSelected
                        ? "border-[#2563EB] bg-blue-50/70 ring-2 ring-blue-100 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200">
                      <Image src={ic.src} alt={ic.label} fill className="object-cover" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">{ic.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-100 mt-4">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              fullWidth
              isLoading={isSaving}
              onClick={handleSaveGroup}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Leave Group Modal with Invariant Enforcement */}
      <Modal
        isOpen={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        title="Leave Group"
      >
        <div className="space-y-4 pt-1">
          {!leaveCheck.allowed ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cannot Leave Group</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                {leaveCheck.reason}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to leave <strong>{group.name}</strong>? All historical expenses and your records in them will be preserved.
            </p>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setIsLeaveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              disabled={!leaveCheck.allowed}
              isLoading={isLeaving}
              onClick={handleConfirmLeaveGroup}
            >
              Leave Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Group Modal with Invariant Enforcement (Creator Only) */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Group"
      >
        <div className="space-y-4 pt-1">
          {!deleteCheck.allowed ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Cannot Delete Group</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                {deleteCheck.reason}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete and archive <strong>{group.name}</strong>? All balances are fully settled.
            </p>
          )}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              disabled={!deleteCheck.allowed}
              isLoading={isDeleting}
              onClick={handleConfirmDeleteGroup}
            >
              Delete Group
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal with Option A and Option C */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => {
          setIsInviteOpen(false);
          setSearchedUser(null);
          setSplitzyIdSearch("");
        }}
        title="Invite to Group"
      >
        <div className="space-y-4 pt-1">
          {/* Splitzy ID Search */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Invite by Splitzy ID (Non-friends & Friends)
            </label>
            <div className="flex gap-2">
              <Input
                value={splitzyIdSearch}
                onChange={(e) => setSplitzyIdSearch(e.target.value)}
                placeholder="e.g. JOY-6LWH3W"
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="md"
                isLoading={isSearchingId}
                onClick={handleSearchSplitzyId}
                leftIcon={<Search className="w-3.5 h-3.5" />}
              >
                Search
              </Button>
            </div>
          </div>

          {/* Search Result Card */}
          {searchedUser && (
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3">
              {searchedUser.found && searchedUser.user ? (
                <>
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={searchedUser.user.photoURL}
                      name={searchedUser.user.displayName || "User"}
                      size="md"
                    />
                    <div>
                      <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                        {searchedUser.user.displayName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {searchedUser.user.splitzyId}
                      </div>
                    </div>
                  </div>

                  {group.members.includes(searchedUser.user.uid!) ? (
                    <div className="text-xs text-amber-600 font-medium">
                      Already a member of this group.
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {/* Explicit Action Checkboxes */}
                      <div className="space-y-2 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                        {/* Group Invitation Checkbox */}
                        {group.invitedMembers?.includes(searchedUser.user.uid!) ? (
                          <div className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-blue-500" />
                            Group invitation already sent and pending
                          </div>
                        ) : (
                          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <input
                              type="checkbox"
                              checked={sendGroupInviteChecked}
                              onChange={(e) => setSendGroupInviteChecked(e.target.checked)}
                              className="rounded text-[#2563EB] focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                            <span>Send group invitation</span>
                          </label>
                        )}

                        {/* Friend Request Checkbox */}
                        {friends.some((f) => f.uid === searchedUser.user!.uid) ? (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            Already in your Friends list
                          </div>
                        ) : (
                          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <input
                              type="checkbox"
                              checked={sendFriendRequestChecked}
                              onChange={(e) => setSendFriendRequestChecked(e.target.checked)}
                              className="rounded text-[#2563EB] focus:ring-blue-500 w-4 h-4 cursor-pointer"
                            />
                            <span>Send friend request</span>
                          </label>
                        )}
                      </div>

                      {/* Clear Summary Message Before Sending */}
                      <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed">
                        {sendGroupInviteChecked && sendFriendRequestChecked ? (
                          <span>Will send a <strong>group invitation</strong> to &quot;{group.name}&quot; and a <strong>friend request</strong>. Each can be accepted independently.</span>
                        ) : sendGroupInviteChecked ? (
                          <span>Will send a <strong>group invitation</strong> to &quot;{group.name}&quot; only. No friend request will be sent.</span>
                        ) : sendFriendRequestChecked ? (
                          <span>Will send a <strong>friend request</strong> only. User will not be invited to &quot;{group.name}&quot;.</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400 font-semibold">Please select at least one action above to continue.</span>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button
                        fullWidth
                        size="sm"
                        disabled={!sendGroupInviteChecked && !sendFriendRequestChecked}
                        isLoading={isInvitingTarget}
                        onClick={() => {
                          const opt =
                            sendGroupInviteChecked && sendFriendRequestChecked
                              ? "COMBINED"
                              : sendGroupInviteChecked
                              ? "GROUP_ONLY"
                              : "FRIEND_ONLY";
                          handleInviteUserWithOptions(searchedUser.user!.uid!, opt);
                        }}
                      >
                        Send Request
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-xs text-red-500">
                  {searchedUser.message || "User not found"}
                </div>
              )}
            </div>
          )}

          {/* Quick Invite from Existing Friends */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Or invite from your friends list:
            </label>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
              {nonMemberFriends.map((f) => {
                const isInvited = group.invitedMembers?.includes(f.uid);

                return (
                  <div key={f.uid} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={f.photoURL} name={f.displayName} size="sm" />
                      <div>
                        <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                          {f.displayName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {f.splitzyId}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isInvited ? "secondary" : "outline"}
                      disabled={isInvited}
                      onClick={() => handleInviteUserWithOptions(f.uid, "GROUP_ONLY")}
                    >
                      {isInvited ? "Invited" : "Invite"}
                    </Button>
                  </div>
                );
              })}

              {nonMemberFriends.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500">
                  All your friends are already in this group.
                </div>
              )}
            </div>
          </div>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              setIsInviteOpen(false);
              setSearchedUser(null);
              setSplitzyIdSearch("");
            }}
          >
            Close
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}

export default function GroupDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <GroupDashboardContent />
    </Suspense>
  );
}
