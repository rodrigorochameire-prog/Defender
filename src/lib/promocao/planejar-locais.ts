import { resolverEndereco } from "./resolver-endereco";
import type {
  AcaoPromocaoLugar,
  CandidatoLugar,
  LugarExistente,
  ParticipacaoLugarExistente,
} from "./tipos-lugar";

/**
 * Planejador PURO de promoção de lugares. Para cada candidato:
 *   - resolve o endereço contra os lugares existentes (vincular | criar);
 *   - se vincular e já existir participação (qualquer fonte) para o mesmo
 *     (processoId, lugarId, tipo) → ignorar (idempotência + soberania manual);
 *   - senão → vincular;
 *   - criar → cria lugar + participação.
 *
 * Idempotência por (processoId, lugarId, tipo). Participações `manual` são
 * protegidas pela mesma checagem (não duplicamos um vínculo já existente).
 */
export function planejarLocais(args: {
  processoId: number;
  candidatos: CandidatoLugar[];
  existentes: LugarExistente[];
  participacoes: ParticipacaoLugarExistente[];
}): AcaoPromocaoLugar[] {
  const { processoId, candidatos, existentes, participacoes } = args;

  return candidatos.map((candidato) => {
    const r = resolverEndereco(candidato, existentes);
    if (r.acao === "criar") return { tipo: "criar", candidato };

    const ja = participacoes.find(
      (p) => p.processoId === processoId && p.lugarId === r.lugarId && p.tipo === candidato.tipo,
    );
    if (ja) {
      const motivo =
        ja.fonte === "manual" ? "participação manual (soberania)" : "já promovido (idempotência)";
      return { tipo: "ignorar", candidato, lugarId: r.lugarId, motivo };
    }
    return { tipo: "vincular", candidato, lugarId: r.lugarId };
  });
}
