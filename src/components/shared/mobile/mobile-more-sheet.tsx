"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAssignment, type UserRole } from "@/contexts/assignment-context";
import { getLauncherGroups } from "@/components/layouts/nav-registry";
import { openCommandPalette } from "@/lib/events/command-palette";
import { resolveIcon } from "@/components/shared/mobile/resolve-icon";
import { cn } from "@/lib/utils";

export function MobileMoreSheet({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  role: UserRole;
}) {
  const { modules } = useAssignment();
  const groups = getLauncherGroups(modules, role);

  function handleSearch() {
    onOpenChange(false);
    openCommandPalette();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl p-0 md:hidden"
      >
        <div className="flex h-full flex-col">
          {/* Subtle search entry — opens the command palette */}
          <div className="p-4 pb-2">
            <button
              type="button"
              onClick={handleSearch}
              className="flex h-11 w-full items-center gap-2 rounded-xl bg-muted px-3 text-sm text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              Buscar seção, assistido, demanda…
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {groups.map((group) => (
              <section key={group.title} className="mb-5">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="grid grid-cols-3 gap-3">
                  {group.items.map((item) => {
                    const Icon = resolveIcon(item.icon);
                    return (
                      <li key={item.path}>
                        <Link
                          href={item.path}
                          onClick={() => onOpenChange(false)}
                          className={cn(
                            "flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl p-2 text-center",
                            "bg-card active:bg-accent transition-colors",
                          )}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-[11px] leading-tight text-foreground line-clamp-2">
                            {item.label}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
