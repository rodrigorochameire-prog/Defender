"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ListTodo } from "lucide-react";

export function FloatingDemandasButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/demandas") return null;

  return (
    <button
      onClick={() => router.push("/admin/demandas")}
      className={cn(
        "fixed z-[51] flex items-center justify-center",
        "w-10 h-10 rounded-2xl shadow-md shadow-black/[0.08]",
        "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm",
        "text-neutral-600 dark:text-neutral-300",
        "ring-1 ring-black/[0.06] dark:ring-white/[0.08]",
        "hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:ring-emerald-300/30 dark:hover:ring-emerald-500/20",
        "transition-all duration-200 active:scale-95",
        "bottom-[11.5rem] right-4 sm:bottom-6 sm:right-[7.5rem]",
        "cursor-pointer"
      )}
      title="Ir para Demandas"
    >
      <ListTodo className="w-4 h-4" />
    </button>
  );
}
