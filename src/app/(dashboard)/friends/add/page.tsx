"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, Info, Calendar, Users, Folder, AtSign, Check, Send } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function AddFriendPage() {
  const router = useRouter();
  const { sendFriendRequest, friends, user } = useAuth();
  const { success, error, info } = useToast();

  const [searchId, setSearchId] = useState("");
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = (query: string) => {
    setSearchId(query);
    const clean = query.trim().toUpperCase();

    if (!clean) {
      setSearchedUser(null);
      return;
    }

    // Check mock friends database for match
    const candidate = friends.find((f) => f.splitzyId.toUpperCase() === clean);
    if (candidate) {
      setSearchedUser({
        ...candidate,
        joined: "Jan 2025",
        friendsCount: 12,
        groupsCount: 4,
      });
    } else if ((clean.startsWith("JOY-") || clean.startsWith("SPL-")) && clean.length >= 7) {
      // Auto-preview candidate
      setSearchedUser({
        displayName: clean.endsWith("4F8K9D") ? "Aman Verma" : `User ${clean.slice(-4)}`,
        splitzyId: clean,
        upiId: `${clean.toLowerCase().replace(/[^a-z0-9]/g, "")}@upi`,
        photoURL: clean.endsWith("4F8K9D") ? "/assets/avatar_boy.jpg" : "/assets/avatar_girl.jpg",
        joined: "Feb 2026",
        friendsCount: 8,
        groupsCount: 3,
      });
    } else {
      setSearchedUser(null);
    }
  };

  const handleSendRequest = async () => {
    if (!searchId) return;
    setIsLoading(true);
    try {
      const res = await sendFriendRequest(searchId);
      if (res.success) {
        success(res.message);
        router.push("/friends/requests");
      } else {
        error(res.message);
      }
    } catch (e: any) {
      error("Failed to send friend request");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <AppHeader title="Add Friend" showBack={true} />

      <div className="max-w-md mx-auto p-4 sm:p-6 space-y-6">
        {/* Search input field */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchId}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="JOY-7K9M2Q"
            className="w-full bg-white border border-[#E5E7EB] rounded-2xl pl-10 pr-10 py-3.5 text-sm font-mono uppercase text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
          {searchId && (
            <button
              onClick={() => {
                setSearchId("");
                setSearchedUser(null);
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {searchedUser ? (
          /* Screen 11: Found User Profile Preview */
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col items-center text-center animate-in fade-in duration-200">
            <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-blue-50 shadow-md mb-3">
              <Image src={searchedUser.photoURL} alt={searchedUser.displayName} fill className="object-cover" />
            </div>

            <h3 className="text-xl font-bold text-[#0F172A]">{searchedUser.displayName}</h3>
            <div className="font-mono text-xs font-semibold text-[#64748B] mt-0.5">
              {searchedUser.splitzyId}
            </div>

            {/* User stats */}
            <div className="grid grid-cols-3 gap-2 w-full my-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <div className="flex flex-col items-center">
                <Calendar className="w-4 h-4 text-slate-400 mb-1" />
                <span className="text-[10px] text-slate-500">Joined</span>
                <span className="text-xs font-bold text-slate-800">{searchedUser.joined}</span>
              </div>
              <div className="flex flex-col items-center border-x border-slate-200">
                <Users className="w-4 h-4 text-slate-400 mb-1" />
                <span className="text-[10px] text-slate-500">Friends</span>
                <span className="text-xs font-bold text-slate-800">{searchedUser.friendsCount}</span>
              </div>
              <div className="flex flex-col items-center">
                <Folder className="w-4 h-4 text-slate-400 mb-1" />
                <span className="text-[10px] text-slate-500">Groups</span>
                <span className="text-xs font-bold text-slate-800">{searchedUser.groupsCount}</span>
              </div>
            </div>

            {/* UPI ID Badge */}
            {searchedUser.upiId && (
              <div className="w-full bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-center justify-between mb-6">
                <span className="text-xs font-semibold text-[#64748B]">UPI ID</span>
                <span className="text-xs font-mono font-bold text-[#2563EB]">
                  {searchedUser.upiId}
                </span>
              </div>
            )}

            <Button
              fullWidth
              size="lg"
              onClick={handleSendRequest}
              isLoading={isLoading}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Send Friend Request
            </Button>
          </div>
        ) : (
          /* Screen 10: Empty State - Find your friends */
          <div className="flex flex-col items-center text-center py-4">
            <div className="relative w-56 h-56 rounded-3xl overflow-hidden shadow-md border-4 border-white mb-6">
              <Image src="/assets/find_friends.jpg" alt="Find friends" fill className="object-cover" />
            </div>

            <h2 className="text-xl font-bold text-[#0F172A]">Find your friends</h2>
            <p className="text-xs text-[#64748B] mt-1.5 max-w-xs leading-relaxed">
              Enter your friend's JoySplit ID (e.g. JOY-4F8K9D) to send a friend request.
            </p>

            {/* Helpful Hint Card */}
            <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 mt-8 text-left flex items-start gap-3 w-full">
              <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
              <div className="text-xs text-[#1E40AF] leading-relaxed">
                Share your JoySplit ID <strong className="font-mono text-blue-900">{user?.splitzyId}</strong> with friends so they can find and add you.
              </div>
            </div>

            {/* Quick try buttons */}
            <div className="mt-6 w-full">
              <div className="text-[11px] font-semibold text-[#64748B] mb-2 text-center uppercase tracking-wider">
                Or quick test with demo friends
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {["JOY-4F8K9D", "JOY-9D3L8K", "JOY-2J7Q6R"].map((id) => (
                  <button
                    key={id}
                    onClick={() => handleSearch(id)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-[#2563EB] hover:bg-blue-50 transition-colors shadow-2xs"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
