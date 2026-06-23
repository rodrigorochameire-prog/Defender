/**
 * Tipologia de Evento de Processo — usado na timeline viva (documentos/atos
 * classificados pelo enrichment). Centraliza o `TIPO_CONFIG` antes inline em
 * components/processos/TimelineViva.tsx, com rótulos acentuados.
 *
 * Puro: `icone` é NOME (string) que a UI resolve para Lucide.
 */

export interface EventoProcessoVisual {
  label: string;
  /** Nome do ícone Lucide (resolvido na UI). */
  icone: string;
  /** Classe de cor do texto/ícone. */
  color: string;
  /** Classe de cor de fundo do ponto na trilha. */
  dot: string;
}

export const EVENTO_PROCESSO_CONFIG: Record<string, EventoProcessoVisual> = {
  denuncia: { label: "Denúncia", icone: "BookMarked", color: "text-red-500", dot: "bg-red-500" },
  sentenca: { label: "Sentença", icone: "Gavel", color: "text-amber-500", dot: "bg-amber-500" },
  decisao: { label: "Decisão", icone: "Gavel", color: "text-orange-500", dot: "bg-orange-500" },
  despacho: { label: "Despacho", icone: "FileText", color: "text-blue-400", dot: "bg-blue-400" },
  depoimento: { label: "Depoimento", icone: "Users", color: "text-blue-500", dot: "bg-blue-500" },
  laudo: { label: "Laudo", icone: "Microscope", color: "text-purple-500", dot: "bg-purple-500" },
  pericia: { label: "Perícia", icone: "Microscope", color: "text-purple-400", dot: "bg-purple-400" },
  defesa: { label: "Defesa", icone: "ShieldCheck", color: "text-emerald-500", dot: "bg-emerald-500" },
  investigacao: { label: "Investigação", icone: "Shield", color: "text-orange-400", dot: "bg-orange-400" },
  audiencia: { label: "Audiência", icone: "CalendarDays", color: "text-indigo-500", dot: "bg-indigo-500" },
  midia: { label: "Mídia", icone: "Music", color: "text-cyan-500", dot: "bg-cyan-500" },
  documento: {
    label: "Documento",
    icone: "FileText",
    color: "text-neutral-600 dark:text-neutral-400",
    dot: "bg-neutral-400",
  },
};

export const EVENTO_PROCESSO_DEFAULT: EventoProcessoVisual = {
  label: "Outro",
  icone: "HelpCircle",
  color: "text-neutral-600 dark:text-neutral-400",
  dot: "bg-neutral-400",
};

export function eventoProcessoInfo(tipo: string | null | undefined): EventoProcessoVisual {
  if (!tipo) return EVENTO_PROCESSO_DEFAULT;
  return EVENTO_PROCESSO_CONFIG[tipo.toLowerCase()] ?? EVENTO_PROCESSO_DEFAULT;
}
