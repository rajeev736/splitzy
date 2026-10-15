"use client";

import React, { Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: React.ReactNode;
  hideNav?: boolean;
}

export function AppShell({ children, hideNav = false }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-[#0F172A]">
      {/* Persistent Desktop Sidebar */}
      {!hideNav && (
        <Suspense
          fallback={
            <aside className="hidden md:flex w-64 lg:w-72 shrink-0 bg-white border-r border-[#E5E7EB] min-h-screen" />
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
