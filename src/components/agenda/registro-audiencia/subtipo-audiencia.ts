import type { LucideIcon } from "lucide-react";
import { Gavel, Scale, Shield, ShieldAlert, Users, HelpCircle, FileClock, Handshake, BookCheck } from "lucide-react";
import { detectarSlug } from "@/lib/agenda/tipos-audiencia";

export type SubtipoAudiencia =
  | "justificacao"
  | "justificacao_ep"
  | "admonitoria"
  | "pap"
  | "anpp"
  | "oitiva_especial"
  | "aij"
  | "custodia"
  | "plenario"
  | "indefinido";

export interface SubtipoConfig {
  key: SubtipoAudiencia;
  label: string;
  icon: LucideIcon;
  /** Cor primária Tailwind ('emerald' | 'amber' | 'rose' | 'sky' | 'violet') */
  cor: string;
  /** Descrição curta para banner contextual */
  descricao: string;
  /** Foco principal desse rito (1 frase) */
  foco: string;
  /** Label alternativo da aba "Depoentes" para esse subtipo */
  labelAbaDepoentes: string;
  /** Aba "Depoentes" se aplica a este rito? */
  exibeAbaDepoentes: boolean;
  /** Aba "Resultado" exige preenchimento detalhado? */
  resultadoDetalhado: boolean;
  /** Tipos de depoente esperados (filtra UI da aba) */
  tiposDepoente: Array<"testemunha" | "vitima" | "reu" | "perito" | "informante" | "policial">;
  /** Lembretes específicos (mostrados no briefing/banner) */
  lembretes: string[];
  /** Rito de instrução completa (ordem art. 400, prova oral plena). AIJ/PAP/plenário. */
  instrucaoCompleta: boolean;
  /** Sessão do Júri → o painel deve direcionar para o Cockpit em vez da preparação padrão. */
  direcionaCockpit?: boolean;
}

