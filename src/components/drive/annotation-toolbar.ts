/**
 * Invariantes puras da toolbar de anotação do leitor de PDF (grifador premium).
 *
 * Mantém a lógica de "qual barra mostrar" fora do componente de 4k linhas, com
 * testes. Invariante central: COLAPSAR NUNCA ALTERA O MODO — o grifo continua
 * ativo com a barra minimizada (pílula flutuante estilo GoodNotes).
 *
 * Spec: docs/specs/grifador-premium.md
 */

export type AnnotationMode = "none" | "highlight" | "underline" | "note" | "ink";

/** Está anotando = qualquer modo diferente de "none". */
export function isAnnotating(mode: AnnotationMode): boolean {
  return mode !== "none";
}

/** Barra cheia visível: anotando e NÃO colapsada. */
export function showFullToolbar(mode: AnnotationMode, collapsed: boolean): boolean {
  return isAnnotating(mode) && !collapsed;
}

/**
 * Pílula compacta flutuante visível: anotando E colapsada. Não empurra o conteúdo;
 * o modo de grifo permanece ativo, então selecionar texto continua criando grifos.
 * Mutuamente exclusiva com `showFullToolbar`.
 */
export function showCompactPalette(mode: AnnotationMode, collapsed: boolean): boolean {
  return isAnnotating(mode) && collapsed;
}

/**
 * Normaliza o estado de colapso ao mudar de modo: enquanto anotando, preserva o
 * colapso atual; ao sair (none), força expandir (não há pílula sem modo ativo).
 */
export function reconcileCollapsed(mode: AnnotationMode, collapsed: boolean): boolean {
  return isAnnotating(mode) ? collapsed : false;
}
