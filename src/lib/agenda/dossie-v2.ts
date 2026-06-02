export type DossieV2 = {
  ato?: string;
  gerado_em?: string;
  resumo?: string[];
  teses?: Array<{ nome?: string; nivel?: string; fundamento?: string }>;
  fragilidades?: string[];
  perguntas?: string[];
  providencias?: string[];
  versao_defendido?: string;
  intimacao?: string;
  fonte?: string;
  versao?: string;
};

/** true quando analysisData contém um objeto `dossie` (formato dossie_vvd_autos_pje_v2). */
export function hasDossieV2(analysisData: unknown): boolean {
  if (!analysisData || typeof analysisData !== "object") return false;
  const d = (analysisData as Record<string, unknown>).dossie;
  return !!d && typeof d === "object";
}

export type NivelTese = "alta" | "media" | "baixa" | "neutra";

/** Classifica o texto do nível ("■■■■□ ALTA", …) para escolha de cor do badge. */
export function nivelTeseClass(nivel?: string): NivelTese {
  const s = (nivel ?? "").toLowerCase();
  if (/alta/.test(s)) return "alta";
  if (/m[eé]dia/.test(s)) return "media";
  if (/baixa/.test(s)) return "baixa";
  return "neutra";
}
