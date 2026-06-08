// Reconciliação de pauta importada: quando uma audiência é *redesignada*
// (mesmo processo, NOVA data), o importBatch INSERE o slot novo mas não
// supersede o slot antigo — a linha "agendada" antiga fica fantasma na agenda.
// Este helper calcula, de forma PURA (sem DB), quais audiências existentes
// devem ser marcadas como "redesignada".
//
// A janela (windowStart..windowEnd) é o intervalo de datas da própria pauta
// importada. O escopo é PROPOSITAL: só superamos fantasmas DENTRO da janela
// da pauta, para que uma pauta parcial nunca apague audiências fora do seu
// intervalo de datas.

export interface ExistingAud {
  id: number;
  processoId: number | null;
  dataAudiencia: Date;
  status: string;
}

export interface ReconcileInput {
  existing: ExistingAud[];
  touchedProcessoIds: Set<number>;
  touchedAudienciaIds: Set<number>;
  windowStart: Date;
  windowEnd: Date;
}

/** Ids de audiências a marcar como redesignada (slots velhos superados pela pauta importada, dentro da janela). */
export function idsParaSuperar(input: ReconcileInput): number[] {
  return input.existing
    .filter((a) => a.processoId != null && input.touchedProcessoIds.has(a.processoId))
    .filter((a) => !input.touchedAudienciaIds.has(a.id))
    .filter((a) => a.status === "agendada")
    .filter((a) => a.dataAudiencia >= input.windowStart && a.dataAudiencia <= input.windowEnd)
    .map((a) => a.id);
}
