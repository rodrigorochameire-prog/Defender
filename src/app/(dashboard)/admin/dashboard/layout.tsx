"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, Scale, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/dashboard", label: "Júri", icon: Gavel, exact: true },
  { href: "/admin/dashboard/varas-criminais", label: "Varas Criminais", icon: Scale, exact: false },
  { href: "/admin/dashboard/kpis", label: "KPIs", icon: BarChart3, exact: false },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Tab bar — pill style, Padrão Defender */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-zinc-200/60 dark:border-zinc-800/40 px-4 lg:px-6 py-3">
        <div className="inline-flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {TABS.map((tab) => {
            const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 dark:hover:text-zinc-200 dark:hover:bg-zinc-700/40",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
