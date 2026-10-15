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
        bg-white rounded-2xl border border-[#E5E7EB] p-4.5
        shadow-[0_1px_3px_rgba(0,0,0,0.04)]
        ${hoverable ? "hover:border-[#BFDBFE] hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.99]" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
