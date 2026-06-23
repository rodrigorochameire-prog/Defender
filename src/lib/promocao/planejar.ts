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
    if (r.acao === "revisar") return { tipo: "revisar", candidato, candidatosIds: r.candidatosIds };
    // vincular: checar participação existente (idempotência + soberania manual)
    const ja = participacoes.find(
      (p) => p.pessoaId === r.pessoaId && p.processoId === processoId && p.papel === candidato.papel,
    );
    if (ja?.origem === "manual") return { tipo: "ignorar", candidato, motivo: "participação manual" };
    return { tipo: "vincular", candidato, pessoaId: r.pessoaId, atualizar: !!ja };
  });
}
