/**
 * Fonte única para interpretar o campo `defensor_nome` das sessões de júri.
 *
 * O valor gravado varia bastante: forma curta ("Dr. Rodrigo"), nome completo
 * ("Rodrigo Rocha Meire"), com sufixo de pedido de auxílio
 * ("Rodrigo Rocha Meire (PEDIR AUXÍLIO)") ou genérico ("Defensor").
 * A paridade e o estilo dos cards precisam reconhecer todas essas variantes
 * como o mesmo defensor canônico — sem destruir o sufixo de auxílio, que é
 * uma informação real (o defensor está pedindo/tentando auxílio naquele júri).
 */

export type DefensorCanonico = "Dr. Rodrigo" | "Dra. Juliane";

/** Mapeia qualquer variante de defensor_nome para o defensor canônico (ou null se não atribuído a R/J). */
export function normalizeDefensor(nome: string | null | undefined): DefensorCanonico | null {
  if (!nome) return null;
  const n = nome.toLowerCase();
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
 * Etiqueta de defensor (R/J) p/ sinalizar de quem é o júri na agenda.
 * Cores na mesma convenção da aba Pauta: Rodrigo=emerald, Juliane=violet.
 */
export function defensorBadge(
  nome: string | null | undefined
): { initial: "R" | "J"; dot: string; text: string; label: DefensorCanonico } | null {
  const c = normalizeDefensor(nome);
  if (c === "Dr. Rodrigo")
    return { initial: "R", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", label: c };
  if (c === "Dra. Juliane")
    return { initial: "J", dot: "bg-violet-500", text: "text-violet-700 dark:text-violet-400", label: c };
  return null;
}
