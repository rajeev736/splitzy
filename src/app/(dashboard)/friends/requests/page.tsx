"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus, Users, Check, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { UserProfile } from "@/lib/types";

function FriendRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const {
    friendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
    getMutualFriendSuggestions,
    user,
  } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  useEffect(() => {
    if (tabParam === "sent" || tabParam === "received") {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [mutualSuggestions, setMutualSuggestions] = useState<
    Array<{ user: UserProfile; mutualCount: number; mutualFriendNames: string[] }>
  >([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const myUid = user?.uid;
  const receivedRequests = friendRequests.filter(
    (r) => r.status === "PENDING" && r.receiverId === myUid
  );
  const sentRequests = friendRequests.filter(
    (r) => r.status === "PENDING" && r.senderId === myUid
  );

  useEffect(() => {
    let isMounted = true;
    async function loadSuggestions() {
      if (!user) return;
      setIsLoadingSuggestions(true);
      try {
        const list = await getMutualFriendSuggestions();
        if (isMounted) setMutualSuggestions(list);
      } catch (e) {
        console.warn("Failed to load mutual friend suggestions:", e);
      } finally {
        if (isMounted) setIsLoadingSuggestions(false);
      }
    }
    loadSuggestions();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, friendRequests.length]);

  const handleAccept = async (id: string, name: string) => {
    try {
      await acceptFriendRequest(id);
      success(`You and ${name} are now friends!`);
    } catch {
      error("Failed to accept request");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectFriendRequest(id);
      success("Friend request rejected");
    } catch {
      error("Failed to reject request");
    }
  };

  const handleSendRequest = async (splitzyId: string) => {
    setAddingId(splitzyId);
    try {
      const res = await sendFriendRequest(splitzyId);
      if (res.success) {
        success(res.message);
        // Refresh suggestions
        const updated = await getMutualFriendSuggestions();
        setMutualSuggestions(updated);
      } else {
        error(res.message);
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <AppShell>
      <AppHeader
        title="Friend Requests"
        showBack={true}
        rightAction={
          <button
            onClick={() => router.push("/friends/add")}
            className="w-9 h-9 rounded-full bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-xs"
            aria-label="Add Friend"
          >
            <UserPlus className="w-5 h-5 stroke-[2.2]" />
          </button>
        }
      />

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Segmented Control: Received / Sent */}
        <div className="flex bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("received")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "received"
                ? "bg-[#2563EB] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Received ({receivedRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "sent"
                ? "bg-[#2563EB] text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Sent ({sentRequests.length})
          </button>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {activeTab === "received" ? (
            receivedRequests.length > 0 ? (
              receivedRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={req.senderPhoto} name={req.senderName} size="md" />
                    <div>
                      <div className="text-sm font-bold text-[#0F172A] dark:text-white">
                        {req.senderName}
                      </div>
                      <div className="text-xs font-mono text-[#64748B] dark:text-slate-400">
                        {req.senderSplitzyId}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 sm:pt-0">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(req.id, req.senderName)}
                      className="flex-1 sm:flex-none"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleReject(req.id)}
                      className="flex-1 sm:flex-none !text-slate-600 dark:!text-slate-300 !border-slate-200 dark:!border-slate-700"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-xs text-[#64748B] dark:text-slate-400">
                No pending received requests.
              </div>
            )
          ) : sentRequests.length > 0 ? (
            sentRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={req.receiverName} size="md" />
                  <div>
                    <div className="text-sm font-bold text-[#0F172A] dark:text-white">
                      {req.receiverName}
                    </div>
                    <div className="text-xs font-mono text-[#64748B] dark:text-slate-400">
                      {req.receiverSplitzyId}
                    </div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                      Pending Response
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(req.id)}
                  className="!text-slate-600 dark:!text-slate-300 !border-slate-200 dark:!border-slate-700"
                >
                  Cancel
                </Button>
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-xs text-[#64748B] dark:text-slate-400">
              No outgoing requests.
            </div>
          )}
        </div>

        {/* Real Mutual Friends / People You May Know */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
              People you may know
            </h3>
            {mutualSuggestions.length > 0 && (
              <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400">
                {mutualSuggestions.length} suggested
              </span>
            )}
          </div>

          {isLoadingSuggestions ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Finding mutual connections...
            </div>
          ) : mutualSuggestions.length === 0 ? (
            // Mandatory empty state from Spec Section 4: "No mutual friends to suggest yet."
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
              <Users className="w-7 h-7 text-slate-400 mx-auto mb-2 opacity-60" />
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                No mutual friends to suggest yet.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                When you and your friends share mutual connections, they will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {mutualSuggestions.map(({ user: su, mutualCount, mutualFriendNames }) => (
                <div
                  key={su.uid}
                  className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={su.photoURL} name={su.displayName} size="sm" />
                    <div>
                      <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                        {su.displayName}
                      </div>
                      <div className="text-[11px] font-mono text-[#64748B] dark:text-slate-400">
                        {su.splitzyId}
                      </div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                        {mutualCount} mutual friend{mutualCount > 1 ? "s" : ""}
                        {mutualFriendNames.length > 0 && ` (${mutualFriendNames.slice(0, 2).join(", ")})`}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    isLoading={addingId === su.splitzyId}
                    onClick={() => handleSendRequest(su.splitzyId)}
                    className="px-4"
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default function FriendRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      }
    >
      <FriendRequestsContent />
    </Suspense>
  );
}