export const SUBTIPO_CONFIG: Record<SubtipoAudiencia, SubtipoConfig> = {
  justificacao: {
    key: "justificacao",
    label: "Justificação (MPU)",
    icon: Shield,
    cor: "amber",
    descricao: "Audiência do art. 19, §1º, Lei 11.340/06 — para reavaliar manutenção, revisão ou revogação das medidas protetivas.",
    foco: "Decidir sobre manutenção, revisão ou revogação das MPU. Não é instrução criminal.",
    labelAbaDepoentes: "Ofendida e Requerido",
    exibeAbaDepoentes: true,
    resultadoDetalhado: false,
    tiposDepoente: ["vitima", "reu", "informante"],
    lembretes: [
      "Não usar 'denúncia' — usar 'representação registrada no BO' ou 'petição inicial das medidas protetivas'.",
      "Verificar FNAR (Formulário Nacional de Avaliação de Risco) — Parte II não preenchida = vício técnico.",
      "Em caso de reaproximação voluntária, art. 24-A pode ser atípico (STJ AgRg AREsp 2.330.912/DF, HC 521.622/SC).",
    ],
    instrucaoCompleta: false,
  },
  oitiva_especial: {
    key: "oitiva_especial",
    label: "Depoimento Especial (Lei 13.431/17)",
    icon: ShieldAlert,
    cor: "rose",
    descricao: "Depoimento especial de criança ou adolescente em situação de violência. Escuta protegida em sala separada, com profissional capacitado.",
    foco: "Coletar prova com escuta protegida sem revitimização. Defesa atua via perguntas escritas / intermediação.",
    labelAbaDepoentes: "Depoente protegido",
    exibeAbaDepoentes: true,
    resultadoDetalhado: false,
    tiposDepoente: ["vitima", "informante"],
    lembretes: [
      "Defendido NÃO assiste presencialmente — circuito fechado ou sala separada.",
      "Perguntas curtas, claras, NÃO sugestivas. Via profissional capacitado.",
      "Vedação a revitimização: a oitiva substitui o depoimento policial — não se repete.",
    ],
    instrucaoCompleta: false,
  },
  aij: {
    key: "aij",
    label: "Audiência de Instrução e Julgamento",
    icon: Scale,
    cor: "emerald",
    descricao: "Instrução processual completa — produção de prova oral seguida de alegações finais.",
    foco: "Produzir prova oral conforme ordem do art. 400 CPP (ofendida → testemunhas acusação → defesa → perito → interrogatório).",
    labelAbaDepoentes: "Depoentes",
    exibeAbaDepoentes: true,
    resultadoDetalhado: true,
    tiposDepoente: ["vitima", "testemunha", "reu", "perito", "informante", "policial"],
    lembretes: [
      "Ordem do art. 400 CPP: ofendida → testemunhas acusação → testemunhas defesa → perito → interrogatório.",
      "Lei 13.431/17 obriga depoimento especial para ofendida menor / em situação de vulnerabilidade.",
      "Ofendida pode ser ouvida fora da presença do defendido (art. 217 CPP).",
    ],
    instrucaoCompleta: true,
  },
  custodia: {
    key: "custodia",
    label: "Audiência de Custódia",
    icon: Gavel,
    cor: "sky",
    descricao: "Examinar legalidade do APF (até 24h da prisão), requisitos do art. 312 CPP e cabimento de relaxamento, liberdade provisória ou cautelares.",
    foco: "Conferir legalidade do flagrante e cogitar liberdade provisória / MPU em substituição à preventiva.",
    labelAbaDepoentes: "Interrogatório",
    exibeAbaDepoentes: true,
    resultadoDetalhado: true,
    tiposDepoente: ["reu"],
    lembretes: [
      "Conferir > 24h entre prisão e apresentação → relaxamento.",
      "Perguntar ao defendido sobre tortura/maus-tratos (quesito obrigatório).",
      "Demonstrar inexistência dos requisitos da preventiva (art. 312, 313). Propor MPU como substitutiva.",
    ],
    instrucaoCompleta: false,
  },
  plenario: {
    key: "plenario",
    label: "Sessão de Plenário (Júri)",
    icon: Users,
    cor: "violet",
    descricao: "Julgamento pelos jurados (Conselho de Sentença). Soberania dos veredictos.",
    foco: "Convencer 4 dos 7 jurados — tese definitiva, perfil de jurados, quesitação.",
    labelAbaDepoentes: "Reinquirição",
    exibeAbaDepoentes: true,
    resultadoDetalhado: true,
    tiposDepoente: ["vitima", "testemunha", "perito", "informante", "policial"],
    lembretes: [
      "Inadmissível ler/referenciar elementos do IP (art. 155 CPP + Súmula 14 STJ).",
      "Pronúncia NÃO pode ser lida na frente dos jurados (art. 478 CPP).",
      "Quesito 4 (absolvição genérica, art. 483 III) é a alavanca da defesa — basta convencer 4 jurados.",
    ],
    instrucaoCompleta: true,
    direcionaCockpit: true,
  },
  justificacao_ep: {
    key: "justificacao_ep",
    label: "Justificação (Execução Penal)",
    icon: FileClock,
    cor: "sky",
    descricao: "Justificação na execução penal — apurar suposta falta disciplinar / descumprimento de condição antes de decisão sobre regressão, revogação de benefício ou prática de falta grave.",
    foco: "Justificar a ausência/descumprimento e evitar regressão de regime ou perda de dias remidos. NÃO é instrução de mérito.",
    labelAbaDepoentes: "Reeducando e testemunhas",
    exibeAbaDepoentes: true,
    resultadoDetalhado: false,
    tiposDepoente: ["reu", "testemunha", "informante"],
    lembretes: [
      "Reeducando/assistido (nunca 'réu'); 'benefício' (nunca 'regalia').",
      "Falta grave exige PAD com contraditório (Súmula 533 STJ) — apontar nulidade se ausente.",
      "Regressão cautelar exige oitiva prévia (art. 118 §2º LEP). Conferir contemporaneidade da falta.",
      "Prazo prescricional da falta disciplinar (analogia: menor prazo do art. 109 CP).",
    ],
    instrucaoCompleta: false,
  },
  admonitoria: {
    key: "admonitoria",
    label: "Audiência Admonitória",
    icon: BookCheck,
    cor: "sky",
    descricao: "Início do cumprimento de pena/benefício em meio aberto — leitura das condições e advertência das consequências do descumprimento (sursis, livramento, PRD, ANPP, suspensão).",
    foco: "Cientificar o assistido das condições e formalizar o início do cumprimento. Negociar/ajustar condições desproporcionais.",
    labelAbaDepoentes: "Assistido",
    exibeAbaDepoentes: false,
    resultadoDetalhado: false,
    tiposDepoente: ["reu"],
    lembretes: [
      "Reeducando/assistido. Conferir se as condições são proporcionais (comparecimento, recolhimento, vedações).",
      "Pleitear adequação de condição incompatível com trabalho/residência/saúde.",
      "Registrar data-base do cumprimento e período de prova; alertar sobre consequências do descumprimento.",
    ],
    instrucaoCompleta: false,
  },
  pap: {
    key: "pap",
    label: "Produção Antecipada de Provas",
    icon: FileClock,
    cor: "emerald",
    descricao: "Coleta antecipada de prova oral (art. 366 CPP / art. 156 I CPP) — testemunha que pode não ser localizada depois, prova urgente. A prova é colhida agora para uso futuro.",
    foco: "Produzir a prova oral com contraditório pleno agora — é instrução, com a mesma técnica da AIJ. Atenção redobrada: pode ser a única oportunidade de inquirir.",
    labelAbaDepoentes: "Depoentes",
    exibeAbaDepoentes: true,
    resultadoDetalhado: true,
    tiposDepoente: ["vitima", "testemunha", "perito", "informante", "policial"],
    lembretes: [
      "Súmula 455 STJ: a antecipação exige fundamentação concreta da urgência (não basta o decurso do prazo).",
      "Contraditório pleno — inquirir como se fosse a AIJ; pode ser a única chance de ouvir a testemunha.",
      "Réu citado por edital e ausente: conferir nomeação de defensor e ciência dos atos.",
    ],
    instrucaoCompleta: true,
  },
  anpp: {
    key: "anpp",
    label: "Acordo de Não Persecução Penal",
    icon: Handshake,
    cor: "emerald",
    descricao: "Homologação/audiência do ANPP (art. 28-A CPP) — confissão formal e pactuação de condições, com extinção da punibilidade ao final do cumprimento.",
    foco: "Avaliar cabimento e proporcionalidade das condições; orientar o assistido sobre a confissão formal e os efeitos do acordo.",
    labelAbaDepoentes: "Assistido",
    exibeAbaDepoentes: false,
    resultadoDetalhado: false,
    tiposDepoente: ["reu"],
    lembretes: [
      "Requisitos do art. 28-A: confissão formal, pena mínima < 4 anos, sem violência/grave ameaça, não reincidente.",
      "Conferir proporcionalidade das condições (prestação de serviço, pecuniária) — negociar excessos.",
      "ANPP cumprido extingue a punibilidade (art. 28-A §13) e não gera reincidência.",
      "ANPP homologado faz cessar cautelares/monitoração por perda de objeto.",
    ],
    instrucaoCompleta: false,
  },
  indefinido: {
    key: "indefinido",
    label: "Audiência",
    icon: HelpCircle,
    cor: "neutral",
    descricao: "Tipo de audiência não classificado automaticamente. Verifique o evento ou marque manualmente.",
    foco: "Conferir nos autos qual o objeto da audiência antes de prosseguir.",
    labelAbaDepoentes: "Depoentes",
    exibeAbaDepoentes: true,
    resultadoDetalhado: true,
    tiposDepoente: ["vitima", "testemunha", "reu", "perito", "informante", "policial"],
    lembretes: [],
    instrucaoCompleta: true,
  },
};

