"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  UserCheck,
  Clock,
  History,
  Bell,
  User,
  Settings,
  PlusCircle,
  LogOut,
  Loader2,
} from "lucide-react";
import { SplitzyLogo } from "@/components/brand/SplitzyLogo";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Avatar } from "@/components/ui/Avatar";
import { formatPaise } from "@/lib/money";

import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, netBalancePaise, notifications } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  const links = [
    { label: "Home", href: "/home", icon: Home },
    { label: "Groups", href: "/groups", icon: Users },
    { label: "Friends", href: "/friends", icon: UserCheck },
    { label: "Activity", href: "/activity", icon: Clock },
    { label: "History", href: "/history", icon: History },
    {
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
    },
    { label: "Profile", href: "/profile", icon: User },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 bg-white dark:bg-slate-900 border-r border-[#E5E7EB] dark:border-slate-800 min-h-screen sticky top-0 h-screen select-none z-40 pointer-events-auto transition-colors">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#F1F5F9] dark:border-slate-800">
        <SplitzyLogo size="md" showTagline={true} href="/home" />
      </div>

      {/* Quick Add CTA */}
      <div className="p-4">
        <Link
          href="/expenses/new"
          className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-3 px-4 rounded-xl font-semibold shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Add Expense</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {links.map((link) => {
          const isActive =
            pathname === link.href || (link.href !== "/home" && pathname.startsWith(link.href));
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer
                ${
                  isActive
                    ? "bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400"
                    : "text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? "text-[#2563EB] dark:text-blue-400 stroke-[2.2]"
                      : "text-[#64748B] dark:text-slate-400"
                  }`}
                />
                <span>{link.label}</span>
              </div>
              {link.badge !== undefined && (
                <span className="bg-[#EF4444] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Desktop Balance Mini Preview Card */}
      <div className="p-4 mx-4 mb-3 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800/50 border border-[#E5E7EB] dark:border-slate-800 transition-colors">
        <div className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
          Net Balance
        </div>
        <div
          className={`text-xl font-bold tracking-tight mt-0.5 ${
            netBalancePaise >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
          }`}
        >
          {netBalancePaise >= 0 ? `+${formatPaise(netBalancePaise)}` : formatPaise(netBalancePaise)}
        </div>
        <div className="text-[11px] text-[#64748B] dark:text-slate-400 mt-0.5">
          {netBalancePaise >= 0 ? "You will receive" : "You need to pay"}
        </div>
      </div>

      {/* User Footer Profile */}
      {user && (
        <div className="p-4 border-t border-[#F1F5F9] dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 transition-colors">
          <Link href="/profile" className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85">
            <Avatar src={user.photoURL} name={user.displayName} size="sm" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100 truncate">
                {user.displayName}
              </div>
              <div className="text-[11px] text-[#2563EB] dark:text-blue-400 font-mono font-medium truncate">
                {user.splitzyId}
              </div>
            </div>
          </Link>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="Log out"
            aria-label="Log out of Splitzy"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </aside>
  );
}
