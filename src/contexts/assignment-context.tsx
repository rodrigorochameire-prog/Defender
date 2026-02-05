"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  DEFENSORES_CONFIG,
  getAtribuicoesDefensor,
  getParceiroEquipe,
  type DefensorConfig
} from "@/config/defensores";

// ==========================================
// TIPOS DE ATRIBUIÇÃO
// ==========================================

export type Assignment = 
  | "JURI_CAMACARI"        // Vara do Júri Camaçari
  | "VVD_CAMACARI"         // Violência Doméstica
  | "EXECUCAO_PENAL"       // Execução Penal
  | "GRUPO_JURI"           // Grupo Especial do Júri (após Execução Penal)
  | "SUBSTITUICAO"         // Substituição Criminal
  | "SUBSTITUICAO_CIVEL"   // Substituições Não Penais (Cível, Família, etc.)
  | "CURADORIA"            // Curadoria Especial
  | "PETICIONAMENTO";      // Peticionamento Integrado (PJe, SAJ, etc.)

// ==========================================
// CATEGORIAS DE ATRIBUIÇÃO
// ==========================================

export type AssignmentCategory = "ORDINARIA" | "SUBSTITUICAO" | "FERRAMENTA";

export interface AssignmentCategoryConfig {
  id: AssignmentCategory;
  label: string;
  description: string;
  assignments: Assignment[];
}

// ==========================================
// ESTRUTURA DE MENU
// ==========================================

export type UserRole = "admin" | "defensor" | "servidor" | "estagiario" | "triagem";

export interface AssignmentMenuItem {
  label: string;
  path: string;
  icon: string;
  badge?: string;
  description?: string;
  isPremium?: boolean; // Para recursos avançados
  requiredRoles?: UserRole[]; // Roles que podem acessar este item
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

// TRIBUNAL DO JÚRI - Ferramentas específicas
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
    id: "jurados",
    title: "Jurados",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Banco de Jurados", path: "/admin/juri/jurados", icon: "Users", description: "Perfis psicológicos e análise comportamental" },
      { label: "Mapa de Afinidades", path: "/admin/juri/jurados?tab=afinidades", icon: "Network", description: "Grupos e influências entre jurados" },
    ],
  },
  {
    id: "estrategia",
    title: "Estratégia",
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: "Matriz de Provas", path: "/admin/juri/provas", icon: "ClipboardCheck", description: "Contradições e tabela comparativa" },
      { label: "Teses do Júri", path: "/admin/juri/teses", icon: "Target", description: "Narrativa e teses defensivas" },
      { label: "Laboratório de Oratória", path: "/admin/juri/laboratorio", icon: "Mic", description: "Treino de sustentação oral", isPremium: true },
    ],
  },
];

// 💜 VIOLÊNCIA DOMÉSTICA - Ferramentas específicas
const VVD_MODULES: MenuSection[] = [
  {
    id: "mpu",
    title: "Medidas Protetivas",
    items: [
      { label: "Painel de MPUs", path: "/admin/vvd", icon: "Shield", description: "Dashboard e visão geral das medidas" },
      { label: "Intimações", path: "/admin/vvd/intimacoes", icon: "Bell", description: "Prazos e ciências pendentes" },
      { label: "Processos VVD", path: "/admin/vvd/processos", icon: "FileText", description: "Processos de medidas protetivas" },
      { label: "Partes", path: "/admin/vvd/partes", icon: "Users", description: "Autores e vítimas cadastrados" },
    ],
  },
  {
    id: "analise",
    title: "Análise",
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: "Mapa de Risco", path: "/admin/vvd/risco", icon: "AlertTriangle", description: "Avaliação de vulnerabilidade", isPremium: true },
      { label: "Estatísticas", path: "/admin/vvd/stats", icon: "BarChart", description: "Relatórios e indicadores", isPremium: true },
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

// SUBSTITUIÇÃO CRIMINAL
const SUBSTITUICAO_MODULES: MenuSection[] = [
  // Módulos específicos removidos - usando apenas menu principal
];

// 🏆 GRUPO ESPECIAL DO JÚRI
const GRUPO_JURI_MODULES: MenuSection[] = [
  {
    id: "plenarios",
    title: "Plenários",
    items: [
      { label: "Sessões do Júri", path: "/admin/juri", icon: "Gavel" },
      { label: "Plenário Live", path: "/admin/juri/cockpit", icon: "Zap", isPremium: true },
      { label: "Histórico", path: "/admin/juri/historico", icon: "History" },
    ],
  },
  {
    id: "jurados",
    title: "Jurados",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Banco de Jurados", path: "/admin/juri/jurados", icon: "Users", description: "Perfis psicológicos e análise" },
      { label: "Mapa de Afinidades", path: "/admin/juri/jurados?tab=afinidades", icon: "Network", description: "Grupos entre jurados" },
    ],
  },
  {
    id: "estrategia",
    title: "Estratégia",
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: "Matriz de Provas", path: "/admin/juri/provas", icon: "ClipboardCheck" },
      { label: "Teses do Júri", path: "/admin/juri/teses", icon: "Target" },
      { label: "Laboratório de Oratória", path: "/admin/juri/laboratorio", icon: "Mic", isPremium: true },
    ],
  },
  {
    id: "relatorios",
    title: "Relatórios",
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: "Estatísticas por Juiz", path: "/admin/relatorios/juizes", icon: "BarChart3", isPremium: true },
      { label: "Análise de Desfechos", path: "/admin/relatorios/desfechos", icon: "PieChart", isPremium: true },
    ],
  },
];

