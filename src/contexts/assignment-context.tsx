"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// Tipos de atribuição disponíveis
export type Assignment = 
  | "JURI_CAMACARI"      // Vara do Júri Camaçari
  | "VVD_CAMACARI"       // Violência Doméstica
  | "EXECUCAO_PENAL"     // Execução Penal
  | "SUBSTITUICAO"       // Substituição Criminal
  | "SUBSTITUICAO_CIVEL" // Substituições Não Penais (Cível, Família, etc.)
  | "GRUPO_JURI";        // Grupo Especial do Júri

// Configuração visual e funcional de cada atribuição
export interface AssignmentConfig {
  id: Assignment;
  name: string;
  shortName: string;
  description: string;
  icon: string; // Lucide icon name
  // Cores do tema
  accentColor: string;
  accentColorLight: string;
  accentColorDark: string;
  bgGradient: string;
  borderColor: string;
  // Funcionalidades específicas
  features: string[];
  // Menus específicos
  menuItems: AssignmentMenuItem[];
}

export interface AssignmentMenuItem {
  label: string;
  path: string;
  icon: string;
  badge?: string; // Para contadores
}

// Configurações de cada atribuição
// Paletas:
// - Júri Camaçari: Verde (principal) + brancos, pretos, cinzas
// - VVD: Amarelo + brancos, pretos, cinzas
// - Execução Penal: Azul + brancos, pretos, cinzas
// - Grupo Júri: Laranja + brancos, pretos, cinzas
// - Substituição Criminal: Vermelho + brancos, pretos, cinzas

