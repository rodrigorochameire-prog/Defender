/**
 * Hook para gerenciar a configuração individual de cada defensor
 * Integra o perfil do defensor logado com o sistema de atribuições
 */

"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  DEFENSORES_CONFIG,
  getDefensorConfig,
  getAtribuicoesDefensor,
  getParceiroEquipe,
  ATRIBUICAO_DESCRICOES,
  type DefensorConfig
} from "@/config/defensores";
import {
  Assignment,
  ASSIGNMENT_CONFIGS,
  ASSIGNMENT_CATEGORIES,
  type AssignmentConfig,
  type AssignmentCategoryConfig
} from "@/contexts/assignment-context";

// ==========================================
// TIPOS
// ==========================================

export interface UseDefensorConfigReturn {
  // Defensor logado
  defensor: DefensorConfig | null;
  isDefensorLoaded: boolean;

  // Atribuições disponíveis
  atribuicaoPrincipal: Assignment | null;
  atribuicoesDisponiveis: Assignment[];
  atribuicoesConfigs: AssignmentConfig[];

  // Categorias organizadas para o defensor
  categorias: AssignmentCategoryConfig[];

  // Helpers
  temAtribuicao: (atribuicao: Assignment) => boolean;
  getAtribuicaoInfo: (atribuicao: Assignment) => typeof ATRIBUICAO_DESCRICOES[Assignment] | undefined;

  // Parceiro de equipe
  parceiro: DefensorConfig | null;
  temDemandasCompartilhadas: boolean;

  // Módulos especiais
  modulosEspeciais: string[];
  temModuloEspecial: (modulo: string) => boolean;
}

// ==========================================
// HOOK
// ==========================================

export function useDefensorConfig(): UseDefensorConfigReturn {
  const { data: session, status } = useSession();

  // Identifica o defensor baseado no usuário logado
  const defensor = useMemo(() => {
    if (status !== "authenticated" || !session?.user) {
      return null;
    }

    // Tenta identificar pelo nome do usuário
    const userName = session.user.name || "";
    const email = session.user.email || "";

    // Primeiro tenta pelo email
    let config = getDefensorConfig(email);

    // Se não encontrou, tenta pelo nome
    if (!config) {
      const normalizedName = userName.toLowerCase();
      if (normalizedName.includes("rodrigo")) config = DEFENSORES_CONFIG["rodrigo"];
      else if (normalizedName.includes("juliane")) config = DEFENSORES_CONFIG["juliane"];
      else if (normalizedName.includes("danilo")) config = DEFENSORES_CONFIG["danilo"];
      else if (normalizedName.includes("cristiane")) config = DEFENSORES_CONFIG["cristiane"];
    }

    return config || null;
  }, [session, status]);

  // Atribuições disponíveis para o defensor
  const atribuicoesDisponiveis = useMemo(() => {
    if (!defensor) return Object.keys(ASSIGNMENT_CONFIGS) as Assignment[];
    return getAtribuicoesDefensor(defensor.id);
  }, [defensor]);

  // Configs de atribuições filtradas
  const atribuicoesConfigs = useMemo(() => {
    return atribuicoesDisponiveis.map(a => ASSIGNMENT_CONFIGS[a]);
  }, [atribuicoesDisponiveis]);

  // Categorias organizadas para o defensor
  const categorias = useMemo(() => {
    // Se não tem defensor identificado, retorna todas as categorias
    if (!defensor) return ASSIGNMENT_CATEGORIES;

    // Filtra as categorias para mostrar apenas as atribuições disponíveis
    return ASSIGNMENT_CATEGORIES.map(cat => ({
      ...cat,
      assignments: cat.assignments.filter(a => atribuicoesDisponiveis.includes(a))
    })).filter(cat => cat.assignments.length > 0);
  }, [defensor, atribuicoesDisponiveis]);

  // Parceiro de equipe
  const parceiro = useMemo(() => {
    if (!defensor) return null;
    return getParceiroEquipe(defensor.id) || null;
  }, [defensor]);

  // Módulos especiais
  const modulosEspeciais = useMemo(() => {
    return defensor?.modulosEspeciais || [];
  }, [defensor]);

  // Helpers
  const temAtribuicao = (atribuicao: Assignment) => {
    return atribuicoesDisponiveis.includes(atribuicao);
  };

  const getAtribuicaoInfo = (atribuicao: Assignment) => {
    return ATRIBUICAO_DESCRICOES[atribuicao];
  };

  const temModuloEspecial = (modulo: string) => {
    return modulosEspeciais.includes(modulo);
  };

  return {
    defensor,
    isDefensorLoaded: status !== "loading",

    atribuicaoPrincipal: defensor?.atribuicaoPrincipal || null,
    atribuicoesDisponiveis,
    atribuicoesConfigs,

    categorias,

    temAtribuicao,
    getAtribuicaoInfo,

    parceiro,
    temDemandasCompartilhadas: defensor?.equipe?.demandasCompartilhadas || false,

    modulosEspeciais,
    temModuloEspecial,
  };
}

// ==========================================
// UTILITÁRIOS ADICIONAIS
// ==========================================

/**
 * Retorna a atribuição padrão para um defensor (para inicialização)
 */
export function getAtribuicaoPadrao(defensorId?: string): Assignment {
  if (!defensorId) return "SUBSTITUICAO"; // Criminal Geral como padrão genérico

  const defensor = DEFENSORES_CONFIG[defensorId.toLowerCase()];
  return defensor?.atribuicaoPrincipal || "SUBSTITUICAO";
}

/**
 * Verifica se dois defensores compartilham demandas
 */
export function compartilhamDemandas(defensor1Id: string, defensor2Id: string): boolean {
  const d1 = DEFENSORES_CONFIG[defensor1Id.toLowerCase()];
  const d2 = DEFENSORES_CONFIG[defensor2Id.toLowerCase()];

  if (!d1 || !d2) return false;

  // Verifica se são parceiros com demandas compartilhadas
  const d1Parceiro = d1.equipe?.parceiroId === defensor2Id.toLowerCase() && d1.equipe?.demandasCompartilhadas;
  const d2Parceiro = d2.equipe?.parceiroId === defensor1Id.toLowerCase() && d2.equipe?.demandasCompartilhadas;

  return d1Parceiro || d2Parceiro || false;
}
