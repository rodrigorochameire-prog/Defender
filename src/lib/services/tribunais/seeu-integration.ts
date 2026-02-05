/**
 * Integração com SEEU - Sistema Eletrônico de Execução Unificado
 *
 * O SEEU é o sistema do CNJ para gestão de execuções penais em todo o Brasil.
 * URL: https://seeu.pje.jus.br
 *
 * Funcionalidades:
 * - Consulta de processos de execução
 * - Cálculo de penas e benefícios
 * - Acompanhamento de progressão de regime
 * - Verificação de requisitos para livramento condicional
 * - Monitoramento de faltas disciplinares
 */

export interface DadosExecucao {
  id: string;
  numeroProcesso: string;
  numeroExecucao: string;
  assistido: {
    nome: string;
    cpf?: string;
    nomeMae?: string;
    dataNascimento?: Date;
  };
  regime: "fechado" | "semiaberto" | "aberto" | "livramento";
  estabelecimento: string;
  comarca: string;
  vara: string;
  situacao: "ativo" | "suspenso" | "extinto" | "evadido";
}

export interface CalculoPena {
  penaTotal: number; // Em dias
  penaRestante: number;
  diasCumpridos: number;
  diasRemidos: number;
  faltasGraves: number;
  dataInicio: Date;
  dataFimPrevista: Date;
  ultimaAtualizacao: Date;
}

export interface BeneficioExecucao {
  id: string;
  tipo:
    | "progressao"
    | "livramento-condicional"
    | "saida-temporaria"
    | "indulto"
    | "comutacao"
    | "remicao"
    | "detracacao";
  status: "pendente" | "deferido" | "indeferido" | "em-analise";
  dataSolicitacao?: Date;
  dataDecisao?: Date;
  dataPreenchimentoRequisitos?: Date;
  observacoes?: string;
}

export interface RequisitoProgressao {
  tipo: "1/6" | "2/5" | "3/5" | "40%" | "50%" | "60%" | "70%";
  descricao: string;
  diasNecessarios: number;
  diasCumpridos: number;
  percentualCumprido: number;
  preenchido: boolean;
  dataPreenchimento?: Date;
  observacoes?: string;
}

export interface FaltaDisciplinar {
  id: string;
  tipo: "grave" | "media" | "leve";
  descricao: string;
  data: Date;
  dataReabilitacao?: Date;
  statusPAD: "em-andamento" | "concluido" | "arquivado";
  decisao?: string;
}

export interface ConsultaSEEUResult {
  success: boolean;
  dadosExecucao?: DadosExecucao;
  calculoPena?: CalculoPena;
  beneficios?: BeneficioExecucao[];
  requisitosProgressao?: RequisitoProgressao[];
  faltas?: FaltaDisciplinar[];
  error?: string;
}

// ==========================================
// REGRAS DE PROGRESSÃO DE REGIME
// ==========================================

export const REGRAS_PROGRESSAO = {
  // Crime comum - primário
  comum_primario: {
    fracao: "1/6",
    percentual: 16.67,
    descricao: "1/6 da pena (crime comum, réu primário)",
    fundamento: "Art. 112, caput, LEP",
  },
  // Crime comum - reincidente
  comum_reincidente: {
    fracao: "1/5",
    percentual: 20,
    descricao: "1/5 da pena (crime comum, reincidente)",
    fundamento: "Art. 112, I, LEP (Pacote Anticrime)",
  },
  // Crime hediondo - primário
  hediondo_primario: {
    fracao: "40%",
    percentual: 40,
    descricao: "40% da pena (hediondo, primário)",
    fundamento: "Art. 112, V, LEP (Pacote Anticrime)",
  },
  // Crime hediondo - reincidente específico
  hediondo_reincidente: {
    fracao: "60%",
    percentual: 60,
    descricao: "60% da pena (hediondo, reincidente específico)",
    fundamento: "Art. 112, VII, LEP (Pacote Anticrime)",
  },
  // Crime hediondo com resultado morte - primário
  hediondo_morte_primario: {
    fracao: "50%",
    percentual: 50,
    descricao: "50% da pena (hediondo com morte, primário)",
    fundamento: "Art. 112, VI, 'a', LEP (Pacote Anticrime)",
  },
  // Crime hediondo com resultado morte - reincidente
  hediondo_morte_reincidente: {
    fracao: "70%",
    percentual: 70,
    descricao: "70% da pena (hediondo com morte, reincidente)",
    fundamento: "Art. 112, VIII, LEP (Pacote Anticrime)",
  },
  // Comando organização criminosa - violência/ameaça
  orcrim_comando: {
    fracao: "50%",
    percentual: 50,
    descricao: "50% da pena (comando de organização criminosa com violência/grave ameaça)",
    fundamento: "Art. 112, VI, 'b', LEP (Pacote Anticrime)",
  },
};

