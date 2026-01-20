"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// ==========================================
// TIPOS DE ATRIBUIÇÃO
// ==========================================

export type Assignment = 
  | "JURI_CAMACARI"      // Vara do Júri Camaçari
  | "VVD_CAMACARI"       // Violência Doméstica
  | "EXECUCAO_PENAL"     // Execução Penal
  | "SUBSTITUICAO"       // Substituição Criminal
  | "SUBSTITUICAO_CIVEL" // Substituições Não Penais (Cível, Família, etc.)
  | "GRUPO_JURI";        // Grupo Especial do Júri

// ==========================================
// ESTRUTURA DE MENU
// ==========================================

export interface AssignmentMenuItem {
  label: string;
  path: string;
  icon: string;
  badge?: string;
  description?: string;
  isPremium?: boolean; // Para recursos avançados
}

export interface MenuSection {
  id: string;
  title: string;
  items: AssignmentMenuItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

// ==========================================
// BLOCO CENTRAL - MÓDULOS POR ESPECIALIDADE
// Contém apenas ferramentas específicas de cada especialidade
// Os itens gerais (Assistidos, Processos, Demandas) ficam no menu fixo superior
// ==========================================

// 🏛️ TRIBUNAL DO JÚRI - Ferramentas específicas
const JURI_MODULES: MenuSection[] = [
  {
    id: "plenario",
    title: "Plenário",
    items: [
      { label: "Sessões do Júri", path: "/admin/juri", icon: "Gavel", description: "Plenários agendados e realizados" },
      { label: "Plenário Live", path: "/admin/juri/cockpit", icon: "Zap", description: "Cockpit para o dia do julgamento", isPremium: true },
    ],
  },
  {
    id: "inteligencia",
    title: "Inteligência",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Banco de Jurados", path: "/admin/jurados", icon: "UserCheck", description: "Perfil e histórico de votações" },
      { label: "Profiler de Jurados", path: "/admin/jurados/profiler", icon: "Brain", description: "Score de empatia e análise", isPremium: true },
      { label: "Investigação & OSINT", path: "/admin/juri/investigacao", icon: "FileSearch", description: "Kanban de providências" },
      { label: "Matriz de Provas", path: "/admin/juri/provas", icon: "ClipboardCheck", description: "Contradições e tabela comparativa" },
      { label: "Teses do Júri", path: "/admin/juri/teses", icon: "Target", description: "Narrativa e teses defensivas" },
      { label: "Banco de Teses", path: "/admin/templates", icon: "FileText", description: "Petições de sucesso" },
      { label: "Laboratório de Oratória", path: "/admin/juri/laboratorio", icon: "Mic", description: "Vídeos e roteiros", isPremium: true },
    ],
  },
];

// 💜 VIOLÊNCIA DOMÉSTICA - Ferramentas específicas
const VVD_MODULES: MenuSection[] = [
  {
    id: "protecao",
    title: "Proteção",
    items: [
      { label: "Monitor de MPUs", path: "/admin/medidas", icon: "Shield", description: "Medidas próximas do vencimento" },
      { label: "Mapa de Risco", path: "/admin/medidas/risco", icon: "AlertTriangle", description: "Avaliação de vulnerabilidade", isPremium: true },
      { label: "Audiências de Custódia", path: "/admin/custodia", icon: "Lock" },
    ],
  },
  {
    id: "atendimento",
    title: "Atendimento",
    items: [
      { label: "Acolhimento", path: "/admin/atendimentos", icon: "Heart", description: "Registro de atendimentos" },
      { label: "Rede de Apoio", path: "/admin/defensoria", icon: "Users", description: "CREAS, CAPS, delegacias" },
    ],
  },
];

// ⛓️ EXECUÇÃO PENAL - Ferramentas específicas
const EP_MODULES: MenuSection[] = [
  {
    id: "beneficios",
    title: "Benefícios",
    items: [
      { label: "Calculadora SEEU", path: "/admin/calculadoras", icon: "Calculator", description: "Progressão, livramento, remição" },
      { label: "Simulador Visual", path: "/admin/progressoes", icon: "TrendingUp", description: "Arraste barras de tempo", isPremium: true },
      { label: "Painel de Benefícios", path: "/admin/beneficios", icon: "Award", description: "Status de todos os pedidos" },
    ],
  },
  {
    id: "unidades",
    title: "Unidades Prisionais",
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: "Inspeções", path: "/admin/custodia/inspecoes", icon: "ClipboardCheck", description: "Relatórios de condições" },
      { label: "Lotação", path: "/admin/custodia/lotacao", icon: "Building2", description: "Capacidade das unidades" },
    ],
  },
];

