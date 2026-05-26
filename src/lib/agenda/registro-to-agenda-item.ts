// src/lib/agenda/registro-to-agenda-item.ts
//
// Mapper puro: converte um registro agendado (com processo/assistido joinados)
// para AgendaItem. Sem dependências de React ou estado — seguro para testar
// em Node puro (vitest).

import { format } from "date-fns";
import { normalizeAreaToFilter, getAtribuicaoColors } from "@/lib/config/atribuicoes";
import type { AgendaItem } from "./agenda-item";

export interface RegistroAgendado {
  id: number;
  titulo: string | null;
  assunto: string | null;
  conteudo: string | null;
  local: string | null;
  status: string;
  dataRegistro: string | Date;
  assistido: { id: number; nome: string } | null;
  processo: {
    id: number;
    numeroAutos: string;
    atribuicao: string | null;
    area: string | null;
  } | null;
}

/**
 * Deriva a chave de atribuição a partir dos campos `atribuicao` e `area`
 * do processo. Usa a mesma lógica do helper local em agenda/page.tsx:
 * - Primeiro tenta normalizar pelo valor exato via AREA_TO_FILTER_MAP
 * - Depois faz fallback por substring
 * - Se nenhum casar, retorna "SUBSTITUICAO"
 *
 * Retorna "NEUTRO" quando não há processo vinculado (sentinela para
 * getAtribuicaoColors, que faz fallback para `all`).
 */
function derivarAtribuicaoKey(
  atribuicao: string | null | undefined,
  area: string | null | undefined,
): string {
  const exactMatch = normalizeAreaToFilter(atribuicao) || normalizeAreaToFilter(area);
  if (exactMatch && exactMatch !== "all") return exactMatch;

  if (!atribuicao && !area) return "SUBSTITUICAO";

  const atrib = (atribuicao || area || "").toUpperCase();

  if (atrib.includes("VVD") || atrib.includes("VIOLENCIA") || atrib.includes("DOMESTICA"))
    return "VVD";
  if (atrib.includes("JURI") || atrib.includes("JÚRI")) return "JURI";
  if (atrib.includes("EXECU")) return "EXECUCAO";
  if (atrib.includes("CIVEL") || atrib.includes("FAMILIA") || atrib.includes("FAZENDA"))
    return "SUBSTITUICAO_CIVEL";
  if (atrib.includes("SUBSTITU") || atrib.includes("CRIMINAL")) return "SUBSTITUICAO";

  return "SUBSTITUICAO";
}

/** Chave sentinela usada quando não há processo vinculado ao registro. */
const ATRIBUICAO_NEUTRO = "NEUTRO";

export function registroAgendadoToAgendaItem(r: RegistroAgendado): AgendaItem {
  const d = new Date(r.dataRegistro);
  const dataFormatada = format(d, "yyyy-MM-dd");

  const atribuicaoKey = r.processo
    ? derivarAtribuicaoKey(r.processo.atribuicao, r.processo.area)
    : ATRIBUICAO_NEUTRO;

  // getAtribuicaoColors aceita qualquer string; para NEUTRO retorna a config "all"
  const atribuicaoConfig = getAtribuicaoColors(atribuicaoKey);

  return {
    id: `registro-${r.id}`,
    rawId: r.id,
    titulo: r.titulo || "Atendimento",
    tipo: "atendimento",
    data: dataFormatada,
    horarioInicio: format(d, "HH:mm"),
    horarioFim: "",
    local: r.local || "",
    assistido: r.assistido?.nome || "",
    assistidoId: r.assistido?.id ?? undefined,
    processo: r.processo?.numeroAutos || "",
    processoId: r.processo?.id ?? undefined,
    atribuicao: atribuicaoConfig.label,
    atribuicaoKey,
    status: r.status || "agendado",
    descricao: r.assunto || r.conteudo || "",
    prioridade: "normal",
    recorrencia: "nenhuma",
    lembretes: [],
    tags: [],
    participantes: [],
    observacoes: "",
    documentos: [],
    dataInclusao: new Date().toISOString(),
    fonte: "registros",
  };
}
