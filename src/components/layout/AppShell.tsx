"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav = false }: AppShellProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      if (typeof window !== "undefined") {
        const currentUrl = window.location.pathname;
        if (currentUrl && !currentUrl.startsWith("/login") && !currentUrl.startsWith("/signup")) {
          sessionStorage.setItem("joysplit_redirect_to", currentUrl);
        }
      }
      router.replace("/login");
    }
  }, [isLoading, user, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg,#F8FAFC)] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-[#2563EB] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
          </div>
          <p className="text-xs font-semibold text-slate-500">Loading JoySplit...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg,#F8FAFC)] flex flex-col md:flex-row text-[var(--app-text,#0F172A)]">
      {/* Persistent Desktop Sidebar */}
      {!hideNav && (
        <Suspense
          fallback={
            <aside className="hidden md:flex w-64 lg:w-72 shrink-0 bg-[var(--app-card,#FFFFFF)] border-r border-[var(--app-border,#E5E7EB)] min-h-screen" />
          }
        >
          <Sidebar />
        </Suspense>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <div className="w-full flex-1">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      {!hideNav && (
        <Suspense fallback={null}>
          <BottomNav />
        </Suspense>
      )}
    </div>
  );
}