// 🔄 SUBSTITUIÇÃO CRIMINAL
const SUBSTITUICAO_MODULES: MenuSection[] = [
  {
    id: "ferramentas",
    title: "Ferramentas",
    items: [
      { label: "Kanban", path: "/admin/kanban", icon: "Columns3", description: "Visão em cards" },
      { label: "Banco de Teses", path: "/admin/templates", icon: "FileText" },
    ],
  },
];

// 🏆 GRUPO ESPECIAL DO JÚRI
const GRUPO_JURI_MODULES: MenuSection[] = [
  {
    id: "plenarios",
    title: "Plenários",
    items: [
      { label: "Próximas Sessões", path: "/admin/juri", icon: "Gavel" },
      { label: "Plenário Live", path: "/admin/juri/cockpit", icon: "Zap", isPremium: true },
      { label: "Histórico", path: "/admin/juri/historico", icon: "History" },
    ],
  },
  {
    id: "inteligencia",
    title: "Inteligência Avançada",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Banco de Jurados", path: "/admin/jurados", icon: "UserCheck" },
      { label: "Investigação & OSINT", path: "/admin/juri/investigacao", icon: "FileSearch" },
      { label: "Matriz de Provas", path: "/admin/juri/provas", icon: "ClipboardCheck" },
      { label: "Teses do Júri", path: "/admin/juri/teses", icon: "Target" },
      { label: "Estatísticas por Juiz", path: "/admin/relatorios/juizes", icon: "BarChart3", isPremium: true },
      { label: "Banco de Teses", path: "/admin/templates", icon: "FileText" },
      { label: "Análise de Desfechos", path: "/admin/relatorios/desfechos", icon: "PieChart", isPremium: true },
    ],
  },
];

// ⚖️ SUBSTITUIÇÃO CÍVEL
const CIVEL_MODULES: MenuSection[] = [
  {
    id: "ferramentas",
    title: "Ferramentas",
    items: [
      { label: "Kanban", path: "/admin/kanban", icon: "Columns3" },
      { label: "Conciliações", path: "/admin/audiencias?tipo=CONCILIACAO", icon: "Handshake" },
      { label: "Documentos", path: "/admin/documentos", icon: "FileText" },
    ],
  },
];

// ==========================================
// BLOCO SUPERIOR - MENU FIXO (CONTEXTO/GERAL)
// Itens gerais que aparecem em todas as especialidades
// ==========================================

export const CONTEXT_MENU_ITEMS: AssignmentMenuItem[] = [
  { label: "Dashboard", path: "/admin", icon: "LayoutDashboard" },
  { label: "Casos", path: "/admin/casos", icon: "Briefcase" },
  { label: "Demandas", path: "/admin/demandas", icon: "Clock" },
  { label: "Processos", path: "/admin/processos", icon: "Scale" },
  { label: "Assistidos", path: "/admin/assistidos", icon: "Users" },
  { label: "Agenda", path: "/admin/audiencias", icon: "Calendar" },
];

// ==========================================
// BLOCO INFERIOR - UTILIDADES (SEMPRE VISÍVEIS)
// ==========================================

export const UTILITIES_MENU: MenuSection[] = [
  {
    id: "comunicacao",
    title: "Comunicação",
    items: [
      { label: "WhatsApp Hub", path: "/admin/whatsapp", icon: "MessageCircle", description: "Notificações automáticas" },
      { label: "Notificações", path: "/admin/notifications", icon: "Bell" },
    ],
    collapsible: true,
    defaultOpen: false,
  },
  {
    id: "integracoes",
    title: "Integrações",
    items: [
      { label: "Google Drive", path: "/admin/drive", icon: "FolderOpen", description: "Arquivos sincronizados" },
      { label: "Automações n8n", path: "/admin/integracoes", icon: "Zap", description: "Fluxos e webhooks", isPremium: true },
      { label: "Calendário Google", path: "/admin/calendar", icon: "CalendarDays" },
    ],
    collapsible: true,
    defaultOpen: false,
  },
  {
    id: "sistema",
    title: "Sistema",
    items: [
      { label: "Configurações", path: "/admin/settings", icon: "Settings" },
      { label: "Workspaces", path: "/admin/workspaces", icon: "Building2", description: "Acessos e universos de dados" },
      { label: "Relatórios", path: "/admin/relatorios", icon: "BarChart3" },
    ],
    collapsible: true,
    defaultOpen: false,
  },
];

