"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, Info, Check, Send, AlertCircle, UserCheck, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { UserProfile } from "@/lib/types";

export default function AddFriendPage() {
  const router = useRouter();
  const {
    searchUserBySplitzyId,
    sendFriendRequest,
    acceptFriendRequest,
    user,
  } = useAuth();
  const { success, error } = useToast();

  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<{
    found: boolean;
    user?: Partial<UserProfile>;
    status?: "SELF" | "FRIENDS" | "REQUEST_SENT" | "REQUEST_RECEIVED" | "CAN_ADD";
    requestId?: string;
    message?: string;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const handlePerformSearch = async (queryToSearch: string) => {
    const clean = queryToSearch.trim().toUpperCase();
    if (!clean) {
      setSearchResult(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await searchUserBySplitzyId(clean);
      setSearchResult(res);
    } catch (e: any) {
      setSearchResult({
        found: false,
        message: e?.message || "Error searching for user.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!searchResult?.user?.splitzyId) return;
    setIsActing(true);
    try {
      const res = await sendFriendRequest(searchResult.user.splitzyId);
      if (res.success) {
        success(res.message);
        // Refresh search status to REQUEST_SENT
        setSearchResult((prev) =>
          prev
            ? {
                ...prev,
                status: "REQUEST_SENT",
                message: "Friend request sent",
              }
            : null
        );
      } else {
        error(res.message);
      }
    } catch {
      error("Failed to send friend request");
    } finally {
      setIsActing(false);
    }
  };

  const handleAcceptIncoming = async () => {
    if (!searchResult?.requestId) return;
    setIsActing(true);
    try {
      await acceptFriendRequest(searchResult.requestId);
      success(`You and ${searchResult.user?.displayName} are now friends!`);
      setSearchResult((prev) =>
        prev
          ? {
              ...prev,
              status: "FRIENDS",
              message: "You are now friends",
            }
          : null
      );
    } catch {
      error("Failed to accept friend request");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <AppShell>
      <AppHeader title="Add Friend" showBack={true} />

      <div className="max-w-md mx-auto p-4 sm:p-6 space-y-6">
        {/* Search input field */}
        <div className="space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handlePerformSearch(searchId);
            }}
            className="relative flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Splitzy ID (e.g. JOY-GXU8AD)"
                className="w-full bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl pl-10 pr-10 py-3.5 text-sm font-mono uppercase text-[#0F172A] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
              />
              {searchId && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchId("");
                    setSearchResult(null);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <Button
              type="submit"
              size="md"
              isLoading={isSearching}
              disabled={!searchId.trim()}
              className="px-5 rounded-2xl"
            >
              Search
            </Button>
          </form>
        </div>

        {searchResult && (
          <div>
            {searchResult.found && searchResult.user ? (
              /* Real User Discovery Profile Preview */
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center text-center animate-in fade-in duration-200">
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-blue-50 dark:border-slate-800 shadow-md mb-3">
                  <Image
                    src={searchResult.user.photoURL || "/assets/avatar_boy.jpg"}
                    alt={searchResult.user.displayName || "User"}
                    fill
                    className="object-cover"
                  />
                </div>

                <h3 className="text-xl font-bold text-[#0F172A] dark:text-white">
                  {searchResult.user.displayName}
                </h3>
                <div className="font-mono text-xs font-semibold text-[#64748B] dark:text-slate-400 mt-0.5">
                  {searchResult.user.splitzyId}
                </div>

                {/* Relationship status badge */}
                <div className="my-6">
                  {searchResult.status === "SELF" && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                      <span>This is your own Splitzy ID</span>
                    </div>
                  )}

                  {searchResult.status === "FRIENDS" && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                      <UserCheck className="w-4 h-4" />
                      <span>Already Friends</span>
                    </div>
                  )}

                  {searchResult.status === "REQUEST_SENT" && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800">
                      <Clock className="w-4 h-4" />
                      <span>Request Sent (Pending Response)</span>
                    </div>
                  )}

                  {searchResult.status === "REQUEST_RECEIVED" && (
                    <div className="space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                        <span>This user sent you a friend request!</span>
                      </div>
                      <div>
                        <Button
                          fullWidth
                          size="md"
                          isLoading={isActing}
                          onClick={handleAcceptIncoming}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Accept Friend Request
                        </Button>
                      </div>
                    </div>
                  )}

                  {searchResult.status === "CAN_ADD" && (
                    <Button
                      fullWidth
                      size="lg"
                      onClick={handleSendRequest}
                      isLoading={isActing}
                      leftIcon={<Send className="w-4 h-4" />}
                    >
                      Send Friend Request
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* User not found */
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 text-center">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  User Not Found
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  {searchResult.message || "Please check the Splitzy ID and try again."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state: Find your friends guidance */}
        {!searchResult && (
          <div className="flex flex-col items-center text-center py-4">
            <div className="relative w-56 h-56 rounded-3xl overflow-hidden shadow-md border-4 border-white dark:border-slate-800 mb-6">
              <Image src="/assets/find_friends.jpg" alt="Find friends" fill className="object-cover" />
            </div>

            <h2 className="text-xl font-bold text-[#0F172A] dark:text-white">Find your friends</h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1.5 max-w-xs leading-relaxed">
              Enter a friend&apos;s Splitzy ID (e.g. {user?.splitzyId || "JOY-XXXX"}) to find their profile and connect.
            </p>

            {/* Helpful Hint Card */}
            <div className="bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#BFDBFE] dark:border-blue-900/60 rounded-2xl p-4 mt-8 text-left flex items-start gap-3 w-full">
              <Info className="w-5 h-5 text-[#2563EB] dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-[#1E40AF] dark:text-blue-200 leading-relaxed">
                Your Splitzy ID is <strong className="font-mono text-blue-900 dark:text-white font-bold">{user?.splitzyId}</strong>. Share it with friends so they can add you.
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
