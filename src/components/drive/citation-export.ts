/**
 * Caderno de citações — transforma grifos coloridos no esqueleto da peça,
 * agrupados pela categoria semântica da cor (Fatos, Teses, Provas…).
 *
 * Lógica pura, desacoplada das constantes de cor (recebe a paleta resolvida).
 * Spec: docs/specs/caderno-citacoes.md
 */

export interface CitationCategory {
  color: string;
  label: string;
}

interface AnnotationLike {
  tipo: string;
  cor?: string | null;
  pagina: number;
  textoSelecionado?: string | null;
  texto?: string | null;
}

export interface CitationItem {
  pagina: number;
  texto: string;
}

export interface CitationGroup {
  color: string | null;
  label: string;
  items: CitationItem[];
}

const SEM_CATEGORIA = "Sem categoria";

/** Remove acentos e baixa a caixa, para busca tolerante. */
function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Apenas grifos/sublinhados com texto selecionado viram citação. */
function isCitable(a: AnnotationLike): boolean {
  return (a.tipo === "highlight" || a.tipo === "underline") && !!a.textoSelecionado?.trim();
}

/**
 * Agrupa as citações por categoria, na ordem de `categories`. Cores fora da paleta
 * caem num grupo "Sem categoria" ao final. Categorias sem itens são omitidas; os
 * itens de cada grupo são ordenados por página.
 */
export function buildCitationGroups(
  annotations: AnnotationLike[],
  categories: CitationCategory[],
): CitationGroup[] {
  const byColor = new Map<string, CitationItem[]>();
  for (const a of annotations) {
    if (!isCitable(a)) continue;
    const key = a.cor ?? "";
    if (!byColor.has(key)) byColor.set(key, []);
    byColor.get(key)!.push({ pagina: a.pagina, texto: a.textoSelecionado!.trim() });
  }

  const groups: CitationGroup[] = [];
  const usados = new Set<string>();

  for (const cat of categories) {
    const items = byColor.get(cat.color);
    if (!items || items.length === 0) continue;
    usados.add(cat.color);
    groups.push({ color: cat.color, label: cat.label, items: sortByPage(items) });
  }

  // Cores que não estão na paleta → "Sem categoria" (uma única seção ao final).
  const orfaos: CitationItem[] = [];
  for (const [color, items] of byColor) {
    if (!usados.has(color)) orfaos.push(...items);
  }
  if (orfaos.length > 0) {
    groups.push({ color: null, label: SEM_CATEGORIA, items: sortByPage(orfaos) });
  }

  return groups;
}

function sortByPage(items: CitationItem[]): CitationItem[] {
  return [...items].sort((a, b) => a.pagina - b.pagina);
}

/** Serializa os grupos como texto estruturado para colar na peça. */
export function citationsToText(groups: CitationGroup[]): string {
  return groups
    .map((g) =>
      [`## ${g.label}`, ...g.items.map((i) => `• Pág. ${i.pagina}: "${i.texto}"`)].join("\n"),
    )
    .join("\n\n");
}

/** Filtra anotações por busca tolerante a caixa/acento em textoSelecionado e texto. */
export function filterCitations<T extends AnnotationLike>(annotations: T[], query: string): T[] {
  const q = fold(query.trim());
  if (!q) return annotations;
  return annotations.filter((a) => {
    const hay = fold(`${a.textoSelecionado ?? ""} ${a.texto ?? ""}`);
    return hay.includes(q);
  });
}
