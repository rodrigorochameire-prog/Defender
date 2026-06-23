import { CATALOGO_CAUTELARES, normalizar } from "@/lib/cautelares/cautelares-taxonomia";
import type { CandidatoCautelar, ResultadoResolucaoCautelar } from "./tipos-cautelar";

/**
 * Resolve um candidato a cautelar contra a taxonomia (CATALOGO_CAUTELARES), por
 * MATCH de gatilhos (não dedup).
 *
 * Estratégia (conservadora — NUNCA cria entrada no catálogo):
 *   1. normaliza o texto livre (minúsculo, sem acento);
 *   2. itera o catálogo na ordem (mais específico primeiro); a PRIMEIRA entrada
 *      cujos `gatilhos` (regex) casam → vincular 0.75;
 *   3. nenhum gatilho casa → sem-correspondencia (será logado p/ revisão manual).
 *
 * Sem "revisar": o match por gatilhos é determinístico.
 */
export function resolverCautelar(candidato: CandidatoCautelar): ResultadoResolucaoCautelar {
  if (!candidato.medida || !candidato.medida.trim()) {
    return { acao: "sem-correspondencia", confianca: 0, motivo: "Medida ausente" };
  }

  const texto = normalizar(candidato.medida);

  for (const entrada of CATALOGO_CAUTELARES) {
    if (entrada.gatilhos.some((re) => re.test(texto))) {
      return {
        acao: "vincular",
        codigo: entrada.codigo,
        especie: entrada.especie,
        artigo: entrada.artigo,
        confianca: 0.75,
        motivo: `Match por gatilho (${entrada.codigo})`,
      };
    }
  }

  return { acao: "sem-correspondencia", confianca: 0, motivo: "Sem correspondência na taxonomia" };
}
