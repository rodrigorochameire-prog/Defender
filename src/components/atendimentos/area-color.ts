// Cor sólida (hex) por área do atendimento — para barras/pontos em estilos inline
// (calendário, cards, insights). Mantido em módulo próprio (não em config.ts) por
// estabilidade: a cor vem da atribuição central (lib/config/atribuicoes).

import { getAtribuicaoColors } from "@/lib/config/atribuicoes";

// Mapa área → chave de atribuição (espelha o de config.ts; estável).
const AREA_PARA_ATRIBUICAO: Record<string, string> = {
  CRIMINAL: "CRIMINAL",
  VIOLENCIA_DOMESTICA: "VVD",
  JURI: "JURI",
  EXECUCAO_PENAL: "EXECUCAO_PENAL",
  CIVEL: "CIVEL",
  FAMILIA: "FAMILIA",
  OUTRA: "all",
};

export function areaHex(area: string | null | undefined): string {
  const c = getAtribuicaoColors(AREA_PARA_ATRIBUICAO[area ?? "OUTRA"] ?? "all");
  return c.color;
}
