import type { Skill } from "../types";
const skill: Skill = {
  id: "abrir-processo", name: "Abrir Processo",
  description: "Navega direto para um processo pelo número",
  icon: "ExternalLink",
  triggers: ["abrir processo", "abrir", "ir para processo", "ver processo"],
  params: [{ name: "numero", extract: /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/i, required: true, entityType: "processo" }],
  type: "navigate",
  route: (params) => `/processos?search=${params.numero}`,
  category: "consulta",
};
export default skill;
