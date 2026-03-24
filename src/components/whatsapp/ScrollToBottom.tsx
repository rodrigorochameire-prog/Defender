"use client";

import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToBottomProps {
  show: boolean;
  unreadCount?: number;
  newMessageCount?: number;
  onClick: () => void;
}

export function ScrollToBottom({ show, unreadCount = 0, newMessageCount = 0, onClick }: ScrollToBottomProps) {
  if (!show) return null;

  const hasNew = newMessageCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute bottom-20 right-4 z-10",
        hasNew ? "h-10 px-3 rounded-full" : "h-10 w-10 rounded-full",
        "bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700",
        "flex items-center justify-center gap-1.5",
        "hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors",
        "animate-scale-in"
      )}
    >
      <ArrowDown className="h-4 w-4 text-zinc-600 dark:text-zinc-300 shrink-0" />
      {hasNew && (
        <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200 whitespace-nowrap">
          {newMessageCount > 99 ? "99+" : newMessageCount} nova{newMessageCount !== 1 ? "s" : ""}
        </span>
      )}
      {!hasNew && unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-semibold flex items-center justify-center animate-bounce-subtle">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
}
