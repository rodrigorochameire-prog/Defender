/**
 * Pipeline: lowercase+deaccent → remove CEP → pontuação → s/n → barras → abreviações
 * → marcadores de número → cidade default → UF → collapse.
 */
export function normalizarEndereco(s: string | null | undefined): string {
  if (!s) return "";
  let t = String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  // CEP: 5+3 dígitos com ou sem hífen, e a label "cep"
  t = t.replace(/\b\d{5}-?\d{3}\b/g, " ");
  t = t.replace(/\bcep\b\s*/g, " ");

  // Pontuação estrutural (mantém / e - para tratar depois)
  t = t.replace(/[,;:()]/g, " ");

  // s/n → sn (antes de remover /)
  t = t.replace(/\bs\s*\/\s*n\b/g, "sn");

  // Barras e hífens → espaço
  t = t.replace(/[-\/\\]/g, " ");

  // Abreviações — ordem importa: mais específicas primeiro
  // av. ou av (avenida) — antes de al para não conflitar
  t = t.replace(/\bav\.?\s*/g, "avenida ");
  // al. → alameda — antes de al sozinho
  t = t.replace(/\bal\.\s*/g, "alameda ");
  // estr. / est. → estrada
  t = t.replace(/\bestr?\.\s*/g, "estrada ");
  // rod. → rodovia
  t = t.replace(/\brod\.\s*/g, "rodovia ");
  // tv. → travessa
  t = t.replace(/\btv\.\s*/g, "travessa ");
  // r. → rua  (MUST match "r." with the literal dot, not bare "r")
  t = t.replace(/\br\.\s*/g, "rua ");
  // pca → praca (after deaccent: pça → pca)
  t = t.replace(/\bpca\b/g, "praca");

  // Marcadores de número — nº/n° não sobrevivem a NFD intactos;
  // o caractere º (U+00BA) e ° (U+00B0) NÃO têm combining mark, logo passam pelo deaccent.
  // Após lowercase ficam nº e n°. Remover explicitamente:
  t = t.replace(/\bn[º°]\s*/g, " ");
  t = t.replace(/\bn\.\s*/g, " ");
  t = t.replace(/\bno\.\s*/g, " ");
  // "nº" after NFD: º (U+00BA ordinal) stays; handle both ordinal and degree sign
  // (belt-and-suspenders for any surviving form)
  t = t.replace(/\bn\u00ba\s*/g, " ");
  t = t.replace(/\bn\u00b0\s*/g, " ");

  // Cidade default (após deaccent já sem acento)
  t = t.replace(/\b(camacari|salvador|lauro de freitas|dias davila|dias d avila)\b/g, " ");

  // UF e país — remover em qualquer posição (não apenas terminal)
  t = t.replace(/\bbahia\b/g, " ");
  t = t.replace(/\b(brasil|brazil)\b/g, " ");
  // "ba" sozinho — só remover se não for parte de palavra (ex: "bairro" não afetado)
  t = t.replace(/\bba\b/g, " ");

  // Collapse espaços
  t = t.replace(/\s+/g, " ").trim();

  return t;
}
