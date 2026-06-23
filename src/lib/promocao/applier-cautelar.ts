import type { PromocaoCautelarRepo } from "./repo-cautelar";
import type { AcaoPromocaoCautelar } from "./tipos-cautelar";

/**
 * IO fino: executa um plano (`AcaoPromocaoCautelar[]`) para um processo via
 * repositório injetado. Toda decisão mora no planejador puro; o applier só
 * executa. Ao fim, marca `processos.cautelares_promovidas_em`.
 *
 * Conservador — NUNCA cria entrada na taxonomia:
 *   - vincular            → cria cautelaresDecisao (origem='promocao') + log;
 *   - sem-correspondencia → só loga (para revisão manual);
 *   - ignorar             → só loga (idempotência / soberania manual).
 */
export async function aplicarAcoesCautelar(
  repo: PromocaoCautelarRepo,
  processoId: number,
  acoes: AcaoPromocaoCautelar[],
): Promise<void> {
  for (const a of acoes) {
    if (a.tipo === "vincular") {
      const id = await repo.criarCautelar(
        processoId,
        { codigo: a.codigo, especie: a.especie, artigo: a.artigo },
        a.candidato,
      );
      await repo.log(processoId, "vincular", a.candidato, id);
    } else if (a.tipo === "sem-correspondencia") {
      await repo.log(processoId, "sem-correspondencia", a.candidato, null);
    } else {
      // ignorar
      await repo.log(processoId, "ignorar", a.candidato, null);
    }
  }
  await repo.marcarPromovido(processoId);
}
