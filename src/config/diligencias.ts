/**
 * Configuração de Diligências Investigativas
 * Sistema de gestão de diligências para investigação criminal
 */

// Categorias de Diligências
export const CATEGORIAS_DILIGENCIA = {
  SOCIAL: {
    id: "SOCIAL",
    label: "Social",
    descricao: "Pesquisa em redes sociais e fontes abertas",
    icon: "Globe",
    cor: "blue",
  },
  CAMPO: {
    id: "CAMPO",
    label: "Campo",
    descricao: "Visitas presenciais e coleta de informações in loco",
    icon: "MapPin",
    cor: "green",
  },
  OFICIAL: {
    id: "OFICIAL",
    label: "Oficial",
    descricao: "Solicitações oficiais a órgãos públicos",
    icon: "FileText",
    cor: "purple",
  },
  GEO: {
    id: "GEO",
    label: "Geolocalização",
    descricao: "Análise de dados de localização e ERBs",
    icon: "MapPinned",
    cor: "orange",
  },
  TELEFONIA: {
    id: "TELEFONIA",
    label: "Telefonia",
    descricao: "Quebra de sigilo telefônico e análise de registros",
    icon: "Phone",
    cor: "rose",
  },
  DOCUMENTAL: {
    id: "DOCUMENTAL",
    label: "Documental",
    descricao: "Análise de documentos dos autos",
    icon: "Folder",
    cor: "zinc",
  },
  PERICIAL: {
    id: "PERICIAL",
    label: "Pericial",
    descricao: "Perícias e laudos técnicos",
    icon: "Microscope",
    cor: "cyan",
  },
  TESTEMUNHAL: {
    id: "TESTEMUNHAL",
    label: "Testemunhal",
    descricao: "Localização e preparação de testemunhas",
    icon: "Users",
    cor: "amber",
  },
} as const;

export type CategoriaDigilenciaKey = keyof typeof CATEGORIAS_DILIGENCIA;

// Status das Diligências
export const STATUS_DILIGENCIA = {
  NAO_INICIADA: {
    id: "NAO_INICIADA",
    label: "Não Iniciada",
    emoji: "⚪",
    cor: "zinc",
  },
  EM_ANDAMENTO: {
    id: "EM_ANDAMENTO",
    label: "Em Andamento",
    emoji: "🟡",
    cor: "amber",
  },
  AGUARDANDO: {
    id: "AGUARDANDO",
    label: "Aguardando",
    emoji: "🟠",
    cor: "orange",
  },
  CONCLUIDA: {
    id: "CONCLUIDA",
    label: "Concluída",
    emoji: "🟢",
    cor: "emerald",
  },
  INFRUTIFERA: {
    id: "INFRUTIFERA",
    label: "Infrutífera",
    emoji: "🔴",
    cor: "red",
  },
  CANCELADA: {
    id: "CANCELADA",
    label: "Cancelada",
    emoji: "⚫",
    cor: "zinc",
  },
} as const;

export type StatusDiligenciaKey = keyof typeof STATUS_DILIGENCIA;

// Tipos de Executor
export const EXECUTOR_DILIGENCIA = {
  DEFENSOR: {
    id: "DEFENSOR",
    label: "Defensor",
    descricao: "O próprio defensor realiza a diligência",
  },
  SERVIDOR: {
    id: "SERVIDOR",
    label: "Servidor",
    descricao: "Servidor da Defensoria Pública",
  },
  ESTAGIARIO: {
    id: "ESTAGIARIO",
    label: "Estagiário",
    descricao: "Delegado para estagiário de direito",
  },
  FAMILIA: {
    id: "FAMILIA",
    label: "Familiar",
    descricao: "Delegado para familiar do assistido",
  },
  INFORMANTE: {
    id: "INFORMANTE",
    label: "Informante",
    descricao: "Pessoa com informações relevantes sobre o caso",
  },
  INVESTIGADOR: {
    id: "INVESTIGADOR",
    label: "Investigador",
    descricao: "Investigador particular contratado",
  },
  ASSISTIDO: {
    id: "ASSISTIDO",
    label: "Assistido",
    descricao: "O próprio assistido (se solto)",
  },
  PERITO: {
    id: "PERITO",
    label: "Perito",
    descricao: "Perito ou assistente técnico",
  },
} as const;

export type ExecutorDiligenciaKey = keyof typeof EXECUTOR_DILIGENCIA;

