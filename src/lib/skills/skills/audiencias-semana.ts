import type { Skill } from "../types";
const skill: Skill = {
  id: "audiencias-semana", name: "Audiências da Semana",
  description: "Agenda de audiências dos próximos 7 dias",
  icon: "Calendar",
  triggers: ["audiências", "audiência", "agenda", "pauta", "audiências da semana"],
  triggerPattern: /audi[eê]ncias?\s*(semana|hoje|amanh[aã]|pr[oó]xim)?/i,
  type: "panel", panel: { component: "AudienciasPainel", title: "Audiências da Semana" },
  category: "consulta",
};
export default skill;