// SUBSTITUIÇÃO CÍVEL
const CIVEL_MODULES: MenuSection[] = [
  {
    id: "ferramentas",
    title: "Ferramentas",
    items: [
      { label: "Conciliações", path: "/admin/audiencias?tipo=CONCILIACAO", icon: "Handshake" },
      { label: "Documentos", path: "/admin/documentos", icon: "FileText" },
    ],
  },
];

// 🎓 CURADORIA ESPECIAL
const CURADORIA_MODULES: MenuSection[] = [
  {
    id: "curatelados",
    title: "Curatelados",
    items: [
      { label: "Painel de Curatelados", path: "/admin/curadoria", icon: "Users", description: "Gestão de curatelados" },
      { label: "Relatórios Mensais", path: "/admin/curadoria/relatorios", icon: "FileText", description: "Prestação de contas" },
      { label: "Patrimônio", path: "/admin/curadoria/patrimonio", icon: "Building2", description: "Bens e imóveis" },
    ],
  },
  {
    id: "audiencias_curadoria",
    title: "Audiências",
    collapsible: true,
    defaultOpen: false,
    items: [
      { label: "Interdições", path: "/admin/curadoria/interdicoes", icon: "Scale" },
      { label: "Tomadas de Decisão", path: "/admin/curadoria/decisoes", icon: "ClipboardCheck" },
    ],
  },
];

// 📝 PETICIONAMENTO INTEGRADO
const PETICIONAMENTO_MODULES: MenuSection[] = [
  {
    id: "sistemas",
    title: "Sistemas Judiciais",
    items: [
      { label: "PJe", path: "/admin/peticionamento/pje", icon: "Scale", description: "Processo Judicial Eletrônico" },
      { label: "SAJ", path: "/admin/peticionamento/saj", icon: "FileText", description: "Sistema de Automação da Justiça" },
      { label: "e-SAJ", path: "/admin/peticionamento/esaj", icon: "Zap", description: "Portal de Serviços" },
      { label: "SEEU", path: "/admin/peticionamento/seeu", icon: "Lock", description: "Execução Penal Unificado" },
    ],
  },
  {
    id: "modelos",
    title: "Modelos & Templates",
    collapsible: true,
    defaultOpen: true,
    items: [
      { label: "Banco de Peças", path: "/admin/pecas", icon: "FolderOpen", description: "Templates organizados" },
      { label: "Gerador IA", path: "/admin/peticionamento/ia", icon: "Sparkles", description: "Geração assistida por IA", isPremium: true },
      { label: "Histórico de Envios", path: "/admin/peticionamento/historico", icon: "History" },
    ],
  },
];

// ==========================================
// BLOCO SUPERIOR - MENU FIXO (CONTEXTO/GERAL)
// Itens gerais que aparecem em todas as especialidades
// ==========================================

