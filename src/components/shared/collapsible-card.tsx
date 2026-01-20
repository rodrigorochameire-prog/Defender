"use client";

import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  number?: number; // Para numeração de seções
}

export function CollapsibleCard({
  title,
  subtitle,
  icon,
  badge,
  children,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
  number,
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader
        className={cn(
          "cursor-pointer select-none transition-colors hover:bg-muted/30",
          "flex flex-row items-center justify-between space-y-0 py-4",
          headerClassName
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          {/* Número da seção */}
          {number !== undefined && (
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary text-sm font-bold">
              {number}
            </div>
          )}
          
          {/* Ícone */}
          {icon && !number && (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
              {icon}
            </div>
          )}

          {/* Título e subtítulo */}
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badge}
          <ChevronDown
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </CardHeader>

      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className={cn("pt-0 pb-5", contentClassName)}>
            <div className="border-t pt-4">{children}</div>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

// Grupo de cards colapsáveis numerados
interface CollapsibleCardGroupProps {
  children: ReactNode;
  className?: string;
}

export function CollapsibleCardGroup({ children, className }: CollapsibleCardGroupProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {children}
    </div>
  );
}
