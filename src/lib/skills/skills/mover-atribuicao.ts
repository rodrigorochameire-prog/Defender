import type { Skill } from "../types";
const skill: Skill = {
  id: "mover-atribuicao", name: "Mover Atribuição",
  description: "Move assistido para outra área (Júri, VVD, EP, Substituição)",
  icon: "ArrowRightLeft",
  triggers: ["mover", "transferir", "mudar atribuição", "mover para"],
  params: [
    { name: "assistido", extract: /(?:mover|transferir)\s+(.+?)\s+para/i, required: true, entityType: "assistido" },
    { name: "area", extract: /para\s+(j[úu]ri|vvd|ep|substitui[çc][ãa]o|execu[çc][ãa]o)/i, required: true },
  ],
  type: "action", action: "assistidos.moverAtribuicao",
  category: "acao",
};
export default skill;
