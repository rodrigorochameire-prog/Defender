/**
 * Fonte única para interpretar o campo `defensor_nome` das sessões de júri.
 *
 * O valor gravado varia bastante: forma curta ("Dr. Rodrigo"), nome completo
 * ("Rodrigo Rocha Meire"), com sufixo de pedido de auxílio
 * ("Rodrigo Rocha Meire (PEDIR AUXÍLIO)") ou "Grupo do Júri (...)".
 *
 * Categorias canônicas do júri: Dr. Rodrigo, Dra. Juliane e Grupo do Júri.
 * O auxílio (PEDIR/TENTAR AUXÍLIO) é responsabilidade do GRUPO DO JÚRI — não
 * do titular cujo nome eventualmente apareça no campo. Por isso o auxílio tem
 * precedência sobre o nome na classificação.
 */

export type DefensorCanonico = "Dr. Rodrigo" | "Dra. Juliane" | "Grupo do Júri";

/** Mapeia qualquer variante de defensor_nome para a categoria canônica (ou null se não atribuído). */
export function normalizeDefensor(nome: string | null | undefined): DefensorCanonico | null {
  if (!nome) return null;
  const n = nome.toLowerCase();
  // Auxílio (PEDIR/TENTAR) e "grupo" → Grupo do Júri, com precedência sobre o nome.
  if (n.includes("grupo") || /\((pedir|tentar)\s+aux[ií]lio\)/.test(n)) return "Grupo do Júri";
  if (n.includes("rodrigo")) return "Dr. Rodrigo";
  if (n.includes("juliane")) return "Dra. Juliane";
  return null;
}

/** Extrai o pedido de auxílio embutido no nome ("PEDIR AUXÍLIO" / "TENTAR AUXÍLIO"), se houver. */
export function parseAuxilio(nome: string | null | undefined): string | null {
  if (!nome) return null;
  const m = nome.match(/\((PEDIR|TENTAR)\s+AUX[IÍ]LIO\)/i);
  return m ? m[0].replace(/[()]/g, "").toUpperCase() : null;
}

/**
 * Etiqueta de defensor p/ sinalizar de quem é o júri na agenda e no switch.
 * Cores: Rodrigo=emerald, Juliane=violet, Grupo do Júri=cinza NEUTRO —
 * todos círculo cheio com letra branca; o grupo é cobertura e não pode
 * competir com as cores dos titulares (pedido do Rodrigo 11/06).
 * `badgeClass` é a composição pronta do círculo — os consumidores NÃO devem
 * recompor cor (text-white + dot) por conta própria.
 */
export function defensorBadge(nome: string | null | undefined): {
  initial: "R" | "J" | "G";
  dot: string;
  text: string;
  badgeClass: string;
  label: DefensorCanonico;
} | null {
  const c = normalizeDefensor(nome);
  if (c === "Dr. Rodrigo")
    return {
      initial: "R",
      dot: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-400",
      badgeClass: "bg-emerald-500 text-white",
      label: c,
    };
  if (c === "Dra. Juliane")
    return {
      initial: "J",
      dot: "bg-violet-500",
      text: "text-violet-700 dark:text-violet-400",
      badgeClass: "bg-violet-500 text-white",
      label: c,
    };
  if (c === "Grupo do Júri")
    return {
      initial: "G",
      dot: "bg-orange-500",
      text: "text-orange-700 dark:text-orange-400",
      badgeClass: "bg-neutral-400 dark:bg-neutral-600 text-white",
      label: c,
    };
  return null;
}