// Para compatibilidade com código legado
export const FIXED_MENU_ITEMS = CONTEXT_MENU_ITEMS;
export const SYSTEM_MENU_ITEMS = UTILITIES_MENU[2].items;

// ==========================================
// MAPEAMENTO DE MÓDULOS POR ESPECIALIDADE
// ==========================================

export const SPECIALTY_MODULES: Record<Assignment, MenuSection[]> = {
  JURI_CAMACARI: JURI_MODULES,
  VVD_CAMACARI: VVD_MODULES,
  EXECUCAO_PENAL: EP_MODULES,
  SUBSTITUICAO: SUBSTITUICAO_MODULES,
  SUBSTITUICAO_CIVEL: CIVEL_MODULES,
  GRUPO_JURI: GRUPO_JURI_MODULES,
};

// ==========================================
// CONFIGURAÇÃO VISUAL DE CADA ATRIBUIÇÃO
// ==========================================

export interface AssignmentConfig {
  id: Assignment;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  emoji: string;
  // Cores do tema
  accentColor: string;
  accentColorLight: string;
  accentColorDark: string;
  bgGradient: string;
  borderColor: string;
  // Cores da sidebar
  sidebarBg: string;
  sidebarBgDark: string;
  sidebarBorder: string;
  sidebarBorderDark: string;
  sidebarHeaderBg: string;
  sidebarHeaderBgDark: string;
  sidebarHover: string;
  sidebarHoverDark: string;
  sidebarActiveBg: string;
  sidebarActiveBgDark: string;
  sidebarActiveRing: string;
  sidebarActiveRingDark: string;
  sidebarTextMuted: string;
  sidebarTextMutedDark: string;
  sidebarDivider: string;
  sidebarDividerDark: string;
  // Funcionalidades
  features: string[];
  // Módulos (para compatibilidade)
  menuItems: AssignmentMenuItem[];
}

