"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Users,
  CreditCard,
  UserPlus,
  ArrowRight,
  MoreVertical,
  Check,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { AppNotification } from "@/lib/types";
import { formatPaise } from "@/lib/money";

export default function NotificationsPage() {
  const router = useRouter();
  const {
    user,
    groups,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    acceptFriendRequest,
    rejectFriendRequest,
    acceptGroupInvite,
    declineGroupInvite,
    confirmPaymentReceipt,
    disputePaymentReceipt,
  } = useAuth();
  const { success, error: toastError } = useToast();

  const [filter, setFilter] = useState<"all" | "payments" | "friends" | "groups">("all");
  const [selectedNotif, setSelectedNotif] = useState<AppNotification | null>(null);
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);

  const filteredNotifs = notifications.filter((n) => {
    if (filter === "payments") return n.type.includes("PAYMENT");
    if (filter === "friends") return n.type.includes("FRIEND");
    if (filter === "groups") return n.type.includes("GROUP");
    return true;
  });

  const handleOpenNotif = (notif: AppNotification) => {
    markNotificationRead(notif.id);
    setSelectedNotif(notif);
  };

  const handleAcceptGroupInvite = async (groupId: string, friendRequestId?: string) => {
    setIsProcessingInvite(true);
    try {
      const res = await acceptGroupInvite(groupId, {
        acceptCombinedFriendship: Boolean(friendRequestId),
        friendRequestId,
      });
      if (res.success) {
        success(res.message || "You have joined the group!");
        setSelectedNotif(null);
        router.push(`/groups/${groupId}`);
      } else {
        toastError(res.message || "Failed to join group");
      }
    } catch (e: any) {
      toastError(e?.message || "Failed to join group");
    } finally {
      setIsProcessingInvite(false);
    }
  };

  const handleDeclineGroupInvite = async (groupId: string, friendRequestId?: string) => {
    setIsProcessingInvite(true);
    try {
      await declineGroupInvite(groupId, friendRequestId);
      success("Group invitation declined");
      setSelectedNotif(null);
    } catch (e: any) {
      toastError(e?.message || "Failed to decline invitation");
    } finally {
      setIsProcessingInvite(false);
    }
  };

  return (
    <AppShell>
      <AppHeader
        title="Notifications"
        showBack={false}
        rightAction={
          <button
            onClick={() => {
              markAllNotificationsRead();
              success("All notifications marked as read");
            }}
            className="text-xs font-bold text-[#2563EB] hover:underline"
          >
            Mark all read
          </button>
        }
      />

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Filter Pills */}
        <div className="flex gap-2">
          {(["all", "payments", "friends", "groups"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === tab
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              {tab === "all" ? "All" : tab}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden transition-colors">
          {filteredNotifs.map((notif) => {
            const isUnread = !notif.read;

            return (
              <div
                key={notif.id}
                onClick={() => handleOpenNotif(notif)}
                className={`p-4 flex items-start justify-between cursor-pointer transition-colors ${
                  isUnread
                    ? "bg-blue-50/20 dark:bg-blue-950/20 hover:bg-blue-50/40 dark:hover:bg-blue-950/40"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="relative shrink-0 mt-0.5">
                    {notif.type.includes("PAYMENT") ? (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                    ) : notif.type.includes("FRIEND") ? (
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <UserPlus className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-slate-100 leading-snug">
                      {notif.title}
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {notif.type === "PAYMENT_REPORTED" && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (notif.data?.expenseId && notif.data?.actorId) {
                            await confirmPaymentReceipt(notif.data.expenseId, notif.data.actorId);
                            markNotificationRead(notif.id);
                            success("Payment confirmed!");
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        Yes, Received
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (notif.data?.expenseId && notif.data?.actorId) {
                            await disputePaymentReceipt(notif.data.expenseId, notif.data.actorId);
                            markNotificationRead(notif.id);
                            toastError("Payment marked as not received");
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-[11px] font-bold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  )}

                  {isUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
                  )}
                </div>
              </div>
            );
          })}

          {filteredNotifs.length === 0 && (
            <div className="p-10 text-center text-xs text-[#64748B] dark:text-slate-400">
              <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <span>No notifications in this category.</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Detail Modal for Notifications (Screens 2, 3, 4, 5, 6) */}
      {selectedNotif && (
        <Modal
          isOpen={Boolean(selectedNotif)}
          onClose={() => setSelectedNotif(null)}
          title={selectedNotif.title}
        >
          <div className="text-center py-2 space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto shadow-xs">
              {selectedNotif.type.includes("PAYMENT") ? (
                <CreditCard className="w-8 h-8" />
              ) : selectedNotif.type.includes("FRIEND") ? (
                <UserPlus className="w-8 h-8" />
              ) : (
                <Users className="w-8 h-8" />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-[#0F172A] leading-relaxed">
                {selectedNotif.message}
              </p>
              {selectedNotif.data?.amountPaise && (
                <div className="text-2xl font-extrabold text-[#0F172A] mt-2">
                  {formatPaise(selectedNotif.data.amountPaise)}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              {/* Group Invitation Accept/Decline Handling */}
              {selectedNotif.type === "GROUP_INVITE" && selectedNotif.data?.groupId ? (
                (() => {
                  const grp = groups.find((g) => g.id === selectedNotif.data?.groupId);
                  const isAlreadyMember = user && grp?.members?.includes(user.uid);

                  if (isAlreadyMember) {
                    return (
                      <Button
                        fullWidth
                        size="lg"
                        onClick={() => {
                          const grpId = selectedNotif.data?.groupId;
                          setSelectedNotif(null);
                          router.push(`/groups/${grpId}`);
                        }}
                      >
                        View Group
                      </Button>
                    );
                  }

                  const isCombined = Boolean(selectedNotif.data?.friendRequestId);

                  return (
                    <div className="space-y-2">
                      <Button
                        fullWidth
                        size="lg"
                        isLoading={isProcessingInvite}
                        onClick={() =>
                          handleAcceptGroupInvite(
                            selectedNotif.data!.groupId!,
                            selectedNotif.data?.friendRequestId
                          )
                        }
                      >
                        {isCombined ? "Accept Group & Friend Request" : "Accept Group Invitation"}
                      </Button>
                      <Button
                        fullWidth
                        variant="secondary"
                        size="md"
                        disabled={isProcessingInvite}
                        onClick={() =>
                          handleDeclineGroupInvite(
                            selectedNotif.data!.groupId!,
                            selectedNotif.data?.friendRequestId
                          )
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  );
                })()
              ) : selectedNotif.type === "FRIEND_REQUEST" ? (
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    setSelectedNotif(null);
                    router.push("/friends/requests?tab=received");
                  }}
                >
                  View Received Request
                </Button>
              ) : selectedNotif.type === "FRIEND_ACCEPTED" ? (
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    setSelectedNotif(null);
                    router.push("/friends");
                  }}
                >
                  View Friends List
                </Button>
              ) : selectedNotif.type === "PAYMENT_REPORTED" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      fullWidth
                      variant="success"
                      size="lg"
                      onClick={async () => {
                        const expId = selectedNotif.data?.expenseId;
                        const actorId = selectedNotif.data?.actorId;
                        if (expId && actorId) {
                          await confirmPaymentReceipt(expId, actorId);
                          success("Payment confirmed!");
                          setSelectedNotif(null);
                        }
                      }}
                    >
                      Yes, Received
                    </Button>
                    <Button
                      fullWidth
                      variant="outline"
                      size="lg"
                      className="!text-red-600 !border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40"
                      onClick={async () => {
                        const expId = selectedNotif.data?.expenseId;
                        const actorId = selectedNotif.data?.actorId;
                        if (expId && actorId) {
                          await disputePaymentReceipt(expId, actorId);
                          toastError("Payment marked as not received (disputed)");
                          setSelectedNotif(null);
                        }
                      }}
                    >
                      No, Not Received
                    </Button>
                  </div>
                  <button
                    onClick={() => {
                      const expId = selectedNotif.data?.expenseId;
                      setSelectedNotif(null);
                      if (expId) {
                        router.push(`/expenses/${expId}`);
                      } else {
                        router.push("/history");
                      }
                    }}
                    className="w-full text-center text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline py-1"
                  >
                    View Full Expense Details
                  </button>
                </div>
              ) : selectedNotif.type === "PAYMENT_CONFIRMED" ? (
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    const expId = selectedNotif.data?.expenseId;
                    setSelectedNotif(null);
                    if (expId) {
                      router.push(`/expenses/${expId}`);
                    } else {
                      router.push("/history");
                    }
                  }}
                >
                  View Confirmed Settlement
                </Button>
              ) : selectedNotif.type === "NEW_EXPENSE" || selectedNotif.data?.expenseId ? (
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    const expId = selectedNotif.data?.expenseId;
                    setSelectedNotif(null);
                    if (expId) {
                      router.push(`/expenses/${expId}`);
                    } else if (selectedNotif.data?.groupId) {
                      router.push(`/groups/${selectedNotif.data.groupId}`);
                    } else {
                      router.push("/history");
                    }
                  }}
                >
                  View Expense
                </Button>
              ) : selectedNotif.type === "GROUP_MEMBER_LEFT" || selectedNotif.type === "GROUP_ACCEPTED" || selectedNotif.data?.groupId ? (
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    const grpId = selectedNotif.data?.groupId;
                    setSelectedNotif(null);
                    if (grpId && groups.some((g) => g.id === grpId)) {
                      router.push(`/groups/${grpId}`);
                    } else {
                      router.push("/groups");
                    }
                  }}
                >
                  View Group
                </Button>
              ) : selectedNotif.type.includes("FRIEND") ? (
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    setSelectedNotif(null);
                    router.push("/friends/requests?tab=received");
                  }}
                >
                  View Friend Requests
                </Button>
              ) : null}

              <Button
                fullWidth
                variant="outline"
                size="md"
                onClick={() => setSelectedNotif(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
