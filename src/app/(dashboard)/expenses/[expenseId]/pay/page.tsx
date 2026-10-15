"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  ShieldCheck,
  Info,
  CheckCircle2,
  ExternalLink,
  Smartphone,
  AlertCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { formatPaise } from "@/lib/money";
import { buildUPILink, SUPPORTED_UPI_APPS } from "@/lib/upi";
import { Suspense } from "react";

function PayExpenseContent() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.expenseId as string;

  const { expenses, user, reportPayment } = useAuth();
  const { success, info } = useToast();

  const expense = expenses.find((e) => e.id === expenseId) || expenses[0];
  const myShare = expense.shares.find((s) => s.userId === user?.uid) || {
    amountPaise: 60000,
    status: "PENDING",
  };

  const [paymentNote, setPaymentNote] = useState(`${expense.title} - ${expense.groupName || "Splitzy"}`);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [showAppChooser, setShowAppChooser] = useState(false);
  const [isReported, setIsReported] = useState(myShare.status === "PAYMENT_REPORTED");

  const amountRupeesString = (myShare.amountPaise / 100).toFixed(0);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(expense.recipientUpiId);
    setCopiedUpi(true);
    success("UPI ID copied!");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amountRupeesString);
    setCopiedAmount(true);
    success("Amount copied!");
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleLaunchApp = (appId: string) => {
    const upiUri = buildUPILink({
      upiId: expense.recipientUpiId,
      payeeName: expense.recipientName,
      amountPaise: myShare.amountPaise,
      note: paymentNote,
      app: appId as any,
    });

    setShowAppChooser(false);

    // Attempt to open native UPI application
    window.location.href = upiUri;

    // Report prompt
    setTimeout(() => {
      handleMarkReported();
    }, 1500);
  };

  const handleMarkReported = async () => {
    await reportPayment(expense.id, paymentNote);
    setIsReported(true);
    success("Payment reported! Waiting for recipient confirmation.");
  };

  return (
    <AppShell>
      <AppHeader
        title={isReported ? "Payment Reported" : "Pay Your Share"}
        showBack={true}
        onBack={() => router.push(`/expenses/${expense.id}`)}
      />

      <div className="max-w-md mx-auto p-4 sm:p-6 pb-20">
        {!isReported ? (
          /* ================= SCREEN 25: PAY NOW ================= */
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header Mini Bill Card */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                <Image src={expense.groupIcon || "/assets/icon_beach.jpg"} alt={expense.title} fill className="object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#0F172A] truncate">{expense.title}</h3>
                <p className="text-xs text-[#64748B]">
                  {expense.groupName || "Personal"} • {expense.date}
                </p>
              </div>
            </div>

            {/* Share Amount Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#64748B]">Your share</span>
                <div className="text-3xl font-extrabold text-[#0F172A] mt-1">
                  {formatPaise(myShare.amountPaise)}
                </div>
              </div>
              <Badge variant="pending" size="md" />
            </div>

            {/* Recipient Details Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#64748B]">Pay to</span>
                <button
                  onClick={handleCopyAmount}
                  className="text-xs font-bold text-[#2563EB] hover:underline"
                >
                  {copiedAmount ? "Copied ₹" : "Copy Amount"}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Avatar name={expense.recipientName} size="md" />
                <div>
                  <div className="text-sm font-bold text-[#0F172A]">{expense.recipientName}</div>
                  <div className="text-xs text-[#64748B]">Recipient</div>
                </div>
              </div>

              {/* UPI ID display with Copy */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#64748B]">UPI ID</span>
                  <div className="font-mono text-sm font-bold text-[#0F172A]">
                    {expense.recipientUpiId}
                  </div>
                </div>
                <button
                  onClick={handleCopyUpi}
                  className="p-2 text-slate-500 hover:text-[#2563EB] rounded-xl hover:bg-white transition-colors"
                  title="Copy UPI ID"
                >
                  {copiedUpi ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Custom Transaction Note */}
              <div>
                <label className="text-xs font-semibold text-[#0F172A] mb-1.5 block">
                  Add a note to payment (optional)
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. Dinner at Thalassa - Goa Trip"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            {/* Redirect Info Callout */}
            <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
              <div className="text-xs text-[#1E40AF] leading-relaxed">
                You will be redirected to your UPI app to complete the payment. If your app doesn't open automatically, you can copy the UPI ID above.
              </div>
            </div>

            {/* Pay CTA */}
            <Button
              fullWidth
              size="lg"
              onClick={() => setShowAppChooser(true)}
              className="py-4 shadow-md text-base"
            >
              Pay {formatPaise(myShare.amountPaise)}
            </Button>

            {/* Secondary Option: Already Paid */}
            <Button
              fullWidth
              variant="outline"
              size="md"
              onClick={handleMarkReported}
            >
              I already paid (Report Payment)
            </Button>

            {/* Footer Trust Badges */}
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#64748B] pt-1">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>No extra charges • Direct UPI peer-to-peer transfer</span>
            </div>
          </div>
        ) : (
          /* ================= SCREEN 28: PAYMENT REPORTED ================= */
          <div className="space-y-6 text-center animate-in zoom-in-95 duration-200">
            {/* Big Green Success Checkmark with Rays */}
            <div className="relative w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-12 h-12 stroke-[3]" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-[#0F172A]">Payment Reported</h2>
              <p className="text-xs text-[#64748B] mt-1">
                You have returned from your UPI app.
              </p>
            </div>

            {/* Payment Summary Receipt Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs text-left space-y-3.5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200">
                  <Image src={expense.groupIcon || "/assets/icon_beach.jpg"} alt={expense.title} fill className="object-cover" />
                </div>
                <div className="text-xs font-bold text-[#0F172A]">{expense.title}</div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Amount</span>
                <span className="text-base font-extrabold text-[#0F172A]">
                  {formatPaise(myShare.amountPaise)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">To</span>
                <span className="font-bold text-[#0F172A]">
                  {expense.recipientName} ({expense.recipientUpiId})
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#64748B]">Status</span>
                <Badge variant="payment_reported" size="sm" />
              </div>
            </div>

            {/* Recipient Confirmation Disclaimer */}
            <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3 text-left">
              <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
              <div className="text-xs text-[#1E40AF] leading-relaxed">
                The payment has been reported. It will be marked as <strong>Paid</strong> once {expense.recipientName} confirms receipt.
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button fullWidth size="lg" onClick={() => router.push("/home")}>
                Done
              </Button>
              <Button
                fullWidth
                variant="outline"
                size="md"
                onClick={() => router.push(`/expenses/${expense.id}`)}
              >
                View Expense
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Screen 26: Choose UPI App Sheet */}
      <Modal
        isOpen={showAppChooser}
        onClose={() => setShowAppChooser(false)}
        title="Open with"
        description="Choose your preferred UPI app to make the payment"
      >
        <div className="space-y-2.5 py-1">
          {SUPPORTED_UPI_APPS.map((app) => (
            <button
              key={app.id}
              onClick={() => handleLaunchApp(app.id)}
              className="w-full flex items-center justify-between p-3.5 bg-[#F8FAFC] hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-2xl transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${app.iconBg} shadow-xs`}
                >
                  {app.name.charAt(0)}
                </div>
                <span className="text-sm font-bold text-[#0F172A]">{app.name}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {app.badge}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </AppShell>
  );
}

export default function PayExpensePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <PayExpenseContent />
    </Suspense>
  );
}

