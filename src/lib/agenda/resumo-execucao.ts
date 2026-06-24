/**
 * Síntese do modo Execução (spec §D): orienta onde o ato está no seu ciclo de
 * vida — concluído ou em aberto — e o que ainda exige ação: pendências em aberto
 * (sinal de atenção, cor = exceção) e gravações disponíveis.
 *
 * Lógica pura/testável; as AÇÕES finais (concluir/redesignar/registrar) seguem
 * no SheetActionFooter, fora deste resumo.
 */

export interface ResumoExecucao {
  concluida: boolean;
  /** Pendências em aberto — atenção quando > 0. */
  pendencias: number;
  /** Gravações/áudios disponíveis para o ato. */
  gravacoes: number;
}

const tamanho = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

export function resumoExecucao(args: {
  jaConcluida?: boolean;
  pendencias?: unknown[];
  midias?: unknown[];
}): ResumoExecucao {
  return {
    concluida: Boolean(args.jaConcluida),
    pendencias: tamanho(args.pendencias),
    gravacoes: tamanho(args.midias),
  };
}
