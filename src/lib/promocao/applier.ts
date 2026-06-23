import type { PromocaoRepo } from "./repo";
import type { AcaoPromocao } from "./tipos";

/**
 * IO fino: executa um plano (`AcaoPromocao[]`) para um processo via repositório
 * injetado. Toda decisão mora no planejador puro; o applier só executa.
 * Ao fim, marca `processos.pessoas_promovidas_em`.
 */
export async function aplicarAcoes(
  repo: PromocaoRepo,
  processoId: number,
  workspaceId: number | null,
  acoes: AcaoPromocao[],
): Promise<void> {
  for (const a of acoes) {
    if (a.tipo === "ignorar") {
      await repo.log(processoId, "ignorar", a.candidato, null, null);
    } else if (a.tipo === "criar") {
      const id = await repo.criarPessoa(a.candidato, "promocao-auto", workspaceId);
      await repo.inserirParticipacao(processoId, id, a.candidato);
      await repo.log(processoId, "criar", a.candidato, id, null);
    } else if (a.tipo === "revisar") {
      const id = await repo.criarPessoa(a.candidato, "promocao-revisao", workspaceId);
      await repo.inserirParticipacao(processoId, id, a.candidato);
      await repo.log(processoId, "revisar", a.candidato, id, a.candidatosIds);
    } else {
      if (a.atualizar) await repo.atualizarParticipacao(processoId, a.pessoaId, a.candidato);
      else await repo.inserirParticipacao(processoId, a.pessoaId, a.candidato);
      await repo.log(processoId, "vincular", a.candidato, a.pessoaId, null);
    }
  }
  await repo.marcarPromovido(processoId);
}
