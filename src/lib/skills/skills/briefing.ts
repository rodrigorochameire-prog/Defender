import type { Skill } from "../types";
const skill: Skill = {
  id: "briefing", name: "Briefing do Caso",
  description: "Gera análise estratégica do caso via Cowork",
  icon: "Brain",
  triggers: ["briefing", "resumo do caso", "resumo", "analise do caso", "análise estratégica"],
  params: [{ name: "assistido", extract: /(?:briefing|resumo|an[aá]lise)\s+(?:do\s+)?(?:caso\s+)?(?:do\s+)?(?:de\s+)?(.+)/i, required: true, entityType: "assistido" }],
  type: "delegate",
  delegate: {
    target: "cowork",
    promptTemplate: "Você é um assistente jurídico da Defensoria Pública de Camaçari.\n\nGere um briefing estratégico completo do caso:\n- Assistido: {{assistidoNome}}\n- Processo: {{numeroAutos}}\n- Classe: {{classeProcessual}}\n- Vara: {{vara}}\n\nAnalise: teses defensivas, contradições nos depoimentos, pontos fortes e fracos, próximos passos recomendados.\n\nDocumentos estão em: Google Drive > {{drivePath}}",
  },
  category: "analise",
};
export default skill;