// Catálogo (slug) → subtipo local do registro de audiência.
const SLUG_PARA_SUBTIPO: Record<string, SubtipoAudiencia> = {
  plenario_juri: "plenario",
  aij: "aij",
  instrucao_oitiva: "aij",
  justificacao: "justificacao",
  justificacao_ep: "justificacao_ep",
  admonitoria: "admonitoria",
  pap: "pap",
  anpp: "anpp",
  oitiva_especial: "oitiva_especial",
  custodia: "custodia",
};

/**
 * Detecta o subtipo a partir do tipo do evento + classe processual + atribuição.
 * A atribuição desempata ritos de mesmo nome com dinâmica distinta — sobretudo
 * a Justificação, que em EP (falta/descumprimento) difere da de VVD (MPU).
 */
export function detectarSubtipo(
  tipoAudiencia?: string | null,
  classeProcessual?: string | null,
  atribuicao?: string | null,
): SubtipoAudiencia {
  const base = `${tipoAudiencia ?? ""} ${classeProcessual ?? ""}`.trim();
  if (!base) return "indefinido";
  const slug = detectarSlug(base);
  const atrib = (atribuicao ?? "").toUpperCase();
  const isEP = atrib.includes("EXECUCAO") || atrib.includes("EXECUÇÃO") || atrib === "EP";
  if (slug === "justificacao" && isEP) return "justificacao_ep";
  return SLUG_PARA_SUBTIPO[slug] ?? "indefinido";
}

export function corBadge(cor: string): {
  bg: string;
  text: string;
  border: string;
  bgSubtle: string;
} {
  const map: Record<string, { bg: string; text: string; border: string; bgSubtle: string }> = {
    amber: {
      bg: "bg-amber-500",
      text: "text-amber-700 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-900/40",
      bgSubtle: "bg-amber-50 dark:bg-amber-950/30",
    },
    emerald: {
      bg: "bg-emerald-500",
      text: "text-emerald-700 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-900/40",
      bgSubtle: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    rose: {
      bg: "bg-rose-500",
      text: "text-rose-700 dark:text-rose-400",
      border: "border-rose-200 dark:border-rose-900/40",
      bgSubtle: "bg-rose-50 dark:bg-rose-950/30",
    },
    sky: {
      bg: "bg-sky-500",
      text: "text-sky-700 dark:text-sky-400",
      border: "border-sky-200 dark:border-sky-900/40",
      bgSubtle: "bg-sky-50 dark:bg-sky-950/30",
    },
    violet: {
      bg: "bg-violet-500",
      text: "text-violet-700 dark:text-violet-400",
      border: "border-violet-200 dark:border-violet-900/40",
      bgSubtle: "bg-violet-50 dark:bg-violet-950/30",
    },
    neutral: {
      bg: "bg-neutral-500",
      text: "text-neutral-700 dark:text-neutral-400",
      border: "border-neutral-200 dark:border-neutral-800",
      bgSubtle: "bg-neutral-50 dark:bg-neutral-900/30",
    },
  };
  return map[cor] ?? map.neutral;
}
