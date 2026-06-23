import { resolverCautelar } from "./resolver-cautelar";
import type {
  AcaoPromocaoCautelar,
  CandidatoCautelar,
  CautelarExistente,
} from "./tipos-cautelar";

/**
 * Planejador PURO de promoção de cautelares. Para cada candidato:
 *   - resolve contra a taxonomia (vincular | sem-correspondencia);
 *   - se vincular e já existir decisão cautelar (QUALQUER origem — parser,
 *     manual, claude, promocao) para o mesmo (processoId, codigo) → ignorar
 *     (idempotência + não duplica parser/manual);
 *   - senão → vincular;
 *   - sem-correspondencia → passa adiante (só será logado).
 *
 * Idempotência por (processoId, codigo). Diferente de delitos (que dedup por
 * delitoId+qualificadoras), aqui o código já é a granularidade da medida.
 */
export function planejarCautelares(args: {
  processoId: number;
  candidatos: CandidatoCautelar[];
  existentes: CautelarExistente[];
}): AcaoPromocaoCautelar[] {
  const { processoId, candidatos, existentes } = args;

  return candidatos.map((candidato) => {
    const r = resolverCautelar(candidato);
    if (r.acao === "sem-correspondencia") {
      return { tipo: "sem-correspondencia", candidato };
    }

    const existente = existentes.find(
      (c) => c.processoId === processoId && c.codigo === r.codigo,
    );
    if (existente) {
      const motivo =
        existente.origem === "manual"
          ? "decisão manual (soberania)"
          : `já existe (origem=${existente.origem})`;
      return { tipo: "ignorar", candidato, codigo: r.codigo, motivo };
    }

    return { tipo: "vincular", candidato, codigo: r.codigo, especie: r.especie, artigo: r.artigo };
  });
}
