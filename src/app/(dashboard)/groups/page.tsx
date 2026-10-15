"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, Users, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { calculateMemberGroupBalance, formatPaise } from "@/lib/money";

export default function GroupsPage() {
  const router = useRouter();
  const { groups, expenses, user } = useAuth();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "settled">("all");

  const filteredGroups = groups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    const balance = user
      ? calculateMemberGroupBalance(user.uid, g.id, expenses)
      : { netPaise: 0, allSettled: true };

    if (filter === "settled") return balance.allSettled || balance.netPaise === 0;
    if (filter === "active") return !balance.allSettled && balance.netPaise !== 0;
    return true;
  });

  return (
    <AppShell>
      <AppHeader
        title="Groups"
        showBack={false}
        rightAction={
          <button
            onClick={() => router.push("/groups/new")}
            className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm"
            aria-label="Create Group"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        }
      />

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Search Field */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full bg-white border border-[#E5E7EB] rounded-2xl pl-10 pr-4 py-3 text-sm text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {(["all", "active", "settled"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                filter === tab
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab === "all" ? "All Groups" : tab}
            </button>
          ))}
        </div>

        {/* Groups List */}
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const balance = user
              ? calculateMemberGroupBalance(user.uid, group.id, expenses)
              : { netPaise: 0, owedToUserPaise: 0, userOwesPaise: 0, allSettled: true };

            return (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-13 h-13 rounded-2xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs flex items-center justify-center">
                    {group.icon ? (
                      <Image src={group.icon} alt={group.name} fill className="object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100 truncate">{group.name}</h3>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">{group.members.length} members</p>
                    {balance.allSettled || balance.netPaise === 0 ? (
                      <div className="mt-1">
                        <Badge variant="all_settled" size="sm" />
                      </div>
                    ) : balance.netPaise > 0 ? (
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        +{formatPaise(balance.netPaise)} to receive
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-[#EF4444] dark:text-red-400 mt-1">
                        {formatPaise(Math.abs(balance.netPaise))} you owe
                      </div>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
              </Link>
            );
          })}

          {filteredGroups.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center border border-slate-200 dark:border-slate-800">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-[#0F172A] dark:text-slate-100">No groups found</p>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">Try a different search query or create a new group.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
