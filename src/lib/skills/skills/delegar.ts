import type { Skill } from "../types";
const skill: Skill = {
  id: "delegar", name: "Delegar Demanda",
  description: "Atribui demanda a um estagiário ou servidor",
  icon: "UserPlus",
  triggers: ["delegar", "atribuir", "passar para", "delegar para"],
  params: [
    { name: "demanda", extract: /(?:delegar|atribuir|passar)\s+(?:demanda\s+)?(\d+)/i, required: true },
    { name: "usuario", extract: /(?:para|pra)\s+(.+)/i, required: true, entityType: "usuario" },
  ],
  type: "action", action: "demandas.delegar",
  category: "acao",
};
export default skill;
