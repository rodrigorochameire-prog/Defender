import { resolverIdentidade } from "./resolver-identidade";
import type { AcaoPromocao, CandidatoPessoa, ParticipacaoExistente, PessoaExistente } from "./tipos";

export function planejarPromocao(args: {
  processoId: number;
  candidatos: CandidatoPessoa[];
  existentes: PessoaExistente[];
  participacoes: ParticipacaoExistente[];
}): AcaoPromocao[] {
  const { processoId, candidatos, existentes, participacoes } = args;
  return candidatos.map((candidato) => {
    const r = resolverIdentidade(candidato, existentes);
    if (r.acao === "criar") return { tipo: "criar", candidato };
    if (r.acao === "revisar") {
      // Idempotência (caminho crítico): em re-análise, um candidato só-nome casa
      // por nome com a pessoa provisória que ELE mesmo criou numa rodada anterior.
      // Se algum dos matches já tem participação de promoção neste processo+papel,
      // este candidato já foi promovido — ignora em vez de re-criar provisória.
      // (Tradeoff consciente: dois homônimos reais no mesmo processo+papel seriam
      // conflados; é raríssimo e preferível à explosão de duplicatas por rodada.)
      const jaPromovido = r.candidatosIds.some((id) =>
        participacoes.some(
          (p) =>
            p.pessoaId === id &&
            p.processoId === processoId &&
            p.papel === candidato.papel &&
            p.origem === "promocao",
        ),
      );
      if (jaPromovido) return { tipo: "ignorar", candidato, motivo: "já promovido (revisão prévia)" };
      return { tipo: "revisar", candidato, candidatosIds: r.candidatosIds };
    }
    // vincular: checar participação existente (idempotência + soberania manual)
    const ja = participacoes.find(
      (p) => p.pessoaId === r.pessoaId && p.processoId === processoId && p.papel === candidato.papel,
    );
    if (ja?.origem === "manual") return { tipo: "ignorar", candidato, motivo: "participação manual" };
    return { tipo: "vincular", candidato, pessoaId: r.pessoaId, atualizar: !!ja };
  });
}
