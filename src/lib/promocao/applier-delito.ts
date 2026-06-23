import type { PromocaoDelitoRepo } from "./repo-delito";
import type { AcaoPromocaoDelito } from "./tipos-delito";

/**
 * IO fino: executa um plano (`AcaoPromocaoDelito[]`) para um processo via
 * repositório injetado. Toda decisão mora no planejador puro; o applier só
 * executa. Ao fim, marca `processos.delitos_promovidos_em`.
 *
 * Conservador — NUNCA cria entrada no catálogo:
 *   - vincular            → cria tipificação (origem='promocao') + log;
 *   - sem-correspondencia → só loga (para revisão manual);
 *   - ignorar             → só loga (idempotência / soberania manual).
 */
export async function aplicarAcoesDelito(
  repo: PromocaoDelitoRepo,
  processoId: number,
  acoes: AcaoPromocaoDelito[],
): Promise<void> {
  for (const a of acoes) {
    if (a.tipo === "vincular") {
      const id = await repo.criarTipificacao(processoId, a.delitoId, a.candidato);
      await repo.log(processoId, "vincular", a.candidato, id);
    } else if (a.tipo === "sem-correspondencia") {
      await repo.log(processoId, "sem-correspondencia", a.candidato, null);
    } else {
      // ignorar
      await repo.log(processoId, "ignorar", a.candidato, a.delitoId);
    }
  }
  await repo.marcarPromovido(processoId);
}
