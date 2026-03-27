import type { Skill } from "../types";
const skill: Skill = {
  id: "prazos-vencendo", name: "Prazos Vencendo",
  description: "Mostra demandas com prazo vencendo hoje, amanhã ou na semana",
  icon: "Clock",
  triggers: ["prazos", "vencendo", "prazo urgente", "prazos de hoje", "prazo amanhã"],
  triggerPattern: /praz[oa]s?\s*(venc|urgen|hoje|amanh[aã]|semana)/i,
  type: "navigate", route: "/prazos?filter=vencendo", category: "urgente",
};
export default skill;
