"use client";

import { SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/**
 * Wraps filter/sort controls in a bottom sheet behind a "Filtros" button.
 * Use on data-dense pages where inline filters do not fit on a phone.
 */
export function FilterSheet({
  children,
  triggerLabel = "Filtros",
  activeCount = 0,
}: {
  children: React.ReactNode;
  triggerLabel?: string;
  activeCount?: number;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          {triggerLabel}
          {activeCount > 0 && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetTitle className="mb-4">{triggerLabel}</SheetTitle>
        <div className="flex flex-col gap-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
