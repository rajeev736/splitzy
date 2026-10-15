import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "success"
  | "danger"
  | "secondary"
  | "outline"
  | "text";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-1 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
    md: "text-sm px-4 py-2.5 rounded-xl gap-2",
    lg: "text-base px-6 py-3.5 rounded-2xl gap-2.5 font-medium",
  };

  const variantStyles = {
    primary:
      "bg-[#2563EB] hover:bg-[#1D4ED8] text-white focus:ring-[#2563EB]/40 shadow-sm",
    accent:
      "bg-[#FBBF24] hover:bg-[#F59E0B] text-[#0F172A] focus:ring-[#FBBF24]/40 shadow-sm font-semibold",
    success:
      "bg-[#10B981] hover:bg-[#059669] text-white focus:ring-[#10B981]/40 shadow-sm",
    danger:
      "bg-[#EF4444] hover:bg-[#DC2626] text-white focus:ring-[#EF4444]/40 shadow-sm",
    secondary:
      "bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE] focus:ring-[#2563EB]/30",
    outline:
      "bg-transparent border border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] focus:ring-[#2563EB]/30",
    text:
      "bg-transparent text-[#2563EB] hover:bg-slate-100 focus:ring-slate-300",
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