export const ASSIGNMENT_CONFIGS: Record<Assignment, AssignmentConfig> = {
  JURI_CAMACARI: {
    id: "JURI_CAMACARI",
    name: "Vara do Júri - Camaçari",
    shortName: "Júri Camaçari",
    description: "Processos do Tribunal do Júri da Comarca de Camaçari",
    icon: "Gavel",
    // Paleta Verde (principal da aplicação)
    accentColor: "hsl(158, 55%, 42%)",
    accentColorLight: "hsl(158, 45%, 94%)",
    accentColorDark: "hsl(158, 50%, 32%)",
    bgGradient: "from-emerald-50/50 to-slate-50",
    borderColor: "border-emerald-200/60",
    features: ["plenarios", "jurados", "memoriais", "quesitos"],
    menuItems: [
      { label: "Dashboard", path: "/admin", icon: "LayoutDashboard" },
      { label: "Assistidos", path: "/admin/assistidos", icon: "Users" },
      { label: "Processos", path: "/admin/processos", icon: "Scale" },
      { label: "Demandas", path: "/admin/demandas", icon: "Clock" },
      { label: "Plenários", path: "/admin/juri", icon: "Gavel" },
      { label: "Jurados", path: "/admin/jurados", icon: "UserCheck" },
      { label: "Calendário", path: "/admin/calendar", icon: "Calendar" },
    ],
  },
  VVD_CAMACARI: {
    id: "VVD_CAMACARI",
    name: "Violência Doméstica - Camaçari",
    shortName: "VVD Camaçari",
    description: "Vara de Violência Doméstica e Familiar",
    icon: "Shield",
    // Paleta Amarelo/Dourado
    accentColor: "hsl(45, 85%, 48%)",
    accentColorLight: "hsl(45, 80%, 94%)",
    accentColorDark: "hsl(45, 80%, 38%)",
    bgGradient: "from-amber-50/50 to-slate-50",
    borderColor: "border-amber-200/60",
    features: ["medidas_protetivas", "custodia", "flagrante", "risco"],
    menuItems: [
      { label: "Dashboard", path: "/admin", icon: "LayoutDashboard" },
      { label: "Assistidos", path: "/admin/assistidos", icon: "Users" },
      { label: "Processos", path: "/admin/processos", icon: "Scale" },
      { label: "Demandas", path: "/admin/demandas", icon: "Clock" },
      { label: "Medidas Protetivas", path: "/admin/medidas", icon: "Shield" },
      { label: "Audiências", path: "/admin/audiencias", icon: "Briefcase" },
      { label: "Custódia", path: "/admin/custodia", icon: "AlertTriangle" },
      { label: "Calendário", path: "/admin/calendar", icon: "Calendar" },
    ],
  },
  EXECUCAO_PENAL: {
    id: "EXECUCAO_PENAL",
    name: "Execução Penal",
    shortName: "Exec. Penal",
    description: "Vara de Execução Penal - Benefícios e Incidentes",
    icon: "Lock",
    // Paleta Azul
    accentColor: "hsl(210, 65%, 50%)",
    accentColorLight: "hsl(210, 60%, 94%)",
    accentColorDark: "hsl(210, 60%, 38%)",
    bgGradient: "from-blue-50/50 to-slate-50",
    borderColor: "border-blue-200/60",
    features: ["progressao", "livramento", "remicao", "indulto", "saida_temporaria"],
    menuItems: [
      { label: "Dashboard", path: "/admin", icon: "LayoutDashboard" },
      { label: "Assistidos", path: "/admin/assistidos", icon: "Users" },
      { label: "Processos", path: "/admin/processos", icon: "Scale" },
      { label: "Demandas", path: "/admin/demandas", icon: "Clock" },
      { label: "Calculadora SEEU", path: "/admin/calculadoras", icon: "Calculator" },
      { label: "Benefícios", path: "/admin/beneficios", icon: "Award" },
      { label: "Progressões", path: "/admin/progressoes", icon: "TrendingUp" },
      { label: "Calendário", path: "/admin/calendar", icon: "Calendar" },
    ],
  },
  SUBSTITUICAO: {
    id: "SUBSTITUICAO",
    name: "Substituição Criminal",
    shortName: "Subst. Criminal",
    description: "Atuação em substituição na área criminal",
    icon: "RefreshCw",
    // Paleta Vermelho
    accentColor: "hsl(0, 65%, 50%)",
    accentColorLight: "hsl(0, 60%, 94%)",
    accentColorDark: "hsl(0, 60%, 38%)",
    bgGradient: "from-red-50/50 to-slate-50",
    borderColor: "border-red-200/60",
    features: ["kanban", "prazos", "multicomarca"],
    menuItems: [
      { label: "Dashboard", path: "/admin", icon: "LayoutDashboard" },
      { label: "Assistidos", path: "/admin/assistidos", icon: "Users" },
      { label: "Processos", path: "/admin/processos", icon: "Scale" },
      { label: "Demandas", path: "/admin/demandas", icon: "Clock" },
      { label: "Kanban", path: "/admin/kanban", icon: "Target" },
      { label: "Audiências", path: "/admin/audiencias", icon: "Briefcase" },
      { label: "Calendário", path: "/admin/calendar", icon: "Calendar" },
    ],
  },
  GRUPO_JURI: {
    id: "GRUPO_JURI",
    name: "Grupo Especial do Júri",
    shortName: "Grupo Júri",
    description: "Atuação em plenários pelo Estado da Bahia",
    icon: "Award",
    // Paleta Laranja
    accentColor: "hsl(25, 85%, 52%)",
    accentColorLight: "hsl(25, 80%, 94%)",
    accentColorDark: "hsl(25, 80%, 40%)",
    bgGradient: "from-orange-50/50 to-slate-50",
    borderColor: "border-orange-200/60",
    features: ["plenarios_avancado", "banco_jurados", "estatisticas", "teses"],
    menuItems: [
      { label: "Dashboard", path: "/admin", icon: "LayoutDashboard" },
      { label: "Próximos Plenários", path: "/admin/juri", icon: "Gavel" },
      { label: "Banco de Jurados", path: "/admin/jurados", icon: "UserCheck" },
      { label: "Estatísticas", path: "/admin/relatorios", icon: "BarChart3" },
      { label: "Banco de Teses", path: "/admin/templates", icon: "FileText" },
      { label: "Calendário", path: "/admin/calendar", icon: "Calendar" },
    ],
  },
  SUBSTITUICAO_CIVEL: {
    id: "SUBSTITUICAO_CIVEL",
    name: "Substituição Não Penal",
    shortName: "Subst. Cível",
    description: "Atuação em substituição nas áreas cível, família e outras",
    icon: "Scale",
    // Paleta Roxo
    accentColor: "hsl(270, 55%, 55%)",
    accentColorLight: "hsl(270, 50%, 94%)",
    accentColorDark: "hsl(270, 50%, 42%)",
    bgGradient: "from-violet-50/50 to-slate-50",
    borderColor: "border-violet-200/60",
    features: ["kanban", "prazos", "multicomarca", "civel", "familia"],
    menuItems: [
      { label: "Dashboard", path: "/admin", icon: "LayoutDashboard" },
      { label: "Assistidos", path: "/admin/assistidos", icon: "Users" },
      { label: "Processos", path: "/admin/processos", icon: "Scale" },
      { label: "Demandas", path: "/admin/demandas", icon: "Clock" },
      { label: "Kanban", path: "/admin/kanban", icon: "Target" },
      { label: "Audiências", path: "/admin/audiencias", icon: "Briefcase" },
      { label: "Documentos", path: "/admin/documentos", icon: "FileText" },
      { label: "Calendário", path: "/admin/calendar", icon: "Calendar" },
    ],
  },
};

