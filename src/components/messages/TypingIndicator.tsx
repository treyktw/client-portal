// components/messages/TypingIndicator.tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  users: Array<{
    name?: string;
    email: string;
  }>;
  className?: string;
}

export default function TypingIndicator({ users, className }: TypingIndicatorProps) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (users.length === 0) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 400);

    return () => clearInterval(interval);
  }, [users.length]);

  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].name || users[0].email} is typing`;
    } else if (users.length === 2) {
      return `${users[0].name || users[0].email} and ${users[1].name || users[1].email} are typing`;
    } else {
      return `${users[0].name || users[0].email} and ${users.length - 1} others are typing`;
    }
  };

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <div className="flex items-center gap-1">
        <span>{getTypingText()}</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "inline-block h-1 w-1 rounded-full bg-muted-foreground transition-opacity",
                i < dots ? "opacity-100" : "opacity-30"
              )}
            />
          ))}
        </span>
      </div>
    </div>
  );
}