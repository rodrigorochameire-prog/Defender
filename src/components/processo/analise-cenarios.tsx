// src/components/processo/analise-cenarios.tsx
"use client";

import {
  GitBranch,
  CheckSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TYPO, CARD_STYLE, COLORS } from "@/lib/config/design-tokens";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface Cenario {
  tipo: string;
  descricao: string;
  providencias: string[];
}

interface ProvidenciaItem {
  item: string;
  concluido?: boolean;
}

interface AnaliseCenariosProps {
  cenarios?: Cenario[];
  providencias?: {
    urgentes?: ProvidenciaItem[];
    audiencia?: ProvidenciaItem[];
    pos?: ProvidenciaItem[];
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function cenarioColor(tipo: string): {
  border: string;
  bg: string;
  text: string;
  badgeVariant: "default" | "danger" | "warning";
} {
  const t = tipo.toLowerCase();
  if (t.includes("absolvic"))
    return {
      border: "border-l-emerald-500",
      bg: COLORS.primary.bg,
      text: "text-emerald-700 dark:text-emerald-300",
      badgeVariant: "default",
    };
  if (t.includes("condenac"))
    return {
      border: "border-l-red-500",
      bg: COLORS.danger.bg,
      text: "text-red-700 dark:text-red-300",
      badgeVariant: "danger",
    };
  if (t.includes("desclassific"))
    return {
      border: "border-l-amber-500",
      bg: COLORS.warning.bg,
      text: "text-amber-700 dark:text-amber-300",
      badgeVariant: "warning",
    };
  return {
    border: "border-l-zinc-400",
    bg: COLORS.neutral.bg,
    text: "text-zinc-700 dark:text-zinc-300",
    badgeVariant: "default",
  };
}

// ─────────────────────────────────────────────
// Section: Cenários
// ─────────────────────────────────────────────

function CenariosSection({ cenarios }: { cenarios?: Cenario[] }) {
  if (!cenarios || cenarios.length === 0) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <GitBranch className="h-5 w-5 text-violet-500 shrink-0" />
        Cenarios Possiveis
      </h3>

      <div className="space-y-3">
        {cenarios.map((cenario, i) => {
          const colors = cenarioColor(cenario.tipo);
          return (
            <div
              key={i}
              className={`${CARD_STYLE.highlight} ${colors.border} ${colors.bg} rounded-xl`}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={colors.badgeVariant} className="text-xs">
                  {cenario.tipo}
                </Badge>
              </div>

              {/* Descrição */}
              <p className={`${TYPO.body} mb-3`}>{cenario.descricao}</p>

              {/* Providências do cenário */}
              {cenario.providencias.length > 0 && (
                <div className="border-t border-border/50 pt-3 mt-3">
                  <p className={`${TYPO.label} mb-2`}>Providencias</p>
                  <ul className="space-y-1.5">
                    {cenario.providencias.map((prov, j) => (
                      <li
                        key={j}
                        className={`flex items-start gap-2 ${TYPO.body}`}
                      >
                        <span className={`shrink-0 font-bold leading-snug ${colors.text}`}>
                          -
                        </span>
                        <span className="text-foreground">{prov}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Section: Providências Checklist
// ─────────────────────────────────────────────

function ProvidenciaChecklist({
  title,
  icon: Icon,
  items,
  accentColor,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ProvidenciaItem[];
  accentColor: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`${CARD_STYLE.base} rounded-xl`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`h-4 w-4 ${accentColor} shrink-0`} />
        <span className={`${TYPO.h3} ${accentColor}`}>{title}</span>
      </div>

      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            {/* Visual checkbox */}
            <span
              className={[
                "shrink-0 mt-0.5",
                "h-4 w-4 rounded border-2",
                item.concluido
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-zinc-300 dark:border-border",
                "inline-flex items-center justify-center",
              ].join(" ")}
              aria-hidden="true"
            >
              {item.concluido && (
                <CheckCircle2 className="h-3 w-3 text-white" />
              )}
            </span>
            <span
              className={[
                TYPO.body,
                item.concluido
                  ? "line-through text-muted-foreground"
                  : "",
              ].join(" ")}
            >
              {item.item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProvidenciasSection({
  providencias,
}: {
  providencias?: AnaliseCenariosProps["providencias"];
}) {
  if (!providencias) return null;

  const hasUrgentes = (providencias.urgentes?.length ?? 0) > 0;
  const hasAudiencia = (providencias.audiencia?.length ?? 0) > 0;
  const hasPos = (providencias.pos?.length ?? 0) > 0;

  if (!hasUrgentes && !hasAudiencia && !hasPos) return null;

  return (
    <div>
      <h3 className={`${TYPO.h2} flex items-center gap-2.5 mb-4`}>
        <CheckSquare className="h-5 w-5 text-zinc-500 shrink-0" />
        Providencias
      </h3>

      <div className="space-y-4">
        {hasUrgentes && (
          <ProvidenciaChecklist
            title="Urgentes"
            icon={AlertTriangle}
            items={providencias.urgentes!}
            accentColor="text-red-500"
          />
        )}
        {hasAudiencia && (
          <ProvidenciaChecklist
            title="Em Audiencia"
            icon={Clock}
            items={providencias.audiencia!}
            accentColor="text-amber-500"
          />
        )}
        {hasPos && (
          <ProvidenciaChecklist
            title="Pos-Audiencia"
            icon={CheckCircle2}
            items={providencias.pos!}
            accentColor="text-emerald-500"
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Root Component
// ─────────────────────────────────────────────

export function AnaliseCenarios({
  cenarios,
  providencias,
}: AnaliseCenariosProps) {
  const hasCenarios = cenarios && cenarios.length > 0;
  const hasProvidencias =
    providencias &&
    ((providencias.urgentes?.length ?? 0) > 0 ||
      (providencias.audiencia?.length ?? 0) > 0 ||
      (providencias.pos?.length ?? 0) > 0);

  if (!hasCenarios && !hasProvidencias) {
    return (
      <p className={`${TYPO.body} text-muted-foreground text-center py-8`}>
        Nenhum cenario ou providencia identificada. Execute uma analise para
        gerar cenarios e checklists.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <CenariosSection cenarios={cenarios} />
      <ProvidenciasSection providencias={providencias} />
    </div>
  );
}
