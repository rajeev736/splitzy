"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LogoutConfirmModal({ isOpen, onClose }: LogoutConfirmModalProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const { success, error } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
      success("Logged out successfully");
      router.replace("/login");
    } catch (err: any) {
      error(err?.message || "Failed to log out");
      setIsLoggingOut(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isLoggingOut && onClose()} title="Log Out">
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Do you want to log out?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Are you sure you want to log out of your Splitzy account? You will need to log back in to view your expenses and groups.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            disabled={isLoggingOut}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="danger"
            isLoading={isLoggingOut}
            onClick={handleConfirmLogout}
          >
            Log Out
          </Button>
        </div>
      </div>
    </Modal>
  );
}
