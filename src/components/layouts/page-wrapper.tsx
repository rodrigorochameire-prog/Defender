"use client";

import { type LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

/**
 * PageWrapper - Layout Universal para TODAS as páginas
 * 
 * Minimalismo Institucional: Estrutura consistente que cria
 * a sensação de "estar no mesmo aplicativo".
 * 
 * Uso:
 * ```tsx
 * <PageWrapper
 *   title="Assistidos"
 *   description="Gerencie seus assistidos..."
 *   icon={Users}
 *   actions={<Button>Nova Pessoa</Button>}
 * >
 *   {children}
 * </PageWrapper>
 * ```
 */

interface PageWrapperProps {
  children: ReactNode;
  /** Título da página (H1) */
  title: string;
  /** Descrição curta abaixo do título */
  description?: string;
  /** Ícone ao lado do título */
  icon?: LucideIcon;
  /** Botões de ação no canto direito */
  actions?: ReactNode;
  /** Breadcrumbs de navegação */
  breadcrumbs?: Array<{ label: string; href?: string }>;
  /** Classe adicional */
  className?: string;
  /** Largura máxima (default: 1600px) */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  "2xl": "max-w-[1600px]",
  full: "max-w-full",
};

export function PageWrapper({
  children,
  title,
  description,
  icon: Icon,
  actions,
  breadcrumbs,
  className,
  maxWidth = "2xl",
}: PageWrapperProps) {
  return (
    <div className={cn("flex flex-col space-y-6", className)}>
      {/* Breadcrumbs (se existir) */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}

      {/* Header da Página - Sempre consistente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-serif font-semibold text-stone-900 dark:text-stone-100 tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Conteúdo da Página */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
