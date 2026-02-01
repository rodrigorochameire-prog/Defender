// Tipos de templates disponíveis
export enum TipoTemplate {
  JURI = "JURI",
  VD = "VD",
  EP = "EP",
  SUBSTITUICAO_DIAS_DAVILA = "SUBSTITUICAO_DIAS_DAVILA",
  CURADORIA = "CURADORIA",
  PROTOCOLO = "PROTOCOLO",
  PLENARIOS = "PLENARIOS",
  LIBERDADE = "LIBERDADE",
  CANDEIAS = "CANDEIAS",
}

// Status disponíveis no sistema (conforme especificação)
export const SYSTEM_STATUS_OPTIONS = [
  "Urgente",
  "Relatório",
  "Analisar",
  "Atender",
  "Buscar",
  "Investigar",
  "Elaborar",
  "Elaborando",
  "Revisar",
  "Revisando",
  "Protocolar",
  "Amanda",
  "Taíssa",
  "Emilly",
  "Monitorar",
  "Fila",
  "Documentos",
  "Testemunhas",
  "Protocolado",
  "Solar",
  "Ciência",
  "Resolvido",
  "Constituiu advogado",
  "Sem atuação",
];

// Situações prisionais completas (conforme especificação)
export const SITUACAO_PRISIONAL_OPTIONS = [
  // Geral
  "Solto",
  "Cadeia Pública",
  
  // Região Metropolitana de Salvador
  "CPMS",
  "COP",
  "Presídio Ssa",
  "PLB",
  "PFDB",
  "CPF",
  "HCT",
  "CASE Salvador",
  "CP Simões Filho",
  "CP Lauro de Freitas",
  
  // Região do Recôncavo
  "CP SAJ",
  "CP Cruz das Almas",
  "CP Cachoeira",
  "CP Valença",
  "CP Nazaré",
  
  // Região Norte/Nordeste
  "CP Feira",
  "CP Alagoinhas",
  "CP Serrinha",
  "CP Ribeira do Pombal",
  "CP Paulo Afonso",
  "CP Juazeiro",
  "CP Senhor do Bonfim",
  "CP Jacobina",
  "CP Irecê",
  
  // Região Sul
  "CP Itabuna",
  "CP Ilhéus",
  "CP Jequié",
  "CP Itapetinga",
  "CP Eunápolis",
  "CP Teixeira de Freitas",
  "CP Porto Seguro",
  
  // Região Oeste/Sudoeste
  "CP VC",
  "CP Barreiras",
  "CP Bom Jesus da Lapa",
  "CP Guanambi",
  "CP Brumado",
  "CP Livramento",
  
  // Unidades Especiais
  "Colônia Lafayete Coutinho",
  "URSA",
  "Casa do Albergado",
];

