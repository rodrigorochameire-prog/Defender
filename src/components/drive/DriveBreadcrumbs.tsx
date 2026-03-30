"use client";

import { cn } from "@/lib/utils";
import { useDriveContext } from "./DriveContext";
import { getAtribuicaoByKey } from "./drive-constants";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function DriveBreadcrumbs() {
  const ctx = useDriveContext();

  // Only render when there is something to show
  if (ctx.breadcrumbPath.length === 0 && !ctx.selectedAtribuicao) {
    return null;
  }

  const atribuicao = ctx.selectedAtribuicao
    ? getAtribuicaoByKey(ctx.selectedAtribuicao)
    : null;

  return (
    <div className="flex items-center gap-1 h-9 sm:h-10 px-3 sm:px-4 border-b border-zinc-200/50 dark:border-border/50 bg-zinc-50/50 dark:bg-card/50 shrink-0 overflow-x-auto scrollbar-none">
      {/* ─── Back Button ─── */}
      {ctx.breadcrumbPath.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 mr-1 text-zinc-400 hover:text-zinc-700 dark:text-muted-foreground dark:hover:text-foreground/80 shrink-0"
          onClick={() => ctx.navigateBack()}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* ─── Atribuicao Root ─── */}
      {atribuicao && (
        <>
          <button
            onClick={() => {
              ctx.setSelectedAtribuicao(ctx.selectedAtribuicao);
            }}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-colors duration-150 shrink-0",
              ctx.breadcrumbPath.length === 0
                ? "text-zinc-900 dark:text-foreground cursor-default"
                : "text-zinc-500 hover:text-zinc-900 dark:text-muted-foreground dark:hover:text-foreground cursor-pointer"
            )}
          >
            <span
              className={cn("h-2 w-2 rounded-full shrink-0", atribuicao.dotClass)}
            />
            <span>{atribuicao.label}</span>
          </button>
          {ctx.breadcrumbPath.length > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-300 dark:text-muted-foreground/50 shrink-0 mx-0.5" />
          )}
        </>
      )}

      {/* ─── Path Segments ─── */}
      {ctx.breadcrumbPath.map((segment, index) => {
        const isLast = index === ctx.breadcrumbPath.length - 1;

        return (
          <div key={segment.id} className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => {
                if (!isLast) {
                  ctx.navigateToBreadcrumb(index);
                }
              }}
              className={cn(
                "text-sm transition-colors duration-150 max-w-[200px] truncate",
                isLast
                  ? "text-zinc-900 dark:text-foreground font-medium cursor-default"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-muted-foreground dark:hover:text-foreground cursor-pointer"
              )}
            >
              {segment.name}
            </button>
            {!isLast && (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-300 dark:text-muted-foreground/50 shrink-0 mx-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}
