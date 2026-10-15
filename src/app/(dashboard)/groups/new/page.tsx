"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Search, Check, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const GROUP_ICONS = [
  { id: "beach", src: "/assets/icon_beach.jpg", label: "Trip" },
  { id: "food", src: "/assets/icon_food.jpg", label: "Food" },
  { id: "house", src: "/assets/icon_house.jpg", label: "Home" },
  { id: "movie", src: "/assets/icon_movie.jpg", label: "Movies" },
];

export default function CreateGroupPage() {
  const router = useRouter();
  const { friends, createGroup } = useAuth();
  const { success, error } = useToast();

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("/assets/icon_beach.jpg");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([
    "usr_neha",
    "usr_rohit",
    "usr_priya",
  ]);
  const [memberSearch, setMemberSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const toggleMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter((m) => m !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      error("Please enter a group name");
      return;
    }

    setIsLoading(true);
    try {
      const newGroupId = await createGroup(
        groupName.trim(),
        description.trim(),
        selectedIcon,
        selectedMemberIds
      );
      success(`Group "${groupName}" created successfully!`);
      router.push(`/groups/${newGroupId}`);
    } catch (e: any) {
      error(e?.message || "Failed to create group");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFriends = friends.filter(
    (f) =>
      f.displayName.toLowerCase().includes(memberSearch.toLowerCase()) ||
      f.splitzyId.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <AppShell>
      <AppHeader title="Create Group" showBack={true} />

      <div className="max-w-xl mx-auto p-4 sm:p-6">
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Icon Selector */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mb-3">
              <Image src={selectedIcon} alt="Group Icon" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/15 flex items-center justify-center pointer-events-none">
                <Camera className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>

            <span className="text-xs font-semibold text-[#64748B] mb-2">Select group icon</span>
            <div className="flex gap-3">
              {GROUP_ICONS.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => setSelectedIcon(icon.src)}
                  className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedIcon === icon.src
                      ? "border-[#2563EB] scale-105 shadow-md ring-2 ring-blue-200"
                      : "border-slate-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={icon.src} alt={icon.label} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Group details inputs */}
          <div className="space-y-3.5 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
            <Input
              label="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Goa Trip"
              required
            />

            <Input
              label="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Trip to North Goa 2026 🏖️"
            />
          </div>

          {/* Add Members Multi-select */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-[#0F172A]">Add Members</label>
              <span className="text-xs font-semibold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-full">
                {selectedMemberIds.length} selected
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search friends by name or ID..."
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Members checkboxes list */}
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
              {filteredFriends.map((friend) => {
                const isSelected = selectedMemberIds.includes(friend.uid);
                return (
                  <div
                    key={friend.uid}
                    onClick={() => toggleMember(friend.uid)}
                    className="flex items-center justify-between py-3 cursor-pointer select-none hover:bg-slate-50 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar src={friend.photoURL} name={friend.displayName} size="sm" />
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">
                          {friend.displayName}
                        </div>
                        <div className="text-[11px] font-mono text-[#64748B]">
                          {friend.splitzyId}
                        </div>
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
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            isLoading={isLoading}
            className="shadow-md"
          >
            Create Group
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
