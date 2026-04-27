"use client";

import { Badge } from "@/components/ui/badge";
import { Check, XCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Depoente } from "../types";

// ─────────────────────────────────────────────
// Constants — compartilhados entre sheet, briefing, depoentes e histórico
// ─────────────────────────────────────────────

export const STATUS_INTIMACAO_MAP: Record<string, { label: string; class: string }> = {
  "intimado":                      { label: "Intimado",          class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "intimado-pessoalmente":         { label: "Intimado pessoal.", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "intimado-advogado":             { label: "Int. advogado",     class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  "intimado-edital":               { label: "Int. edital",       class: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  "nao-intimado":                  { label: "Não intimado",      class: "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" },
  "sem-diligencia":                { label: "Sem diligência",    class: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  "frustrada":                     { label: "Frustrada",         class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "frustrada-nao-localizado":      { label: "Não localizado",    class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "frustrada-endereco-incorreto":  { label: "End. incorreto",    class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "frustrada-mudou":               { label: "Mudou",             class: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  "mp-desistiu":                   { label: "MP desistiu",       class: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  "dispensado":                    { label: "Dispensado",        class: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  "pendente":                      { label: "Pendente",          class: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" },
};

export const JA_OUVIDO_MAP: Record<string, { label: string; class: string }> = {
  "nenhum":             { label: "1ª vez",      class: "bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400" },
  "delegacia":          { label: "Ouvido DP",   class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  "audiencia-anterior": { label: "Ouvido AIJ",  class: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  "juizo-anterior":     { label: "Ouvido juízo",class: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  "ambos":              { label: "DP + juízo",  class: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
};

export const LADO_MAP: Record<string, { label: string; class: string }> = {
  "acusacao": { label: "Acusação", class: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-300 dark:border-rose-800" },
  "defesa":   { label: "Defesa",   class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800" },
};

// ─────────────────────────────────────────────
// Resolve status (lida com legacy `intimado: boolean`)
// ─────────────────────────────────────────────

export function resolveStatusIntimacao(dep: Partial<Depoente> | any): keyof typeof STATUS_INTIMACAO_MAP | null {
  if (dep?.statusIntimacao && STATUS_INTIMACAO_MAP[dep.statusIntimacao]) return dep.statusIntimacao;
  if (dep?.intimado === true) return "intimado";
  if (dep?.intimado === false) return "nao-intimado";
  return null;
}

// ─────────────────────────────────────────────
// DepoenteStatusBadges — chips compactos em linha
// Modo "compact" = só status + presença (listas densas)
// Modo "full"    = lado + status + ouvido + presença (cards de leitura)
// ─────────────────────────────────────────────

interface DepoenteStatusBadgesProps {
  dep: Partial<Depoente> | any;
  variant?: "compact" | "full";
  className?: string;
}

export function DepoenteStatusBadges({ dep, variant = "full", className }: DepoenteStatusBadgesProps) {
  const status = resolveStatusIntimacao(dep);
  const lado = dep?.lado;
  const jaOuvido = dep?.jaOuvido;
  const presente = dep?.presente;

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", className)}>
      {variant === "full" && lado && LADO_MAP[lado] && (
        <Badge className={cn("text-[9px] px-1.5 py-0 border-0", LADO_MAP[lado].class)}>
          {LADO_MAP[lado].label}
        </Badge>
      )}
      {status && (
        <Badge className={cn("text-[9px] px-1.5 py-0 border-0 inline-flex items-center gap-0.5", STATUS_INTIMACAO_MAP[status].class)}>
          <Mail className="w-2.5 h-2.5" />
          {STATUS_INTIMACAO_MAP[status].label}
        </Badge>
      )}
      {variant === "full" && jaOuvido && jaOuvido !== "nenhum" && JA_OUVIDO_MAP[jaOuvido] && (
        <Badge className={cn("text-[9px] px-1.5 py-0 border-0", JA_OUVIDO_MAP[jaOuvido].class)}>
          {JA_OUVIDO_MAP[jaOuvido].label}
        </Badge>
      )}
      {presente !== undefined && presente !== null && (
        <Badge className={cn(
          "text-[9px] px-1.5 py-0 border-0 inline-flex items-center gap-0.5",
          presente
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
        )}>
          {presente ? <><Check className="w-2.5 h-2.5" />Presente</> : <><XCircle className="w-2.5 h-2.5" />Ausente</>}
        </Badge>
      )}
    </div>
  );
}
