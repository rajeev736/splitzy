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
  Receipt,
  UserCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { formatPaise, calculateDirectBalance } from "@/lib/money";

export default function HomePage() {
  const router = useRouter();
  const {
    user,
    friends,
    groups,
    expenses,
    netBalancePaise,
    totalOwedToYouPaise,
    totalYouOwePaise,
  } = useAuth();

  const [showIdModal, setShowIdModal] = useState(false);
  const [copied, setCopied] = useState(false);
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
      navigator
        .share({
          title: "Add me on JoySplit",
          text: `Hey! Add me on JoySplit using my JoySplit ID: ${user.splitzyId} to split expenses easily!`,
        })
        .catch(() => {});
    } else {
      handleCopyId();
    }
  };

  // Derive genuine friend balances dynamically
  const friendBalances = friends.map((f) => {
    const bal = user ? calculateDirectBalance(user.uid, f.uid, expenses) : { netBalancePaise: 0 };
    return {
      friend: f,
      netBalancePaise: bal.netBalancePaise,
    };
  });

  const whoOwesYou = friendBalances.filter((b) => b.netBalancePaise > 0);
  const youOweTo = friendBalances.filter((b) => b.netBalancePaise < 0);

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
              <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute right-4 top-4 opacity-20">
                <TrendingUp className="w-20 h-20 text-white" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-1.5 text-blue-100 text-xs font-medium">
                  <span>Your Net Balance</span>
                </div>

                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 mb-1">
                  {netBalancePaise > 0
                    ? `+${formatPaise(netBalancePaise)}`
                    : netBalancePaise < 0
                    ? `-${formatPaise(Math.abs(netBalancePaise))}`
                    : "₹0"}
                </div>

                <div className="text-xs font-semibold text-blue-100">
                  {netBalancePaise > 0
                    ? "You will receive overall"
                    : netBalancePaise < 0
                    ? "You need to pay overall"
                    : "All settled up!"}
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
                className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center mb-2 shadow-inner">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100 text-center">
                  Add Expense
                </span>
              </button>

              <button
                onClick={() => router.push("/groups/new")}
                className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-[#D97706] dark:text-amber-400 flex items-center justify-center mb-2 shadow-inner">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100 text-center">
                  Create Group
                </span>
              </button>

              <button
                onClick={() => setShowIdModal(true)}
                className="flex flex-col items-center justify-center p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-[#7C3AED] dark:text-purple-400 flex items-center justify-center mb-2 shadow-inner">
                  <QrCode className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100 text-center">
                  My JoySplit ID
                </span>
              </button>
            </div>

            {/* Detailed Balance Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E5E7EB] dark:border-slate-800 p-5 shadow-xs transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  Balance Details
                </h2>
              </div>

              {/* Who owes you list */}
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2">
                    Who owes you
                  </div>
                  {whoOwesYou.length > 0 ? (
                    <div className="space-y-2">
                      {whoOwesYou.map(({ friend, netBalancePaise: bal }) => (
                        <div
                          key={friend.uid}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar src={friend.photoURL} name={friend.displayName} size="sm" />
                            <div>
                              <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100">
                                {friend.displayName}
                              </div>
                              <div className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono">
                                {friend.splitzyId}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#10B981] bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                            + {formatPaise(bal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-[#64748B] dark:text-slate-400">
                      No one owes you right now.
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider mb-2">
                    You owe to
                  </div>
                  {youOweTo.length > 0 ? (
                    <div className="space-y-2">
                      {youOweTo.map(({ friend, netBalancePaise: bal }) => (
                        <div
                          key={friend.uid}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar src={friend.photoURL} name={friend.displayName} size="sm" />
                            <div>
                              <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100">
                                {friend.displayName}
                              </div>
                              <div className="text-[11px] text-[#64748B] dark:text-slate-400 font-mono">
                                {friend.splitzyId}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#EF4444] bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full">
                            {formatPaise(Math.abs(bal))}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-[#64748B] dark:text-slate-400">
                      You do not owe anyone right now.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (lg:col-span-5): Recent Groups & Recent Activity */}
          <div className="lg:col-span-5 space-y-6">
            {/* Recent Groups Card List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E5E7EB] dark:border-slate-800 p-5 shadow-xs transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  Recent Groups
                </h2>
                <Link
                  href="/groups"
                  className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {groups.length > 0 ? (
                <div className="space-y-3">
                  {groups.slice(0, 3).map((group) => (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          {group.icon ? (
                            <Image src={group.icon} alt={group.name} fill className="object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100 truncate">
                            {group.name}
                          </div>
                          <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                            {group.members.length} members
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400">
                          View
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center space-y-2">
                  <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    No groups yet. Create a group to start splitting bills!
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/groups/new")}
                  >
                    Create Group
                  </Button>
                </div>
              )}
            </div>

            {/* Recent Activity Card List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E5E7EB] dark:border-slate-800 p-5 shadow-xs transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                  Recent Activity
                </h2>
                <Link
                  href="/activity"
                  className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  See all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {expenses.length > 0 ? (
                <div className="space-y-3">
                  {expenses.slice(0, 4).map((exp) => (
                    <Link
                      key={exp.id}
                      href={`/expenses/${exp.id}`}
                      className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100 truncate">
                            {exp.title}
                          </div>
                          <div className="text-[10px] text-[#64748B] dark:text-slate-400 truncate">
                            {exp.groupName ? `${exp.groupName} • ` : ""}
                            Paid by {exp.payerName}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-[#0F172A] dark:text-slate-100">
                          {formatPaise(exp.amountPaise)}
                        </span>
                        <div className="text-[10px] text-[#94A3B8]">{exp.date}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center space-y-2">
                  <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs text-[#64748B] dark:text-slate-400">
                    No recent expenses. Add your first expense to see it here!
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/expenses/new")}
                  >
                    Add Expense
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* JoySplit ID Share Modal */}
      {user && (
        <Modal
          isOpen={showIdModal}
          onClose={() => setShowIdModal(false)}
          title="My JoySplit ID"
        >
          <div className="flex flex-col items-center text-center py-2 space-y-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700">
              <Avatar src={user.photoURL} name={user.displayName} size="lg" />
            </div>
            <div>
              <h4 className="text-base font-bold text-[#0F172A] dark:text-slate-100">
                {user.displayName}
              </h4>
              <p className="text-xs text-[#64748B] dark:text-slate-400">{user.email}</p>
            </div>

            <div className="w-full bg-[#F8FAFC] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] font-semibold text-[#64748B] dark:text-slate-400 uppercase">
                  Your JoySplit ID
                </span>
                <div className="font-mono text-lg font-bold text-[#2563EB] dark:text-blue-400 tracking-wider">
                  {user.splitzyId}
                </div>
              </div>
              <button
                onClick={handleCopyId}
                className="p-2 text-slate-500 hover:text-[#2563EB] rounded-xl hover:bg-white dark:hover:bg-slate-700 transition-colors"
                title="Copy ID"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-xs">
              Share this code with friends so they can add you to their friend list and groups instantly.
            </p>

            <div className="w-full space-y-2">
              <Button
                fullWidth
                onClick={handleShareId}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                Share My JoySplit ID
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