// Interface do contexto
interface AssignmentContextType {
  currentAssignment: Assignment;
  config: AssignmentConfig;
  setAssignment: (assignment: Assignment) => void;
  isLoading: boolean;
}

const AssignmentContext = createContext<AssignmentContextType | undefined>(undefined);

const STORAGE_KEY = "defesahub_current_assignment";

export function AssignmentProvider({ children }: { children: ReactNode }) {
  const [currentAssignment, setCurrentAssignment] = useState<Assignment>("SUBSTITUICAO");
  const [isLoading, setIsLoading] = useState(true);

  // Carregar atribuição salva
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in ASSIGNMENT_CONFIGS) {
      setCurrentAssignment(saved as Assignment);
    }
    setIsLoading(false);
  }, []);

  // Salvar atribuição quando mudar
  const setAssignment = useCallback((assignment: Assignment) => {
    setCurrentAssignment(assignment);
    localStorage.setItem(STORAGE_KEY, assignment);
    
    // Aplicar tema visual
    applyAssignmentTheme(assignment);
  }, []);

  // Aplicar tema inicial
  useEffect(() => {
    if (!isLoading) {
      applyAssignmentTheme(currentAssignment);
    }
  }, [isLoading, currentAssignment]);

  const config = ASSIGNMENT_CONFIGS[currentAssignment];

  return (
    <AssignmentContext.Provider value={{ currentAssignment, config, setAssignment, isLoading }}>
      {children}
    </AssignmentContext.Provider>
  );
}

// Aplicar tema visual baseado na atribuição
function applyAssignmentTheme(assignment: Assignment) {
  const config = ASSIGNMENT_CONFIGS[assignment];
  const root = document.documentElement;
  
  // Atualizar variáveis CSS customizadas para a atribuição
  root.style.setProperty("--assignment-accent", config.accentColor);
  root.style.setProperty("--assignment-accent-light", config.accentColorLight);
  root.style.setProperty("--assignment-accent-dark", config.accentColorDark);
  
  // Adicionar classe no body para estilos específicos
  document.body.className = document.body.className
    .replace(/assignment-\w+/g, "")
    .trim();
  document.body.classList.add(`assignment-${assignment.toLowerCase()}`);
}

// Hook para usar o contexto
export function useAssignment() {
  const context = useContext(AssignmentContext);
  if (context === undefined) {
    throw new Error("useAssignment must be used within an AssignmentProvider");
  }
  return context;
}

// Hook para verificar se uma feature está disponível na atribuição atual
export function useFeature(feature: string) {
  const { config } = useAssignment();
  return config.features.includes(feature);
}
