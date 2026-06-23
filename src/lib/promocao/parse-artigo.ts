/**
 * Parser PURO de artigo bruto extraído pela IA para componentes estruturados.
 *
 * Normaliza para o formato do catálogo (`delitos_catalogo`), que armazena:
 *   - codigoLei: "CP" (default) ou número de lei especial ("11.343", "10.826").
 *   - artigo:    "121", "217-A", "24-A".
 *   - paragrafo: COM símbolos — "§2º", "§2º-A", "§4º", "caput" (ou null).
 *   - inciso:    romano em maiúsculas — "II", "IV" (ou null).
 *
 * Casos suportados (ver testes): "121", "121, §2º", "121 §2º II", "art. 33",
 * "11.343 art. 33 §4º", "129 caput", "121 §2" (sem símbolo), "121 par. 2", etc.
 */

export interface ArtigoParseado {
  codigoLei: string;
  artigo: string;
  paragrafo: string | null;
  inciso: string | null;
}

// Número de lei especial: "11.343", "10.826", "8.069" (com ponto de milhar).
const RE_LEI_ESPECIAL = /\b(\d{1,2}\.\d{3})\b/;
// "art." / "artigo" prefixo (opcional, ruído).
const RE_PREFIXO_ART = /\bart(?:igo|\.)?\b\.?/gi;
// Paragrafo: "§2º", "§ 2", "par. 2", "parágrafo 2", "p. 2" — captura número + sufixo letra.
// O sufixo só casa quando colado ("§2º-A" / "§2A"), nunca após espaço — caso
// contrário um inciso seguinte ("§2º II") seria consumido como sufixo.
const RE_PARAGRAFO = /(?:§|\bpar[áa]?(?:grafo)?\.?|\bp\.)\s*(\d{1,3})(?:º|°|o)?(-?[A-Za-z])?/i;
// Inciso romano: "II", "IV", "inc. III" — após paragrafo ou solto no fim.
const RE_INCISO = /(?:\binc(?:iso|\.)?\.?\s*)?\b([IVXLCM]{1,5})\b/i;
// Artigo: número (com ponto de milhar NÃO — esse já é lei) + sufixo "-A".
const RE_ARTIGO = /\b(\d{1,4}(?:-[A-Za-z])?)\b/;

const ROMANO_VALIDO = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;

function normalizarParagrafo(num: string, sufixo: string | null): string {
  const suf = sufixo ? sufixo.toUpperCase().replace(/^-?/, "-") : "";
  return `§${num}º${suf}`;
}

export function parseArtigo(raw: string | null | undefined): ArtigoParseado {
  const texto = (raw ?? "").trim();
  if (!texto) {
    return { codigoLei: "CP", artigo: "", paragrafo: null, inciso: null };
  }

  let resto = texto;

  // 1. Código de lei. Lei especial pelo padrão "NN.NNN"; senão default "CP"
  //    (consumindo um eventual prefixo literal "CP").
  let codigoLei = "CP";
  const mLei = resto.match(RE_LEI_ESPECIAL);
  if (mLei) {
    codigoLei = mLei[1];
    resto = resto.replace(mLei[1], " ");
  } else {
    resto = resto.replace(/\bCP\b/gi, " ");
  }

  // 2. Remove prefixos "art."/"artigo" (ruído).
  resto = resto.replace(RE_PREFIXO_ART, " ");

  // 3. caput (mutuamente exclusivo com §).
  let paragrafo: string | null = null;
  const temCaput = /\bcaput\b/i.test(resto);
  if (temCaput) {
    resto = resto.replace(/\bcaput\b/gi, " ");
    paragrafo = "caput";
  }

  // 4. Paragrafo "§Nº".
  if (!paragrafo) {
    const mPar = resto.match(RE_PARAGRAFO);
    if (mPar) {
      paragrafo = normalizarParagrafo(mPar[1], mPar[2] ?? null);
      resto = resto.replace(mPar[0], " ");
    }
  }

  // 5. Artigo (primeiro número remanescente, podendo ter sufixo "-A").
  let artigo = "";
  const mArt = resto.match(RE_ARTIGO);
  if (mArt) {
    artigo = mArt[1].toUpperCase();
    resto = resto.replace(mArt[1], " ");
  }

  // 6. Inciso romano (no que sobrou). Valida que é romano de fato.
  let inciso: string | null = null;
  const mInc = resto.match(RE_INCISO);
  if (mInc && ROMANO_VALIDO.test(mInc[1])) {
    inciso = mInc[1].toUpperCase();
  }

  return { codigoLei, artigo, paragrafo, inciso };
}
