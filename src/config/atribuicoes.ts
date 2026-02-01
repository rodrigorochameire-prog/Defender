import {
  Gavel,
  Target,
  Home,
  Lock,
  Folder,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

export interface AtribuicaoConfig {
  value: string;
  label: string;
  color: string;
  icon: LucideIcon;
}

// Configuração de todas as atribuições
export const ATRIBUICOES: Record<string, AtribuicaoConfig> = {
  "Tribunal do Júri": {
    value: "Tribunal do Júri",
    label: "Tribunal do Júri",
    color: "#16A34A", // green-600
    icon: Gavel,
  },
  "Grupo Especial do Júri": {
    value: "Grupo Especial do Júri",
    label: "Grupo Especial do Júri",
    color: "#EA580C", // orange-600
    icon: Target,
  },
  "Violência Doméstica": {
    value: "Violência Doméstica",
    label: "Violência Doméstica",
    color: "#CA8A04", // yellow-600
    icon: Home,
  },
  "Execução Penal": {
    value: "Execução Penal",
    label: "Execução Penal",
    color: "#2563EB", // blue-600
    icon: Lock,
  },
  "Criminal Geral": {
    value: "Criminal Geral",
    label: "Criminal Geral",
    color: "#DC2626", // red-600
    icon: Folder,
  },
  "Substituição": {
    value: "Substituição",
    label: "Substituição",
    color: "#9333EA", // purple-600
    icon: RefreshCw,
  },
};

// Helper para obter config da atribuição
export function getAtribuicaoConfig(atribuicao: string): AtribuicaoConfig | null {
  return ATRIBUICOES[atribuicao] || null;
}
