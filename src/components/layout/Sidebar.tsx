"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  QrCode,
  LogOut,
} from "lucide-react";
import { SplitzyLogo } from "@/components/brand/SplitzyLogo";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { formatPaise } from "@/lib/money";

export function Sidebar() {
  const pathname = usePathname();
  const { user, netBalancePaise, logout, notifications } = useAuth();

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
    <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 bg-white border-r border-[#E5E7EB] min-h-screen sticky top-0 h-screen select-none z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#F1F5F9]">
        <SplitzyLogo size="md" showTagline={true} href="/home" />
      </div>

      {/* Quick Add CTA */}
      <div className="p-4">
        <Link
          href="/expenses/new"
          className="w-full flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-3 px-4 rounded-xl font-semibold shadow-sm transition-all duration-150 active:scale-[0.98]"
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
                flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                ${
                  isActive
                    ? "bg-[#EFF6FF] text-[#2563EB]"
                    : "text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? "text-[#2563EB] stroke-[2.2]" : "text-[#64748B]"}`} />
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
      <div className="p-4 mx-4 mb-3 rounded-2xl bg-[#F8FAFC] border border-[#E5E7EB]">
        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
          Net Balance
        </div>
        <div
          className={`text-xl font-bold tracking-tight mt-0.5 ${
            netBalancePaise >= 0 ? "text-[#10B981]" : "text-[#EF4444]"
          }`}
        >
          {netBalancePaise >= 0 ? `+${formatPaise(netBalancePaise)}` : formatPaise(netBalancePaise)}
        </div>
        <div className="text-[11px] text-[#64748B] mt-0.5">
          {netBalancePaise >= 0 ? "You will receive" : "You need to pay"}
        </div>
      </div>

      {/* User Footer Profile */}
      {user && (
        <div className="p-4 border-t border-[#F1F5F9] flex items-center justify-between bg-white">
          <Link href="/profile" className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85">
            <Avatar src={user.photoURL} name={user.displayName} size="sm" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#0F172A] truncate">
                {user.displayName}
              </div>
              <div className="text-[11px] text-[#2563EB] font-mono font-medium truncate">
                {user.splitzyId}
              </div>
            </div>
          </Link>
          <button
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
