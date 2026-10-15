import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function Card({
  children,
  className = "",
  hoverable = false,
  ...props
}: CardProps) {
  return (
    <div
      className={`
        bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 p-4.5
        shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-slate-900 dark:text-slate-100
        ${hoverable ? "hover:border-[#BFDBFE] dark:hover:border-blue-700/60 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99]" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
