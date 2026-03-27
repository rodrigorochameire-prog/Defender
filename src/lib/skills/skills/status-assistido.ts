import type { Skill } from "../types";
const skill: Skill = {
  id: "status-assistido", name: "Status do Assistido",
  description: "Ficha rápida: processos, prazos, situação prisional",
  icon: "User",
  triggers: ["status", "ficha", "situação", "como está", "dados"],
  params: [{ name: "assistido", extract: /(?:status|ficha|situa[çc][ãa]o|como\s+est[aá])\s+(?:do\s+)?(?:de\s+)?(.+)/i, required: true, entityType: "assistido" }],
  type: "panel", panel: { component: "StatusAssistidoPainel", title: "Status do Assistido" },
  category: "consulta",
};
export default skill;
