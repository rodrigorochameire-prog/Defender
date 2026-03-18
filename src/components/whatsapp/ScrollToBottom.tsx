"use client";

import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToBottomProps {
  show: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function ScrollToBottom({ show, unreadCount = 0, onClick }: ScrollToBottomProps) {
  if (!show) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute bottom-20 right-4 z-10",
        "h-10 w-10 rounded-full",
        "bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700",
        "flex items-center justify-center",
        "hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors",
        "animate-scale-in"
      )}
    >
      <ArrowDown className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-semibold flex items-center justify-center animate-bounce-subtle">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
