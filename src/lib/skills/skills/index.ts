import type { Skill } from "../types";
import prazosVencendo from "./prazos-vencendo";
import intimacoesHoje from "./intimacoes-hoje";
import briefing from "./briefing";
import statusAssistido from "./status-assistido";
import buscar from "./buscar";
import abrirProcesso from "./abrir-processo";
import audienciasSemana from "./audiencias-semana";
import delegar from "./delegar";
import enviarWhatsapp from "./enviar-whatsapp";
import moverAtribuicao from "./mover-atribuicao";

const allSkills: Skill[] = [
  prazosVencendo, intimacoesHoje, briefing, statusAssistido, buscar,
  abrirProcesso, audienciasSemana, delegar, enviarWhatsapp, moverAtribuicao,
];
export default allSkills;
