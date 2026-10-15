"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Check, X, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function FriendRequestsPage() {
  const router = useRouter();
  const { friendRequests, acceptFriendRequest, rejectFriendRequest, sendFriendRequest, user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");

  const myUid = user?.uid || "usr_rajeev";
  const receivedRequests = friendRequests.filter((r) => r.status === "PENDING" && r.receiverId === myUid);
  const sentRequests = friendRequests.filter((r) => r.status === "PENDING" && r.senderId === myUid);

  const handleAccept = async (id: string, name: string) => {
    try {
      await acceptFriendRequest(id);
      success(`You and ${name} are now friends!`);
    } catch (e) {
      error("Failed to accept request");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectFriendRequest(id);
      success("Friend request rejected");
    } catch (e) {
      error("Failed to reject request");
    }
  };

  const handleQuickAdd = async (splitzyId: string) => {
    const res = await sendFriendRequest(splitzyId);
    if (res.success) success(res.message);
    else error(res.message);
  };

  return (
    <AppShell>
      <AppHeader
        title="Friend Requests"
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

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Segmented Control: Received / Sent */}
        <div className="flex bg-slate-200/70 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("received")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "received"
                ? "bg-[#2563EB] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Received ({receivedRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "sent"
                ? "bg-[#2563EB] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
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
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={req.senderPhoto} name={req.senderName} size="md" />
                    <div>
                      <div className="text-sm font-bold text-[#0F172A]">{req.senderName}</div>
                      <div className="text-xs font-mono text-[#64748B]">{req.senderSplitzyId}</div>
                      <div className="text-[11px] text-[#2563EB] mt-0.5">2 mutual groups</div>
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
                      className="flex-1 sm:flex-none !text-slate-600 !border-slate-200"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-xs text-[#64748B]">
                No pending received requests.
              </div>
            )
          ) : sentRequests.length > 0 ? (
            sentRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={req.receiverName} size="md" />
                  <div>
                    <div className="text-sm font-bold text-[#0F172A]">{req.receiverName}</div>
                    <div className="text-xs font-mono text-[#64748B]">{req.receiverSplitzyId}</div>
                    <div className="text-[11px] text-amber-600 font-semibold mt-0.5">Pending Response</div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(req.id)}
                  className="!text-slate-600 !border-slate-200"
                >
                  Cancel
                </Button>
              </div>
            ))
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-xs text-[#64748B]">
              No outgoing requests.
            </div>
          )}
        </div>

        {/* People You May Know Section (Screen 12 bottom) */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#0F172A]">People you may know</h3>
            <span className="text-xs font-bold text-[#2563EB] cursor-pointer">See all</span>
          </div>

          <div className="space-y-2.5">
            {[
              { name: "Priya Singh", id: "JOY-5H2N9F", photo: "/assets/avatar_girl.jpg" },
              { name: "Karan Patel", id: "JOY-8T6M4B", photo: "/assets/avatar_boy.jpg" },
              { name: "Sneha Gupta", id: "JOY-1Q9V7D", photo: "/assets/avatar_girl.jpg" },
            ].map((p) => (
              <div
                key={p.id}
                className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar src={p.photo} name={p.name} size="sm" />
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">{p.name}</div>
                    <div className="text-[11px] font-mono text-[#64748B]">{p.id}</div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleQuickAdd(p.id)}
                  className="px-4"
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
