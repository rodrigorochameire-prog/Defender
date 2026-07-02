// src/components/layouts/header/header-actions-bar.tsx
"use client";

import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { HEADER_GLASS } from "@/lib/config/design-tokens";
import { computeVisibleActions } from "./overflow-logic";

export interface HeaderAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  /**
   * Maior prioridade fica mais tempo na barra.
   * Infinity = nunca colapsa. 0 = nasce no "…" (nunca aparece na barra).
   */
  priority: number;
  /** "primary" = botão sólido emerald (reservado ao + Novo). */
  variant?: "ghost" | "primary";
  /** Handler do clique — usado na barra E no item do "…". */
  onSelect?: () => void;
  /**
   * Render custom na barra (input de busca, dropdown próprio).
   * ATENÇÃO: sem `onSelect`/`overflowItems`, a action NÃO aparece no menu "…"
   * quando colapsa (evita item morto) — dê um onSelect que abra o equivalente
   * sempre que existir. NUNCA use `render: cond && jsx` (inclusão condicional
   * é via spread no array).
   */
  render?: ReactNode;
  /** Só ícone na barra; o label vira title/aria-label. */
  hideLabel?: boolean;
  /** Grupo no "…" — separador entre grupos distintos. */
  group?: string;
  /** Itens alternativos no "…" (ex.: as 3 opções de visualização). */
  overflowItems?: Array<{ id: string; label: string; icon?: LucideIcon; onSelect: () => void }>;
}

const OVERFLOW_RESERVE = 40; // largura do botão "…" + gap
const ITEM_GAP_PX = 6; // = gap-1.5 usado no container visível e na régua de medição

function BarButton({ action }: { action: HeaderAction }) {
  if ("render" in action) return action.render ? <>{action.render}</> : null;
  const Icon = action.icon;
  return (
    <button
      type="button"
      onClick={action.onSelect}
      title={action.label}
      aria-label={action.label}
      className={cn(
        action.variant === "primary" ? HEADER_GLASS.primaryBtn : HEADER_GLASS.ghostBtn,
        action.variant !== "primary" && (action.hideLabel ? "w-9 md:w-8" : "px-2.5 text-[11px] font-semibold"),
        "shrink-0",
      )}
    >
      {Icon && <Icon className="w-[15px] h-[15px]" />}
      {!action.hideLabel && <span>{action.label}</span>}
    </button>
  );
}

export function HeaderActionsBar({
  actions,
  className,
}: {
  actions: HeaderAction[];
  className?: string;
}) {
  // Candidatos à barra: priority > 0. Os de priority 0 moram no "…".
  const barCandidates = actions.filter((a) => a.priority > 0);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleIds, setVisibleIds] = useState<string[] | null>(null);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;
    const children = Array.from(measure.children) as HTMLElement[];
    if (children.length !== barCandidates.length) return;
    const items = children.map((el, i) => ({
      id: barCandidates[i].id,
      priority: barCandidates[i].priority,
      width: el.offsetWidth + ITEM_GAP_PX,
    }));
    // O "…" é SEMPRE renderizado quando há alguma action com priority <= 0
    // (elas nascem direto no overflow). Nesse caso a reserva já deve ser
    // subtraída do espaço disponível de antemão — computeVisibleActions não
    // deve subtraí-la de novo (reserve=0), senão o "…" perde largura em dobro.
    const hasPermanentOverflow = actions.some((a) => a.priority <= 0);
    const { visibleIds: ids } = computeVisibleActions(
      items,
      hasPermanentOverflow ? container.offsetWidth - OVERFLOW_RESERVE : container.offsetWidth,
      hasPermanentOverflow ? 0 : OVERFLOW_RESERVE,
    );
    setVisibleIds(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useLayoutEffect(() => {
    recompute();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recompute);
    ro.observe(container);
    return () => ro.disconnect();
  }, [recompute]);

  const isVisible = (a: HeaderAction) =>
    a.priority > 0 && (visibleIds === null || visibleIds.includes(a.id));
  const visible = actions.filter(isVisible);
  // Actions com `render` mas sem `onSelect` nem `overflowItems` não têm
  // equivalente clicável no menu "…" — ficam de fora para não virar item
  // morto quando colapsam (ver JSDoc de `render` em HeaderAction).
  const overflow = actions.filter(
    (a) => !isVisible(a) && !(a.render && !a.onSelect && !a.overflowItems),
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-1 items-center justify-end gap-1.5 min-w-0", className)}
    >
      {/* Régua de medição invisível — todos os candidatos, sempre montados */}
      <div
        ref={measureRef}
        aria-hidden
        inert
        className="absolute -top-[999px] left-0 flex items-center gap-1.5 invisible pointer-events-none"
      >
        {barCandidates.map((a) => (
          <span key={a.id} className="inline-flex shrink-0">
            <BarButton action={a} />
          </span>
        ))}
      </div>

      {visible.map((a) => (
        <Fragment key={a.id}>
          <BarButton action={a} />
        </Fragment>
      ))}

      {overflow.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Mais opções"
              aria-label="Mais opções"
              className={cn(HEADER_GLASS.ghostBtn, "w-9 md:w-8 shrink-0")}
            >
              <MoreHorizontal className="w-[15px] h-[15px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {overflow.map((a, i) => {
              const prev = overflow[i - 1];
              const needsSeparator = i > 0 && prev.group !== a.group;
              const Icon = a.icon;
              return (
                <Fragment key={a.id}>
                  {needsSeparator && <DropdownMenuSeparator />}
                  {a.overflowItems ? (
                    a.overflowItems.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <DropdownMenuItem key={sub.id} onClick={sub.onSelect}>
                          {SubIcon && <SubIcon className="w-4 h-4 mr-2" />}
                          {sub.label}
                        </DropdownMenuItem>
                      );
                    })
                  ) : (
                    <DropdownMenuItem onClick={a.onSelect}>
                      {Icon && <Icon className="w-4 h-4 mr-2" />}
                      {a.label}
                    </DropdownMenuItem>
                  )}
                </Fragment>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
