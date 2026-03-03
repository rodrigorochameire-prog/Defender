"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  Calendar,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", icon: LayoutDashboard, path: "/admin" },
  { label: "Assistidos", icon: Users, path: "/admin/assistidos" },
  { label: "Demandas", icon: FileText, path: "/admin/demandas" },
  { label: "Agenda", icon: Calendar, path: "/admin/agenda" },
  { label: "Drive", icon: FolderOpen, path: "/admin/drive" },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "md:hidden",
        "bg-[#1f1f23]/95 backdrop-blur-xl",
        "border-t border-zinc-700/30",
        "h-16 pb-[env(safe-area-inset-bottom)]"
      )}
    >
      <div className="flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.path === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5",
                "w-full h-full relative",
                "transition-colors duration-150",
                isActive ? "text-emerald-400" : "text-zinc-500"
              )}
            >
              {/* Active dot indicator */}
              {isActive && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-emerald-400" />
              )}

              <item.icon className="w-5 h-5 mt-1" />
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>

              {/* Static unread badge on Demandas */}
              {item.path === "/admin/demandas" && !isActive && (
                <span className="absolute top-2 right-1/2 translate-x-3 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
