"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, QrCode } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showUserGreeting?: boolean;
}

export function AppHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  showUserGreeting = false,
}: AppHeaderProps) {
  const router = useRouter();
  const { user, notifications } = useAuth();
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-4 py-3 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* Left item */}
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <button
              onClick={handleBack}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
          )}

          {showUserGreeting && user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="shrink-0">
                <Avatar src={user.photoURL} name={user.displayName} size="md" />
              </Link>
              <div>
                <div className="text-base font-bold text-[#0F172A] leading-tight flex items-center gap-1.5">
                  <span>Hi {user.displayName.split(" ")[0]}!</span>
                  <span>👋</span>
                </div>
                <div className="text-xs text-[#64748B] font-medium">Good to see you again</div>
              </div>
            </div>
          ) : (
            <div>
              {title && (
                <h1 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight truncate">
                  {title}
                </h1>
              )}
              {subtitle && <p className="text-xs text-[#64748B] font-medium">{subtitle}</p>}
            </div>
          )}
        </div>

        {/* Right items */}
        <div className="flex items-center gap-2">
          {rightAction ? (
            rightAction
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/notifications"
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 stroke-[2]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#EF4444] rounded-full ring-2 ring-white" />
                )}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