// Fontes OSINT
export const FONTES_OSINT = [
  { id: "jusbrasil", label: "Jusbrasil", url: "https://www.jusbrasil.com.br/busca?q={query}", categoria: "JURIDICO" },
  { id: "escavador", label: "Escavador", url: "https://www.escavador.com/busca?q={query}", categoria: "JURIDICO" },
  { id: "facebook", label: "Facebook", url: "https://www.facebook.com/search/top/?q={query}", categoria: "SOCIAL" },
  { id: "instagram", label: "Instagram", url: "https://www.instagram.com/explore/tags/{query}", categoria: "SOCIAL" },
  { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/search/results/all/?keywords={query}", categoria: "SOCIAL" },
  { id: "tiktok", label: "TikTok", url: "https://www.tiktok.com/search?q={query}", categoria: "SOCIAL" },
  { id: "twitter", label: "X/Twitter", url: "https://twitter.com/search?q={query}", categoria: "SOCIAL" },
  { id: "google", label: "Google", url: "https://www.google.com/search?q={query}", categoria: "GERAL" },
  { id: "google_images", label: "Google Imagens", url: "https://www.google.com/search?tbm=isch&q={query}", categoria: "GERAL" },
  { id: "google_maps", label: "Google Maps", url: "https://www.google.com/maps/search/{query}", categoria: "GEO" },
  { id: "google_street", label: "Street View", url: "https://www.google.com/maps/@?api=1&map_action=pano&query={query}", categoria: "GEO" },
  { id: "transparencia", label: "Portal Transparência", url: "https://portaldatransparencia.gov.br/busca?termo={query}", categoria: "OFICIAL" },
  { id: "diario_oficial", label: "Diário Oficial", url: "https://www.jusbrasil.com.br/diarios/busca?q={query}", categoria: "OFICIAL" },
  { id: "receita", label: "Receita Federal (CNPJ)", url: "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp", categoria: "OFICIAL" },
  { id: "siel", label: "SIEL (BA)", url: "https://siel.ba.gov.br/", categoria: "OFICIAL" },
  { id: "infopen", label: "INFOPEN", url: "https://www.gov.br/senappen/pt-br/servicos/sisdepen", categoria: "OFICIAL" },
  { id: "wayback", label: "Wayback Machine", url: "https://web.archive.org/web/*/{query}", categoria: "ARQUIVO" },
  { id: "whois", label: "Whois", url: "https://who.is/whois/{query}", categoria: "TECNICO" },
  { id: "hunter", label: "Hunter.io", url: "https://hunter.io/search/{query}", categoria: "TECNICO" },
] as const;

// Checklists pré-definidos por categoria
export const CHECKLISTS_DILIGENCIA: Record<CategoriaDigilenciaKey, string[]> = {
  SOCIAL: [
    "Pesquisar nome completo nas redes",
    "Verificar perfis de familiares",
    "Analisar fotos e postagens relevantes",
    "Identificar círculo social",
    "Salvar prints com data/hora",
  ],
  CAMPO: [
    "Identificar endereço exato",
    "Verificar existência do local no Google Maps",
    "Planejar rota de acesso",
    "Preparar perguntas para testemunhas",
    "Documentar com fotos/vídeos",
    "Solicitar contato para depoimento",
  ],
  OFICIAL: [
    "Elaborar ofício requisitório",
    "Protocolar no órgão competente",
    "Controlar prazo de resposta",
    "Analisar resposta recebida",
    "Verificar necessidade de reiteração",
  ],
  GEO: [
    "Identificar ERBs próximas ao local",
    "Mapear trajeto alegado",
    "Verificar câmeras de segurança na região",
    "Analisar tempo de deslocamento",
    "Cruzar com dados de telefonia (se disponível)",
  ],
  TELEFONIA: [
    "Verificar se há quebra de sigilo nos autos",
    "Analisar histórico de chamadas",
    "Identificar números relevantes",
    "Mapear ERBs acionadas",
    "Cruzar com timeline dos fatos",
  ],
  DOCUMENTAL: [
    "Analisar laudos periciais",
    "Verificar contradições nos depoimentos",
    "Identificar documentos faltantes",
    "Listar inconsistências",
    "Preparar quesitos complementares",
  ],
  PERICIAL: [
    "Identificar tipo de perícia necessária",
    "Elaborar quesitos técnicos",
    "Verificar necessidade de assistente técnico",
    "Analisar laudo oficial",
    "Identificar contradições técnicas",
  ],
  TESTEMUNHAL: [
    "Identificar potenciais testemunhas",
    "Obter contatos",
    "Verificar disposição para depor",
    "Preparar orientações para audiência",
    "Verificar possíveis contradições com acusação",
  ],
};

// Templates de ofícios por categoria
export const TEMPLATES_OFICIOS: Record<string, { titulo: string; destinatario: string; prazo: string }[]> = {
  OFICIAL: [
    { titulo: "Requisição de prontuário hospitalar", destinatario: "Hospital/UPA", prazo: "10 dias" },
    { titulo: "Requisição de imagens de câmeras", destinatario: "Órgão de trânsito/Empresa", prazo: "15 dias" },
    { titulo: "Requisição de antecedentes da vítima", destinatario: "SSP/Polícia Civil", prazo: "10 dias" },
    { titulo: "Requisição de dados de telecomunicações", destinatario: "Operadora de telefonia", prazo: "15 dias" },
    { titulo: "Requisição INFOPEN", destinatario: "SEAP/SAP", prazo: "10 dias" },
  ],
  PERICIAL: [
    { titulo: "Indicação de assistente técnico", destinatario: "Juízo", prazo: "5 dias" },
    { titulo: "Formulação de quesitos complementares", destinatario: "Juízo", prazo: "5 dias" },
    { titulo: "Requisição de contraprova pericial", destinatario: "Juízo", prazo: "5 dias" },
  ],
};

// Tipo para uma diligência
export interface Diligencia {
  id: string;
  casoId?: number;
  assistidoId?: number;
  processoId?: number;

  titulo: string;
  descricao?: string;
  categoria: CategoriaDigilenciaKey;
  status: StatusDiligenciaKey;

  executor?: ExecutorDiligenciaKey;
  executorNome?: string;
  executorContato?: string;

  dataInicio?: string;
  dataConclusao?: string;
  prazo?: string;

  checklist?: { id: string; texto: string; concluido: boolean }[];
  notas?: string;
  resultado?: string;

  arquivos?: { id: string; nome: string; url?: string }[];

  createdAt: string;
  updatedAt: string;
}

// Opções para dropdowns
export const CATEGORIA_OPTIONS = Object.values(CATEGORIAS_DILIGENCIA).map(c => ({
  value: c.id,
  label: c.label,
}));

export const STATUS_OPTIONS = Object.values(STATUS_DILIGENCIA).map(s => ({
  value: s.id,
  label: `${s.emoji} ${s.label}`,
}));

export const EXECUTOR_OPTIONS = Object.values(EXECUTOR_DILIGENCIA).map(e => ({
  value: e.id,
  label: e.label,
}));
