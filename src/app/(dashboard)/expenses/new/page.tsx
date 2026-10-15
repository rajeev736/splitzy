"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  X,
  Calendar,
  Receipt,
  User,
  AtSign,
  QrCode,
  Check,
  CheckCircle2,
  AlertCircle,
  Share2,
  Search,
  Plus,
  ChevronDown,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  rupeesToPaise,
  formatPaise,
  calculateEqualSplit,
  validateManualSplit,
  SplitShare,
} from "@/lib/money";
import { Suspense } from "react";

function NewExpenseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGroupId = searchParams.get("groupId");
  const preselectedFriendId = searchParams.get("friend");

  const { groups, friends, user, createExpense } = useAuth();
  const { success, error: toastError } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Basic Info
  const [expenseType, setExpenseType] = useState<"group" | "personal">(
    preselectedFriendId ? "personal" : "group"
  );
  const [selectedGroupId, setSelectedGroupId] = useState(preselectedGroupId || groups[0]?.id || "");
  const [selectedFriendId, setSelectedFriendId] = useState(preselectedFriendId || friends[0]?.uid || "");
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [title, setTitle] = useState("Dinner at Thalassa");
  const [amountRupees, setAmountRupees] = useState("2400");
  const [payerId, setPayerId] = useState(user?.uid || friends[0]?.uid || "usr_aman");
  const [recipientId, setRecipientId] = useState(user?.uid || friends[0]?.uid || "usr_aman");
  const [recipientUpiId, setRecipientUpiId] = useState("aman@upi");
  const [date, setDate] = useState("2026-10-12");
  const [notes, setNotes] = useState("Dinner with beach view 🌴");

  // Step 2: Participants
  const fallbackGroup = {
    id: "grp_default",
    name: "General Split",
    description: "General group",
    icon: "/assets/icon_food.jpg",
    members: [user?.uid || "usr_me"],
    createdBy: user?.uid || "usr_me",
    createdAt: new Date().toISOString(),
    memberDetails: {},
  };
  const currentGroup = groups.find((g) => g.id === selectedGroupId) || groups[0] || fallbackGroup;

  // Selected Friend for personal split
  const selectedFriend = friends.find((f) => f.uid === selectedFriendId) || friends[0];

  // Authoritative eligible participants list:
  // For group expense: ONLY members of the current group (Never unrelated friends!)
  // For personal expense: Current user + selected friend
  const groupEligibleMembers = currentGroup.members.map((mId) => {
    if (mId === user?.uid) {
      return {
        uid: user.uid,
        displayName: `${user.displayName} (You)`,
        rawName: user.displayName,
        photoURL: user.photoURL,
        splitzyId: user.splitzyId,
        upiId: user.upiId,
        isCurrentUser: true,
      };
    }
    const fr = friends.find((f) => f.uid === mId);
    const det = currentGroup.memberDetails?.[mId];
    return {
      uid: mId,
      displayName: det?.name || fr?.displayName || `Member ${mId.slice(-4)}`,
      rawName: det?.name || fr?.displayName || `Member`,
      photoURL: det?.photoURL || fr?.photoURL || "/assets/avatar_boy.jpg",
      splitzyId: det?.splitzyId || fr?.splitzyId || mId,
      upiId: fr?.upiId || `${(det?.name || "user").toLowerCase().replace(/\s+/g, "")}@upi`,
      isCurrentUser: false,
    };
  });

  const personalEligibleMembers = [
    ...(user
      ? [
          {
            uid: user.uid,
            displayName: `${user.displayName} (You)`,
            rawName: user.displayName,
            photoURL: user.photoURL,
            splitzyId: user.splitzyId,
            upiId: user.upiId,
            isCurrentUser: true,
          },
        ]
      : []),
    ...(selectedFriend
      ? [
          {
            uid: selectedFriend.uid,
            displayName: selectedFriend.displayName,
            rawName: selectedFriend.displayName,
            photoURL: selectedFriend.photoURL,
            splitzyId: selectedFriend.splitzyId,
            upiId: selectedFriend.upiId,
            isCurrentUser: false,
          },
        ]
      : []),
  ];

  const eligibleParticipants =
    expenseType === "group" ? groupEligibleMembers : personalEligibleMembers;

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");

  // Keep selectedParticipants constrained to eligible participants
  useEffect(() => {
    if (expenseType === "group") {
      // By default select all members of the group
      setSelectedParticipants(currentGroup.members);
      if (!currentGroup.members.includes(payerId)) {
        setPayerId(user?.uid || currentGroup.members[0] || "");
      }
      if (!currentGroup.members.includes(recipientId)) {
        setRecipientId(user?.uid || currentGroup.members[0] || "");
      }
    } else {
      // Personal expense: both user and selected friend
      const pUids = personalEligibleMembers.map((m) => m.uid).filter(Boolean);
      setSelectedParticipants(pUids);
      if (!pUids.includes(payerId)) {
        setPayerId(user?.uid || "");
      }
      if (!pUids.includes(recipientId)) {
        setRecipientId(user?.uid || "");
      }
    }
  }, [expenseType, selectedGroupId, selectedFriendId, currentGroup.members.length]);

  // Step 3: Split mode & shares
  const [splitMode, setSplitMode] = useState<"EQUAL" | "MANUAL">("EQUAL");
  const [manualShares, setManualShares] = useState<Record<string, string>>({});
  const [calculatedShares, setCalculatedShares] = useState<SplitShare[]>([]);

  // Step 5: Created expense Id
  const [createdExpenseId, setCreatedExpenseId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-sync recipient UPI ID when recipient changes
  useEffect(() => {
    const found = eligibleParticipants.find((p) => p.uid === recipientId);
    if (found?.upiId) {
      setRecipientUpiId(found.upiId);
    } else if (recipientId === user?.uid) {
      setRecipientUpiId(user.upiId || "rajeev@upi");
    }
  }, [recipientId, eligibleParticipants, user]);

  // Recalculate equal shares whenever amount or participants change
  useEffect(() => {
    const totalPaise = rupeesToPaise(amountRupees);
    const activeParticipants = selectedParticipants.map((pId) => {
      const found = eligibleParticipants.find((p) => p.uid === pId);
      return { id: pId, name: found?.rawName || found?.displayName || "Member" };
    });

    const equal = calculateEqualSplit(totalPaise, activeParticipants);
    setCalculatedShares(equal);

    // Initial manual shares map
    const initialManual: Record<string, string> = {};
    equal.forEach((s) => {
      initialManual[s.userId] = (s.amountPaise / 100).toString();
    });
    setManualShares(initialManual);
  }, [amountRupees, selectedParticipants, eligibleParticipants]);

  const toggleParticipant = (uid: string) => {
    if (selectedParticipants.includes(uid)) {
      if (selectedParticipants.length <= 1) {
        toastError("Expense must have at least one participant");
        return;
      }
      setSelectedParticipants(selectedParticipants.filter((id) => id !== uid));
    } else {
      setSelectedParticipants([...selectedParticipants, uid]);
    }
  };

  const handleStep1Next = () => {
    if (!title.trim()) {
      toastError("Please enter an expense title");
      return;
    }
    const paise = rupeesToPaise(amountRupees);
    if (paise <= 0) {
      toastError("Please enter a valid amount greater than ₹0");
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (selectedParticipants.length === 0) {
      toastError("Select at least 1 participant");
      return;
    }
    setStep(3);
  };

  const handleStep3Next = () => {
    if (splitMode === "MANUAL") {
      const totalPaise = rupeesToPaise(amountRupees);
      const sharesList: SplitShare[] = selectedParticipants.map((pId) => {
        const fr = pId === user?.uid ? user : friends.find((f) => f.uid === pId);
        return {
          userId: pId,
          userName: fr?.displayName || "Member",
          amountPaise: rupeesToPaise(manualShares[pId] || 0),
        };
      });

      const validation = validateManualSplit(totalPaise, sharesList);
      if (!validation.isValid) {
        toastError(validation.message || "Manual split total does not match bill total");
        return;
      }
      setCalculatedShares(sharesList);
    }
    setStep(4);
  };

  const handleCreateExpense = async () => {
    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);
    try {
      const totalPaise = rupeesToPaise(amountRupees);
      const payerObj = eligibleParticipants.find((p) => p.uid === payerId);
      const recipientObj = eligibleParticipants.find((p) => p.uid === recipientId);

      const payerName = payerObj?.rawName || payerObj?.displayName || user?.displayName || "Payer";
      const recipientName = recipientObj?.rawName || recipientObj?.displayName || user?.displayName || "Recipient";

      const finalShares = calculatedShares.map((s) => {
        const memberUser = eligibleParticipants.find((f) => f.uid === s.userId);
        return {
          userId: s.userId,
          userName: s.userName,
          userPhoto: memberUser?.photoURL,
          amountPaise: s.amountPaise,
        };
      });

      // Crucial Authorization & Eligibility Validation:
      // Group expenses MUST ONLY contain verified current group members!
      if (expenseType === "group") {
        const nonMembers = finalShares.filter((s) => !currentGroup.members.includes(s.userId));
        if (nonMembers.length > 0) {
          toastError("One or more selected participants are not members of this group");
          setIsSubmitting(false);
          return;
        }
      } else {
        const allowed = [user?.uid, selectedFriendId];
        const nonMembers = finalShares.filter((s) => !allowed.includes(s.userId));
        if (nonMembers.length > 0) {
          toastError("Personal expenses can only include you and the selected friend");
          setIsSubmitting(false);
          return;
        }
      }

      const expId = await createExpense({
        groupId: expenseType === "group" ? selectedGroupId : undefined,
        groupName: expenseType === "group" ? currentGroup?.name : undefined,
        groupIcon: expenseType === "group" ? currentGroup?.icon : undefined,
        title: title.trim(),
        amountPaise: totalPaise,
        payerId,
        payerName,
        recipientId,
        recipientName,
        recipientUpiId: recipientUpiId.trim(),
        date,
        notes: notes.trim(),
        splitType: splitMode,
        shares: finalShares,
      });

      setCreatedExpenseId(expId);
      setStep(5);

      // Trigger celebratory confetti effect!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#2563EB", "#FBBF24", "#10B981"],
      });
      success("Expense created successfully!");
    } catch (e: any) {
      toastError("Failed to create expense: " + (e?.message || "Please check inputs"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell>
      <AppHeader
        title={
          step === 1
            ? "Add Expense"
            : step === 2
            ? "Select Participants"
            : step === 3
            ? "Split Amount"
            : step === 4
            ? "Review Expense"
            : "Expense Created"
        }
        showBack={step > 1 && step < 5}
        onBack={() => setStep((step - 1) as any)}
      />

      <div className="max-w-xl mx-auto p-4 sm:p-6 pb-20">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-5 text-xs font-semibold text-[#64748B]">
          <span>Step {step} of 5</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-[#2563EB]" : i < step ? "w-3 bg-blue-300" : "w-2 bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* ================= STEP 1: BASIC INFO (Screen 19) ================= */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Segmented control: Group Expense / Personal */}
            <div className="flex bg-slate-200/80 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setExpenseType("group")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  expenseType === "group"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Group Expense
              </button>
              <button
                type="button"
                onClick={() => setExpenseType("personal")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  expenseType === "personal"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Personal
              </button>
            </div>

            {expenseType === "group" && (
              <div>
                <label className="text-xs font-semibold text-[#0F172A] mb-1.5 block">Group</label>
                <div
                  onClick={() => setIsGroupModalOpen(true)}
                  className="bg-white border border-[#E5E7EB] hover:border-blue-300 rounded-2xl p-3 flex items-center justify-between shadow-xs cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200">
                      <Image src={currentGroup.icon} alt={currentGroup.name} fill className="object-cover" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0F172A]">{currentGroup.name}</div>
                      <div className="text-[11px] text-[#64748B]">{currentGroup.members.length} members</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#2563EB]">Change</span>
                </div>
              </div>
            )}

            <Input
              label="Expense Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dinner at Thalassa"
              leftIcon={<Receipt className="w-4 h-4" />}
              required
            />

            {/* Total Amount Input with Indian Rupee symbol */}
            <div>
              <label className="text-xs font-semibold text-[#0F172A] mb-1.5 block">Total Amount</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-xl font-bold text-[#0F172A]">₹</span>
                <input
                  type="number"
                  step="any"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-[#E5E7EB] rounded-2xl pl-9 pr-10 py-3.5 text-xl font-extrabold text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
                {amountRupees && (
                  <button
                    onClick={() => setAmountRupees("")}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Paid By Dropdown */}
            <div>
              <label className="text-xs font-semibold text-[#0F172A] mb-1.5 block">
                Paid by (Original Payer)
              </label>
              <div className="relative">
                <select
                  value={payerId}
                  onChange={(e) => {
                    setPayerId(e.target.value);
                    setRecipientId(e.target.value);
                  }}
                  className="w-full bg-white border border-[#E5E7EB] rounded-2xl px-3.5 py-3 pr-10 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB] appearance-none cursor-pointer shadow-2xs"
                >
                  {eligibleParticipants.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Reimbursement To Dropdown */}
            <div>
              <label className="text-xs font-semibold text-[#0F172A] mb-1.5 block">
                Reimbursement to (Recipient)
              </label>
              <div className="relative">
                <select
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-2xl px-3.5 py-3 pr-10 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#2563EB] appearance-none cursor-pointer shadow-2xs"
                >
                  {eligibleParticipants.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <Input
              label="Recipient UPI ID"
              value={recipientUpiId}
              onChange={(e) => setRecipientUpiId(e.target.value)}
              placeholder="recipient@upi"
              leftIcon={<AtSign className="w-4 h-4" />}
              rightAction={<QrCode className="w-4 h-4 text-[#2563EB]" />}
            />

            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              leftIcon={<Calendar className="w-4 h-4" />}
            />

            <Input
              label="Note (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dinner with beach view 🌴"
            />

            <Button fullWidth size="lg" onClick={handleStep1Next} className="mt-4">
              Next →
            </Button>
          </div>
        )}

        {/* ================= STEP 2: SELECT PARTICIPANTS (Screen 20) ================= */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Choose Participants</h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {expenseType === "group"
                      ? `${currentGroup.name} • Only members of this group`
                      : "Direct split with your friend"}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-full">
                  {selectedParticipants.length} selected
                </span>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Members checkboxes list - STRICTLY ONLY ELIGIBLE MEMBERS */}
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {eligibleParticipants
                  .filter((m) =>
                    m.displayName.toLowerCase().includes(participantSearch.toLowerCase())
                  )
                  .map((m) => {
                    const isSelected = selectedParticipants.includes(m.uid);
                    return (
                      <div
                        key={m.uid}
                        onClick={() => toggleParticipant(m.uid)}
                        className="flex items-center justify-between py-3 cursor-pointer select-none hover:bg-slate-50 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar src={m.photoURL} name={m.displayName} size="sm" />
                          <div>
                            <div className="text-xs font-bold text-[#0F172A]">{m.displayName}</div>
                            <div className="text-[11px] font-mono text-[#64748B]">{m.splitzyId}</div>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-[#2563EB] text-white"
                              : "border-2 border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}

                {eligibleParticipants.length === 0 && (
                  <div className="p-8 text-center text-xs text-[#64748B]">
                    No eligible members in this group.
                  </div>
                )}
              </div>
            </div>

            {/* Stacked avatar footer preview */}
            <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-[#0F172A]">
                {selectedParticipants.length} members selected:
              </span>
              <div className="flex -space-x-2 overflow-hidden">
                {selectedParticipants.map((pId) => {
                  const m = pId === user?.uid ? user : friends.find((f) => f.uid === pId);
                  return (
                    <div key={pId} className="inline-block ring-2 ring-white rounded-full">
                      <Avatar src={m?.photoURL} name={m?.displayName || "U"} size="xs" />
                    </div>
                  );
                })}
              </div>
            </div>

            <Button fullWidth size="lg" onClick={handleStep2Next} className="mt-4">
              Next →
            </Button>
          </div>
        )}

        {/* ================= STEP 3: SPLIT AMOUNT (Screen 21) ================= */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header summary card */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 flex items-center gap-3.5 shadow-xs">
              <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 shrink-0">
                <Image src={currentGroup.icon} alt="Group" fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#0F172A] truncate">{title}</div>
                <div className="text-xs text-[#64748B]">
                  Total Amount: <strong className="text-[#0F172A]">₹{amountRupees}</strong>
                </div>
              </div>
            </div>

            {/* Split Type Selector */}
            <div className="flex bg-slate-200/80 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setSplitMode("EQUAL")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  splitMode === "EQUAL"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Split Equally
              </button>
              <button
                type="button"
                onClick={() => setSplitMode("MANUAL")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  splitMode === "MANUAL"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Split Manually
              </button>
            </div>

            {/* Split info pill */}
            <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-[#1E40AF]">
              <AlertCircle className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>
                {splitMode === "EQUAL"
                  ? `Amount will be divided equally among ${selectedParticipants.length} selected members.`
                  : "Enter custom rupee amount for each participant."}
              </span>
            </div>

            {/* Members breakdown list */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs divide-y divide-slate-100">
              {calculatedShares.map((share) => {
                const member =
                  share.userId === user?.uid
                    ? user
                    : friends.find((f) => f.uid === share.userId);

                return (
                  <div key={share.userId} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={member?.photoURL} name={share.userName} size="sm" />
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">{share.userName}</div>
                        <div className="text-[11px] text-[#64748B]">{member?.splitzyId}</div>
                      </div>
                    </div>

                    {splitMode === "EQUAL" ? (
                      <span className="text-sm font-extrabold text-[#0F172A]">
                        {formatPaise(share.amountPaise)}
                      </span>
                    ) : (
                      <div className="relative w-28">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={manualShares[share.userId] || ""}
                          onChange={(e) =>
                            setManualShares({
                              ...manualShares,
                              [share.userId]: e.target.value,
                            })
                          }
                          className="w-full bg-[#F8FAFC] border border-slate-300 rounded-xl pl-7 pr-2 py-1.5 text-xs font-bold text-right text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Remainder Paise Guarantee Notice */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-2 text-[11px] text-[#64748B]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>
                Any remaining fractional paise are automatically balanced deterministically so the sum is 100% exact.
              </span>
            </div>

            <Button fullWidth size="lg" onClick={handleStep3Next} className="mt-4">
              Next →
            </Button>
          </div>
        )}

        {/* ================= STEP 4: REVIEW & CREATE (Screen 22) ================= */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header bill card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-slate-200">
                    <Image src={currentGroup.icon} alt={currentGroup.name} fill className="object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">{title}</h3>
                    <p className="text-xs text-[#64748B]">
                      {currentGroup.name} • {date} • {selectedParticipants.length} members
                    </p>
                  </div>
                </div>
                <div className="text-lg font-extrabold text-[#0F172A]">₹{amountRupees}</div>
              </div>

              {/* Details table */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B]">Paid by</span>
                  <span className="font-bold text-[#0F172A]">
                    {payerId === user?.uid ? user.displayName : friends.find((f) => f.uid === payerId)?.displayName}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B]">Reimburse to</span>
                  <span className="font-bold text-[#0F172A]">
                    {recipientId === user?.uid ? user.displayName : friends.find((f) => f.uid === recipientId)?.displayName}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B]">UPI ID</span>
                  <span className="font-mono font-bold text-[#2563EB]">{recipientUpiId}</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B]">Split type</span>
                  <span className="font-semibold text-[#0F172A] capitalize">
                    {splitMode.toLowerCase()} split
                  </span>
                </div>

                {notes && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#64748B]">Note</span>
                    <span className="text-slate-800 italic">{notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Member shares list */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                Members & Shares
              </h4>
              <div className="divide-y divide-slate-100">
                {calculatedShares.map((s) => (
                  <div key={s.userId} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.userName} size="xs" />
                      <span className="text-xs font-semibold text-[#0F172A]">{s.userName}</span>
                    </div>
                    <span className="text-xs font-bold text-[#0F172A]">
                      {formatPaise(s.amountPaise)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              fullWidth
              size="lg"
              isLoading={isSubmitting}
              onClick={handleCreateExpense}
              className="mt-4 shadow-md"
            >
              Create Expense
            </Button>
          </div>
        )}

        {/* ================= STEP 5: EXPENSE CREATED (Screen 23) ================= */}
        {step === 5 && (
          <div className="space-y-6 text-center animate-in zoom-in-95 duration-300">
            {/* Celebration Icon */}
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-[#0F172A]">Expense Added!</h2>
              <p className="text-xs text-[#64748B] mt-1">
                Bill has been split among {selectedParticipants.length} members.
              </p>
            </div>

            {/* Summary mini card */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-2xl overflow-hidden border border-slate-200">
                  <Image src={currentGroup.icon} alt={currentGroup.name} fill className="object-cover" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">{title}</div>
                  <div className="text-[11px] text-[#64748B]">{currentGroup.name} • {date}</div>
                </div>
              </div>
              <div className="text-base font-extrabold text-[#0F172A]">₹{amountRupees}</div>
            </div>

            {/* Payment Status List */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs text-left space-y-3">
              <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                Payment Status
              </h4>
              <div className="divide-y divide-slate-100">
                {calculatedShares.map((s) => (
                  <div key={s.userId} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.userName} size="xs" />
                      <span className="text-xs font-semibold text-[#0F172A]">{s.userName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#0F172A]">
                        {formatPaise(s.amountPaise)}
                      </span>
                      <Badge variant="pending" size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push(`/expenses/${createdExpenseId}`)}
                >
                  View Expense
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    setStep(1);
                    setTitle("");
                    setAmountRupees("");
                  }}
                >
                  Add Another
                </Button>
              </div>

              <Button
                fullWidth
                variant="secondary"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `JoySplit: ${title}`,
                      text: `Hey everyone, added "${title}" (₹${amountRupees}) on JoySplit. Check your share!`,
                    }).catch(() => {});
                  } else {
                    success("Expense link copied!");
                  }
                }}
                leftIcon={<Share2 className="w-4 h-4" />}
              >
                Share to Group
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Group Selector Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title="Select Group"
      >
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {groups.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-xs text-slate-500 mb-3">No groups created yet</p>
              <Button
                size="sm"
                onClick={() => {
                  setIsGroupModalOpen(false);
                  router.push("/groups/new");
                }}
              >
                Create a Group
              </Button>
            </div>
          ) : (
            groups.map((g) => {
              const isSelected = (currentGroup.id === g.id);
              return (
                <div
                  key={g.id}
                  onClick={() => {
                    setSelectedGroupId(g.id);
                    setIsGroupModalOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all ${
                    isSelected
                      ? "border-[#2563EB] bg-blue-50/60 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <Image src={g.icon} alt={g.name} fill className="object-cover" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0F172A]">{g.name}</div>
                      <div className="text-[11px] text-[#64748B]">{g.members.length} members</div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-bold text-[#2563EB]">Selected</span>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              setIsGroupModalOpen(false);
              router.push("/groups/new");
            }}
            className="text-xs font-bold text-[#2563EB] hover:underline"
          >
            + Create New Group
          </button>
          <Button size="sm" variant="secondary" onClick={() => setIsGroupModalOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}

export default function NewExpensePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <NewExpenseContent />
    </Suspense>
  );
}

