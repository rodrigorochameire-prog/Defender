import type { Skill } from "../types";
const skill: Skill = {
  id: "buscar", name: "Buscar",
  description: "Busca em documentos, processos e assistidos",
  icon: "Search",
  triggers: ["buscar", "procurar", "pesquisar", "achar", "encontrar"],
  params: [{ name: "termo", extract: /(?:buscar|procurar|pesquisar|achar|encontrar)\s+(.+)/i, required: true }],
  type: "panel", panel: { component: "BuscaPainel", title: "Resultados da Busca" },
  category: "consulta",
};
export default skill;
