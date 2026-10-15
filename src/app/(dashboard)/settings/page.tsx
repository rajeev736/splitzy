"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Shield,
  Smartphone,
  Database,
  RefreshCw,
  LogOut,
  Info,
  CheckCircle2,
  ExternalLink,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useTheme, Theme } from "@/context/ThemeContext";
import { isFirebaseConfigured } from "@/lib/firebase/config";

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { success, warning } = useToast();
  const { theme, setTheme } = useTheme();

  const handleClearCache = () => {
    localStorage.removeItem("joysplit_user_profile");
    localStorage.removeItem("joysplit_friends_list");
    localStorage.removeItem("joysplit_groups_list");
    localStorage.removeItem("joysplit_expenses_list");
    localStorage.removeItem("joysplit_notifications_list");
    localStorage.removeItem("joysplit_friend_requests");
    warning("Local cache cleared. Syncing with live Firestore...");
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
    { value: "system", label: "System", icon: <Laptop className="w-4 h-4" /> },
  ];

  return (
    <AppShell>
      <AppHeader title="Settings" showBack={true} />

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6 pb-20">
        {/* Appearance & Theme Selector */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Appearance & Theme</h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Choose your preferred visual theme</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {themeOptions.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                    isSelected
                      ? "border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400 shadow-xs ring-2 ring-blue-500/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className={`p-2 rounded-xl ${isSelected ? "bg-[#2563EB] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                    {opt.icon}
                  </div>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PWA & Mobile Installation */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2563EB] dark:text-blue-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Install JoySplit App</h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Add JoySplit to your home screen as a PWA</p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
            On iOS: Tap the <strong>Share</strong> button in Safari, then tap <strong>Add to Home Screen</strong>.
            <br />
            On Android: Tap the menu (three dots) in Chrome, then tap <strong>Install App</strong>.
          </div>
        </div>

        {/* Financial Rules & Currency Precision */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#10B981] dark:text-emerald-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Financial Precision</h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Deterministic Integer Paise Math</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-[#64748B] dark:text-slate-400">
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Base Currency</span>
              <strong className="text-slate-800 dark:text-slate-200">INR (₹)</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span>Database Storage Unit</span>
              <strong className="text-slate-800 dark:text-slate-200">Integer Paise (1 INR = 100 Paise)</strong>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Remainder Distribution</span>
              <strong className="text-emerald-700 dark:text-emerald-400">Strictly Deterministic</strong>
            </div>
          </div>
        </div>

        {/* Backend & Connectivity Status */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-[#7C3AED] dark:text-purple-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-slate-100">Backend & Security</h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400">Firebase Authentication + Cloud Firestore</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs">
            <span className="text-slate-600 dark:text-slate-400">Firebase Configuration</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full ${
                isFirebaseConfigured
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
              }`}
            >
              {isFirebaseConfigured ? "Live Firebase Active" : "Interactive Demo Mode"}
            </span>
          </div>
        </div>

        {/* Cache Maintenance */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-3 transition-colors">
          <h3 className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
            Client Cache
          </h3>

          <button
            onClick={handleClearCache}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100">Clear Local Cache</div>
                <div className="text-[11px] text-[#64748B] dark:text-slate-400">Purges browser cache and re-syncs from Firestore</div>
              </div>
            </div>
            <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400">Sync</span>
          </button>
        </div>

        {/* About App */}
        <div className="text-center text-xs text-[#64748B] dark:text-slate-400 space-y-1">
          <p className="font-bold text-slate-700 dark:text-slate-300">JoySplit v1.0.0 (Zero-Budget Production MVP)</p>
          <p>Split bills. Keep friendships. Direct UPI settlement.</p>
        </div>
      </div>
    </AppShell>
  );
}
