"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Search,
  MoreVertical,
  ChevronRight,
  UserCheck,
  User,
  Trash2,
  Receipt,
  AlertTriangle,
  AtSign,
  Calendar,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { UserProfile } from "@/lib/types";
import { canRemoveFriend, formatPaise } from "@/lib/money";

export default function FriendsPage() {
  const router = useRouter();
  const { friends, friendRequests, expenses, user, removeFriend } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Context menu state
  const [activeMenuFriendId, setActiveMenuFriendId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Modals state
  const [profileModalFriend, setProfileModalFriend] = useState<UserProfile | null>(null);
  const [removeModalFriend, setRemoveModalFriend] = useState<UserProfile | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuFriendId(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const pendingReceivedCount = friendRequests.filter(
    (r) => r.status === "PENDING"
  ).length;

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.splitzyId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirmRemoveFriend = async () => {
    if (!removeModalFriend || !user) return;
    setIsRemoving(true);
    try {
      const res = await removeFriend(removeModalFriend.uid);
      if (res.success) {
        toastSuccess(`${removeModalFriend.displayName} removed from friends`);
        setRemoveModalFriend(null);
      } else {
        toastError(res.message || "Failed to remove friend");
      }
    } catch (e: any) {
      toastError(e?.message || "Failed to remove friend");
    } finally {
      setIsRemoving(false);
    }
  };

  // Check removal invariant for selected modal friend
  const removalCheck =
    removeModalFriend && user
      ? canRemoveFriend(user.uid, removeModalFriend.uid, expenses)
      : { allowed: true, reason: "" };

  return (
    <AppShell>
      <AppHeader
        title="My Friends"
        showBack={true}
        rightAction={
          <button
            onClick={() => router.push("/friends/add")}
            className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center hover:bg-blue-100 transition-colors shadow-xs"
            aria-label="Add Friend"
          >
            <UserPlus className="w-5 h-5 stroke-[2.2]" />
          </button>
        }
      />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Friend Requests Banner */}
        <Link
          href="/friends/requests"
          className="flex items-center justify-between p-4 bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl shadow-xs hover:border-blue-300 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                <span>Friend Requests</span>
                {pendingReceivedCount > 0 && (
                  <span className="bg-[#EF4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {pendingReceivedCount}
                  </span>
                )}
              </div>
              <div className="text-xs text-[#64748B]">Manage incoming and outgoing requests</div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#2563EB]" />
        </Link>

        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search friends by name or JoySplit ID..."
            className="w-full bg-white border border-[#E5E7EB] rounded-2xl pl-10 pr-4 py-3 text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Friends Count and Sort header */}
        <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
          <span>{filteredFriends.length} Friends</span>
          <span className="text-[#2563EB] cursor-pointer">A-Z ▾</span>
        </div>

        {/* Friends List */}
        <div className="bg-white rounded-3xl border border-[#E5E7EB] divide-y divide-slate-100 shadow-xs">
          {filteredFriends.map((friend) => {
            const isMenuOpen = activeMenuFriendId === friend.uid;

            return (
              <div
                key={friend.uid}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors relative"
              >
                <div
                  className="flex items-center gap-3.5 min-w-0 cursor-pointer flex-1"
                  onClick={() => setProfileModalFriend(friend)}
                >
                  <Avatar src={friend.photoURL} name={friend.displayName} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#0F172A] truncate">
                      {friend.displayName}
                    </div>
                    <div className="text-xs font-mono text-[#64748B] flex items-center gap-1.5 mt-0.5">
                      <span>{friend.splitzyId}</span>
                      {friend.upiId && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-sans text-[10px]">
                            {friend.upiId}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 relative">
                  <Link
                    href={`/expenses/new?friend=${friend.uid}`}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#2563EB] hover:bg-blue-100 text-xs font-bold transition-colors"
                  >
                    Split
                  </Link>

                  {/* 3-Dot Menu Button */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuFriendId(isMenuOpen ? null : friend.uid);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                      aria-label="Friend options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Contextual Dropdown */}
                    {isMenuOpen && (
                      <div
                        ref={menuRef}
                        className="absolute right-0 top-10 w-44 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150"
                      >
                        <button
                          onClick={() => {
                            setActiveMenuFriendId(null);
                            setProfileModalFriend(friend);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          View Profile
                        </button>

                        <button
                          onClick={() => {
                            setActiveMenuFriendId(null);
                            router.push(`/expenses/new?friend=${friend.uid}`);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5 text-slate-400" />
                          Split Expense
                        </button>

                        <div className="border-t border-slate-100 my-1" />

                        <button
                          onClick={() => {
                            setActiveMenuFriendId(null);
                            setRemoveModalFriend(friend);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          Remove Friend
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredFriends.length === 0 && (
            <div className="p-8 text-center text-xs text-[#64748B]">
              No friends found matching "{searchQuery}".
            </div>
          )}
        </div>
      </div>

      {/* View Profile Modal */}
      {profileModalFriend && (
        <Modal
          isOpen={!!profileModalFriend}
          onClose={() => setProfileModalFriend(null)}
          title="Friend Profile"
        >
          <div className="space-y-5 pt-1 text-center">
            <div className="flex justify-center">
              <Avatar
                src={profileModalFriend.photoURL}
                name={profileModalFriend.displayName}
                size="xl"
              />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">
                {profileModalFriend.displayName}
              </h3>
              <p className="text-xs font-mono text-[#64748B] mt-0.5">
                JoySplit ID: {profileModalFriend.splitzyId}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5" /> UPI ID:
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {profileModalFriend.upiId || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Member Since:
                </span>
                <span className="font-semibold text-slate-800">
                  {new Date(profileModalFriend.createdAt).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setProfileModalFriend(null)}
              >
                Close
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  const targetId = profileModalFriend.uid;
                  setProfileModalFriend(null);
                  router.push(`/expenses/new?friend=${targetId}`);
                }}
              >
                Split Bill
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove Friend Confirmation Modal with Invariant Enforcement */}
      {removeModalFriend && (
        <Modal
          isOpen={!!removeModalFriend}
          onClose={() => setRemoveModalFriend(null)}
          title="Remove Friend"
        >
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <Avatar
                src={removeModalFriend.photoURL}
                name={removeModalFriend.displayName}
                size="md"
              />
              <div>
                <div className="text-sm font-bold text-[#0F172A]">
                  {removeModalFriend.displayName}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {removeModalFriend.splitzyId}
                </div>
              </div>
            </div>

            {/* Invariant check banner */}
            {!removalCheck.allowed ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Unsettled Balance Detected</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  {removalCheck.reason}
                </p>
                <p className="text-[11px] text-amber-700 font-semibold">
                  Please settle all pending direct expenses with {removeModalFriend.displayName} before removing this friendship.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to remove <strong>{removeModalFriend.displayName}</strong> from your friends? Historical expenses and group memberships will be preserved.
              </p>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setRemoveModalFriend(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                disabled={!removalCheck.allowed}
                isLoading={isRemoving}
                onClick={handleConfirmRemoveFriend}
              >
                Remove Friend
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
