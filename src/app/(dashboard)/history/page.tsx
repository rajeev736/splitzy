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

  // Derive genuine payment records from authentic expenses
  const paymentRecords: Array<{
    id: string;
    type: "sent" | "received";
    counterpart: string;
    photo?: string;
    note: string;
    amountPaise: number;
    time: string;
    status: string;
  }> = [];

  let totalSentPaise = 0;
  let totalReceivedPaise = 0;

  if (user) {
    expenses.forEach((exp) => {
      if (exp.payerId === user.uid) {
        // As payer, look for shares marked PAID or PAYMENT_REPORTED
        exp.shares.forEach((share) => {
          if (
            share.userId !== user.uid &&
            (share.status === "PAID" || share.status === "PAYMENT_REPORTED")
          ) {
            totalReceivedPaise += share.amountPaise;
            paymentRecords.push({
              id: `${exp.id}_${share.userId}`,
              type: "received",
              counterpart: share.userName,
              photo: share.userPhoto,
              note: exp.title,
              amountPaise: share.amountPaise,
              time: share.confirmedAt || share.reportedAt || exp.date,
              status: share.status === "PAID" ? "received" : "reported",
            });
          }
        });
      } else {
        // As participant, check own share
        const myShare = exp.shares.find((s) => s.userId === user.uid);
        if (myShare && (myShare.status === "PAID" || myShare.status === "PAYMENT_REPORTED")) {
          totalSentPaise += myShare.amountPaise;
          paymentRecords.push({
            id: `${exp.id}_${user.uid}`,
            type: "sent",
            counterpart: exp.payerName,
            note: exp.title,
            amountPaise: myShare.amountPaise,
            time: myShare.confirmedAt || myShare.reportedAt || exp.date,
            status: myShare.status === "PAID" ? "completed" : "reported",
          });
        }
      }
    });
  }

  const filteredPayments = paymentRecords.filter((p) => {
    if (paymentFilter === "sent") return p.type === "sent";
    if (paymentFilter === "received") return p.type === "received";
    return true;
  });

  const filteredExpenses = expenses.filter((exp) => {
    if (expenseFilter === "all") return true;
    if (expenseFilter === "paid") return exp.shares.every((s) => s.status === "PAID");
    if (expenseFilter === "pending") return exp.shares.some((s) => s.status === "PENDING");
    if (expenseFilter === "payment_reported")
      return exp.shares.some((s) => s.status === "PAYMENT_REPORTED");
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
        <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl transition-colors">
          <button
            onClick={() => setMainView("expenses")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mainView === "expenses"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Expense History
          </button>
          <button
            onClick={() => setMainView("payments")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              mainView === "payments"
                ? "bg-[#2563EB] text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Payment History
          </button>
        </div>

        {mainView === "expenses" ? (
          /* ================= EXPENSE HISTORY ================= */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "payment_reported", label: "Payment Reported" },
                { id: "paid", label: "Paid" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setExpenseFilter(f.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    expenseFilter === f.id
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Expenses List */}
            <div className="space-y-3">
              {filteredExpenses.map((exp) => (
                <Link
                  key={exp.id}
                  href={`/expenses/${exp.id}`}
                  className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                      {exp.groupIcon ? (
                        <Image src={exp.groupIcon} alt={exp.title} fill className="object-cover" />
                      ) : (
                        <Receipt className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[#0F172A] dark:text-slate-100 truncate">
                        {exp.title}
                      </div>
                      <div className="text-xs text-[#64748B] dark:text-slate-400">
                        {exp.groupName || "Direct Split"} • {exp.date}
                      </div>
                      <div className="text-xs font-bold text-[#0F172A] dark:text-slate-100 mt-1">
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
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  </div>
                </Link>
              ))}

              {filteredExpenses.length === 0 && (
                <div className="p-12 text-center text-xs text-[#64748B] dark:text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <span>No expenses found in this filter category.</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ================= PAYMENT HISTORY ================= */
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Total Sent & Received Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] dark:text-slate-400">
                  <Send className="w-3.5 h-3.5 text-[#2563EB] dark:text-blue-400" />
                  <span>Total Sent</span>
                </div>
                <div className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mt-1">
                  {formatPaise(totalSentPaise)}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10B981] dark:text-emerald-400">
                  <Download className="w-3.5 h-3.5 text-[#10B981] dark:text-emerald-400" />
                  <span>Total Received</span>
                </div>
                <div className="text-xl font-bold text-[#10B981] dark:text-emerald-400 mt-1">
                  {formatPaise(totalReceivedPaise)}
                </div>
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
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {tab === "all" ? "All Payments" : tab}
                </button>
              ))}
            </div>

            {/* Payments List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden transition-colors">
              {filteredPayments.map((p) => {
                const isSent = p.type === "sent";

                return (
                  <div
                    key={p.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isSent
                            ? "bg-blue-50 dark:bg-blue-950/40 text-[#2563EB] dark:text-blue-400"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-[#10B981] dark:text-emerald-400"
                        }`}
                      >
                        {isSent ? (
                          <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          <ArrowDownLeft className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-slate-100 truncate">
                          {isSent ? `Paid to ${p.counterpart}` : `Received from ${p.counterpart}`}
                        </div>
                        <div className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5 truncate">
                          {p.note}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">
                          {p.time}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm sm:text-base font-extrabold ${
                          isSent ? "text-[#0F172A] dark:text-slate-100" : "text-[#10B981] dark:text-emerald-400"
                        }`}
                      >
                        {isSent ? `- ${formatPaise(p.amountPaise)}` : `+ ${formatPaise(p.amountPaise)}`}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {p.status}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredPayments.length === 0 && (
                <div className="p-12 text-center text-xs text-[#64748B] dark:text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <span>No payment records found.</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