export const CONTEXT_MENU_ITEMS: AssignmentMenuItem[] = [
  { label: "Dashboard", path: "/admin", icon: "LayoutDashboard", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Demandas", path: "/admin/demandas", icon: "ListTodo", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Agenda", path: "/admin/agenda", icon: "Calendar", description: "Agenda completa de eventos", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Casos", path: "/admin/casos", icon: "Briefcase", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Assistidos", path: "/admin/assistidos", icon: "Users", requiredRoles: ["admin", "defensor", "servidor", "estagiario", "triagem"] },
  { label: "Processos", path: "/admin/processos", icon: "Scale", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Drive", path: "/admin/drive", icon: "FolderOpen", description: "Arquivos e documentos", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Modelos", path: "/admin/modelos", icon: "FileStack", description: "Banco de modelos de documentos", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Investigação", path: "/admin/diligencias", icon: "FileSearch", description: "Diligências e OSINT", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Lógica", path: "/admin/logica", icon: "Brain", description: "Contradições e teses", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Equipe", path: "/admin/equipe", icon: "UsersRound", description: "Gestão da equipe", requiredRoles: ["admin", "defensor", "servidor"] },
];

// ==========================================
// BLOCO INFERIOR - UTILIDADES (SEMPRE VISÍVEIS)
// ==========================================

export const UTILITIES_MENU: MenuSection[] = [
  {
    id: "comunicacao",
    title: "Comunicação",
    items: [
      { label: "Chat WhatsApp", path: "/admin/whatsapp/chat", icon: "MessageSquare", description: "Conversas em tempo real" },
      { label: "WhatsApp Hub", path: "/admin/whatsapp", icon: "MessageCircle", description: "Configurações e templates" },
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
      { label: "Usuários", path: "/admin/usuarios", icon: "Users", description: "Gerenciar acessos", requiredRoles: ["admin"] },
      { label: "Preview Perfis", path: "/admin/preview-perfis", icon: "UserCheck", description: "Visualizar dashboards por perfil", requiredRoles: ["admin"] },
      { label: "Configurações", path: "/admin/settings", icon: "Settings", requiredRoles: ["admin", "defensor"] },
      { label: "Banco de Dados", path: "/admin/settings/dados", icon: "FolderOpen", description: "Monitor e gestão de dados", requiredRoles: ["admin", "defensor"] },
      { label: "Workspaces", path: "/admin/workspaces", icon: "Building2", description: "Acessos e universos de dados", requiredRoles: ["admin"] },
      { label: "Relatórios", path: "/admin/relatorios", icon: "BarChart3", requiredRoles: ["admin", "defensor"] },
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
  CURADORIA: CURADORIA_MODULES,
  PETICIONAMENTO: PETICIONAMENTO_MODULES,
};

// ==========================================
// CATEGORIAS DE ATRIBUIÇÃO (para o switcher)
// ==========================================

export const ASSIGNMENT_CATEGORIES: AssignmentCategoryConfig[] = [
  {
    id: "ORDINARIA",
    label: "Atribuições Ordinárias",
    description: "Funções regulares da Defensoria",
    assignments: ["JURI_CAMACARI", "VVD_CAMACARI", "EXECUCAO_PENAL"],
  },
  {
    id: "SUBSTITUICAO",
    label: "Substituições",
    description: "Atuação em substituição temporária",
    assignments: ["SUBSTITUICAO", "SUBSTITUICAO_CIVEL", "GRUPO_JURI"],
  },
  {
    id: "FERRAMENTA",
    label: "Ferramentas Especiais",
    description: "Módulos de produtividade",
    assignments: ["CURADORIA", "PETICIONAMENTO"],
  },
];

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
        accentColor: "hsl(220, 10%, 45%)",
    accentColorLight: "hsl(220, 8%, 95%)",
    accentColorDark: "hsl(220, 12%, 35%)",
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
    shortName: "Violência Doméstica",
    description: "Vara de Violência Doméstica e Familiar",
    icon: "Shield",
    emoji: "💜",
    accentColor: "hsl(220, 10%, 48%)",
    accentColorLight: "hsl(220, 8%, 95%)",
    accentColorDark: "hsl(220, 12%, 38%)",
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
    accentColor: "hsl(220, 10%, 50%)",
    accentColorLight: "hsl(220, 8%, 95%)",
    accentColorDark: "hsl(220, 12%, 40%)",
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
    name: "Criminal Geral",
    shortName: "Criminal Geral",
    description: "Atuação em varas criminais comuns",
    icon: "RefreshCw",
        accentColor: "hsl(220, 10%, 47%)",
    accentColorLight: "hsl(220, 8%, 95%)",
    accentColorDark: "hsl(220, 12%, 37%)",
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
    features: ["prazos", "multicomarca"],
    menuItems: SUBSTITUICAO_MODULES.flatMap(s => s.items),
  },
  GRUPO_JURI: {
    id: "GRUPO_JURI",
    name: "Grupo Especial do Júri",
    shortName: "Grupo Júri",
    description: "Atuação em plenários pelo Estado da Bahia",
    icon: "Award",
    emoji: "🏆",
    accentColor: "hsl(220, 10%, 52%)",
    accentColorLight: "hsl(220, 8%, 95%)",
    accentColorDark: "hsl(220, 12%, 42%)",
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
        accentColor: "hsl(220, 10%, 50%)",
    accentColorLight: "hsl(220, 8%, 95%)",
    accentColorDark: "hsl(220, 12%, 40%)",
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
    features: ["prazos", "multicomarca", "civel", "familia"],
    menuItems: CIVEL_MODULES.flatMap(s => s.items),
  },
  CURADORIA: {
    id: "CURADORIA",
    name: "Curadoria Especial",
    shortName: "Curadoria",
    description: "Gestão de curatelados e interdições",
    icon: "UserCheck",
    emoji: "🎓",
    accentColor: "hsl(220, 10%, 48%)",
    accentColorLight: "hsl(220, 8%, 95%)",
    accentColorDark: "hsl(220, 12%, 38%)",
    bgGradient: "from-cyan-50/50 to-slate-50",
    borderColor: "border-cyan-200/60",
    sidebarBg: "linear-gradient(to bottom, hsl(180, 20%, 97%), hsl(175, 18%, 96%), hsl(185, 24%, 94%))",
    sidebarBgDark: "linear-gradient(to bottom, hsl(180, 16%, 7%), hsl(175, 14%, 6%), hsl(185, 18%, 8%))",
    sidebarBorder: "hsl(180, 28%, 84%)",
    sidebarBorderDark: "hsl(180, 18%, 18%)",
    sidebarHeaderBg: "linear-gradient(to right, hsl(180, 38%, 93%), hsl(175, 32%, 94%), hsl(185, 28%, 95%))",
    sidebarHeaderBgDark: "linear-gradient(to right, hsl(180, 24%, 10%), hsl(175, 20%, 9%), hsl(185, 22%, 8%))",
    sidebarHover: "hsl(180, 32%, 90%)",
    sidebarHoverDark: "hsl(180, 18%, 14%)",
    sidebarActiveBg: "linear-gradient(to right, hsl(180, 42%, 89%), hsl(175, 38%, 91%))",
    sidebarActiveBgDark: "linear-gradient(to right, hsl(180, 30%, 14%), hsl(175, 26%, 12%))",
    sidebarActiveRing: "hsl(180, 42%, 80%)",
    sidebarActiveRingDark: "hsl(180, 26%, 22%)",
    sidebarTextMuted: "hsl(180, 18%, 35%)",
    sidebarTextMutedDark: "hsl(175, 12%, 60%)",
    sidebarDivider: "hsl(180, 32%, 84%)",
    sidebarDividerDark: "hsl(180, 16%, 16%)",
    features: ["curatelados", "patrimonio", "relatorios", "interdicoes"],
    menuItems: CURADORIA_MODULES.flatMap(s => s.items),
  },
  PETICIONAMENTO: {
    id: "PETICIONAMENTO",
    name: "Peticionamento Integrado",
    shortName: "Peticionamento",
    description: "Integração com sistemas judiciais (PJe, SAJ, SEEU)",
    icon: "FileText",
    emoji: "📝",
    accentColor: "hsl(220, 10%, 53%)",
    accentColorLight: "hsl(220, 8%, 95%)",
    accentColorDark: "hsl(220, 12%, 43%)",
    bgGradient: "from-indigo-50/50 to-slate-50",
    borderColor: "border-indigo-200/60",
    sidebarBg: "linear-gradient(to bottom, hsl(220, 22%, 97%), hsl(225, 20%, 96%), hsl(215, 26%, 94%))",
    sidebarBgDark: "linear-gradient(to bottom, hsl(220, 18%, 7%), hsl(225, 16%, 6%), hsl(215, 20%, 8%))",
    sidebarBorder: "hsl(220, 30%, 84%)",
    sidebarBorderDark: "hsl(220, 20%, 18%)",
    sidebarHeaderBg: "linear-gradient(to right, hsl(220, 40%, 93%), hsl(225, 34%, 94%), hsl(215, 30%, 95%))",
    sidebarHeaderBgDark: "linear-gradient(to right, hsl(220, 26%, 10%), hsl(225, 22%, 9%), hsl(215, 24%, 8%))",
    sidebarHover: "hsl(220, 34%, 90%)",
    sidebarHoverDark: "hsl(220, 20%, 14%)",
    sidebarActiveBg: "linear-gradient(to right, hsl(220, 44%, 89%), hsl(225, 40%, 91%))",
    sidebarActiveBgDark: "linear-gradient(to right, hsl(220, 32%, 14%), hsl(225, 28%, 12%))",
    sidebarActiveRing: "hsl(220, 44%, 80%)",
    sidebarActiveRingDark: "hsl(220, 28%, 22%)",
    sidebarTextMuted: "hsl(220, 20%, 35%)",
    sidebarTextMutedDark: "hsl(225, 14%, 60%)",
    sidebarDivider: "hsl(220, 34%, 84%)",
    sidebarDividerDark: "hsl(220, 18%, 16%)",
    features: ["pje", "saj", "seeu", "pecas", "ia"],
    menuItems: PETICIONAMENTO_MODULES.flatMap(s => s.items),
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
  // Novos campos para configuração por defensor
  defensor: DefensorConfig | null;
  atribuicoesDisponiveis: Assignment[];
  parceiro: DefensorConfig | null;
  temDemandasCompartilhadas: boolean;
}

const AssignmentContext = createContext<AssignmentContextType | undefined>(undefined);

const STORAGE_KEY = "defesahub_current_assignment";
const DEFENSOR_STORAGE_KEY = "defesahub_defensor_id";

export function AssignmentProvider({ children }: { children: ReactNode }) {
  const [currentAssignment, setCurrentAssignment] = useState<Assignment>("SUBSTITUICAO");
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [defensorId, setDefensorId] = useState<string | null>(null);

  // Carrega configurações do localStorage
  useEffect(() => {
    setMounted(true);

    // Carrega defensor salvo
    const savedDefensor = localStorage.getItem(DEFENSOR_STORAGE_KEY);
    if (savedDefensor) {
      setDefensorId(savedDefensor);
    }

    // Carrega atribuição salva
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in ASSIGNMENT_CONFIGS) {
      setCurrentAssignment(saved as Assignment);
    } else if (savedDefensor) {
      // Se não tem atribuição salva mas tem defensor, usa a principal dele
      const defensorConfig = DEFENSORES_CONFIG[savedDefensor];
      if (defensorConfig) {
        setCurrentAssignment(defensorConfig.atribuicaoPrincipal);
      }
    }

    setIsLoading(false);
  }, []);

  const setAssignment = useCallback((assignment: Assignment) => {
    setCurrentAssignment(assignment);
    localStorage.setItem(STORAGE_KEY, assignment);
  }, []);

  // Obtém configuração do defensor
  const defensor = defensorId ? DEFENSORES_CONFIG[defensorId] || null : null;

  // Atribuições disponíveis baseadas no defensor
  const atribuicoesDisponiveis = defensor
    ? getAtribuicoesDefensor(defensor.id)
    : Object.keys(ASSIGNMENT_CONFIGS) as Assignment[];

  // Parceiro de equipe
  const parceiro = defensor ? getParceiroEquipe(defensor.id) || null : null;
  const temDemandasCompartilhadas = defensor?.equipe?.demandasCompartilhadas || false;

  // Durante SSR, sempre usa SUBSTITUICAO para evitar hydration mismatch
  const effectiveAssignment = mounted ? currentAssignment : "SUBSTITUICAO";
  const config = ASSIGNMENT_CONFIGS[effectiveAssignment];
  const modules = SPECIALTY_MODULES[effectiveAssignment];

  return (
    <AssignmentContext.Provider
      value={{
        currentAssignment: effectiveAssignment,
        config,
        modules,
        setAssignment,
        isLoading: !mounted || isLoading,
        defensor,
        atribuicoesDisponiveis,
        parceiro,
        temDemandasCompartilhadas,
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
