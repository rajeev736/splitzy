"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Receipt,
  User,
  AtSign,
  QrCode,
  Bell,
  CreditCard,
  MoreVertical,
  Check,
  Copy,
  Clock,
  CheckCircle2,
  Trash2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { formatPaise } from "@/lib/money";
import { Suspense } from "react";

function ExpenseDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.expenseId as string;

  const {
    expenses,
    user,
    sendPaymentReminder,
    confirmPaymentReceipt,
    disputePaymentReceipt,
    deleteExpense,
  } = useAuth();
  const { success, error } = useToast();

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [selectedShareUser, setSelectedShareUser] = useState<any | null>(null);

  // 3-dot menu & delete modal state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const expense = expenses.find((e) => e.id === expenseId) || expenses[0];

  const myShare = expense.shares.find((s) => s.userId === user?.uid);
  const isRecipient = expense.recipientId === user?.uid;
  const isPayer = expense.payerId === user?.uid;
  const isCreator = expense.createdBy === user?.uid;
  const canDelete = isPayer || isCreator;

  // Invariant check: cannot delete if confirmed payments exist
  const hasPaidMembers = expense.shares.some(
    (s) => s.userId !== user?.uid && s.status === "PAID"
  );

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(expense.recipientUpiId);
    setCopiedUpi(true);
    success("UPI ID copied to clipboard!");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleRemindAll = async () => {
    const unpaids = expense.shares.filter((s) => s.status !== "PAID" && s.userId !== user?.uid);
    for (const u of unpaids) {
      await sendPaymentReminder(expense.id, u.userId);
    }
    success(`Reminder sent to ${unpaids.length} members!`);
    setIsMenuOpen(false);
  };

  const handleConfirmReceipt = async (userId: string) => {
    await confirmPaymentReceipt(expense.id, userId);
    success("Payment confirmed and marked as Paid!");
    setSelectedShareUser(null);
  };

  const handleDisputeReceipt = async (userId: string) => {
    await disputePaymentReceipt(expense.id, userId);
    error("Payment marked as disputed");
    setSelectedShareUser(null);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteExpense(expense.id);
      if (res.success) {
        success("Expense deleted successfully");
        setIsDeleteModalOpen(false);
        router.back();
      } else {
        error(res.message || "Failed to delete expense");
      }
    } catch (e: any) {
      error(e?.message || "Failed to delete expense");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppShell>
      <AppHeader
        title="Expense Details"
        showBack={true}
        rightAction={
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Expense options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push(`/expenses/${expense.id}/pay`);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                  Settle Up / Pay
                </button>

                <button
                  onClick={handleRemindAll}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                >
                  <Bell className="w-3.5 h-3.5 text-slate-400" />
                  Remind Unpaid
                </button>

                {canDelete && (
                  <>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDeleteModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      Delete Expense
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        }
      />

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-5 pb-24">
        {/* Screen 24: Header Hero Image Banner */}
        <div className="relative h-44 sm:h-52 rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
          <Image
            src={expense.groupIcon || "/assets/icon_beach.jpg"}
            alt={expense.title}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-5 text-white">
            <h1 className="text-2xl font-extrabold tracking-tight">{expense.title}</h1>
            <p className="text-xs text-slate-200 mt-0.5">
              {expense.groupName || "Personal Split"} • {expense.date}
            </p>
          </div>
        </div>

        {/* Amount & Status Bar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#64748B]">Total Bill Amount</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-0.5">
              {formatPaise(expense.amountPaise)}
            </div>
          </div>
          <Badge
            variant={
              expense.shares.every((s) => s.status === "PAID") ? "paid" : "pending"
            }
            size="md"
          />
        </div>

        {/* Bill Metadata Grid */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3.5 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-[#64748B]">
              <User className="w-4 h-4 text-slate-400" />
              <span>Paid by</span>
            </div>
            <span className="font-bold text-[#0F172A]">{expense.payerName}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-[#64748B]">
              <Receipt className="w-4 h-4 text-slate-400" />
              <span>Reimburse to</span>
            </div>
            <span className="font-bold text-[#0F172A]">{expense.recipientName}</span>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-[#64748B]">
              <AtSign className="w-4 h-4 text-slate-400" />
              <span>UPI ID</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[#2563EB]">
                {expense.recipientUpiId}
              </span>
              <button
                onClick={handleCopyUpi}
                className="text-slate-400 hover:text-blue-600 p-1"
                title="Copy UPI ID"
              >
                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-[#64748B]">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Date</span>
            </div>
            <span className="font-semibold text-[#0F172A]">{expense.date}</span>
          </div>

          {expense.notes && (
            <div className="pt-1 text-[#64748B] italic">
              Note: "{expense.notes}"
            </div>
          )}
        </div>

        {/* Member Splits List (Screen 24) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0F172A]">Participants & Shares</h3>
            <span className="text-xs text-[#64748B]">
              {expense.shares.length} people • {expense.splitType.toLowerCase()} split
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {expense.shares.map((share) => {
              const isMe = share.userId === user?.uid;
              const canConfirmThis = isRecipient && share.status === "PAYMENT_REPORTED";

              return (
                <div key={share.userId} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={share.userPhoto} name={share.userName} size="md" />
                    <div>
                      <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                        <span>{share.userName}</span>
                        {isMe && <span className="text-[10px] text-blue-600 font-semibold">(You)</span>}
                        {share.userId === expense.payerId && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                            Payer
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        Share: {formatPaise(share.amountPaise)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {share.status === "PAID" && (
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                      </span>
                    )}

                    {share.status === "PAYMENT_REPORTED" && (
                      <button
                        onClick={() => canConfirmThis && setSelectedShareUser(share)}
                        disabled={!canConfirmThis}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${
                          canConfirmThis
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {canConfirmThis ? "Verify Payment" : "Payment Reported"}
                      </button>
                    )}

                    {share.status === "PENDING" && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        Pending
                      </span>
                    )}

                    {share.status === "DISPUTED" && (
                      <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                        Disputed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="pt-2 flex gap-3">
          {myShare && myShare.status !== "PAID" && (
            <Button
              fullWidth
              size="lg"
              onClick={() => router.push(`/expenses/${expense.id}/pay`)}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Pay My Share ({formatPaise(myShare.amountPaise)})
            </Button>
          )}

          <Button
            variant="outline"
            fullWidth={!myShare || myShare.status === "PAID"}
            size="lg"
            onClick={handleRemindAll}
            leftIcon={<Bell className="w-4 h-4" />}
          >
            Remind Unpaid
          </Button>
        </div>
      </div>

      {/* Recipient Confirmation Modal */}
      {selectedShareUser && (
        <Modal
          isOpen={Boolean(selectedShareUser)}
          onClose={() => setSelectedShareUser(null)}
          title="Confirm Payment"
        >
          <div className="text-center py-2 space-y-4">
            <Avatar src={selectedShareUser.userPhoto} name={selectedShareUser.userName} size="lg" className="mx-auto" />
            <div>
              <h4 className="text-base font-bold text-[#0F172A]">{selectedShareUser.userName}</h4>
              <p className="text-xs text-[#64748B]">reported paid for {expense.title}</p>
            </div>

            <div className="text-2xl font-extrabold text-[#0F172A]">
              {formatPaise(selectedShareUser.amountPaise)}
            </div>

            <p className="text-xs text-[#64748B] max-w-xs mx-auto">
              Please check your UPI app or bank balance to verify if the payment was received.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => handleDisputeReceipt(selectedShareUser.userId)}
                className="!text-[#EF4444] !border-[#FCA5A5] hover:bg-red-50"
              >
                Not Received
              </Button>
              <Button
                variant="success"
                onClick={() => handleConfirmReceipt(selectedShareUser.userId)}
              >
                Confirm Received
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Expense Modal with Invariant Enforcement */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Expense"
        >
          <div className="space-y-4 pt-1">
            {hasPaidMembers ? (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Cannot Delete Expense</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  One or more members have already had their payments confirmed for this expense. To preserve financial audit integrity, expenses with confirmed payments cannot be deleted.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete <strong>"{expense.title}"</strong> ({formatPaise(expense.amountPaise)})? This action cannot be undone.
              </p>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                disabled={hasPaidMembers}
                isLoading={isDeleting}
                onClick={handleConfirmDelete}
              >
                Delete Expense
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

export default function ExpenseDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <ExpenseDetailsContent />
    </Suspense>
  );
}
