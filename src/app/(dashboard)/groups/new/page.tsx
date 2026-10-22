"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Search, Check, Users, X, UserPlus, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { UserProfile } from "@/lib/types";

const GROUP_ICONS = [
  { id: "beach", src: "/assets/icon_beach.jpg", label: "Trip" },
  { id: "food", src: "/assets/icon_food.jpg", label: "Food" },
  { id: "house", src: "/assets/icon_house.jpg", label: "Home" },
  { id: "movie", src: "/assets/icon_movie.jpg", label: "Movies" },
];

export default function CreateGroupPage() {
  const router = useRouter();
  const { user, friends, createGroup, searchUserBySplitzyId } = useAuth();
  const { success, error } = useToast();

  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("/assets/icon_beach.jpg");
  // Section 6: On initial load, select ZERO additional members by default. No hardcoded sample users.
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedNonFriends, setSelectedNonFriends] = useState<UserProfile[]>([]);
  
  const [memberSearch, setMemberSearch] = useState("");
  const [isSearchingId, setIsSearchingId] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    user?: Partial<UserProfile>;
    status?: "SELF" | "FRIENDS" | "REQUEST_SENT" | "REQUEST_RECEIVED" | "CAN_ADD";
    message?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const toggleFriendMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      setSelectedMemberIds(selectedMemberIds.filter((m) => m !== id));
    } else {
      setSelectedMemberIds([...selectedMemberIds, id]);
    }
  };

  const removeNonFriend = (uid: string) => {
    setSelectedNonFriends((prev) => prev.filter((u) => u.uid !== uid));
  };

  const handleSearchId = async () => {
    const clean = memberSearch.trim().toUpperCase();
    if (!clean) return;
    setIsSearchingId(true);
    setSearchResult(null);
    try {
      const res = await searchUserBySplitzyId(clean);
      setSearchResult(res);
    } catch (e: any) {
      error(e?.message || "Error searching user");
    } finally {
      setIsSearchingId(false);
    }
  };

  const addNonFriendInvitee = (u: Partial<UserProfile>) => {
    if (!u.uid || !u.displayName) return;
    if (selectedNonFriends.some((nf) => nf.uid === u.uid)) return;
    if (u.uid === user?.uid) {
      error("You are already the creator and member of this group");
      return;
    }
    const full: UserProfile = {
      uid: u.uid,
      displayName: u.displayName,
      splitzyId: u.splitzyId || "",
      email: u.email || "",
      upiId: u.upiId || "",
      photoURL: u.photoURL,
      createdAt: new Date().toISOString(),
    };
    setSelectedNonFriends((prev) => [...prev, full]);
    setSearchResult(null);
    setMemberSearch("");
    success(`Added ${u.displayName} as proposed invitee (Combined Friend & Group Invite)`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      error("Please enter a group name");
      return;
    }

    setIsLoading(true);
    try {
      const pendingInviteUids = selectedNonFriends.map((nf) => nf.uid);
      const newGroupId = await createGroup(
        groupName.trim(),
        description.trim(),
        selectedIcon,
        selectedMemberIds,
        pendingInviteUids
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

  const totalSelectedCount = selectedMemberIds.length + selectedNonFriends.length;

  return (
    <AppShell>
      <AppHeader title="Create Group" showBack={true} />

      <div className="max-w-xl mx-auto p-4 sm:p-6">
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Icon Selector */}
          <div className="flex flex-col items-center">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg mb-3">
              <Image src={selectedIcon} alt="Group Icon" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/15 flex items-center justify-center pointer-events-none">
                <Camera className="w-6 h-6 text-white drop-shadow-md" />
              </div>
            </div>

            <span className="text-xs font-semibold text-[#64748B] dark:text-slate-400 mb-2">
              Select group icon
            </span>
            <div className="flex gap-3">
              {GROUP_ICONS.map((icon) => (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => setSelectedIcon(icon.src)}
                  className={`relative w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all ${
                    selectedIcon === icon.src
                      ? "border-[#2563EB] scale-105 shadow-md ring-2 ring-blue-200 dark:ring-blue-900"
                      : "border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100"
                  }`}
                >
                  <Image src={icon.src} alt={icon.label} fill className="object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Group details inputs */}
          <div className="space-y-3.5 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
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
              placeholder="e.g. Trip to North Goa 🏖️"
            />
          </div>

          {/* Add Members Multi-select */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-[#0F172A] dark:text-white">
                  Add Members
                </label>
                <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                  You are included automatically as creator
                </p>
              </div>
              <span className="text-xs font-semibold text-[#2563EB] bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 px-2.5 py-1 rounded-full">
                {totalSelectedCount} selected
              </span>
            </div>

            {/* Selected members pill badges */}
            {totalSelectedCount > 0 && (
              <div className="flex flex-wrap gap-2 pt-1 pb-2">
                {selectedMemberIds.map((mId) => {
                  const f = friends.find((fr) => fr.uid === mId);
                  if (!f) return null;
                  return (
                    <span
                      key={mId}
                      className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800"
                    >
                      <Avatar src={f.photoURL} name={f.displayName} size="xs" />
                      <span>{f.displayName}</span>
                      <button
                        type="button"
                        onClick={() => toggleFriendMember(mId)}
                        className="hover:text-red-500 transition-colors ml-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  );
                })}
                {selectedNonFriends.map((nf) => (
                  <span
                    key={nf.uid}
                    className="inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800"
                  >
                    <Avatar src={nf.photoURL} name={nf.displayName} size="xs" />
                    <span>{nf.displayName}</span>
                    <span className="text-[10px] bg-purple-200 dark:bg-purple-800 px-1 rounded">
                      Invite
                    </span>
                    <button
                      type="button"
                      onClick={() => removeNonFriend(nf.uid)}
                      className="hover:text-red-500 transition-colors ml-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="space-y-2">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setSearchResult(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearchId();
                      }
                    }}
                    placeholder="Search friends or enter Splitzy ID (e.g. JOY-XXXX)..."
                    className="w-full bg-[#F8FAFC] dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0F172A] dark:text-white focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                {memberSearch.trim().length >= 3 && (
                  <button
                    type="button"
                    onClick={handleSearchId}
                    disabled={isSearchingId}
                    className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center shrink-0"
                  >
                    {isSearchingId ? "Searching..." : "Lookup ID"}
                  </button>
                )}
              </div>

              {/* Splitzy ID Non-friend Search Result */}
              {searchResult && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {searchResult.found && searchResult.user ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={searchResult.user.photoURL}
                          name={searchResult.user.displayName || "User"}
                          size="sm"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                            {searchResult.user.displayName}
                          </div>
                          <div className="text-[11px] font-mono text-[#64748B] dark:text-slate-400">
                            {searchResult.user.splitzyId}
                          </div>
                        </div>
                      </div>

                      {searchResult.status === "SELF" ? (
                        <span className="text-[11px] text-slate-500 font-medium">You (Creator)</span>
                      ) : searchResult.status === "FRIENDS" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (searchResult.user?.uid) {
                              toggleFriendMember(searchResult.user.uid);
                            }
                            setSearchResult(null);
                            setMemberSearch("");
                          }}
                          className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          {selectedMemberIds.includes(searchResult.user.uid!) ? "Remove" : "Select Friend"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addNonFriendInvitee(searchResult.user!)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Invite to Group</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{searchResult.message || "No user found with that Splitzy ID."}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Friends list */}
            {friends.length === 0 ? (
              <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  No friends added yet
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  You can create this group now and add members later, or enter their Splitzy ID above to invite them!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto pr-1">
                {filteredFriends.length === 0 ? (
                  <p className="text-center py-4 text-xs text-slate-400">
                    No friends matching &quot;{memberSearch}&quot;
                  </p>
                ) : (
                  filteredFriends.map((friend) => {
                    const isSelected = selectedMemberIds.includes(friend.uid);
                    return (
                      <div
                        key={friend.uid}
                        onClick={() => toggleFriendMember(friend.uid)}
                        className="flex items-center justify-between py-3 cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-800/60 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar src={friend.photoURL} name={friend.displayName} size="sm" />
                          <div>
                            <div className="text-xs font-bold text-[#0F172A] dark:text-white">
                              {friend.displayName}
                            </div>
                            <div className="text-[11px] font-mono text-[#64748B] dark:text-slate-400">
                              {friend.splitzyId}
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
                  })
                )}
              </div>
            )}
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
