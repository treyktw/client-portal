// components/messages/UnreadBadge.tsx
"use client";

import { cn } from "@/lib/utils";

interface UnreadBadgeProps {
  count: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export default function UnreadBadge({ count, className, size = "md" }: UnreadBadgeProps) {
  if (count <= 0) return null;

  const sizeClasses = {
    sm: "h-4 min-w-[16px] text-[10px] px-1",
    md: "h-5 min-w-[20px] text-[11px] px-1.5",
    lg: "h-6 min-w-[24px] text-xs px-2",
  };

  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary font-medium text-primary-foreground group-hover:text-primary-foreground",
        sizeClasses[size],
        "group-hover:bg-primary/90",
        className
      )}
    >
      {displayCount}
    </span>
  );
}