export const ASSIGNMENT_CONFIGS: Record<Assignment, AssignmentConfig> = {
  JURI_CAMACARI: {
    id: "JURI_CAMACARI",
    name: "Vara do Júri - Camaçari",
    shortName: "Júri Camaçari",
    description: "Processos do Tribunal do Júri da Comarca de Camaçari",
    icon: "Gavel",
    emoji: "🏛️",
    accentColor: "hsl(158, 55%, 42%)",
    accentColorLight: "hsl(158, 45%, 94%)",
    accentColorDark: "hsl(158, 50%, 32%)",
    bgGradient: "from-emerald-50/50 to-slate-50",
    borderColor: "border-emerald-200/60",
    sidebarBg: "linear-gradient(to bottom, hsl(155, 20%, 97%), hsl(155, 18%, 96%), hsl(158, 22%, 94%))",
    sidebarBgDark: "linear-gradient(to bottom, hsl(160, 18%, 7%), hsl(160, 16%, 6%), hsl(158, 20%, 8%))",
    sidebarBorder: "hsl(158, 25%, 85%)",
    sidebarBorderDark: "hsl(160, 20%, 18%)",
    sidebarHeaderBg: "linear-gradient(to right, hsl(158, 35%, 94%), hsl(155, 28%, 95%), hsl(158, 25%, 96%))",
    sidebarHeaderBgDark: "linear-gradient(to right, hsl(158, 25%, 10%), hsl(160, 20%, 9%), hsl(158, 22%, 8%))",
    sidebarHover: "hsl(158, 30%, 90%)",
    sidebarHoverDark: "hsl(158, 20%, 14%)",
    sidebarActiveBg: "linear-gradient(to right, hsl(158, 40%, 90%), hsl(158, 35%, 92%))",
    sidebarActiveBgDark: "linear-gradient(to right, hsl(158, 30%, 14%), hsl(158, 25%, 12%))",
    sidebarActiveRing: "hsl(158, 40%, 82%)",
    sidebarActiveRingDark: "hsl(158, 25%, 22%)",
    sidebarTextMuted: "hsl(160, 18%, 35%)",
    sidebarTextMutedDark: "hsl(150, 15%, 65%)",
    sidebarDivider: "hsl(158, 30%, 85%)",
    sidebarDividerDark: "hsl(160, 18%, 16%)",
    features: ["plenarios", "jurados", "memoriais", "quesitos", "cockpit"],
    menuItems: JURI_MODULES.flatMap(s => s.items),
  },
  VVD_CAMACARI: {
    id: "VVD_CAMACARI",
    name: "Violência Doméstica - Camaçari",
    shortName: "VVD Camaçari",
    description: "Vara de Violência Doméstica e Familiar",
    icon: "Shield",
    emoji: "💜",
    accentColor: "hsl(45, 85%, 48%)",
    accentColorLight: "hsl(45, 80%, 94%)",
    accentColorDark: "hsl(45, 80%, 38%)",
    bgGradient: "from-amber-50/50 to-slate-50",
    borderColor: "border-amber-200/60",
    sidebarBg: "linear-gradient(to bottom, hsl(48, 25%, 97%), hsl(45, 22%, 96%), hsl(42, 28%, 94%))",
    sidebarBgDark: "linear-gradient(to bottom, hsl(45, 15%, 7%), hsl(42, 12%, 6%), hsl(48, 18%, 8%))",
    sidebarBorder: "hsl(45, 30%, 82%)",
    sidebarBorderDark: "hsl(45, 18%, 18%)",
    sidebarHeaderBg: "linear-gradient(to right, hsl(45, 40%, 93%), hsl(48, 32%, 94%), hsl(42, 28%, 95%))",
    sidebarHeaderBgDark: "linear-gradient(to right, hsl(45, 22%, 10%), hsl(48, 18%, 9%), hsl(42, 20%, 8%))",
    sidebarHover: "hsl(45, 35%, 90%)",
    sidebarHoverDark: "hsl(45, 18%, 14%)",
    sidebarActiveBg: "linear-gradient(to right, hsl(45, 45%, 89%), hsl(48, 40%, 91%))",
    sidebarActiveBgDark: "linear-gradient(to right, hsl(45, 28%, 14%), hsl(48, 22%, 12%))",
    sidebarActiveRing: "hsl(45, 45%, 78%)",
    sidebarActiveRingDark: "hsl(45, 22%, 22%)",
    sidebarTextMuted: "hsl(45, 18%, 32%)",
    sidebarTextMutedDark: "hsl(48, 10%, 60%)",
    sidebarDivider: "hsl(45, 35%, 82%)",
    sidebarDividerDark: "hsl(45, 15%, 16%)",
    features: ["medidas_protetivas", "custodia", "flagrante", "risco", "mapa_risco"],
    menuItems: VVD_MODULES.flatMap(s => s.items),
  },
  EXECUCAO_PENAL: {
    id: "EXECUCAO_PENAL",
    name: "Execução Penal",
    shortName: "Exec. Penal",
    description: "Vara de Execução Penal - Benefícios e Incidentes",
    icon: "Lock",
    emoji: "⛓️",
    accentColor: "hsl(210, 65%, 50%)",
    accentColorLight: "hsl(210, 60%, 94%)",
    accentColorDark: "hsl(210, 60%, 38%)",
    bgGradient: "from-blue-50/50 to-slate-50",
    borderColor: "border-blue-200/60",
    sidebarBg: "linear-gradient(to bottom, hsl(210, 22%, 97%), hsl(215, 20%, 96%), hsl(205, 25%, 94%))",
    sidebarBgDark: "linear-gradient(to bottom, hsl(210, 18%, 7%), hsl(215, 15%, 6%), hsl(205, 20%, 8%))",
    sidebarBorder: "hsl(210, 28%, 84%)",
    sidebarBorderDark: "hsl(210, 18%, 18%)",
    sidebarHeaderBg: "linear-gradient(to right, hsl(210, 38%, 93%), hsl(215, 30%, 94%), hsl(205, 26%, 95%))",
    sidebarHeaderBgDark: "linear-gradient(to right, hsl(210, 24%, 10%), hsl(215, 20%, 9%), hsl(205, 22%, 8%))",
    sidebarHover: "hsl(210, 32%, 90%)",
    sidebarHoverDark: "hsl(210, 18%, 14%)",
    sidebarActiveBg: "linear-gradient(to right, hsl(210, 42%, 89%), hsl(215, 38%, 91%))",
    sidebarActiveBgDark: "linear-gradient(to right, hsl(210, 30%, 14%), hsl(215, 24%, 12%))",
    sidebarActiveRing: "hsl(210, 42%, 80%)",
    sidebarActiveRingDark: "hsl(210, 24%, 22%)",
    sidebarTextMuted: "hsl(210, 20%, 35%)",
    sidebarTextMutedDark: "hsl(215, 12%, 60%)",
    sidebarDivider: "hsl(210, 32%, 84%)",
    sidebarDividerDark: "hsl(210, 16%, 16%)",
    features: ["progressao", "livramento", "remicao", "indulto", "saida_temporaria", "simulador"],
    menuItems: EP_MODULES.flatMap(s => s.items),
  },
  SUBSTITUICAO: {
    id: "SUBSTITUICAO",
    name: "Substituição Criminal",
    shortName: "Subst. Criminal",
    description: "Atuação em substituição na área criminal",
    icon: "RefreshCw",
    emoji: "🔄",
    accentColor: "hsl(0, 65%, 50%)",
    accentColorLight: "hsl(0, 60%, 94%)",
    accentColorDark: "hsl(0, 60%, 38%)",
    bgGradient: "from-red-50/50 to-slate-50",
    borderColor: "border-red-200/60",
    sidebarBg: "linear-gradient(to bottom, hsl(0, 18%, 97%), hsl(355, 16%, 96%), hsl(5, 22%, 94%))",
    sidebarBgDark: "linear-gradient(to bottom, hsl(0, 14%, 7%), hsl(355, 12%, 6%), hsl(5, 16%, 8%))",
    sidebarBorder: "hsl(0, 25%, 85%)",
    sidebarBorderDark: "hsl(0, 16%, 18%)",
    sidebarHeaderBg: "linear-gradient(to right, hsl(0, 35%, 94%), hsl(355, 28%, 95%), hsl(5, 24%, 96%))",
    sidebarHeaderBgDark: "linear-gradient(to right, hsl(0, 22%, 10%), hsl(355, 18%, 9%), hsl(5, 20%, 8%))",
    sidebarHover: "hsl(0, 28%, 91%)",
    sidebarHoverDark: "hsl(0, 16%, 14%)",
    sidebarActiveBg: "linear-gradient(to right, hsl(0, 38%, 90%), hsl(355, 34%, 92%))",
    sidebarActiveBgDark: "linear-gradient(to right, hsl(0, 26%, 14%), hsl(355, 22%, 12%))",
    sidebarActiveRing: "hsl(0, 38%, 82%)",
    sidebarActiveRingDark: "hsl(0, 22%, 22%)",
    sidebarTextMuted: "hsl(0, 15%, 35%)",
    sidebarTextMutedDark: "hsl(355, 8%, 60%)",
    sidebarDivider: "hsl(0, 28%, 86%)",
    sidebarDividerDark: "hsl(0, 14%, 16%)",
    features: ["kanban", "prazos", "multicomarca"],
    menuItems: SUBSTITUICAO_MODULES.flatMap(s => s.items),
  },
  GRUPO_JURI: {
    id: "GRUPO_JURI",
    name: "Grupo Especial do Júri",
    shortName: "Grupo Júri",
    description: "Atuação em plenários pelo Estado da Bahia",
    icon: "Award",
    emoji: "🏆",
    accentColor: "hsl(25, 85%, 52%)",
    accentColorLight: "hsl(25, 80%, 94%)",
    accentColorDark: "hsl(25, 80%, 40%)",
    bgGradient: "from-orange-50/50 to-slate-50",
    borderColor: "border-orange-200/60",
    sidebarBg: "linear-gradient(to bottom, hsl(25, 22%, 97%), hsl(20, 20%, 96%), hsl(30, 26%, 94%))",
    sidebarBgDark: "linear-gradient(to bottom, hsl(25, 16%, 7%), hsl(20, 14%, 6%), hsl(30, 18%, 8%))",
    sidebarBorder: "hsl(25, 32%, 82%)",
    sidebarBorderDark: "hsl(25, 18%, 18%)",
    sidebarHeaderBg: "linear-gradient(to right, hsl(25, 42%, 92%), hsl(20, 35%, 93%), hsl(30, 30%, 94%))",
    sidebarHeaderBgDark: "linear-gradient(to right, hsl(25, 25%, 10%), hsl(20, 20%, 9%), hsl(30, 22%, 8%))",
    sidebarHover: "hsl(25, 38%, 89%)",
    sidebarHoverDark: "hsl(25, 18%, 14%)",
    sidebarActiveBg: "linear-gradient(to right, hsl(25, 48%, 88%), hsl(20, 44%, 90%))",
    sidebarActiveBgDark: "linear-gradient(to right, hsl(25, 32%, 14%), hsl(20, 28%, 12%))",
    sidebarActiveRing: "hsl(25, 48%, 76%)",
    sidebarActiveRingDark: "hsl(25, 26%, 22%)",
    sidebarTextMuted: "hsl(25, 18%, 32%)",
    sidebarTextMutedDark: "hsl(20, 12%, 60%)",
    sidebarDivider: "hsl(25, 36%, 82%)",
    sidebarDividerDark: "hsl(25, 16%, 16%)",
    features: ["plenarios_avancado", "banco_jurados", "estatisticas", "teses"],
    menuItems: GRUPO_JURI_MODULES.flatMap(s => s.items),
  },
  SUBSTITUICAO_CIVEL: {
    id: "SUBSTITUICAO_CIVEL",
    name: "Substituição Não Penal",
    shortName: "Subst. Cível",
    description: "Atuação em substituição nas áreas cível, família e outras",
    icon: "Scale",
    emoji: "⚖️",
    accentColor: "hsl(270, 55%, 55%)",
    accentColorLight: "hsl(270, 50%, 94%)",
    accentColorDark: "hsl(270, 50%, 42%)",
    bgGradient: "from-violet-50/50 to-slate-50",
    borderColor: "border-violet-200/60",
    sidebarBg: "linear-gradient(to bottom, hsl(270, 18%, 97%), hsl(265, 16%, 96%), hsl(275, 22%, 94%))",
    sidebarBgDark: "linear-gradient(to bottom, hsl(270, 14%, 7%), hsl(265, 12%, 6%), hsl(275, 16%, 8%))",
    sidebarBorder: "hsl(270, 26%, 84%)",
    sidebarBorderDark: "hsl(270, 16%, 18%)",
    sidebarHeaderBg: "linear-gradient(to right, hsl(270, 36%, 93%), hsl(265, 30%, 94%), hsl(275, 26%, 95%))",
    sidebarHeaderBgDark: "linear-gradient(to right, hsl(270, 22%, 10%), hsl(265, 18%, 9%), hsl(275, 20%, 8%))",
    sidebarHover: "hsl(270, 30%, 90%)",
    sidebarHoverDark: "hsl(270, 16%, 14%)",
    sidebarActiveBg: "linear-gradient(to right, hsl(270, 40%, 89%), hsl(265, 36%, 91%))",
    sidebarActiveBgDark: "linear-gradient(to right, hsl(270, 28%, 14%), hsl(265, 24%, 12%))",
    sidebarActiveRing: "hsl(270, 40%, 80%)",
    sidebarActiveRingDark: "hsl(270, 24%, 22%)",
    sidebarTextMuted: "hsl(270, 16%, 35%)",
    sidebarTextMutedDark: "hsl(265, 10%, 60%)",
    sidebarDivider: "hsl(270, 30%, 84%)",
    sidebarDividerDark: "hsl(270, 14%, 16%)",
    features: ["kanban", "prazos", "multicomarca", "civel", "familia"],
    menuItems: CIVEL_MODULES.flatMap(s => s.items),
  },
};

