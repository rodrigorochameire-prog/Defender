"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOTTOM_TABS, isTabActive } from "@/components/layouts/nav-registry";
import { MobileMoreSheet } from "@/components/shared/mobile/mobile-more-sheet";
import type { UserRole } from "@/contexts/assignment-context";

export function MobileBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden",
          "bg-[#303032]/95 backdrop-blur-xl border-t border-neutral-700/30",
          "h-16 pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <div className="flex h-16 items-center justify-around px-1">
          {BOTTOM_TABS.map((tab) => {
            const active = isTabActive(pathname, tab);
            return (
              <Link
                key={tab.path}
                href={tab.path}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full w-full flex-col items-center justify-center gap-0.5 transition-colors duration-150",
                  active ? "text-emerald-400" : "text-neutral-500",
                )}
              >
                {active && (
                  <span className="absolute top-1 h-1 w-1 rounded-full bg-emerald-400" />
                )}
                <tab.icon className="mt-1 h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-neutral-500 transition-colors duration-150 active:text-emerald-400"
          >
            <MoreHorizontal className="mt-1 h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">Mais</span>
          </button>
        </div>
      </nav>

      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} role={role} />
    </>
  );
}
