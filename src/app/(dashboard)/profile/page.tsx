"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  Copy,
  Check,
  Share2,
  ChevronRight,
  User,
  Bell,
  Moon,
  HelpCircle,
  Info,
  LogOut,
  AtSign,
  Edit2,
  Settings,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function ProfilePage() {
  const router = useRouter();
  const { user, friends, notifications, logout, updateProfile } = useAuth();
  const { success, error } = useToast();

  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState(user?.displayName || "Rajeev Ranjan");
  const [upiInput, setUpiInput] = useState(user?.upiId || "rajeev@upi");

  if (!user) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.splitzyId);
    setCopied(true);
    success("JoySplit ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareId = () => {
    if (navigator.share) {
      navigator.share({
        title: "My JoySplit ID",
        text: `Hey! Add me on JoySplit: ${user.splitzyId}`,
      }).catch(() => {});
    } else {
      handleCopyId();
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        displayName: nameInput.trim(),
        upiId: upiInput.trim(),
      });
      success("Profile updated!");
      setIsEditModalOpen(false);
    } catch (e) {
      error("Failed to update profile");
    }
  };

  const handleLogout = async () => {
    await logout();
    success("Logged out successfully");
    router.push("/login");
  };

  return (
    <AppShell>
      <AppHeader
        title="Profile"
        showBack={true}
        rightAction={
          <button
            onClick={() => router.push("/settings")}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-full"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6 pb-20">
        {/* Profile Card Header (Screen 9 in Friends Feature Showcase) */}
        <div className="flex flex-col items-center text-center">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mb-3">
            <Image
              src={user.photoURL || "/assets/avatar_boy.jpg"}
              alt={user.displayName}
              fill
              className="object-cover"
            />
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="absolute inset-0 bg-black/25 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              <Camera className="w-6 h-6" />
            </button>
          </div>

          <h1 className="text-xl font-extrabold text-[#0F172A]">{user.displayName}</h1>
          <p className="text-xs text-[#64748B] mt-0.5">{user.email}</p>
        </div>

        {/* JoySplit ID Card */}
        <div className="bg-linear-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                Your JoySplit ID
              </span>
              <div className="font-mono text-xl font-extrabold text-[#0F172A] tracking-wider mt-0.5">
                {user.splitzyId}
              </div>
            </div>
            <button
              onClick={handleCopyId}
              className="p-2.5 bg-white text-slate-600 hover:text-[#2563EB] rounded-2xl border border-slate-200 shadow-2xs transition-colors"
              title="Copy ID"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <Button
            fullWidth
            size="md"
            onClick={handleShareId}
            leftIcon={<Share2 className="w-4 h-4" />}
          >
            Share ID
          </Button>
        </div>

        {/* UPI ID Mini Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#D97706] flex items-center justify-center">
              <AtSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#64748B] uppercase">UPI ID</span>
              <div className="text-sm font-bold text-[#0F172A]">{user.upiId || "Not set"}</div>
            </div>
          </div>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs font-bold text-[#2563EB] hover:underline"
          >
            Edit
          </button>
        </div>

        {/* Navigation Menu Options List */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs divide-y divide-slate-100 overflow-hidden">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-semibold text-[#0F172A]">Edit Profile</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>

          <Link
            href="/friends"
            className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-semibold text-[#0F172A]">Friends</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">{friends.length}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </Link>

          <Link
            href="/notifications"
            className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-semibold text-[#0F172A]">Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">
                {notifications.filter((n) => !n.read).length}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </Link>

          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-semibold text-[#0F172A]">Dark Mode</span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-11 h-6 rounded-full transition-colors p-1 ${
                darkMode ? "bg-[#2563EB]" : "bg-slate-300"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  darkMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <Link
            href="/settings"
            className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-semibold text-[#0F172A]">Help & Support</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </Link>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-2xl bg-white border border-red-200 hover:bg-red-50 text-[#EF4444] font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile"
      >
        <div className="space-y-4 py-2">
          <Input
            label="Display Name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />

          <Input
            label="UPI ID"
            value={upiInput}
            onChange={(e) => setUpiInput(e.target.value)}
            hint="For receiving payments directly via UPI"
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
