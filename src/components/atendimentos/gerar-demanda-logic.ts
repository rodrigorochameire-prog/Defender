// Lógica pura do fluxo "Gerar demanda a partir do atendimento" (Fase 5).
// Sem React/tRPC — testável e reutilizável pelo popover/painel e pelo futuro
// ProceduralActSelector. O payload de createFromForm permanece no componente
// (depende do tipo de input do tRPC) até a migração popover→painel.

import { htmlParaTexto } from "./html-para-texto";
import { ATRIBUICAO_DEMANDA_OPTIONS } from "./config";
import { getAtoOptionsAgrupados } from "@/config/atos-por-atribuicao";

/** Rascunho de registro inicial a partir do que foi colhido no atendimento (HTML limpo). */
export function montarRegistroDoAtendimento(
  ctx: { assunto?: string | null; pedido?: string | null; conteudo?: string | null } | null | undefined,
): string {
  if (!ctx) return "";
  const assunto = htmlParaTexto(ctx.assunto);
  const pedido = htmlParaTexto(ctx.pedido);
  const conteudo = htmlParaTexto(ctx.conteudo);
  return [assunto && `Assunto: ${assunto}`, pedido && `Pedido: ${pedido}`, conteudo || ""]
    .filter(Boolean)
    .join("\n");
}

/** Enum de atribuição → rótulo do catálogo de atos (fallback "Criminal Geral"). */
export function atribuicaoAtosLabel(atribuicao: string): string {
  return ATRIBUICAO_DEMANDA_OPTIONS.find((o) => o.value === atribuicao)?.atosLabel ?? "Criminal Geral";
}

export interface AtoGroup {
  group: string;
  options: { value: string; label: string }[];
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Atos da atribuição agrupados por categoria, com busca acento/caixa-insensível.
 * Query vazia → todos os grupos na ordem do catálogo. Grupos sem match são omitidos.
 */
export function filtrarAtos(atribuicaoEnum: string, query: string): AtoGroup[] {
  const flat = getAtoOptionsAgrupados(atribuicaoAtosLabel(atribuicaoEnum)); // já ordenado por categoria
  const q = normalizar(query);
  const filtrados = q ? flat.filter((a) => normalizar(a.label).includes(q)) : flat;

  const grupos: AtoGroup[] = [];
  const indice = new Map<string, number>();
  for (const a of filtrados) {
    let i = indice.get(a.group);
    if (i === undefined) {
      i = grupos.length;
      indice.set(a.group, i);
      grupos.push({ group: a.group, options: [] });
    }
    grupos[i].options.push({ value: a.value, label: a.label });
  }
  return grupos;
}
