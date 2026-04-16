"use client";

import { Label } from "@/components/ui/label";
import { BookOpen, Target, Quote, Eye, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDepoenteStyle } from "../constants";
import { DepoenteStatusBadges } from "./depoente-status";

// ─────────────────────────────────────────────
// InfoBlock — card padronizado com borda colorida + label
// Usado para Resultado, Manifestações, Decisões, Encaminhamentos, Anotações
// ─────────────────────────────────────────────

export function InfoBlock({
  icon: Icon,
  label,
  borderColor,
  children,
}: {
  icon?: any;
  label: string;
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 p-3">
      <div className={`border-l-4 ${borderColor} pl-3 -ml-2`}>
        <Label className="text-xs font-semibold mb-0.5 block text-neutral-700 dark:text-neutral-300 inline-flex items-center gap-1.5">
          {Icon && <Icon className="w-3 h-3" />}
          {label}
        </Label>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// DepoenteField — sub-bloco dentro do DepoenteCard
// ─────────────────────────────────────────────

function DepoenteField({ icon: Icon, label, text }: { icon: any; label: string; text: string }) {
  return (
    <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 p-2">
      <Label className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1 mb-1">
        <Icon className="w-2.5 h-2.5" /> {label}
      </Label>
      <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// DepoenteCard — card rico unificado (usado em Briefing, Sheet e Histórico)
// Campos sem valor são ocultados automaticamente.
// ─────────────────────────────────────────────

interface DepoenteCardProps {
  dep: any;
  /** "compact" omite campos extensos (depoimento literal, análise) — use no Sheet lateral */
  variant?: "compact" | "full";
  className?: string;
}

export function DepoenteCard({ dep, variant = "full", className }: DepoenteCardProps) {
  const style = getDepoenteStyle(dep.tipo);
  const nome = dep.nome ?? dep.name ?? "Sem nome";
  const resumoPreparacao = dep.resumo ?? dep.depoimentoDelegacia ?? dep.versao_delegacia ?? null;

  const hasPreparacao =
    dep.depoimentoDelegacia || dep.depoimentoAnterior ||
    dep.pontosFortes || dep.pontosFracos ||
    dep.estrategiaInquiricao || dep.perguntasDefesa ||
    dep.pontosFavoraveis || dep.pontosDesfavoraveis || dep.perguntasSugeridas;

  const hasRegistro = dep.depoimentoLiteral || dep.analisePercepcoes;

  const temConteudo = hasPreparacao || hasRegistro;

  // Compat: análise IA usa pontosFavoraveis/pontosDesfavoraveis/perguntasSugeridas,
  // registro manual usa pontosFortes/pontosFracos/estrategiaInquiricao. Aceita ambos.
  const pontosFortes = dep.pontosFortes ?? dep.pontosFavoraveis ?? null;
  const pontosFracos = dep.pontosFracos ?? dep.pontosDesfavoraveis ?? null;
  const estrategia = dep.estrategiaInquiricao ?? dep.perguntasSugeridas ?? null;
  const depoimentoDelegacia = dep.depoimentoDelegacia ?? (dep.resumo && !dep.resumo.startsWith(dep.vinculo ?? "") ? dep.resumo : null);

  return (
    <div className={cn("rounded-lg border overflow-hidden", style.border, className)}>
      {/* Header */}
      <div className={cn("p-2.5 border-b border-neutral-200 dark:border-neutral-800", style.bg)}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", style.bg, style.text)}>
              {style.label}
            </span>
            <span className={cn("text-sm font-semibold truncate", style.text)}>{nome}</span>
          </div>
          <DepoenteStatusBadges dep={dep} variant="full" />
        </div>
        {/* Vínculo */}
        {dep.vinculo && (
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 pl-0.5">
            <span className="font-semibold">Vínculo:</span> {dep.vinculo}
          </p>
        )}
      </div>

      {/* Teor da certidão — visível logo abaixo do header quando presente */}
      {dep.teorCertidao && (
        <div className="px-3 pt-2.5 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/60 dark:border-amber-800/40">
          <Label className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
            <FileWarning className="w-2.5 h-2.5" />
            Teor da certidão {dep.dataCertidao ? `(${dep.dataCertidao})` : ""}
          </Label>
          <p className="text-xs text-amber-900 dark:text-amber-200 pb-2.5 leading-relaxed whitespace-pre-wrap italic">
            &ldquo;{dep.teorCertidao}&rdquo;
          </p>
        </div>
      )}

      {/* Content */}
      {temConteudo && (
        <div className="p-3 space-y-2 bg-white dark:bg-neutral-950">
          {/* Relatos anteriores */}
          {depoimentoDelegacia && (
            <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-2">
              <Label className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-1 block">
                Relato na Delegacia
              </Label>
              <p className={cn("text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap", variant === "compact" && "line-clamp-3")}>
                {depoimentoDelegacia}
              </p>
            </div>
          )}
          {dep.depoimentoAnterior && (
            <div className="rounded-lg bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/40 p-2">
              <Label className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 mb-1 block">
                Audiência Anterior
              </Label>
              <p className={cn("text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap", variant === "compact" && "line-clamp-3")}>
                {dep.depoimentoAnterior}
              </p>
            </div>
          )}

          {/* Pontos fortes / fracos */}
          {(pontosFortes || pontosFracos) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {pontosFortes && (
                <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-2">
                  <Label className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1 block">
                    Pontos Fortes
                  </Label>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{pontosFortes}</p>
                </div>
              )}
              {pontosFracos && (
                <div className="rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 p-2">
                  <Label className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mb-1 block">
                    Pontos Fracos
                  </Label>
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{pontosFracos}</p>
                </div>
              )}
            </div>
          )}

          {/* Estratégia / Perguntas */}
          {estrategia && <DepoenteField icon={Target} label="Estratégia de Inquirição" text={estrategia} />}
          {dep.perguntasDefesa && <DepoenteField icon={BookOpen} label="Perguntas da Defesa" text={dep.perguntasDefesa} />}

          {/* Registro pós-audiência (só se variant=full) */}
          {variant === "full" && dep.depoimentoLiteral && (
            <div className="bg-neutral-50/50 dark:bg-neutral-900/30 rounded-lg border border-neutral-200/80 dark:border-neutral-800/80 p-2">
              <Label className="text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 flex items-center gap-1 mb-1">
                <Quote className="w-2.5 h-2.5" /> Depoimento Literal (Audiência)
              </Label>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed italic whitespace-pre-wrap">
                &ldquo;{dep.depoimentoLiteral}&rdquo;
              </p>
            </div>
          )}
          {variant === "full" && dep.analisePercepcoes && (
            <DepoenteField icon={Eye} label="Análise e Percepções" text={dep.analisePercepcoes} />
          )}
        </div>
      )}
    </div>
  );
}
