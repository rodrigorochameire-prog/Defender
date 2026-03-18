"use client";

export function ConversationSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-3 border-b border-zinc-100 dark:border-zinc-800/50"
        >
          {/* Avatar */}
          <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-shimmer" />
          {/* Content */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="h-3.5 w-28 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-shimmer" />
              <div className="h-3 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-shimmer" />
            </div>
            <div className="h-3 w-40 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}