// Tipos de ato por atribuição (conforme especificação)
export const TIPOS_ATO = {
  JURI: [
    "Resposta à Acusação",
    "Alegações finais",
    "Apelação",
    "Contrarrazões de apelação",
    "Razões de apelação",
    "RESE",
    "Razões de RESE",
    "Diligências do 422",
    "Incidente de insanidade",
    "Revogação da prisão",
    "Relaxamento da prisão",
    "Habeas Corpus",
    "Restituição de coisa",
    "Ofício",
    "Ciência habilitação DPE",
    "Ciência de decisão",
    "Ciência da pronúncia",
    "Ciência da impronúncia",
    "Ciência da absolvição",
    "Ciência desclassificação",
    "Ciência da prescrição",
    "Ciência laudo de exame",
    "Ciência revogação prisão",
    "Ciência",
    "Outro",
    "Desaforamento",
    "Petição intermediária",
    "Prosseguimento do feito",
    "Atualização de endereço",
  ],
  VD: [
    "Resposta à Acusação",
    "Alegações finais",
    "Apelação",
    "Razões de apelação",
    "Contrarrazões de apelação",
    "Contrarrazões de RE",
    "Contrarrazões de ED",
    "Incidente de insanidade",
    "Revogação de medidas",
    "Modulação de MPU",
    "Revogação da prisão",
    "Relaxamento da prisão",
    "Habeas Corpus",
    "Revogação de monitoração",
    "Requerimento de progressão",
    "Requerimento audiência",
    "Mandado de Segurança",
    "Quesitos",
    "Ciência absolvição",
    "Ciência condenação",
    "Ciência de sentença",
    "Ciência de extinção",
    "Ciência habilitação DPE",
    "Ciência de decisão",
    "Ciência acórdão",
    "Outro",
    "Petição intermediária",
    "Prosseguimento do feito",
    "Atualização de endereço",
  ],
  EP: [
    "Audiência de justificação",
    "Designação admonitória",
    "Transferência de unidade",
    "Requerimento de progressão",
    "Indulto",
    "Petição intermediária",
    "Agravo em Execução",
    "Manifestação contrarrazões",
    "Atualização de endereço",
    "Ciência",
    "Ciência habilitação DPE",
    "Ciência de decisão",
    "Ciência reconversão",
    "Outro",
    "Ciência cumprimento",
    "Ciência morte",
    "Cumprimento ANPP",
    "Ciência regressão de regime",
    "Ciência indulto",
    "Ciência prescrição",
  ],
  SUBSTITUICAO: [
    "Resposta à Acusação",
    "Memoriais",
    "RESE",
    "Diligências do 422",
    "Apelação",
    "Razões de apelação",
    "Contrarrazões de apelação",
    "Contrarrazões de RE",
    "Interposição de Apelação",
    "Petição intermediária",
    "Relaxamento",
    "Revogação",
    "Relaxamento e revogação",
    "Revogação de MPU",
    "Habeas Corpus",
    "Mandado de Segurança",
    "Testemunhas",
    "Endereço do réu",
    "Outros",
    "Ciência de condenação",
    "Ciência da absolvição",
    "Ciência da pronúncia",
    "Ciência do acórdão",
    "Ciência da extinção",
    "Ciência",
    "Ciência LP",
    "Ciência habilitação DPE",
    "Ciência audiência",
    "Ciência Júri",
    "Ciência da revogação",
    "Ciência da redesignação",
    "Ciência constituição",
  ],
  CURADORIA: [
    "Contestação",
    "Alegações finais",
    "Apelação",
    "Razões de apelação",
    "Contrarrazões de apelação",
    "Contrarrazões de ED",
    "Ciência absolvição",
    "Ciência de sentença",
    "Ciência habilitação DPE",
    "Ciência de decisão",
    "Ciência acórdão",
    "Outro",
    "Petição intermediária",
    "Prosseguimento do feito",
    "Atualização de endereço",
  ],
};

// Definição de colunas por template
export interface TemplateColumn {
  key: string;
  label: string;
  width: string;
  type: "text" | "date" | "dropdown" | "badge" | "textarea";
  options?: string[];
}

