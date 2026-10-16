"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Receipt,
  AtSign,
  QrCode,
  Check,
  AlertCircle,
  Share2,
  Search,
  ChevronDown,
  User,
  Users,
  Wallet,
  Tag,
  Calendar,
  X,
  CheckCircle2,
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

const PERSONAL_CATEGORIES = [
  { id: "Food & Dining", icon: "🍔", label: "Food & Dining" },
  { id: "Travel & Commute", icon: "🚕", label: "Travel & Commute" },
  { id: "Shopping", icon: "🛍️", label: "Shopping" },
  { id: "Bills & Utilities", icon: "⚡", label: "Bills & Utilities" },
  { id: "Entertainment", icon: "🎬", label: "Entertainment" },
  { id: "Health & Medical", icon: "💊", label: "Health & Medical" },
  { id: "Other", icon: "📌", label: "Other" },
];

function NewExpenseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGroupId = searchParams.get("groupId");
  const preselectedFriendId = searchParams.get("friend");

  const { groups, friends, user, createExpense } = useAuth();
  const { success, error: toastError } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // 3 Distinct Modes: "group" | "friend" | "personal"
  const [expenseMode, setExpenseMode] = useState<"group" | "friend" | "personal">(
    preselectedFriendId ? "friend" : "group"
  );

  // Common Fields
  const [title, setTitle] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  // Mode A (Group) State
  const [selectedGroupId, setSelectedGroupId] = useState(
    preselectedGroupId || groups[0]?.id || ""
  );
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // Mode B (Direct Friends) State
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(
    preselectedFriendId ? [preselectedFriendId] : friends[0]?.uid ? [friends[0].uid] : []
  );

  // Mode C (Personal) State
  const [personalCategory, setPersonalCategory] = useState("Food & Dining");

  // Shared Expense Specific (Modes A & B only)
  const [payerId, setPayerId] = useState(user?.uid || "");
  const [recipientId, setRecipientId] = useState(user?.uid || "");
  const [recipientUpiId, setRecipientUpiId] = useState(user?.upiId || "");
  const [splitMode, setSplitMode] = useState<"EQUAL" | "MANUAL">("EQUAL");
  const [manualShares, setManualShares] = useState<Record<string, string>>({});
  const [calculatedShares, setCalculatedShares] = useState<SplitShare[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");

  // Submission State
  const [createdExpenseId, setCreatedExpenseId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback group for Mode A
  const fallbackGroup = useMemo(
    () => ({
      id: "grp_default",
      name: "General Split",
      description: "General group",
      icon: "/assets/icon_food.jpg",
      members: user?.uid ? [user.uid] : ["usr_me"],
      createdBy: user?.uid || "usr_me",
      createdAt: new Date().toISOString(),
      memberDetails: {},
    }),
    [user?.uid]
  );

  const currentGroup = useMemo(() => {
    return groups.find((g) => g.id === selectedGroupId) || groups[0] || fallbackGroup;
  }, [groups, selectedGroupId, fallbackGroup]);

  // Eligible participants for Mode A (Group only)
  const groupEligibleMembers = useMemo(() => {
    return currentGroup.members.map((mId) => {
      if (user?.uid && mId === user.uid) {
        return {
          uid: user.uid,
          displayName: `${user.displayName || "You"} (You)`,
          rawName: user.displayName || "You",
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
  }, [currentGroup, user, friends]);

  // Eligible participants for Mode B (Direct friends)
  const friendEligibleMembers = useMemo(() => {
    const list: Array<{
      uid: string;
      displayName: string;
      rawName: string;
      photoURL?: string;
      splitzyId: string;
      upiId?: string;
      isCurrentUser: boolean;
    }> = [];

    if (user) {
      list.push({
        uid: user.uid,
        displayName: `${user.displayName || "You"} (You)`,
        rawName: user.displayName || "You",
        photoURL: user.photoURL,
        splitzyId: user.splitzyId,
        upiId: user.upiId,
        isCurrentUser: true,
      });
    }

    selectedFriendIds.forEach((fId) => {
      const f = friends.find((fr) => fr.uid === fId);
      if (f && f.uid !== user?.uid) {
        list.push({
          uid: f.uid,
          displayName: f.displayName,
          rawName: f.displayName,
          photoURL: f.photoURL,
          splitzyId: f.splitzyId,
          upiId: f.upiId,
          isCurrentUser: false,
        });
      }
    });

    return list;
  }, [user, friends, selectedFriendIds]);

  const activeEligibleParticipants = useMemo(() => {
    if (expenseMode === "group") return groupEligibleMembers;
    if (expenseMode === "friend") return friendEligibleMembers;
    return [];
  }, [expenseMode, groupEligibleMembers, friendEligibleMembers]);

  // Keep selectedParticipants synced when mode or group/friend changes
  useEffect(() => {
    if (expenseMode === "group") {
      setSelectedParticipants(currentGroup.members);
      if (!currentGroup.members.includes(payerId)) {
        setPayerId(user?.uid || currentGroup.members[0] || "");
      }
      if (!currentGroup.members.includes(recipientId)) {
        setRecipientId(user?.uid || currentGroup.members[0] || "");
      }
    } else if (expenseMode === "friend") {
      const pUids = friendEligibleMembers.map((m) => m.uid);
      setSelectedParticipants(pUids);
      if (!pUids.includes(payerId)) {
        setPayerId(user?.uid || "");
      }
      if (!pUids.includes(recipientId)) {
        setRecipientId(user?.uid || "");
      }
    }
  }, [expenseMode, currentGroup.members, friendEligibleMembers, payerId, recipientId, user?.uid]);

  // Auto-sync recipient UPI ID
  useEffect(() => {
    if (expenseMode === "personal") return;
    const found = activeEligibleParticipants.find((p) => p.uid === recipientId);
    const targetUpi = found?.upiId || (recipientId === user?.uid ? user?.upiId || "" : "");
    if (targetUpi) {
      setRecipientUpiId((prev) => (prev !== targetUpi ? targetUpi : prev));
    }
  }, [recipientId, activeEligibleParticipants, user?.uid, user?.upiId, expenseMode]);

  // Recalculate equal shares
  useEffect(() => {
    if (expenseMode === "personal") return;
    const totalPaise = rupeesToPaise(amountRupees);
    const activeMembers = selectedParticipants.map((pId) => {
      const found = activeEligibleParticipants.find((p) => p.uid === pId);
      return { id: pId, name: found?.rawName || found?.displayName || "Member" };
    });

    const equal = calculateEqualSplit(totalPaise, activeMembers);
    setCalculatedShares(equal);

    setManualShares((prev) => {
      let changed = false;
      const next: Record<string, string> = { ...prev };
      equal.forEach((s) => {
        if (next[s.userId] === undefined) {
          next[s.userId] = (s.amountPaise / 100).toString();
          changed = true;
        }
      });
      Object.keys(next).forEach((k) => {
        if (!selectedParticipants.includes(k)) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [amountRupees, selectedParticipants, activeEligibleParticipants, expenseMode]);

  // Toggle friend selection for Mode B
  const toggleFriendSelection = (fId: string) => {
    if (selectedFriendIds.includes(fId)) {
      if (selectedFriendIds.length <= 1) {
        toastError("Please keep at least one friend selected for direct split");
        return;
      }
      setSelectedFriendIds(selectedFriendIds.filter((id) => id !== fId));
    } else {
      setSelectedFriendIds([...selectedFriendIds, fId]);
    }
  };

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

  // Step 1 Validation
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

    if (expenseMode === "friend" && selectedFriendIds.length === 0) {
      toastError("Please select at least one friend to split with");
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
        const member = activeEligibleParticipants.find((m) => m.uid === pId);
        return {
          userId: pId,
          userName: member?.rawName || member?.displayName || "Member",
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

  // Handle Save for Personal Expense (Mode C - direct 1-step save)
  const handleSavePersonalExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toastError("Please enter an expense title");
      return;
    }
    const totalPaise = rupeesToPaise(amountRupees);
    if (totalPaise <= 0) {
      toastError("Please enter a valid amount greater than ₹0");
      return;
    }

    setIsSubmitting(true);
    try {
      const expId = await createExpense({
        expenseType: "personal",
        isPersonal: true,
        category: personalCategory,
        title: title.trim(),
        amountPaise: totalPaise,
        payerId: user?.uid || "",
        payerName: user?.displayName || "You",
        recipientId: user?.uid || "",
        recipientName: user?.displayName || "You",
        recipientUpiId: user?.upiId || "",
        date,
        notes: notes.trim(),
        splitType: "EQUAL",
        shares: [
          {
            userId: user?.uid || "",
            userName: user?.displayName || "You",
            userPhoto: user?.photoURL,
            amountPaise: totalPaise,
          },
        ],
      });

      setCreatedExpenseId(expId);
      setStep(5);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#2563EB", "#10B981"],
      });
      success("Personal expense saved!");
    } catch (e: any) {
      toastError(e?.message || "Failed to save personal expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Save for Group (Mode A) and Direct Friend (Mode B)
  const handleCreateSharedExpense = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const totalPaise = rupeesToPaise(amountRupees);
      const payerObj = activeEligibleParticipants.find((p) => p.uid === payerId);
      const recipientObj = activeEligibleParticipants.find((p) => p.uid === recipientId);

      const payerName = payerObj?.rawName || payerObj?.displayName || user?.displayName || "Payer";
      const recipientName =
        recipientObj?.rawName || recipientObj?.displayName || user?.displayName || "Recipient";

      const finalShares = calculatedShares.map((s) => {
        const memberUser = activeEligibleParticipants.find((f) => f.uid === s.userId);
        return {
          userId: s.userId,
          userName: s.userName,
          userPhoto: memberUser?.photoURL,
          amountPaise: s.amountPaise,
        };
      });

      const expId = await createExpense({
        groupId: expenseMode === "group" ? selectedGroupId : undefined,
        groupName: expenseMode === "group" ? currentGroup?.name : undefined,
        groupIcon: expenseMode === "group" ? currentGroup?.icon : undefined,
        expenseType: expenseMode === "group" ? "group" : "friend",
        isDirect: expenseMode === "friend",
        isPersonal: false,
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

      confetti({
        particleCount: 90,
        spread: 75,
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
        showBack={step < 5}
        onBack={() => {
          if (step > 1) {
            setStep((step - 1) as any);
          } else {
            router.back();
          }
        }}
      />

      <div className="max-w-xl mx-auto p-4 sm:p-6 pb-20">
        {/* Step Indicator Header (Only for shared expenses) */}
        {expenseMode !== "personal" && (
          <div className="flex items-center justify-between mb-5 text-xs font-semibold text-[#64748B] dark:text-slate-400">
            <span>Step {step} of 5</span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step
                      ? "w-6 bg-[#2563EB]"
                      : i < step
                      ? "w-3 bg-blue-300 dark:bg-blue-800"
                      : "w-2 bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* ================= STEP 1: BASIC INFO ================= */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Segmented Control: Exactly 3 Modes */}
            <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setExpenseMode("group")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  expenseMode === "group"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Group</span>
              </button>

              <button
                type="button"
                onClick={() => setExpenseMode("friend")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  expenseMode === "friend"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Split with Friends</span>
              </button>

              <button
                type="button"
                onClick={() => setExpenseMode("personal")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  expenseMode === "personal"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Personal</span>
              </button>
            </div>

            {/* ========== MODE A: GROUP EXPENSE SPECIFIC ========== */}
            {expenseMode === "group" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0F172A] dark:text-white">
                    Selected Group
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsGroupModalOpen(true)}
                    className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline"
                  >
                    Change Group
                  </button>
                </div>

                <div
                  onClick={() => setIsGroupModalOpen(true)}
                  className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-300 rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <Image
                        src={currentGroup.icon}
                        alt={currentGroup.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                        {currentGroup.name}
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        {currentGroup.members.length} member{currentGroup.members.length > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400">Change</span>
                </div>
              </div>
            )}

            {/* ========== MODE B: SPLIT WITH FRIENDS SPECIFIC ========== */}
            {expenseMode === "friend" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#0F172A] dark:text-white">
                    Select Friends to Split With
                  </label>
                  <span className="text-xs font-semibold text-[#2563EB] bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 px-2.5 py-0.5 rounded-full">
                    {selectedFriendIds.length} selected
                  </span>
                </div>

                {friends.length === 0 ? (
                  <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      You haven&apos;t added any friends yet.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => router.push("/friends/add")}
                      className="mt-2"
                    >
                      Add a Friend
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pt-1">
                    {friends.map((fr) => {
                      const isSelected = selectedFriendIds.includes(fr.uid);
                      return (
                        <button
                          key={fr.uid}
                          type="button"
                          onClick={() => toggleFriendSelection(fr.uid)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                          }`}
                        >
                          <Avatar src={fr.photoURL} name={fr.displayName} size="xs" />
                          <span>{fr.displayName}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========== MODE C: PERSONAL EXPENSE FORM ========== */}
            {expenseMode === "personal" ? (
              <form onSubmit={handleSavePersonalExpense} className="space-y-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
                  <Input
                    label="Expense Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Grocery shopping, Metro recharge"
                    leftIcon={<Receipt className="w-4 h-4" />}
                    required
                  />

                  {/* Amount */}
                  <div>
                    <label className="text-xs font-semibold text-[#0F172A] dark:text-white mb-1.5 block">
                      Amount
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-xl font-bold text-[#0F172A] dark:text-white">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="any"
                        value={amountRupees}
                        onChange={(e) => setAmountRupees(e.target.value)}
                        placeholder="0"
                        className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-2xl pl-9 pr-10 py-3.5 text-xl font-extrabold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                      />
                      {amountRupees && (
                        <button
                          type="button"
                          onClick={() => setAmountRupees("")}
                          className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Selector */}
                  <div>
                    <label className="text-xs font-semibold text-[#0F172A] dark:text-white mb-2 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      <span>Category</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PERSONAL_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setPersonalCategory(cat.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                            personalCategory === cat.id
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

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
                    placeholder="e.g. Bought from Supermarket"
                  />
                </div>

                <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
                  <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    Personal expenses are private to your account. They do not affect shared debts, net balances, or notify any friends.
                  </span>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  isLoading={isSubmitting}
                  className="shadow-md"
                >
                  Save Personal Expense
                </Button>
              </form>
            ) : (
              /* ========== MODES A & B: SHARED EXPENSE COMMON FORM ========== */
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
                <Input
                  label="Expense Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dinner at Thalassa"
                  leftIcon={<Receipt className="w-4 h-4" />}
                  required
                />

                {/* Total Amount Input */}
                <div>
                  <label className="text-xs font-semibold text-[#0F172A] dark:text-white mb-1.5 block">
                    Total Amount
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-xl font-bold text-[#0F172A] dark:text-white">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(e.target.value)}
                      placeholder="0"
                      className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-2xl pl-9 pr-10 py-3.5 text-xl font-extrabold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                    />
                    {amountRupees && (
                      <button
                        type="button"
                        onClick={() => setAmountRupees("")}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Paid By Dropdown */}
                <div>
                  <label className="text-xs font-semibold text-[#0F172A] dark:text-white mb-1.5 block">
                    Paid by (Original Payer)
                  </label>
                  <div className="relative">
                    <select
                      value={payerId}
                      onChange={(e) => {
                        setPayerId(e.target.value);
                        setRecipientId(e.target.value);
                      }}
                      className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-2xl px-3.5 py-3 pr-10 text-xs font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB] appearance-none cursor-pointer"
                    >
                      {activeEligibleParticipants.map((m) => (
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
                  <label className="text-xs font-semibold text-[#0F172A] dark:text-white mb-1.5 block">
                    Reimbursement to (Recipient)
                  </label>
                  <div className="relative">
                    <select
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-2xl px-3.5 py-3 pr-10 text-xs font-bold text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB] appearance-none cursor-pointer"
                    >
                      {activeEligibleParticipants.map((m) => (
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

                <Button fullWidth size="lg" onClick={handleStep1Next} className="mt-4 shadow-md">
                  Next →
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: SELECT PARTICIPANTS ================= */}
        {step === 2 && expenseMode !== "personal" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                    Choose Participants
                  </h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                    {expenseMode === "group"
                      ? `${currentGroup.name} • Group Members`
                      : "Direct split participants"}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#2563EB] bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 px-2.5 py-1 rounded-full">
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
                  placeholder="Search participants..."
                  className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Members checkboxes list */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {activeEligibleParticipants
                  .filter((m) =>
                    m.displayName.toLowerCase().includes(participantSearch.toLowerCase())
                  )
                  .map((m) => {
                    const isSelected = selectedParticipants.includes(m.uid);
                    return (
                      <div
                        key={m.uid}
                        onClick={() => toggleParticipant(m.uid)}
                        className="flex items-center justify-between py-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar src={m.photoURL} name={m.displayName} size="sm" />
                          <div>
                            <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                              {m.displayName}
                            </div>
                            <div className="text-[11px] font-mono text-[#64748B] dark:text-slate-400">
                              {m.splitzyId}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-[#2563EB] text-white"
                              : "border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <Button fullWidth size="lg" onClick={handleStep2Next} className="mt-4 shadow-md">
              Next →
            </Button>
          </div>
        )}

        {/* ================= STEP 3: SPLIT AMOUNT ================= */}
        {step === 3 && expenseMode !== "personal" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header summary card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 shadow-xs">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#0F172A] dark:text-white truncate">{title}</div>
                <div className="text-xs text-[#64748B] dark:text-slate-400">
                  Total Amount: <strong className="text-[#0F172A] dark:text-white">₹{amountRupees}</strong>
                </div>
              </div>
            </div>

            {/* Split Type Selector */}
            <div className="flex bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setSplitMode("EQUAL")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  splitMode === "EQUAL"
                    ? "bg-[#2563EB] text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Split Manually
              </button>
            </div>

            {/* Members breakdown list */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
              {calculatedShares.map((share) => {
                const member = activeEligibleParticipants.find((m) => m.uid === share.userId);

                return (
                  <div key={share.userId} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={member?.photoURL} name={share.userName} size="sm" />
                      <div>
                        <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                          {share.userName}
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B] dark:text-slate-400">
                          {member?.splitzyId}
                        </div>
                      </div>
                    </div>

                    {splitMode === "EQUAL" ? (
                      <span className="text-sm font-extrabold text-[#0F172A] dark:text-white">
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
                          className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl pl-7 pr-2 py-1.5 text-xs font-bold text-right text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button fullWidth size="lg" onClick={handleStep3Next} className="mt-4 shadow-md">
              Next →
            </Button>
          </div>
        )}

        {/* ================= STEP 4: REVIEW & CREATE ================= */}
        {step === 4 && expenseMode !== "personal" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header bill card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">{title}</h3>
                  <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                    {expenseMode === "group" ? currentGroup.name : "Split with Friends"} • {date} •{" "}
                    {selectedParticipants.length} participants
                  </p>
                </div>
                <div className="text-lg font-extrabold text-[#0F172A] dark:text-white">
                  ₹{amountRupees}
                </div>
              </div>

              {/* Details table */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B] dark:text-slate-400">Paid by</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">
                    {activeEligibleParticipants.find((p) => p.uid === payerId)?.displayName || "Payer"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B] dark:text-slate-400">Reimburse to</span>
                  <span className="font-bold text-[#0F172A] dark:text-white">
                    {activeEligibleParticipants.find((p) => p.uid === recipientId)?.displayName || "Recipient"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B] dark:text-slate-400">UPI ID</span>
                  <span className="font-mono font-bold text-[#2563EB] dark:text-blue-400">
                    {recipientUpiId}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-[#64748B] dark:text-slate-400">Split type</span>
                  <span className="font-semibold text-[#0F172A] dark:text-white capitalize">
                    {splitMode.toLowerCase()} split
                  </span>
                </div>

                {notes && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[#64748B] dark:text-slate-400">Note</span>
                    <span className="text-slate-800 dark:text-slate-200 italic">{notes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Member shares list */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">
                Members & Shares
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {calculatedShares.map((s) => (
                  <div key={s.userId} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.userName} size="xs" />
                      <span className="text-xs font-semibold text-[#0F172A] dark:text-white">
                        {s.userName}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white">
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
              onClick={handleCreateSharedExpense}
              className="mt-4 shadow-md"
            >
              Create Expense
            </Button>
          </div>
        )}

        {/* ================= STEP 5: EXPENSE CREATED ================= */}
        {step === 5 && (
          <div className="space-y-6 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-md">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-[#0F172A] dark:text-white">
                Expense Added!
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1">
                {expenseMode === "personal"
                  ? "Saved to your private personal expenses."
                  : `Bill split among ${selectedParticipants.length} participants.`}
              </p>
            </div>

            {/* Summary mini card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between text-left">
              <div>
                <div className="text-xs font-bold text-[#0F172A] dark:text-white">{title}</div>
                <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                  {expenseMode === "personal"
                    ? `Personal • ${personalCategory}`
                    : expenseMode === "group"
                    ? currentGroup.name
                    : "Direct Friends Split"}{" "}
                  • {date}
                </div>
              </div>
              <div className="text-base font-extrabold text-[#0F172A] dark:text-white">
                ₹{amountRupees}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push(createdExpenseId ? `/expenses/${createdExpenseId}` : "/home")}
                >
                  View Expense
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    setStep(1);
                    setTitle("");
                    setAmountRupees("");
                    setNotes("");
                  }}
                >
                  Add Another
                </Button>
              </div>

              {expenseMode !== "personal" && (
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => {
                    if (navigator.share) {
                      navigator
                        .share({
                          title: `Splitzy: ${title}`,
                          text: `Added "${title}" (₹${amountRupees}) on Splitzy. Check your share!`,
                        })
                        .catch(() => {});
                    } else {
                      success("Expense link copied!");
                    }
                  }}
                  leftIcon={<Share2 className="w-4 h-4" />}
                >
                  Share Details
                </Button>
              )}
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
              const isSelected = currentGroup.id === g.id;
              return (
                <div
                  key={g.id}
                  onClick={() => {
                    setSelectedGroupId(g.id);
                    setIsGroupModalOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer border transition-all ${
                    isSelected
                      ? "border-[#2563EB] bg-blue-50/60 dark:bg-blue-950/40 shadow-2xs"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                      <Image src={g.icon} alt={g.name} fill className="object-cover" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                        {g.name}
                      </div>
                      <div className="text-[11px] text-[#64748B] dark:text-slate-400">
                        {g.members.length} members
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400">
                      Selected
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              setIsGroupModalOpen(false);
              router.push("/groups/new");
            }}
            className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline"
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
        <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <NewExpenseContent />
    </Suspense>
  );
}
