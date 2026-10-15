import React from "react";
import Image from "next/image";
import { Users, Clock, Search, UserPlus, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  type?: "groups" | "activity" | "search" | "friends" | "error";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  imageSrc?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  type = "groups",
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  imageSrc,
  icon,
}: EmptyStateProps) {
  const defaultIcons = {
    groups: <Users className="w-12 h-12 text-[#2563EB]" />,
    activity: <Clock className="w-12 h-12 text-[#2563EB]" />,
    search: <Search className="w-12 h-12 text-[#64748B]" />,
    friends: <UserPlus className="w-12 h-12 text-[#2563EB]" />,
    error: <AlertCircle className="w-12 h-12 text-[#EF4444]" />,
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto my-6 animate-in fade-in duration-300">
      {imageSrc ? (
        <div className="relative w-44 h-44 mb-4 rounded-3xl overflow-hidden shadow-sm">
          <Image src={imageSrc} alt={title} fill className="object-cover" />
        </div>
      ) : (
        <div className="w-20 h-20 rounded-full bg-[#EFF6FF] flex items-center justify-center mb-5 shadow-xs">
          {icon || defaultIcons[type]}
        </div>
      )}

      <h3 className="text-xl font-bold text-[#0F172A] tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-[#64748B] mt-2 mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-col gap-2.5 w-full">
        {actionLabel && onAction && (
          <Button fullWidth onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button fullWidth variant="outline" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
