import { resolverArtigo } from "./resolver-artigo";
import type {
  AcaoPromocaoDelito,
  CandidatoDelito,
  CatalogoDelito,
  TipificacaoExistente,
} from "./tipos-delito";

/** Chave estável de qualificadoras (ordem-insensível) para dedup. */
function chaveQualificadoras(qs: string[]): string {
  return [...qs].map((q) => q.trim().toLowerCase()).sort().join("|");
}

/**
 * Planejador PURO de promoção de delitos. Para cada candidato:
 *   - resolve contra o catálogo (vincular | sem-correspondencia);
 *   - se vincular e já existir tipificação (qualquer origem) para o mesmo
 *     (delitoId, qualificadoras) → ignorar (idempotência + soberania manual);
 *   - senão → vincular;
 *   - sem-correspondencia → ação correspondente (será só logada).
 *
 * Idempotência por (delitoId, conjunto de qualificadoras). Tipificações
 * `manual` são intocáveis: se uma existe para o mesmo par, ignoramos.
 */
export function planejarDelitos(args: {
  processoId: number;
  candidatos: CandidatoDelito[];
  catalogo: CatalogoDelito[];
  tipificacoes: TipificacaoExistente[];
}): AcaoPromocaoDelito[] {
  const { processoId, candidatos, catalogo, tipificacoes } = args;

  return candidatos.map((candidato) => {
    const r = resolverArtigo(candidato, catalogo);
    if (r.acao === "sem-correspondencia") {
      return { tipo: "sem-correspondencia", candidato };
    }

    const chaveCand = chaveQualificadoras(candidato.qualificadoras);
    const existente = tipificacoes.find(
      (t) =>
        t.processoId === processoId &&
        t.delitoId === r.delitoId &&
        chaveQualificadoras(t.qualificadoras) === chaveCand,
    );

    if (existente) {
      const motivo =
        existente.origem === "manual"
          ? "tipificação manual (soberania)"
          : "já promovido (idempotência)";
      return { tipo: "ignorar", candidato, delitoId: r.delitoId, motivo };
    }

    return { tipo: "vincular", candidato, delitoId: r.delitoId };
  });
}
