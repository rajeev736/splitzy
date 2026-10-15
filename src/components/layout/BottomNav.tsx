"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Clock, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/home", icon: Home },
    { label: "Groups", href: "/groups", icon: Users },
    { label: "Activity", href: "/activity", icon: Clock },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-[#E5E7EB] dark:border-slate-800 px-3 py-2 pb-safe transition-colors">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150
                ${
                  isActive
                    ? "text-[#2563EB] dark:text-blue-400 font-bold"
                    : "text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-200 font-medium"
                }
              `}
            >
              <div
                className={`relative p-1 rounded-full transition-transform ${
                  isActive ? "scale-110" : ""
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.75]"}`} />
              </div>
              <span className="text-[11px] tracking-tight mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
