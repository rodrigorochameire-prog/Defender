"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BOTTOM_TABS, isTabActive } from "@/components/layouts/nav-registry";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
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
      </div>
    </nav>
  );
}
