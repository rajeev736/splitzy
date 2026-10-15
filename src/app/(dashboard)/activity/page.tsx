"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Users,
  Receipt,
  CreditCard,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";

export default function ActivityPage() {
  const router = useRouter();
  const { notifications, expenses, friends } = useAuth();
  const [filter, setFilter] = useState<"all" | "friends" | "groups" | "payments">("all");

  const activities = notifications.map((n) => {
    let type: "friends" | "groups" | "payments" = "payments";
    let link = "/notifications";
    if (n.type.includes("FRIEND")) {
      type = "friends";
      link = "/friends/requests";
    } else if (n.type.includes("GROUP")) {
      type = "groups";
      link = n.data?.groupId ? `/groups/${n.data.groupId}` : "/groups";
    } else if (n.type.includes("EXPENSE") || n.type.includes("PAYMENT")) {
      type = "payments";
      link = n.data?.expenseId ? `/expenses/${n.data.expenseId}` : "/history";
    }

    return {
      id: n.id,
      user: {
        name: n.data?.actorName || "JoySplit",
        photo: undefined,
      },
      action: n.message,
      time: new Date(n.createdAt).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      }),
      type,
      link,
    };
  });

  const filtered = activities.filter((act) => {
    if (filter === "all") return true;
    return act.type === filter;
  });

  return (
    <AppShell>
      <AppHeader title="Activity" showBack={false} />

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(["all", "friends", "groups", "payments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize shrink-0 transition-all ${
                filter === tab
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              {tab === "all" ? "All Activity" : tab}
            </button>
          ))}
        </div>

        {/* Activity Feed */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden transition-colors">
          {filtered.map((act) => (
            <Link
              key={act.id}
              href={act.link}
              className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Avatar src={act.user.photo} name={act.user.name} size="md" />

                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-[#0F172A] dark:text-slate-100 leading-snug">
                    <span className="font-bold">{act.user.name} </span>
                    <span className="text-[#64748B] dark:text-slate-400">{act.action}</span>
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                    {act.time}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 ml-3" />
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="p-12 text-center text-xs text-[#64748B] dark:text-slate-400">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <span>No activity recorded yet in this category.</span>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