// ==========================================
// REGRAS DE LIVRAMENTO CONDICIONAL
// ==========================================

export const REGRAS_LIVRAMENTO = {
  // Crime comum - primário, bons antecedentes
  comum_primario_bons: {
    fracao: "1/3",
    percentual: 33.33,
    descricao: "1/3 da pena (crime comum, primário, bons antecedentes)",
    fundamento: "Art. 83, I, CP",
  },
  // Crime comum - reincidente
  comum_reincidente: {
    fracao: "1/2",
    percentual: 50,
    descricao: "1/2 da pena (crime comum, reincidente)",
    fundamento: "Art. 83, II, CP",
  },
  // Crime hediondo - primário
  hediondo_primario: {
    fracao: "2/3",
    percentual: 66.67,
    descricao: "2/3 da pena (crime hediondo, primário)",
    fundamento: "Art. 83, V, CP",
  },
  // Crime hediondo - reincidente específico: vedado
  hediondo_reincidente: {
    fracao: "vedado",
    percentual: 100,
    descricao: "Vedado (reincidência específica em crime hediondo)",
    fundamento: "Art. 83, V, CP c/c Art. 44, parágrafo único, Lei 11.343/2006",
  },
};

// ==========================================
// CÁLCULO DE BENEFÍCIOS
// ==========================================

/**
 * Calcula a data prevista para progressão de regime
 */
export function calcularProgressao(
  penaTotal: number, // em dias
  diasCumpridos: number,
  diasRemidos: number,
  tipoProgressao: keyof typeof REGRAS_PROGRESSAO
): RequisitoProgressao {
  const regra = REGRAS_PROGRESSAO[tipoProgressao];
  const diasNecessarios = Math.ceil(penaTotal * (regra.percentual / 100));
  const totalCumprido = diasCumpridos + diasRemidos;
  const percentualCumprido = (totalCumprido / diasNecessarios) * 100;

  return {
    tipo: regra.fracao as RequisitoProgressao["tipo"],
    descricao: regra.descricao,
    diasNecessarios,
    diasCumpridos: totalCumprido,
    percentualCumprido: Math.min(percentualCumprido, 100),
    preenchido: totalCumprido >= diasNecessarios,
    dataPreenchimento:
      totalCumprido >= diasNecessarios
        ? new Date()
        : adicionarDias(new Date(), diasNecessarios - totalCumprido),
    observacoes: regra.fundamento,
  };
}

/**
 * Calcula a data prevista para livramento condicional
 */
export function calcularLivramento(
  penaTotal: number,
  diasCumpridos: number,
  diasRemidos: number,
  tipoLivramento: keyof typeof REGRAS_LIVRAMENTO
): RequisitoProgressao {
  const regra = REGRAS_LIVRAMENTO[tipoLivramento];
  const diasNecessarios = Math.ceil(penaTotal * (regra.percentual / 100));
  const totalCumprido = diasCumpridos + diasRemidos;
  const percentualCumprido = (totalCumprido / diasNecessarios) * 100;

  return {
    tipo: regra.fracao as RequisitoProgressao["tipo"],
    descricao: regra.descricao,
    diasNecessarios,
    diasCumpridos: totalCumprido,
    percentualCumprido: Math.min(percentualCumprido, 100),
    preenchido: totalCumprido >= diasNecessarios,
    dataPreenchimento:
      totalCumprido >= diasNecessarios
        ? new Date()
        : adicionarDias(new Date(), diasNecessarios - totalCumprido),
    observacoes: regra.fundamento,
  };
}

/**
 * Calcula a remição de pena
 * - 1 dia de pena a cada 3 dias de trabalho (Art. 126 LEP)
 * - 1 dia de pena a cada 12 horas de estudo (Art. 126, §1º, I, LEP)
 */
export function calcularRemicao(
  diasTrabalhados: number,
  horasEstudo: number
): { diasRemidos: number; detalhamento: string } {
  const remicaoTrabalho = Math.floor(diasTrabalhados / 3);
  const remicaoEstudo = Math.floor(horasEstudo / 12);
  const totalRemido = remicaoTrabalho + remicaoEstudo;

  return {
    diasRemidos: totalRemido,
    detalhamento: `${remicaoTrabalho} dias (trabalho: ${diasTrabalhados}/3) + ${remicaoEstudo} dias (estudo: ${horasEstudo}h/12)`,
  };
}

/**
 * Verifica o impacto de falta grave na progressão
 * - Falta grave interrompe contagem de progressão (Súmula 534 STJ)
 * - NÃO interrompe prazo de indulto/comutação (Súmula 535 STJ)
 */
