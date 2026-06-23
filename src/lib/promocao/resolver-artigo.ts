import { parseArtigo } from "./parse-artigo";
import type { CandidatoDelito, CatalogoDelito, ResultadoResolucaoDelito } from "./tipos-delito";

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

/**
 * Resolve um candidato a delito contra o catálogo, por MATCH (não dedup).
 *
 * Estratégia (conservadora — NUNCA cria entrada no catálogo):
 *   1. Exato em (codigoLei, artigo, paragrafo, inciso) → vincular 0.95.
 *   2. Fuzzy em (codigoLei, artigo) ignorando paragrafo/inciso; se houver UMA
 *      única entrada nesse par → vincular 0.75.
 *   3. Caso contrário → sem-correspondencia (será logado p/ revisão manual).
 */
export function resolverArtigo(
  candidato: CandidatoDelito,
  catalogo: CatalogoDelito[],
): ResultadoResolucaoDelito {
  if (!candidato.artigoBruto || !candidato.artigoBruto.trim()) {
    return { acao: "sem-correspondencia", confianca: 0, motivo: "Artigo ausente" };
  }

  const p = parseArtigo(candidato.artigoBruto);
  if (!p.artigo) {
    return { acao: "sem-correspondencia", confianca: 0, motivo: "Artigo não parseável" };
  }

  // 1. Match exato nas quatro dimensões.
  const exato = catalogo.find(
    (c) =>
      norm(c.codigoLei) === norm(p.codigoLei) &&
      norm(c.artigo) === norm(p.artigo) &&
      norm(c.paragrafo) === norm(p.paragrafo) &&
      norm(c.inciso) === norm(p.inciso),
  );
  if (exato) {
    return { acao: "vincular", delitoId: exato.id, confianca: 0.95, motivo: "Match exato" };
  }

  // 2. Fuzzy: par (codigoLei, artigo) com entrada única.
  const mesmoArtigo = catalogo.filter(
    (c) => norm(c.codigoLei) === norm(p.codigoLei) && norm(c.artigo) === norm(p.artigo),
  );
  if (mesmoArtigo.length === 1) {
    return {
      acao: "vincular",
      delitoId: mesmoArtigo[0].id,
      confianca: 0.75,
      motivo: "Match por artigo (paragrafo/inciso ignorados)",
    };
  }

  // 3. Sem correspondência confiável.
  return { acao: "sem-correspondencia", confianca: 0, motivo: "Sem correspondência no catálogo" };
}
