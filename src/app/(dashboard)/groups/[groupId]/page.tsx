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
    updateGroup,
    leaveGroup,
    deleteGroup,
    inviteGroupMember,
  } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<"overview" | "expenses" | "members">("overview");

  const fallbackGroup = {
    id: groupId || "grp_default",
    name: "Group",
    description: "",
    icon: "/assets/icon_food.jpg",
    members: [user?.uid || "usr_me"],
    createdBy: user?.uid || "usr_me",
    createdAt: new Date().toISOString(),
    memberDetails: {},
  };
  const group = groups.find((g) => g.id === groupId) || groups[0] || fallbackGroup;
  const groupExpenses = expenses.filter((e) => e.groupId === group.id);

  const totalExpensePaise = groupExpenses.reduce((acc, curr) => acc + curr.amountPaise, 0);

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

  const handleInviteFriend = async (friendUid: string) => {
    const res = await inviteGroupMember(group.id, friendUid);
    if (res.success) {
      toastSuccess("Invitation sent!");
    } else {
      toastError(res.message || "Failed to invite friend");
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
                  {formatPaise(Math.round(totalExpensePaise / Math.max(1, group.members.length)))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-[#10B981]">You are Owed</span>
                <div className="text-lg font-extrabold text-[#10B981] mt-1">
                  {user ? formatPaise(calculateMemberGroupBalance(user.uid, group.id, expenses).owedToUserPaise) : "₹0"}
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-[#EF4444]">You Owe</span>
                <div className="text-lg font-extrabold text-[#EF4444] mt-1">
                  {user ? formatPaise(calculateMemberGroupBalance(user.uid, group.id, expenses).userOwesPaise) : "₹0"}
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

            <div className="divide-y divide-slate-100">
              {group.members.map((mId) => {
                const info = group.memberDetails?.[mId];
                const fr = friends.find((f) => f.uid === mId);
                const isMemberCreator = mId === group.createdBy;
                const mBalance = calculateMemberGroupBalance(mId, group.id, expenses);

                return (
                  <div key={mId} className="py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={info?.photoURL || fr?.photoURL}
                        name={info?.name || fr?.displayName || "Member"}
                        size="md"
                      />
                      <div>
                        <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                          <span>{info?.name || fr?.displayName || `User ${mId.slice(-4)}`}</span>
                          {isMemberCreator && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.2 rounded-full flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5" /> Creator
                            </span>
                          )}
                          {!isMemberCreator && info?.role === "admin" && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.2 rounded">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B] mt-0.5">
                          {info?.splitzyId || fr?.splitzyId || mId}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
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
                );
              })}
            </div>
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

      {/* Invite Friends Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Friends to Group"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-slate-600">
            Select an accepted friend to invite to <strong>{group.name}</strong>:
          </p>

          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {nonMemberFriends.map((f) => {
              const isInvited = group.invitedMembers?.includes(f.uid);

              return (
                <div key={f.uid} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={f.photoURL} name={f.displayName} size="sm" />
                    <div>
                      <div className="text-xs font-bold text-[#0F172A]">{f.displayName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{f.splitzyId}</div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isInvited ? "secondary" : "outline"}
                    disabled={isInvited}
                    onClick={() => handleInviteFriend(f.uid)}
                  >
                    {isInvited ? "Invited" : "Invite"}
                  </Button>
                </div>
              );
            })}

            {nonMemberFriends.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                All your friends are already in this group or you have no friends added yet.
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => setIsInviteOpen(false)}
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
