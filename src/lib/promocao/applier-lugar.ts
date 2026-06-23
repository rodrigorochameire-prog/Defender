import type { PromocaoLugarRepo } from "./repo-lugar";
import type { AcaoPromocaoLugar } from "./tipos-lugar";

/**
 * IO fino: executa um plano (`AcaoPromocaoLugar[]`) para um processo via
 * repositório injetado. Toda decisão mora no planejador puro; o applier só
 * executa. Ao fim, marca `processos.lugares_promovidos_em`.
 *
 *   - criar    → cria lugar + participação + log;
 *   - vincular → cria participação (lugar já existe) + log;
 *   - ignorar  → só loga (idempotência / soberania manual).
 */
export async function aplicarAcoesLugar(
  repo: PromocaoLugarRepo,
  processoId: number,
  workspaceId: number,
  acoes: AcaoPromocaoLugar[],
): Promise<void> {
  for (const a of acoes) {
    if (a.tipo === "criar") {
      const id = await repo.criarLugar(a.candidato, workspaceId);
      await repo.inserirParticipacao(processoId, id, a.candidato);
      await repo.log(processoId, "criar", a.candidato, id);
    } else if (a.tipo === "vincular") {
      await repo.inserirParticipacao(processoId, a.lugarId, a.candidato);
      await repo.log(processoId, "vincular", a.candidato, a.lugarId);
    } else {
      // ignorar
      await repo.log(processoId, "ignorar", a.candidato, a.lugarId);
    }
  }
  await repo.marcarPromovido(processoId);
}
