"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Plus,
  Users,
  QrCode,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Share2,
  Copy,
  Check,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { formatPaise } from "@/lib/money";

export default function HomePage() {
  const router = useRouter();
  const {
    user,
    groups,
    expenses,
    netBalancePaise,
    totalOwedToYouPaise,
    totalYouOwePaise,
  } = useAuth();

  const [showIdModal, setShowIdModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Active balance tab for desktop/tablet detailed inspection
  const [balanceView, setBalanceView] = useState<"overall" | "byGroup" | "byFriend">("overall");

  const handleCopyId = () => {
    if (user) {
      navigator.clipboard.writeText(user.splitzyId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShareId = () => {
    if (navigator.share && user) {
      navigator.share({
        title: "Add me on Splitzy",
        text: `Hey! Add me on Splitzy using my Splitzy ID: ${user.splitzyId} to split expenses easily!`,
      }).catch(() => {});
    } else {
      handleCopyId();
    }
  };

  return (
    <AppShell>
      {/* Top Header with greeting */}
      <AppHeader showUserGreeting={true} />

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Responsive Grid: 2-column on desktop/tablet */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (lg:col-span-7): Net Balance & Quick Actions */}
          <div className="lg:col-span-7 space-y-6">
            {/* Primary Net Balance Hero Card */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#2563EB] to-[#1D4ED8] text-white p-6 sm:p-7 shadow-lg shadow-blue-500/15">
              {/* Background abstract decoration */}
              <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute right-4 top-4 opacity-20">
                <TrendingUp className="w-20 h-20 text-white" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-blue-100 text-xs font-medium">
                  <span>Your Net Balance</span>
                  <span className="w-3.5 h-3.5 rounded-full border border-blue-200/50 flex items-center justify-center text-[10px] cursor-help">
                    i
                  </span>
                </div>

                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 mb-1">
                  {formatPaise(Math.abs(netBalancePaise))}
                </div>

                <div className="text-xs font-semibold text-blue-100">
                  {netBalancePaise >= 0 ? "You will receive" : "You need to pay"}
                </div>

                {/* Sub-cards: You are owed & You owe */}
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {/* You are owed */}
                  <Link
                    href="/history"
                    className="bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-2xl p-3.5 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[11px] text-blue-100 font-medium">
                      <span>You are owed</span>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-200" />
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white mt-1">
                      {formatPaise(totalOwedToYouPaise)}
                    </div>
                  </Link>

                  {/* You owe */}
                  <Link
                    href="/history"
                    className="bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-2xl p-3.5 transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[11px] text-blue-100 font-medium">
                      <span>You owe</span>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-200" />
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white mt-1">
                      {formatPaise(totalYouOwePaise)}
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => router.push("/expenses/new")}
                className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-2 shadow-inner">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-[#0F172A] text-center">
                  Add Expense
                </span>
              </button>

              <button
                onClick={() => router.push("/groups/new")}
                className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#D97706] flex items-center justify-center mb-2 shadow-inner">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-[#0F172A] text-center">
                  Create Group
                </span>
              </button>

              <button
                onClick={() => setShowIdModal(true)}
                className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center mb-2 shadow-inner">
                  <QrCode className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-[#0F172A] text-center">
                  My Splitzy ID
                </span>
              </button>
            </div>

            {/* Detailed Balance Breakdown Tabs (Screen 2 in Feature Walkthrough) */}
            <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#0F172A]">Balance Details</h2>
                <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setBalanceView("overall")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      balanceView === "overall"
                        ? "bg-white text-[#2563EB] shadow-xs"
                        : "text-[#64748B]"
                    }`}
                  >
                    Overall
                  </button>
                  <button
                    onClick={() => setBalanceView("byGroup")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      balanceView === "byGroup"
                        ? "bg-white text-[#2563EB] shadow-xs"
                        : "text-[#64748B]"
                    }`}
                  >
                    By Group
                  </button>
                  <button
                    onClick={() => setBalanceView("byFriend")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      balanceView === "byFriend"
                        ? "bg-white text-[#2563EB] shadow-xs"
                        : "text-[#64748B]"
                    }`}
                  >
                    By Friend
                  </button>
                </div>
              </div>

              {/* Who owes you list */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                  Who owes you
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar src="/assets/avatar_boy.jpg" name="Aman Verma" size="sm" />
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">Aman Verma</div>
                        <div className="text-[11px] text-[#64748B]">2 expenses</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#10B981] bg-emerald-50 px-2.5 py-1 rounded-full">
                      + ₹600
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar src="/assets/avatar_girl.jpg" name="Neha Sharma" size="sm" />
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">Neha Sharma</div>
                        <div className="text-[11px] text-[#64748B]">3 expenses</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#10B981] bg-emerald-50 px-2.5 py-1 rounded-full">
                      + ₹450
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar src="/assets/avatar_boy.jpg" name="Karan Patel" size="sm" />
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">Karan Patel</div>
                        <div className="text-[11px] text-[#64748B]">1 expense</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#10B981] bg-emerald-50 px-2.5 py-1 rounded-full">
                      + ₹280
                    </span>
                  </div>
                </div>

                <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider pt-3 border-t border-slate-100">
                  You owe to
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar src="/assets/avatar_glasses.jpg" name="Rohit Mehta" size="sm" />
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">Rohit Mehta</div>
                        <div className="text-[11px] text-[#64748B]">2 expenses</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#EF4444] bg-red-50 px-2.5 py-1 rounded-full">
                        ₹600
                      </span>
                      <Link
                        href="/expenses/exp_thalassa/pay"
                        className="text-[11px] font-bold text-[#2563EB] hover:underline"
                      >
                        Pay
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar src="/assets/avatar_girl.jpg" name="Sneha Gupta" size="sm" />
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">Sneha Gupta</div>
                        <div className="text-[11px] text-[#64748B]">1 expense</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#EF4444] bg-red-50 px-2.5 py-1 rounded-full">
                      ₹320
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (lg:col-span-5): Recent Groups & Recent Activity */}
          <div className="lg:col-span-5 space-y-6">
            {/* Recent Groups Card List */}
            <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#0F172A]">Recent Groups</h2>
                <Link
                  href="/groups"
                  className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                {groups.slice(0, 3).map((group) => (
                  <Link
                    key={group.id}
                    href={`/groups/${group.id}`}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/20 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-slate-200">
                        <Image src={group.icon} alt={group.name} fill className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#0F172A] truncate">
                          {group.name}
                        </div>
                        <div className="text-[11px] text-[#64748B]">
                          {group.members.length} members
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {group.id === "grp_roommates" ? (
                        <Badge variant="all_settled" size="sm" />
                      ) : (
                        <div>
                          <div className="text-xs font-bold text-[#0F172A]">
                            ₹{group.id === "grp_goa" ? "4,520" : "2,140"}
                          </div>
                          <div className="text-[10px] font-semibold text-[#D97706]">
                            ₹{group.id === "grp_goa" ? "1,230" : "320"} pending
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Activity Card List */}
            <div className="bg-white rounded-3xl border border-[#E5E7EB] p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#0F172A]">Recent Activity</h2>
                <Link
                  href="/activity"
                  className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3">
                <Link
                  href="/expenses/exp_thalassa"
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src="/assets/avatar_boy.jpg" name="Aman Verma" size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#0F172A] truncate">
                        Aman Verma paid you
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate">
                        Dinner at Thalassa • Goa Trip
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#10B981]">+ ₹600</span>
                    <div className="text-[10px] text-[#94A3B8]">2 hours ago</div>
                  </div>
                </Link>

                <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src="/assets/avatar_girl.jpg" name="Neha Sharma" size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#0F172A] truncate">
                        Neha marked as paid
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate">
                        Dinner at Cafe • 10 min ago
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="paid" size="sm" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src="/assets/avatar_glasses.jpg" name="Rohit Mehta" size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#0F172A] truncate">
                        Rohit added a new bill
                      </div>
                      <div className="text-[10px] text-[#64748B] truncate">
                        Scooty Rent • Goa Trip
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#0F172A]">₹1,200</span>
                    <div className="text-[10px] text-[#94A3B8]">1 day ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Splitzy ID Share Modal */}
      {user && (
        <Modal
          isOpen={showIdModal}
          onClose={() => setShowIdModal(false)}
          title="My Splitzy ID"
        >
          <div className="flex flex-col items-center text-center py-2 space-y-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200">
              <Image src={user.photoURL || "/assets/avatar_boy.jpg"} alt={user.displayName} width={64} height={64} />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#0F172A]">{user.displayName}</h4>
              <p className="text-xs text-[#64748B]">{user.email}</p>
            </div>

            <div className="w-full bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase">Your Splitzy ID</span>
                <div className="font-mono text-lg font-bold text-[#2563EB] tracking-wider">
                  {user.splitzyId}
                </div>
              </div>
              <button
                onClick={handleCopyId}
                className="p-2 text-slate-500 hover:text-[#2563EB] rounded-xl hover:bg-white transition-colors"
                title="Copy ID"
              >
                {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <p className="text-xs text-[#64748B] max-w-xs">
              Share this code with friends so they can add you to their friend list and groups instantly.
            </p>

            <div className="w-full space-y-2">
              <Button fullWidth onClick={handleShareId} leftIcon={<Share2 className="w-4 h-4" />}>
                Share My Splitzy ID
              </Button>
              <Button fullWidth variant="outline" onClick={() => setShowIdModal(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