// ==========================================
// CONTEXTO
// ==========================================

interface AssignmentContextType {
  currentAssignment: Assignment;
  config: AssignmentConfig;
  modules: MenuSection[];
  setAssignment: (assignment: Assignment) => void;
  isLoading: boolean;
}

const AssignmentContext = createContext<AssignmentContextType | undefined>(undefined);

const STORAGE_KEY = "defesahub_current_assignment";

export function AssignmentProvider({ children }: { children: ReactNode }) {
  const [currentAssignment, setCurrentAssignment] = useState<Assignment>("SUBSTITUICAO");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in ASSIGNMENT_CONFIGS) {
      setCurrentAssignment(saved as Assignment);
    }
    setIsLoading(false);
  }, []);

  const setAssignment = useCallback((assignment: Assignment) => {
    setCurrentAssignment(assignment);
    localStorage.setItem(STORAGE_KEY, assignment);
  }, []);

  const config = ASSIGNMENT_CONFIGS[currentAssignment];
  const modules = SPECIALTY_MODULES[currentAssignment];

  return (
    <AssignmentContext.Provider
      value={{
        currentAssignment,
        config,
        modules,
        setAssignment,
        isLoading,
      }}
    >
      {children}
    </AssignmentContext.Provider>
  );
}

export function useAssignment() {
  const context = useContext(AssignmentContext);
  if (!context) {
    throw new Error("useAssignment must be used within AssignmentProvider");
  }
  return context;
}
