"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  useAssignment,
  ASSIGNMENT_CONFIGS,
  Assignment,
} from "@/contexts/assignment-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Gavel,
  Shield,
  Lock,
  RefreshCw,
  Award,
  ChevronDown,
  Check,
  Briefcase,
} from "lucide-react";

// Mapeamento de ícones
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Gavel,
  Shield,
  Lock,
  RefreshCw,
  Award,
  Briefcase,
};

export function AssignmentSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { currentAssignment, config, setAssignment, isLoading } = useAssignment();
  const [open, setOpen] = useState(false);

  const Icon = iconMap[config.icon] || Briefcase;

  if (isLoading) {
    return (
      <div className="h-14 px-3 flex items-center">
        <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
        {!collapsed && (
          <div className="ml-3 flex-1">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse mt-1" />
          </div>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center gap-3 rounded-xl transition-all duration-200",
            "hover:bg-[var(--assignment-accent-light)] dark:hover:bg-[hsl(160_12%_12%)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--assignment-accent)]/40",
            "group cursor-pointer",
            collapsed ? "justify-center p-2" : "px-3 py-2.5"
          )}
          style={{
            background: open ? "var(--assignment-accent-light)" : undefined,
          }}
        >
          {/* Ícone com cor da atribuição - Aumentado */}
          <div
            className={cn(
              "rounded-xl flex items-center justify-center shrink-0 shadow-lg transition-all",
              collapsed ? "h-10 w-10" : "h-10 w-10"
            )}
            style={{
              background: `linear-gradient(145deg, ${config.accentColor}, ${config.accentColorDark})`,
            }}
          >
            <Icon className={cn("text-white", collapsed ? "h-5 w-5" : "h-5 w-5")} />
          </div>

          {/* Nome e descrição - Tipografia melhorada */}
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold truncate text-foreground tracking-tight">
                  {config.shortName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate uppercase tracking-wider font-medium">
                  Atribuição
                </p>
              </div>

              {/* Chevron */}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180"
                )}
              />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-72 shadow-xl border-[hsl(155_15%_90%)] dark:border-[hsl(160_12%_18%)]"
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium px-3 py-2">
          Trocar Atribuição
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {Object.values(ASSIGNMENT_CONFIGS).map((assignmentConfig) => {
          const AssignmentIcon = iconMap[assignmentConfig.icon] || Briefcase;
          const isActive = currentAssignment === assignmentConfig.id;

          return (
            <DropdownMenuItem
              key={assignmentConfig.id}
              onClick={() => {
                setAssignment(assignmentConfig.id);
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg mx-1 my-0.5",
                isActive && "bg-[var(--assignment-accent-light)] dark:bg-[hsl(160_12%_14%)]"
              )}
            >
              {/* Ícone */}
              <div
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                  isActive ? "text-white" : ""
                )}
                style={{
                  background: isActive
                    ? `linear-gradient(145deg, ${assignmentConfig.accentColor}, ${assignmentConfig.accentColorDark})`
                    : assignmentConfig.accentColorLight,
                  color: isActive ? "white" : assignmentConfig.accentColor,
                }}
              >
                <AssignmentIcon className="h-4 w-4" />
              </div>

              {/* Nome e descrição */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[13px] truncate",
                  isActive ? "font-semibold text-foreground" : "font-medium text-foreground"
                )}>
                  {assignmentConfig.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {assignmentConfig.description}
                </p>
              </div>

              {/* Check se ativo */}
              {isActive && (
                <Check
                  className="h-4 w-4 shrink-0"
                  style={{ color: assignmentConfig.accentColor }}
                />
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="my-2" />

        <div className="px-3 py-2 text-[10px] text-muted-foreground">
          Cada atribuição tem ferramentas e visualizações específicas para sua área de atuação.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
