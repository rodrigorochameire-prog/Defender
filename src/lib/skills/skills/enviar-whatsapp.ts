import type { Skill } from "../types";
const skill: Skill = {
  id: "enviar-whatsapp", name: "Enviar WhatsApp",
  description: "Abre conversa WhatsApp com assistido",
  icon: "MessageCircle",
  triggers: ["whatsapp", "mandar mensagem", "enviar whatsapp", "mensagem"],
  params: [{ name: "assistido", extract: /(?:whatsapp|mensagem)\s+(?:para\s+)?(?:do\s+)?(.+)/i, required: true, entityType: "assistido" }],
  type: "navigate",
  route: (params) => `/whatsapp?search=${params.assistido}`,
  category: "comunicacao",
};
export default skill;
