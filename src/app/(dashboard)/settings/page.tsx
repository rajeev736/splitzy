"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { isFirebaseConfigured } from "@/lib/firebase/config";

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { success, warning } = useToast();

  const handleResetData = () => {
    localStorage.clear();
    warning("Demo data has been reset to defaults. Reloading...");
    setTimeout(() => {
      window.location.href = "/home";
    }, 1000);
  };

  return (
    <AppShell>
      <AppHeader title="Settings" showBack={true} />

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6 pb-20">
        {/* PWA & Mobile Installation */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Install Splitzy App</h3>
              <p className="text-xs text-[#64748B]">Add Splitzy to your home screen as a PWA</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3.5 text-xs text-[#64748B] leading-relaxed">
            On iOS: Tap the <strong>Share</strong> button in Safari, then tap <strong>Add to Home Screen</strong>.
            <br />
            On Android: Tap the menu (three dots) in Chrome, then tap <strong>Install App</strong>.
          </div>
        </div>

        {/* Financial Rules & Currency Precision */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#10B981] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Financial Precision</h3>
              <p className="text-xs text-[#64748B]">Deterministic Integer Paise Math</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-[#64748B]">
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Base Currency</span>
              <strong className="text-slate-800">INR (₹)</strong>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100">
              <span>Database Storage Unit</span>
              <strong className="text-slate-800">Integer Paise (1 INR = 100 Paise)</strong>
            </div>
            <div className="flex items-center justify-between py-1">
              <span>Remainder Distribution</span>
              <strong className="text-emerald-700">Strictly Deterministic</strong>
            </div>
          </div>
        </div>

        {/* Backend & Connectivity Status */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Backend & Security</h3>
              <p className="text-xs text-[#64748B]">Firebase Authentication + Cloud Firestore</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 text-xs">
            <span>Firebase Configuration</span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full ${
                isFirebaseConfigured
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {isFirebaseConfigured ? "Live Firebase Active" : "Interactive Demo Mode"}
            </span>
          </div>
        </div>

        {/* Reset & Maintenance */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
            Data Maintenance
          </h3>

          <button
            onClick={handleResetData}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <div>
                <div className="text-xs font-bold text-[#0F172A]">Reset Demo Data</div>
                <div className="text-[11px] text-[#64748B]">Restore initial groups, friends & bills</div>
              </div>
            </div>
            <span className="text-xs font-bold text-[#2563EB]">Reset</span>
          </button>
        </div>

        {/* About App */}
        <div className="text-center text-xs text-[#64748B] space-y-1">
          <p className="font-bold text-slate-700">JoySplit v1.0.0 (Zero-Budget MVP)</p>
          <p>Split bills. Keep friendships. Direct UPI settlement.</p>
        </div>
      </div>
    </AppShell>
  );
}
