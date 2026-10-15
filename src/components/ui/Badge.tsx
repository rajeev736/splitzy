import React from "react";

export type BadgeVariant =
  | "pending"
  | "payment_reported"
  | "paid"
  | "failed"
  | "you_owe"
  | "you_are_owed"
  | "settled"
  | "reminder"
  | "friend_request"
  | "group_invitation"
  | "new"
  | "all_settled";

export interface BadgeProps {
  variant?: BadgeVariant;
  children?: React.ReactNode;
  className?: string;
  size?: "sm" | "md";
}

const BADGE_STYLES: Record<BadgeVariant, { bg: string; text: string; label: string }> = {
  pending: {
    bg: "bg-[#FEF3C7]",
    text: "text-[#D97706]",
    label: "Pending",
  },
  payment_reported: {
    bg: "bg-[#E0F2FE]",
    text: "text-[#0284C7]",
    label: "Payment Reported",
  },
  paid: {
    bg: "bg-[#DCFCE7]",
    text: "text-[#16A34A]",
    label: "Paid",
  },
  failed: {
    bg: "bg-[#FEE2E2]",
    text: "text-[#DC2626]",
    label: "Failed",
  },
  you_owe: {
    bg: "bg-[#FEE2E2]",
    text: "text-[#DC2626]",
    label: "You Owe",
  },
  you_are_owed: {
    bg: "bg-[#DCFCE7]",
    text: "text-[#16A34A]",
    label: "You Are Owed",
  },
  settled: {
    bg: "bg-[#E0F2FE]",
    text: "text-[#0284C7]",
    label: "Settled",
  },
  reminder: {
    bg: "bg-[#FEF3C7]",
    text: "text-[#D97706]",
    label: "Reminder",
  },
  friend_request: {
    bg: "bg-[#F3E8FF]",
    text: "text-[#9333EA]",
    label: "Friend Request",
  },
  group_invitation: {
    bg: "bg-[#EDE9FE]",
    text: "text-[#7C3AED]",
    label: "Group Invitation",
  },
  new: {
    bg: "bg-[#DBEAFE]",
    text: "text-[#2563EB]",
    label: "New",
  },
  all_settled: {
    bg: "bg-[#DCFCE7]",
    text: "text-[#16A34A]",
    label: "All Settled",
  },
};

export function Badge({
  variant = "pending",
  children,
  className = "",
  size = "md",
}: BadgeProps) {
  const config = BADGE_STYLES[variant] || BADGE_STYLES.pending;
  const content = children || config.label;

  const sizeClasses = {
    sm: "text-[11px] px-2 py-0.5 rounded-full font-medium",
    md: "text-xs px-2.5 py-1 rounded-full font-semibold",
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 leading-none select-none
        ${config.bg} ${config.text} ${sizeClasses[size]}
        ${className}
      `}
    >
      {content}
    </span>
  );
}