// Templates disponíveis com configurações completas
export const TEMPLATE_CONFIGS: Record<TipoTemplate, {
  name: string;
  description: string;
  headerColor: string;
  headerTextColor: string;
  borderColor: string;
  columns: TemplateColumn[];
}> = {
  [TipoTemplate.JURI]: {
    name: "Júri",
    description: "Tribunal do Júri",
    headerColor: "#356854",
    headerTextColor: "#FFFFFF",
    borderColor: "#284E3F",
    columns: [
      { 
        key: "status", 
        label: "Status", 
        width: "129px", 
        type: "dropdown",
        options: SYSTEM_STATUS_OPTIONS
      },
      { 
        key: "estadoPrisional", 
        label: "Prisão", 
        width: "121px", 
        type: "dropdown",
        options: SITUACAO_PRISIONAL_OPTIONS
      },
      { key: "data", label: "Data", width: "91px", type: "date" },
      { key: "assistido", label: "Assistido", width: "169px", type: "text" },
      { key: "processos", label: "Autos", width: "187px", type: "text" },
      { 
        key: "ato", 
        label: "Ato", 
        width: "187px", 
        type: "dropdown",
        options: TIPOS_ATO.JURI
      },
      { key: "prazo", label: "Prazo", width: "99px", type: "text" },
      { key: "providencias", label: "Providências", width: "187px", type: "textarea" },
    ],
  },
  [TipoTemplate.VD]: {
    name: "Violência Doméstica",
    description: "Vara de VD",
    headerColor: "#356854",
    headerTextColor: "#FFFFFF",
    borderColor: "#284E3F",
    columns: [
      { 
        key: "status", 
        label: "Status", 
        width: "129px", 
        type: "dropdown",
        options: SYSTEM_STATUS_OPTIONS
      },
      { 
        key: "estadoPrisional", 
        label: "Prisão", 
        width: "121px", 
        type: "dropdown",
        options: SITUACAO_PRISIONAL_OPTIONS
      },
      { key: "data", label: "Data", width: "91px", type: "date" },
      { key: "assistido", label: "Assistido", width: "169px", type: "text" },
      { key: "processos", label: "Autos", width: "187px", type: "text" },
      { 
        key: "ato", 
        label: "Ato", 
        width: "187px", 
        type: "dropdown",
        options: TIPOS_ATO.VD
      },
      { key: "prazo", label: "Prazo", width: "99px", type: "text" },
      { key: "providencias", label: "Providências", width: "187px", type: "textarea" },
    ],
  },
  [TipoTemplate.EP]: {
    name: "EP",
    description: "Execução Penal",
    headerColor: "#356854",
    headerTextColor: "#FFFFFF",
    borderColor: "#284E3F",
    columns: [
      { 
        key: "status", 
        label: "Status", 
        width: "100px", 
        type: "dropdown",
        options: SYSTEM_STATUS_OPTIONS
      },
      { 
        key: "estadoPrisional", 
        label: "Prisão", 
        width: "86px", 
        type: "dropdown",
        options: SITUACAO_PRISIONAL_OPTIONS
      },
      { key: "data", label: "Data", width: "100px", type: "date" },
      { key: "assistido", label: "Parte", width: "249px", type: "text" },
      { key: "processos", label: "Processo", width: "200px", type: "text" },
      { 
        key: "ato", 
        label: "Assunto", 
        width: "122px", 
        type: "dropdown",
        options: TIPOS_ATO.EP
      },
      { key: "prazo", label: "Prazo", width: "100px", type: "text" },
      { key: "providencias", label: "Providência", width: "477px", type: "textarea" },
    ],
  },
  [TipoTemplate.SUBSTITUICAO_DIAS_DAVILA]: {
    name: "Substituição - Dias Dávila",
    description: "Substituições criminais",
    headerColor: "#535fc1",
    headerTextColor: "#FFFFFF",
    borderColor: "#4248a0",
    columns: [
      { 
        key: "status", 
        label: "Status", 
        width: "129px", 
        type: "dropdown",
        options: SYSTEM_STATUS_OPTIONS
      },
      { 
        key: "estadoPrisional", 
        label: "Prisão", 
        width: "121px", 
        type: "dropdown",
        options: SITUACAO_PRISIONAL_OPTIONS
      },
      { key: "data", label: "Data", width: "91px", type: "date" },
      { key: "assistido", label: "Assistido", width: "169px", type: "text" },
      { key: "processos", label: "Autos", width: "187px", type: "text" },
      { 
        key: "ato", 
        label: "Ato", 
        width: "187px", 
        type: "dropdown",
        options: TIPOS_ATO.SUBSTITUICAO
      },
      { key: "prazo", label: "Prazo", width: "99px", type: "text" },
      { key: "providencias", label: "Providências", width: "187px", type: "textarea" },
    ],
  },
  [TipoTemplate.CURADORIA]: {
    name: "Curadoria",
    description: "Curadoria especial",
    headerColor: "#356854",
    headerTextColor: "#FFFFFF",
    borderColor: "#284E3F",
    columns: [
      { 
        key: "status", 
        label: "Status", 
        width: "129px", 
        type: "dropdown",
        options: SYSTEM_STATUS_OPTIONS
      },
      { key: "data", label: "Data", width: "92px", type: "date" },
      { key: "assistido", label: "Parte", width: "249px", type: "text" },
      { key: "processos", label: "Processo", width: "200px", type: "text" },
      { 
        key: "ato", 
        label: "Assunto", 
        width: "122px", 
        type: "dropdown",
        options: TIPOS_ATO.CURADORIA
      },
      { key: "prazo", label: "Prazo", width: "100px", type: "text" },
      { key: "providencias", label: "Providências", width: "300px", type: "textarea" },
    ],
  },
  [TipoTemplate.PROTOCOLO]: {
    name: "Protocolo integrado",
    description: "Protocolos gerais",
    headerColor: "#FFFFFF",
    headerTextColor: "#434343",
    borderColor: "#E5E7EB",
    columns: [
      { key: "data", label: "DATA", width: "92px", type: "date" },
      { key: "assistido", label: "PARTE", width: "249px", type: "text" },
      { key: "processos", label: "PROCESSO", width: "200px", type: "text" },
      { key: "ato", label: "ASSUNTO", width: "122px", type: "text" },
      { key: "atribuicao", label: "ORIGEM", width: "191px", type: "text" },
    ],
  },
  [TipoTemplate.PLENARIOS]: {
    name: "Plenários",
    description: "Sessões do júri",
    headerColor: "#535fc1",
    headerTextColor: "#FFFFFF",
    borderColor: "#4248a0",
    columns: [
      { 
        key: "status", 
        label: "Status", 
        width: "129px", 
        type: "dropdown",
        options: SYSTEM_STATUS_OPTIONS
      },
      { key: "data", label: "Data", width: "91px", type: "date" },
      { key: "assistido", label: "Assistido", width: "169px", type: "text" },
      { key: "processos", label: "Autos", width: "187px", type: "text" },
      { key: "ato", label: "Sessão", width: "187px", type: "text" },
      { key: "prazo", label: "Horário", width: "99px", type: "text" },
      { key: "providencias", label: "Observações", width: "187px", type: "textarea" },
    ],
  },
  [TipoTemplate.LIBERDADE]: {
    name: "Liberdade",
    description: "Pedidos de liberdade",
    headerColor: "#356854",
    headerTextColor: "#FFFFFF",
    borderColor: "#284E3F",
    columns: [
      { 
        key: "status", 
        label: "Status", 
        width: "129px", 
        type: "dropdown",
        options: SYSTEM_STATUS_OPTIONS
      },
      { 
        key: "estadoPrisional", 
        label: "Prisão", 
        width: "121px", 
        type: "dropdown",
        options: SITUACAO_PRISIONAL_OPTIONS
      },
      { key: "data", label: "Data", width: "91px", type: "date" },
      { key: "assistido", label: "Assistido", width: "169px", type: "text" },
      { key: "processos", label: "Autos", width: "187px", type: "text" },
      { key: "ato", label: "Tipo de Pedido", width: "187px", type: "text" },
      { key: "prazo", label: "Prazo", width: "99px", type: "text" },
      { key: "providencias", label: "Providências", width: "187px", type: "textarea" },
    ],
  },
  [TipoTemplate.CANDEIAS]: {
    name: "Candeias",
    description: "Substituição Candeias",
    headerColor: "#535fc1",
    headerTextColor: "#FFFFFF",
    borderColor: "#4248a0",
    columns: [
      { 
        key: "status", 
        label: "Status", 
        width: "129px", 
        type: "dropdown",
        options: SYSTEM_STATUS_OPTIONS
      },
      { 
        key: "estadoPrisional", 
        label: "Prisão", 
        width: "121px", 
        type: "dropdown",
        options: SITUACAO_PRISIONAL_OPTIONS
      },
      { key: "data", label: "Data", width: "91px", type: "date" },
      { key: "assistido", label: "Assistido", width: "169px", type: "text" },
      { key: "processos", label: "Autos", width: "187px", type: "text" },
      { key: "ato", label: "Ato", width: "187px", type: "text" },
      { key: "prazo", label: "Prazo", width: "99px", type: "text" },
      { key: "providencias", label: "Providências", width: "187px", type: "textarea" },
    ],
  },
};

// Função para obter configuração do template
export function getTemplateConfig(tipo: TipoTemplate) {
  return TEMPLATE_CONFIGS[tipo];
}

// Função para obter headers CSV baseado no template
export function getTemplateHeaders(tipo: TipoTemplate): string[] {
  const config = TEMPLATE_CONFIGS[tipo];
  return config.columns.map(col => col.label);
}

// Função para obter dados de exemplo para template
export function getTemplateExampleRow(tipo: TipoTemplate): string[] {
  const config = TEMPLATE_CONFIGS[tipo];
  return config.columns.map(col => {
    switch (col.type) {
      case "date":
        return "28/01/26";
      case "badge":
        return col.options?.[0] || "";
      case "dropdown":
        return col.options?.[0] || "";
      case "text":
        return col.key === "processos" 
          ? "0000000-00.2026.8.05.0001" 
          : col.key === "assistido" 
          ? "João da Silva" 
          : "Exemplo";
      case "textarea":
        return "Texto de exemplo";
      default:
        return "";
    }
  });
}
