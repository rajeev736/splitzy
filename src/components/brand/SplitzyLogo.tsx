import React from "react";
import Link from "next/link";

interface JoySplitLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  href?: string;
}

export function JoySplitLogoIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left blue leaning curved bar */}
      <rect
        x="24"
        y="30"
        width="22"
        height="50"
        rx="11"
        transform="rotate(-18 24 30)"
        fill="#2563EB"
      />
      {/* Right yellow leaning curved bar */}
      <rect
        x="60"
        y="36"
        width="20"
        height="44"
        rx="10"
        transform="rotate(-18 60 36)"
        fill="#FBBF24"
      />
      {/* Top yellow spark / accent */}
      <circle cx="68" cy="22" r="5" fill="#FBBF24" />
      <path
        d="M62 14L65 17M74 14L71 17"
        stroke="#FBBF24"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function JoySplitLogo({
  size = "md",
  showText = true,
  showTagline = false,
  className = "",
  href,
}: JoySplitLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
    xl: "text-4xl",
  };

  const content = (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <JoySplitLogoIcon className={iconSizes[size]} />
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-[#0F172A] dark:text-white leading-tight ${textSizes[size]}`}>
            JoySplit
          </span>
          {showTagline && (
            <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium tracking-normal -mt-0.5">
              Split bills. Keep friendships.
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

// Aliases for compatibility
export const SplitzyLogo = JoySplitLogo;
export const SplitzyLogoIcon = JoySplitLogoIcon;