export function verificarImpactoFaltaGrave(
  dataFalta: Date,
  tipoCalculo: "progressao" | "livramento" | "indulto"
): { interrompe: boolean; fundamento: string; observacao: string } {
  if (tipoCalculo === "indulto") {
    return {
      interrompe: false,
      fundamento: "Súmula 535 STJ",
      observacao:
        "A prática de falta grave NÃO interrompe o prazo para fim de comutação de pena ou indulto.",
    };
  }

  return {
    interrompe: true,
    fundamento: "Súmula 534 STJ",
    observacao:
      "A prática de falta grave INTERROMPE a contagem do prazo para progressão de regime, reiniciando a partir da data da infração.",
  };
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function adicionarDias(data: Date, dias: number): Date {
  const novaData = new Date(data);
  novaData.setDate(novaData.getDate() + dias);
  return novaData;
}

/**
 * Converte pena de anos/meses/dias para total de dias
 */
export function penaTotalEmDias(anos: number, meses: number, dias: number): number {
  return anos * 365 + meses * 30 + dias;
}

/**
 * Converte dias para formato legível
 */
export function formatarPena(totalDias: number): string {
  const anos = Math.floor(totalDias / 365);
  const meses = Math.floor((totalDias % 365) / 30);
  const dias = totalDias % 30;

  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ano${anos > 1 ? "s" : ""}`);
  if (meses > 0) partes.push(`${meses} ${meses > 1 ? "meses" : "mês"}`);
  if (dias > 0) partes.push(`${dias} dia${dias > 1 ? "s" : ""}`);

  return partes.join(", ") || "0 dias";
}

// ==========================================
// URLs DO SEEU
// ==========================================

export const SEEU_URLS = {
  login: "https://seeu.pje.jus.br/seeu/login.seam",
  consultaPublica: "https://seeu.pje.jus.br/seeu/publico/consulta.seam",
  // Autenticação via certificado digital ou Gov.BR
  authGovBR: "https://seeu.pje.jus.br/seeu/login/govbr",
};

/**
 * Gera URL de consulta pública do SEEU
 */
export function gerarURLConsultaSEEU(numeroExecucao: string): string {
  return `${SEEU_URLS.consultaPublica}?numExecucao=${encodeURIComponent(numeroExecucao)}`;
}

// ==========================================
// SIMULAÇÃO DE CONSULTA (MOCK)
// ==========================================

/**
 * Mock de consulta ao SEEU para demonstração
 * Em produção, faria request à API do SEEU ou web scraping
 */
export async function consultarSEEU(
  numeroExecucao: string
): Promise<ConsultaSEEUResult> {
  // Simular delay de rede
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Dados mockados para demonstração
  const dataInicio = new Date(2022, 5, 15); // 15/06/2022
  const hoje = new Date();
  const diasCumpridos = Math.floor(
    (hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)
  );

  const penaTotal = penaTotalEmDias(6, 0, 0); // 6 anos
  const diasRemidos = 180; // 6 meses de remição

  const requisitosProgressao: RequisitoProgressao[] = [
    calcularProgressao(penaTotal, diasCumpridos, diasRemidos, "hediondo_primario"),
    {
      ...calcularProgressao(penaTotal, diasCumpridos, diasRemidos, "comum_primario"),
      observacoes: "Se desclassificado para crime comum",
    },
  ];

  return {
    success: true,
    dadosExecucao: {
      id: "mock-001",
      numeroProcesso: "0001234-56.2022.8.05.0001",
      numeroExecucao,
      assistido: {
        nome: "João da Silva Santos",
        cpf: "123.456.789-00",
        nomeMae: "Maria da Silva",
        dataNascimento: new Date(1985, 3, 10),
      },
      regime: "fechado",
      estabelecimento: "Penitenciária Lemos Brito",
      comarca: "Salvador",
      vara: "Vara de Execuções Penais",
      situacao: "ativo",
    },
    calculoPena: {
      penaTotal,
      penaRestante: penaTotal - diasCumpridos - diasRemidos,
      diasCumpridos,
      diasRemidos,
      faltasGraves: 0,
      dataInicio,
      dataFimPrevista: adicionarDias(dataInicio, penaTotal - diasRemidos),
      ultimaAtualizacao: new Date(),
    },
    beneficios: [
      {
        id: "ben-001",
        tipo: "progressao",
        status: "pendente",
        dataSolicitacao: undefined,
        dataPreenchimentoRequisitos: adicionarDias(
          new Date(),
          requisitosProgressao[0].diasNecessarios - requisitosProgressao[0].diasCumpridos
        ),
      },
      {
        id: "ben-002",
        tipo: "remicao",
        status: "deferido",
        dataSolicitacao: new Date(2023, 8, 1),
        dataDecisao: new Date(2023, 8, 15),
        observacoes: "Remição por trabalho - 180 dias",
      },
    ],
    requisitosProgressao,
    faltas: [],
  };
}
