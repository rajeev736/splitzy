"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Filter,
  Send,
  Download,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { formatPaise } from "@/lib/money";

export default function HistoryPage() {
  const { expenses, user } = useAuth();

  const [mainView, setMainView] = useState<"expenses" | "payments">("expenses");
  const [expenseFilter, setExpenseFilter] = useState<
    "all" | "pending" | "payment_reported" | "paid" | "failed"
  >("all");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "sent" | "received">("all");

  const paymentRecords = [
    {
      id: "pay_1",
      type: "sent",
      counterpart: "Aman Verma",
      photo: "/assets/avatar_boy.jpg",
      note: "Dinner at Thalassa",
      amountPaise: 60000,
      time: "Oct 12, 2026 • 2:30 PM",
      status: "completed",
    },
    {
      id: "pay_2",
      type: "sent",
      counterpart: "Neha Sharma",
      photo: "/assets/avatar_girl.jpg",
      note: "Goa Trip",
      amountPaise: 60000,
      time: "Oct 12, 2026 • 1:15 PM",
      status: "completed",
    },
    {
      id: "pay_3",
      type: "received",
      counterpart: "Rohit Mehta",
      photo: "/assets/avatar_glasses.jpg",
      note: "Goa Trip",
      amountPaise: 60000,
      time: "Oct 12, 2026 • 1:10 PM",
      status: "received",
    },
    {
      id: "pay_4",
      type: "sent",
      counterpart: "Priya Singh",
      photo: "/assets/avatar_girl.jpg",
      note: "Movie Plan",
      amountPaise: 60000,
      time: "Oct 10, 2026 • 8:45 PM",
      status: "completed",
    },
    {
      id: "pay_5",
      type: "received",
      counterpart: "Karan Patel",
      photo: "/assets/avatar_boy.jpg",
      note: "Cafe Hangout",
      amountPaise: 80000,
      time: "Oct 05, 2026 • 7:20 PM",
      status: "received",
    },
  ];

  const filteredPayments = paymentRecords.filter((p) => {
    if (paymentFilter === "sent") return p.type === "sent";
    if (paymentFilter === "received") return p.type === "received";
    return true;
  });

  return (
    <AppShell>
      <AppHeader
        title={mainView === "expenses" ? "Expense History" : "Payment History"}
        showBack={false}
      />

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Main Segmented Toggle */}
        <div className="flex bg-slate-200/80 p-1 rounded-2xl">
          <button
            onClick={() => setMainView("expenses")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mainView === "expenses"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Expense History
          </button>
          <button
            onClick={() => setMainView("payments")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mainView === "payments"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Payment History
          </button>
        </div>

        {mainView === "expenses" ? (
          /* ================= SCREEN 31: EXPENSE HISTORY ================= */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "payment_reported", label: "Payment Reported" },
                { id: "paid", label: "Paid" },
                { id: "failed", label: "Failed" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setExpenseFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    expenseFilter === f.id
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Expenses List */}
            <div className="space-y-3">
              {expenses.map((exp) => (
                <Link
                  key={exp.id}
                  href={`/expenses/${exp.id}`}
                  className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                      <Image
                        src={exp.groupIcon || "/assets/icon_beach.jpg"}
                        alt={exp.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#0F172A] truncate">
                        {exp.title}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        {exp.groupName || "Personal"} • {exp.date}
                      </div>
                      <div className="text-xs font-bold text-[#0F172A] mt-1">
                        {formatPaise(exp.amountPaise)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge
                      variant={
                        exp.shares.every((s) => s.status === "PAID") ? "paid" : "pending"
                      }
                      size="sm"
                    />
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          /* ================= SCREEN 32: PAYMENT HISTORY ================= */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Total Sent & Received Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B]">
                  <Send className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Total Sent</span>
                </div>
                <div className="text-xl font-bold text-[#0F172A] mt-1">₹4,850</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10B981]">
                  <Download className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Total Received</span>
                </div>
                <div className="text-xl font-bold text-[#10B981] mt-1">₹5,200</div>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2">
              {(["all", "sent", "received"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPaymentFilter(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                    paymentFilter === tab
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab === "all" ? "All" : tab}
                </button>
              ))}
            </div>

            {/* Payments List (Screen 32) */}
            <div className="space-y-3">
              {filteredPayments.map((p) => (
                <div
                  key={p.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={p.photo} name={p.counterpart} size="md" />
                    <div>
                      <div className="text-xs font-bold text-[#0F172A]">
                        {p.type === "sent" ? `To ${p.counterpart}` : `From ${p.counterpart}`}
                      </div>
                      <div className="text-xs text-[#64748B]">
                        <strong className="text-slate-800">{formatPaise(p.amountPaise)}</strong> • {p.note}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{p.time}</div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      p.type === "received"
                        ? "bg-[#E0F2FE] text-[#0284C7]"
                        : "bg-[#DCFCE7] text-[#16A34A]"
                    }`}
                  >
                    {p.type === "received" ? "Received" : "Completed"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
