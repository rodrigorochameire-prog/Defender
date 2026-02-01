// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  useAssignment,
  ASSIGNMENT_CONFIGS,
  ASSIGNMENT_CATEGORIES,
  Assignment,
} from "@/contexts/assignment-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
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
  Scale,
  UserCheck,
  FileText,
  Sparkles,
} from "lucide-react";

// Mapeamento de ícones
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Gavel,
  Shield,
  Lock,
  RefreshCw,
  Award,
  Briefcase,
  Scale,
  UserCheck,
  FileText,
};

// Ícones de categoria
const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  ORDINARIA: Briefcase,
  SUBSTITUICAO: RefreshCw,
  FERRAMENTA: Sparkles,
};

export function AssignmentSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { currentAssignment, config, setAssignment, isLoading } = useAssignment();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const Icon = iconMap[config.icon] || Briefcase;

  // Loading skeleton
  if (!mounted || isLoading) {
    return (
      <div className="h-14 px-3 flex items-center">
        <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 animate-pulse" />
        {!collapsed && (
          <div className="ml-3 flex-1">
            <div className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-900 rounded-lg animate-pulse mt-1.5" />
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
            "w-full flex items-center gap-3 rounded-2xl transition-all duration-300",
            "bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950",
            "border border-zinc-200/80 dark:border-zinc-800/80",
            "hover:border-emerald-300 dark:hover:border-emerald-800",
            "hover:shadow-lg hover:shadow-emerald-500/10",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
            "group cursor-pointer",
            collapsed ? "justify-center p-2" : "px-3 py-3"
          )}
        >
          {/* Ícone Premium */}
          <div
            className={cn(
              "rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
              "shadow-lg group-hover:shadow-xl group-hover:scale-105",
              collapsed ? "h-11 w-11" : "h-11 w-11"
            )}
            style={{
              background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColorDark})`,
              boxShadow: `0 4px 14px -2px ${config.accentColor}40`,
            }}
          >
            <Icon className={cn("text-white drop-shadow-sm", collapsed ? "h-5 w-5" : "h-5 w-5")} strokeWidth={2.5} />
          </div>

          {/* Nome e descrição */}
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-bold truncate text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {config.shortName}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate uppercase tracking-widest font-medium">
                  Atribuição
                </p>
              </div>

              {/* Chevron animado */}
              <div className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-300",
                "bg-zinc-100 dark:bg-zinc-800",
                "group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30"
              )}>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-zinc-500 dark:text-zinc-400 transition-all duration-300",
                    "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
                    open && "rotate-180"
                  )}
                  strokeWidth={2.5}
                />
              </div>
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className={cn(
          "w-80 p-2",
          "bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl",
          "border border-zinc-200/80 dark:border-zinc-800/80",
          "shadow-2xl shadow-zinc-900/10 dark:shadow-black/30",
          "rounded-2xl"
        )}
        sideOffset={8}
      >
        <DropdownMenuLabel className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold px-2 py-2 uppercase tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Trocar Atribuição
        </DropdownMenuLabel>

        {ASSIGNMENT_CATEGORIES.map((category, categoryIndex) => {
          const CategoryIcon = categoryIcons[category.id] || Briefcase;
          
          return (
            <div key={category.id}>
              {categoryIndex > 0 && <DropdownMenuSeparator className="my-2" />}
              
              <DropdownMenuGroup>
                <div className="px-2 py-2 flex items-center gap-2">
                  <CategoryIcon className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {category.label}
                  </span>
                </div>
                
                {category.assignments.map((assignmentId) => {
                  const assignmentConfig = ASSIGNMENT_CONFIGS[assignmentId];
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
                        "flex items-center gap-3 px-3 py-3 cursor-pointer rounded-xl mx-1 my-0.5 transition-all duration-200",
                        isActive 
                          ? "bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border border-emerald-200/50 dark:border-emerald-800/50" 
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      )}
                    >
                      {/* Ícone */}
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
                          isActive && "shadow-md"
                        )}
                        style={{
                          background: isActive
                            ? `linear-gradient(135deg, ${assignmentConfig.accentColor}, ${assignmentConfig.accentColorDark})`
                            : assignmentConfig.accentColorLight,
                          boxShadow: isActive ? `0 4px 12px -2px ${assignmentConfig.accentColor}40` : undefined,
                        }}
                      >
                        <AssignmentIcon 
                          className="h-4.5 w-4.5" 
                          style={{ color: isActive ? "white" : assignmentConfig.accentColor }}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                      </div>

                      {/* Nome e descrição */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm truncate transition-colors",
                          isActive 
                            ? "font-bold text-emerald-700 dark:text-emerald-400" 
                            : "font-medium text-zinc-700 dark:text-zinc-300"
                        )}>
                          {assignmentConfig.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 truncate mt-0.5">
                          {assignmentConfig.description}
                        </p>
                      </div>

                      {/* Check animado */}
                      {isActive && (
                        <div 
                          className="h-6 w-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: assignmentConfig.accentColorLight }}
                        >
                          <Check
                            className="h-3.5 w-3.5"
                            style={{ color: assignmentConfig.accentColor }}
                            strokeWidth={3}
                          />
                        </div>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            </div>
          );
        })}

        <DropdownMenuSeparator className="my-2" />

        <div className="px-3 py-2.5 text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed bg-zinc-50 dark:bg-zinc-900/50 rounded-xl mx-1">
          <span className="font-semibold text-zinc-500 dark:text-zinc-400">Dica:</span> Cada atribuição tem ferramentas e visualizações específicas para sua área de atuação.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
