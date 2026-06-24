// Semântica visual do módulo Atendimentos (camada de apresentação).
//
// Régua de badges da spec do redesign: por item, 1 badge FORTE (status) +
// 1 badge SUTIL opcional (readiness) + o resto em TEXTO. Aqui ficam os helpers
// específicos do módulo:
//  - `metadataLine`  → área + tipo como texto secundário (nunca badge forte).
//  - `resolveReadiness` → o badge sutil opcional (contexto/dossiê preparado).
//
// O STATUS operacional (forte) é a fonte única central em
// `@/lib/config/tipologia/atendimento` — re-exportado aqui para que os
// componentes do módulo importem tudo de um só lugar.

import { AREA_CONFIG, SUBTIPO_CONFIG, type DossieAtendimento } from "./config";

export {
  ATENDIMENTO_STATUS_CONFIG,
  resolveStatusAtendimento,
  statusAtendimentoInfo,
  type AtendimentoStatusSemantico,
  type AtendimentoStatusVisual,
  type AtendimentoTone,
} from "@/lib/config/tipologia/atendimento";

/**
 * Linha de metadados "Área · Tipo" (ex.: "Violência Doméstica · Inicial").
 * Área e tipo são taxonomia — vão para tipografia secundária, nunca para um
 * badge forte. Omite partes ausentes; sem nenhuma das duas retorna "".
 */
export function metadataLine(item: { area: string | null; subtipo: string | null }): string {
  const areaLabel = item.area ? AREA_CONFIG[item.area]?.label ?? null : null;
  const tipoLabel = item.subtipo ? SUBTIPO_CONFIG[item.subtipo]?.label ?? null : null;
  return [areaLabel, tipoLabel].filter(Boolean).join(" · ");
}

export interface Readiness {
  label: string;
}

/**
 * Badge sutil de prontidão: indica que o atendimento já tem contexto jurídico
 * preparado. `skill` (dossiê dos autos) é mais rico que `ombuds` (contexto
 * automático), por isso o rótulo difere. Sem dossiê → null (não renderiza).
 */
export function resolveReadiness(item: {
  dossieAtendimento: Pick<DossieAtendimento, "fonte"> | null | undefined;
}): Readiness | null {
  if (!item.dossieAtendimento) return null;
  return { label: item.dossieAtendimento.fonte === "skill" ? "Dossiê preparado" : "Contexto preparado" };
}
