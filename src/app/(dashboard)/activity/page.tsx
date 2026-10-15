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

  const activities = [
    {
      id: "act_1",
      user: { name: "Aman Verma", photo: "/assets/avatar_boy.jpg" },
      action: "accepted your friend request",
      time: "2m ago",
      type: "friends",
      link: "/friends",
      buttonText: null,
    },
    {
      id: "act_2",
      user: { name: "Neha Sharma", photo: "/assets/avatar_girl.jpg" },
      action: 'invited you to join "Goa Trip"',
      time: "10m ago",
      type: "groups",
      link: "/groups/grp_goa",
      buttonText: "View",
    },
    {
      id: "act_3",
      user: { name: "Rohit Mehta", photo: "/assets/avatar_glasses.jpg" },
      action: "marked your payment as received",
      time: "1h ago",
      type: "payments",
      link: "/expenses/exp_thalassa",
      buttonText: null,
    },
    {
      id: "act_4",
      user: { name: "Priya Singh", photo: "/assets/avatar_girl.jpg" },
      action: 'added a new expense "Dinner at Thalassa"',
      time: "1h ago",
      type: "groups",
      link: "/expenses/exp_thalassa",
      buttonText: "View",
    },
    {
      id: "act_5",
      user: { name: "Karan Patel", photo: "/assets/avatar_boy.jpg" },
      action: 'confirmed payment for "Movie Plan"',
      time: "3h ago",
      type: "payments",
      link: "/expenses/exp_movie",
      buttonText: null,
    },
    {
      id: "act_6",
      user: { name: "Sneha Gupta", photo: "/assets/avatar_girl.jpg" },
      action: 'created a new group "Office Lunch"',
      time: "4h ago",
      type: "groups",
      link: "/groups/grp_lunch",
      buttonText: null,
    },
  ];

  const filtered = activities.filter((act) => {
    if (filter === "all") return true;
    return act.type === filter;
  });

  return (
    <AppShell>
      <AppHeader title="Activity" showBack={false} />

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Filter Pills (Screen 30 top) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {(["all", "friends", "groups", "payments"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize shrink-0 transition-all ${
                filter === tab
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab === "all" ? "All" : tab}
            </button>
          ))}
        </div>

        {/* Activity Items List (Screen 30) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Avatar src={item.user.photo} name={item.user.name} size="md" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-semibold text-[#0F172A] leading-snug">
                    <strong className="font-bold">{item.user.name}</strong> {item.action}
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5">{item.time}</div>
                </div>
              </div>

              {item.buttonText ? (
                <Link
                  href={item.link}
                  className="px-3.5 py-1.5 bg-blue-50 text-[#2563EB] hover:bg-blue-100 rounded-xl text-xs font-bold shrink-0 transition-colors"
                >
                  {item.buttonText}
                </Link>
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
              )}
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-xs text-[#64748B]">
              No activity in this category.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
