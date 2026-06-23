import { normalizarEndereco } from "@/lib/lugares/normalizar-endereco";
import type { CandidatoLugar, LugarExistente, ResultadoResolucaoLugar } from "./tipos-lugar";

/**
 * Resolve um candidato a lugar contra os lugares existentes, por DEDUP de
 * endereço normalizado.
 *
 * Estratégia (determinística — SEM "revisar"):
 *   1. computa o endereço normalizado do candidato;
 *   2. se vazio (só cidade/UF, sem logradouro) → criar (não casa com lugares reais);
 *   3. match exato contra `enderecoNormalizado` dos existentes (já filtrados
 *      para `merged_into IS NULL` na borda de IO) → vincular 1.0;
 *   4. sem match → criar.
 */
export function resolverEndereco(
  candidato: CandidatoLugar,
  existentes: LugarExistente[],
): ResultadoResolucaoLugar {
  const norm = normalizarEndereco(candidato.enderecoCompleto);
  if (!norm) {
    return { acao: "criar", confianca: candidato.confianca, motivo: "Endereço ausente ou não-normalizável" };
  }

  const match = existentes.find((l) => l.enderecoNormalizado === norm);
  if (match) {
    return { acao: "vincular", lugarId: match.id, confianca: 1.0, motivo: "Endereço normalizado idêntico" };
  }

  return { acao: "criar", confianca: candidato.confianca, motivo: "Sem correspondência" };
}
