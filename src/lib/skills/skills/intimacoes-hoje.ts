import type { Skill } from "../types";
const skill: Skill = {
  id: "intimacoes-hoje", name: "Intimações de Hoje",
  description: "Lista intimações e expedientes recebidos hoje",
  icon: "Bell",
  triggers: ["intimações", "intimação", "novas intimações", "intimações de hoje", "expedientes"],
  triggerPattern: /intima[çc][õo]e?s?\s*(hoje|nova|pendente)?/i,
  type: "panel", panel: { component: "IntimacoesPainel", title: "Intimações de Hoje" },
  category: "urgente",
};
export default skill;
