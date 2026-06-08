// Nome de exibição de vara/órgão julgador, a partir do campo cru do PJe.
//
// O `processos.vara` vem MUITO sujo: caixa alta, variações ("Vara de Violência
// Doméstica Fam Contra a Mulher de Camaç`ari", "VARA DA JUSTIÇA PELA PAZ EM CASA
// DA COMARCA DE CAMAÇARI – BAHIA Autos nº 8001…") e caudas de lixo (número de
// autos, nome de parte, "Petição Juntado por…", "Relatório VVD"). Este helper
// normaliza para um nome canônico e limpo.
//
// Regra principal: a Vara de Violência Doméstica de Camaçari foi renomeada pelo
// TJBA para **"Vara da Justiça pela Paz em Casa"**. Qualquer variante (o nome
// antigo "Violência Doméstica…" OU o novo verboso) é exibida como
// "Vara da Justiça pela Paz em Casa de <Comarca>".

import { toTitleCasePtBr } from "./title-case";

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Caudas de lixo grudadas ao nome da vara no texto do PJe. Cortamos a partir da
// primeira ocorrência (sobre o texto sem acento, em caixa alta).
const CAUDA_LIXO =
  /\b(AUTOS|PROCESSO|PETICAO|PETICÃO|ANALISE|RELATORIO|DEMANDA|PACIENTE|JUNTADO)\b/;

/**
 * Nome de exibição da vara. Retorna `null` para entrada vazia.
 * - Vara de VD / Justiça pela Paz → "Vara da Justiça pela Paz em Casa de <Comarca>".
 * - Demais → cauda de lixo removida + Title Case pt-BR.
 */
export function nomeVaraExibicao(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const flat = stripAccents(raw).toUpperCase();

  const ehVVD =
    (flat.includes("VIOLENCIA") && flat.includes("DOMESTICA")) ||
    (flat.includes("JUSTICA") && flat.includes("PAZ") && flat.includes("CASA"));

  if (ehVVD) {
    const comarca = comarcaDe(flat);
    return comarca
      ? `Vara da Justiça pela Paz em Casa de ${comarca}`
      : "Vara da Justiça pela Paz em Casa";
  }

  // Genérico: cortar cauda de lixo, normalizar separadores e Title Case.
  let limpo = raw;
  const m = stripAccents(raw).toUpperCase().match(CAUDA_LIXO);
  if (m && m.index !== undefined) limpo = raw.slice(0, m.index);
  limpo = limpo.replace(/\s*[-–—/]\s*(BA|BAHIA|ESTADO DA BAHIA)\b.*$/i, "");
  limpo = limpo.replace(/[\s,;/–—-]+$/, "").trim();
  return toTitleCasePtBr(limpo) || null;
}

// Extrai a comarca conhecida do texto achatado (sem acento, caixa alta).
function comarcaDe(flat: string): string | null {
  if (flat.includes("SALVADOR")) return "Salvador";
  if (flat.includes("CAMACARI")) return "Camaçari";
  // "... COMARCA DE <X> ..." — pega a palavra seguinte, se houver.
  const m = flat.match(/COMARCA DE\s+([A-ZÇÃÕÁÉÍÓÚÂÊÔÀ]+)/);
  if (m) return toTitleCasePtBr(m[1]);
  return null;
}
