"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  UserPlus,
  MoreVertical,
  Link as LinkIcon,
  Copy,
  Check,
  Share2,
  Crown,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Suspense } from "react";

function GroupMembersContent() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { groups, friends, user, inviteGroupMember } = useAuth();
  const { success, error: toastError } = useToast();

  const group = groups.find((g) => g.id === groupId) || groups[0];
  const [copied, setCopied] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const inviteLink = `https://joysplit.app/invite/${group.name.toLowerCase().replace(/\s+/g, "")}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    success("Group invite link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join ${group.name} on JoySplit`,
        text: `Hey! Join our group "${group.name}" on JoySplit: ${inviteLink}`,
        url: inviteLink,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const handleInviteFriend = async (friendUid: string) => {
    const res = await inviteGroupMember(group.id, friendUid);
    if (res.success) {
      success("Invitation sent to friend!");
    } else {
      toastError(res.message || "Failed to invite friend");
    }
  };

  const nonMemberFriends = friends.filter((f) => !group.members.includes(f.uid));

  return (
    <AppShell>
      <AppHeader
        title="Members"
        showBack={true}
        rightAction={
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="w-9 h-9 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center hover:bg-blue-100 transition-colors shadow-xs"
            aria-label="Add Member"
          >
            <UserPlus className="w-5 h-5 stroke-[2.2]" />
          </button>
        }
      />

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Members List (Screen 17) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {group.members.map((mId) => {
            const member = group.memberDetails?.[mId];
            const fr = friends.find((f) => f.uid === mId);
            const isCreator = mId === group.createdBy;
            const isMe = mId === user?.uid;

            const displayName =
              member?.name || (isMe ? user?.displayName : fr?.displayName) || `User ${mId.slice(-4)}`;
            const photoURL = member?.photoURL || (isMe ? user?.photoURL : fr?.photoURL);
            const splitzyId = member?.splitzyId || (isMe ? user?.splitzyId : fr?.splitzyId) || mId;

            return (
              <div
                key={mId}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <Avatar src={photoURL} name={displayName} size="md" />
                  <div>
                    <div className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                      <span>{displayName}</span>
                      {isMe && <span className="text-xs text-blue-600 font-semibold">(You)</span>}
                      {isCreator && (
                        <span className="text-[10px] font-bold text-[#D97706] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5" /> Creator 👑
                        </span>
                      )}
                      {!isCreator && member?.role === "admin" && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-[#64748B] mt-0.5">
                      {splitzyId}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          fullWidth
          variant="secondary"
          onClick={() => setIsInviteModalOpen(true)}
          leftIcon={<LinkIcon className="w-4 h-4" />}
        >
          Invite Friends
        </Button>

        {/* Group Invite Link Box (Screen 17 bottom) */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="text-xs font-bold text-[#0F172A]">Group Invite Link</div>
          <p className="text-xs text-[#64748B]">Share this link with your friends to let them join this group.</p>

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-xs font-mono text-slate-700 truncate pr-2">
              {inviteLink}
            </span>
            <button
              onClick={handleCopyLink}
              className="p-1.5 text-slate-500 hover:text-[#2563EB] transition-colors"
              title="Copy Link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <Button
            fullWidth
            variant="outline"
            onClick={handleShareLink}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Share Invite Link
          </Button>
        </div>
      </div>

      {/* Invite Friends Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Friends"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-slate-600">
            Select an accepted friend to add to <strong>{group.name}</strong>:
          </p>

          <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {nonMemberFriends.map((f) => {
              const isInvited = group.invitedMembers?.includes(f.uid);

              return (
                <div key={f.uid} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={f.photoURL} name={f.displayName} size="sm" />
                    <div>
                      <div className="text-xs font-bold text-[#0F172A]">{f.displayName}</div>
                      <div className="text-[11px] font-mono text-slate-500">{f.splitzyId}</div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isInvited ? "secondary" : "outline"}
                    disabled={isInvited}
                    onClick={() => handleInviteFriend(f.uid)}
                  >
                    {isInvited ? "Invited" : "Invite"}
                  </Button>
                </div>
              );
            })}

            {nonMemberFriends.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500">
                All your friends are already in this group.
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => setIsInviteModalOpen(false)}
          >
            Done
          </Button>
        </div>
      </Modal>
    </AppShell>
  );
}

export default function GroupMembersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <GroupMembersContent />
    </Suspense>
  );
}
