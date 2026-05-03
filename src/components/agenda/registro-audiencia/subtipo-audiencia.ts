import type { LucideIcon } from "lucide-react";
import { Gavel, Scale, Shield, ShieldAlert, Users, HelpCircle } from "lucide-react";

export type SubtipoAudiencia =
  | "justificacao"
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
  },
  oitiva_especial: {
    key: "oitiva_especial",
    label: "Oitiva Especial (Lei 13.431/17)",
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
  },
};

/**
 * Detecta o subtipo a partir do tipo do evento (string livre, gravado em
 * `audiencias.tipo`) e da classe processual (opcional, ajuda em casos
 * ambíguos como APF que vem como Justificação na pauta).
 */
export function detectarSubtipo(
  tipoAudiencia: string | null | undefined,
  classeProcessual: string | null | undefined = null,
): SubtipoAudiencia {
  const t = (tipoAudiencia || "").toUpperCase();
  const c = (classeProcessual || "").toUpperCase();

  if (c.includes("FLAGRANTE") || c.includes("APF") || t.includes("CUSTÓDIA") || t.includes("CUSTODIA")) {
    return "custodia";
  }
  if (t.includes("PLEN") || t.includes("JULGAMENTO PELO JÚRI") || t.includes("SESSÃO")) {
    return "plenario";
  }
  if (t.includes("DEPOIMENTO ESPECIAL") || (t.includes("ESPECIAL") && !t.includes("ESPECIAL DO JÚRI"))) {
    return "oitiva_especial";
  }
  if (t.includes("JUSTIFICA")) {
    return "justificacao";
  }
  if (t.includes("INSTRUÇÃO") || t.includes("INSTRUCAO") || t.includes("AIJ") || t.includes("SUMÁRIO") || t.includes("SUMARIO")) {
    return "aij";
  }
  return "indefinido";
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
