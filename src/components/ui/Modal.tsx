import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
  showCloseButton = true,
}: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Content */}
      <div
        className={`
          relative w-full ${maxWidthStyles[maxWidth]} bg-white dark:bg-slate-900
          rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 overflow-hidden
          border border-[#E5E7EB] dark:border-slate-800 transition-all transform max-h-[92vh] flex flex-col
        `}
      >
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1" />

        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div>
              {title && (
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-100 tracking-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        <div className="px-6 py-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
