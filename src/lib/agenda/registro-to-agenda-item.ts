// src/lib/agenda/registro-to-agenda-item.ts
//
// Mapper puro: converte um registro agendado (com processo/assistido joinados)
// para AgendaItem. Sem dependências de React ou estado — seguro para testar
// em Node puro (vitest).

import { format } from "date-fns";
import { getAtribuicaoColors } from "@/lib/config/atribuicoes";
import { mapAtribuicaoToKey } from "./atribuicao-key";
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

/** Chave sentinela usada quando não há processo vinculado ao registro. */
const ATRIBUICAO_NEUTRO = "NEUTRO";

export function registroAgendadoToAgendaItem(r: RegistroAgendado): AgendaItem {
  const d = new Date(r.dataRegistro);
  const dataFormatada = format(d, "yyyy-MM-dd");

  const atribuicaoKey = r.processo
    ? mapAtribuicaoToKey(r.processo.atribuicao, r.processo.area)
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
