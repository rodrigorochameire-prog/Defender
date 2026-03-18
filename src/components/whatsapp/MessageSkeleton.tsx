"use client";

export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Inbound bubble */}
      <div className="flex justify-start">
        <div className="w-[55%] space-y-2">
          <div className="h-12 rounded-2xl rounded-tl-md bg-zinc-200 dark:bg-zinc-800 animate-shimmer" />
          <div className="h-3 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-shimmer" />
        </div>
      </div>
      {/* Outbound bubble */}
      <div className="flex justify-end">
        <div className="w-[45%] space-y-2">
          <div className="h-8 rounded-2xl rounded-tr-md bg-emerald-100 dark:bg-emerald-950/30 animate-shimmer" />
          <div className="ml-auto h-3 w-12 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-shimmer" />
        </div>
      </div>
      {/* Inbound bubble long */}
      <div className="flex justify-start">
        <div className="w-[65%] space-y-2">
          <div className="h-20 rounded-2xl rounded-tl-md bg-zinc-200 dark:bg-zinc-800 animate-shimmer" />
          <div className="h-3 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-shimmer" />
        </div>
      </div>
      {/* Outbound bubble short */}
      <div className="flex justify-end">
        <div className="w-[35%] space-y-2">
          <div className="h-8 rounded-2xl rounded-tr-md bg-emerald-100 dark:bg-emerald-950/30 animate-shimmer" />
          <div className="ml-auto h-3 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
