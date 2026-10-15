"use client";

import React, { useState } from "react";
import Image from "next/image";

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  badge?: React.ReactNode;
}

export function Avatar({
  src,
  name,
  size = "md",
  className = "",
  badge,
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  const sizeMap = {
    xs: { dim: "w-6 h-6 text-[10px]", px: 24 },
    sm: { dim: "w-8 h-8 text-xs", px: 32 },
    md: { dim: "w-10 h-10 text-sm", px: 40 },
    lg: { dim: "w-14 h-14 text-base", px: 56 },
    xl: { dim: "w-20 h-20 text-xl", px: 80 },
  };

  const getInitials = (str: string) => {
    if (!str) return "U";
    const parts = str.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.slice(0, 2).toUpperCase();
  };

  // Deterministic pastel color for initials based on name string
  const getBgColor = (str: string) => {
    const colors = [
      "bg-blue-100 text-blue-700",
      "bg-amber-100 text-amber-800",
      "bg-emerald-100 text-emerald-800",
      "bg-purple-100 text-purple-800",
      "bg-rose-100 text-rose-800",
      "bg-indigo-100 text-indigo-800",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const showImage = Boolean(src && !hasError);

  return (
    <div className={`relative inline-flex shrink-0 ${sizeMap[size].dim} ${className}`}>
      {showImage ? (
        <div className="relative w-full h-full rounded-full overflow-hidden border border-slate-200/60 shadow-xs">
          <Image
            src={src!}
            alt={name || "Avatar"}
            fill
            sizes={`${sizeMap[size].px}px`}
            className="object-cover"
            onError={() => setHasError(true)}
            unoptimized={src?.startsWith("http") && !src.includes("googleusercontent.com")}
          />
        </div>
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center font-bold tracking-tight border border-slate-200 shadow-xs ${getBgColor(
            name || "User"
          )}`}
        >
          {getInitials(name)}
        </div>
      )}
      {badge && <div className="absolute -bottom-0.5 -right-0.5">{badge}</div>}
    </div>
  );
}
