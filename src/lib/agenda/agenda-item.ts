import type { RegistroAudienciaData } from "@/components/agenda/registro-audiencia-modal-simples";

export interface AgendaItem {
  /** Id composto para React keys e lookup (ex: "audiencia-179", "calendar-42"). */
  id: string;
  /** Id numérico cru da fonte (audiencias.id, calendar_events.id OU registros.id). Use com `fonte`. */
  rawId: number;
  titulo: string;
  /** Natureza do item para o visual/filtros: "audiencia" | "atendimento" | tipo de evento do calendário. */
  tipo: string;
  /** Ato real da audiência (= audiencias.tipo). Fonte autoritativa da sigla exibida; vence o título. */
  tipoAudiencia?: string | null;
  data: string;
  horarioInicio: string;
  horarioFim: string;
  local: string;
  assistido: string;
  assistidoId?: number | null;
  processo: string;
  processoId?: number | null;
  atribuicao: string;
  atribuicaoKey?: string;
  status: string;
  descricao: string;
  prioridade: string;
  recorrencia: string;
  lembretes: string[];
  tags: string[];
  participantes: string[];
  vinculoDemanda?: string;
  observacoes: string;
  documentos: string[];
  dataInclusao: string;
  responsavel?: string;
  /** Nome do defensor responsável (audiencias.defensor) — usado p/ a etiqueta R/J nos júris da agenda. */
  defensorNome?: string;
  /** Patrocínio do processo (processos.tipo_patrocinio) — sinaliza advogado constituído na agenda. */
  tipoPatrocinio?: "DEFENSORIA" | "PARTICULAR";
  /** Nome/OAB do advogado constituído (processos.advogado_particular). */
  advogadoParticular?: string | null;
  registro?: RegistroAudienciaData;
  fonte?: "audiencias" | "calendar" | "registros";
}
