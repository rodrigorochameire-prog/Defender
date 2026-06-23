import { normalizarNome } from "@/lib/pessoas/normalize";
import type { CandidatoPessoa, PessoaExistente, ResultadoResolucao } from "./tipos";

const soDigitos = (s?: string | null) => (s ?? "").replace(/\D/g, "");

function nomeBate(cand: string, p: PessoaExistente): boolean {
  const n = normalizarNome(cand);
  if (!n) return false;
  return p.nomeNormalizado === n || p.nomesAlternativos.map(normalizarNome).includes(n);
}

export function resolverIdentidade(
  candidato: CandidatoPessoa,
  existentes: PessoaExistente[],
): ResultadoResolucao {
  // 1. CPF
  const cpf = soDigitos(candidato.cpf);
  if (cpf) {
    const porCpf = existentes.find((p) => soDigitos(p.cpf) === cpf);
    if (porCpf) return { acao: "vincular", pessoaId: porCpf.id, confianca: 1.0, motivo: "CPF idêntico" };
  }

  // 2. nome + nascimento
  if (candidato.dataNascimento) {
    const porNomeNasc = existentes.filter(
      (p) => p.dataNascimento === candidato.dataNascimento && nomeBate(candidato.nome, p),
    );
    if (porNomeNasc.length === 1) {
      return { acao: "vincular", pessoaId: porNomeNasc[0].id, confianca: 0.9, motivo: "Nome + nascimento" };
    }
  }

  // 3. nome-só → ambíguo (a desambiguação fica com a merge-queue humana)
  const porNome = existentes.filter((p) => nomeBate(candidato.nome, p));
  if (porNome.length >= 1) {
    return { acao: "revisar", candidatosIds: porNome.map((p) => p.id), confianca: 0.4, motivo: "Nome coincide; ambíguo" };
  }

  // 4. nada
  return { acao: "criar", confianca: candidato.confianca, motivo: "Sem correspondência" };
}
