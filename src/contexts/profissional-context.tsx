"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";

// ============================================
// TIPOS
// ============================================

export type ProfissionalId = number;
export type GrupoTrabalho = "juri_ep_vvd" | "varas_criminais" | "todos";
export type Atribuicao = "JURI_EP" | "VVD" | null;

export interface Profissional {
  id: number;
  nome: string;
  nomeCurto: string | null;
  email: string | null;
  grupo: string;
  vara: string | null;
  cor: string | null;
  ativo: boolean;
}

export interface ProfissionalConfig {
  id: ProfissionalId;
  nome: string;
  nomeCurto: string;
  grupo: GrupoTrabalho;
  vara?: string;
  cor: string;
  corBg: string;
  corBadge: string;
}

// Configurações estáticas dos profissionais (FALLBACK)
// CORES NEUTRAS para nomes, cores apenas nas atribuições
export const PROFISSIONAIS_CONFIG: Record<number, ProfissionalConfig> = {
  1: {
    id: 1,
    nome: "Dr. Rodrigo",
    nomeCurto: "Rodrigo",
    grupo: "juri_ep_vvd",
    cor: "zinc",
    corBg: "bg-zinc-800 dark:bg-zinc-200",
    corBadge: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
  },
  2: {
    id: 2,
    nome: "Dra. Juliane",
    nomeCurto: "Juliane",
    grupo: "juri_ep_vvd",
    cor: "zinc",
    corBg: "bg-zinc-600 dark:bg-zinc-400",
    corBadge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
  },
  3: {
    id: 3,
    nome: "Dra. Cristiane",
    nomeCurto: "Cristiane",
    grupo: "varas_criminais",
    vara: "1ª Vara Criminal",
    cor: "zinc",
    corBg: "bg-zinc-700",
    corBadge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
  },
  4: {
    id: 4,
    nome: "Dr. Danilo",
    nomeCurto: "Danilo",
    grupo: "varas_criminais",
    vara: "2ª Vara Criminal",
    cor: "zinc",
    corBg: "bg-zinc-500",
    corBadge: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
  },
  0: {
    id: 0,
    nome: "Visão Geral",
    nomeCurto: "Geral",
    grupo: "todos",
    cor: "zinc",
    corBg: "bg-zinc-400 dark:bg-zinc-600",
    corBadge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
  },
};

// Paleta de cores neutras para profissionais dinâmicos que não estão no fallback
const CORES_NEUTRAS = [
  { corBg: "bg-zinc-700 dark:bg-zinc-300", corBadge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  { corBg: "bg-zinc-500 dark:bg-zinc-500", corBadge: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" },
  { corBg: "bg-zinc-600 dark:bg-zinc-400", corBadge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  { corBg: "bg-zinc-800 dark:bg-zinc-200", corBadge: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200" },
];

// ============================================
// HELPER: Converter DB profissional para ProfissionalConfig
// ============================================

function dbToProfissionalConfig(prof: Profissional, index: number): ProfissionalConfig {
  // Se existe no fallback, mescla com dados do DB
  if (prof.id in PROFISSIONAIS_CONFIG) {
    const fallback = PROFISSIONAIS_CONFIG[prof.id];
    return {
      ...fallback,
      nome: prof.nome || fallback.nome,
      nomeCurto: prof.nomeCurto || fallback.nomeCurto,
      grupo: (prof.grupo as GrupoTrabalho) || fallback.grupo,
      vara: prof.vara || fallback.vara,
    };
  }

  // Profissional novo sem fallback: gerar config dinamicamente
  const corIndex = index % CORES_NEUTRAS.length;
  const cores = CORES_NEUTRAS[corIndex];

  return {
    id: prof.id,
    nome: prof.nome,
    nomeCurto: prof.nomeCurto || prof.nome.split(" ").pop() || prof.nome,
    grupo: (prof.grupo as GrupoTrabalho) || "varas_criminais",
    vara: prof.vara || undefined,
    cor: "zinc",
    corBg: cores.corBg,
    corBadge: cores.corBadge,
  };
}

// ============================================
// CONTEXTO
// ============================================

interface ProfissionalContextValue {
  // Profissional logado (detectado automaticamente)
  profissionalLogado: ProfissionalConfig | null;

  // Profissional ativo (pode ser alterado pelo switch)
  profissionalAtivo: ProfissionalConfig;
  setProfissionalAtivo: (id: ProfissionalId) => void;

  // Helpers
  isGrupoJuriEpVvd: boolean;
  isGrupoVarasCriminais: boolean;
  isVisaoGeral: boolean;
  colegoId: ProfissionalId | null;
  colegoConfig: ProfissionalConfig | null;

  // Lista de profissionais (configs completas geradas do DB)
  profissionais: Profissional[];
  profissionaisConfigs: ProfissionalConfig[];
  isLoading: boolean;

  // Escala atual (quem está em qual atribuição este mês)
  escalaAtual: { profissionalId: number | null; atribuicao: string }[];
  atribuicaoAtual: Atribuicao;

  // Helper: Quem está no Júri/EP este mês? Quem está na VVD?
  profissionalJuriEP: ProfissionalId | null;
  profissionalVVD: ProfissionalId | null;
}

const ProfissionalContext = createContext<ProfissionalContextValue | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function ProfissionalProvider({ children }: { children: React.ReactNode }) {
  // Estados
  const [profissionalAtivoId, setProfissionalAtivoId] = useState<ProfissionalId>(1);

  // Buscar profissionais do banco
  const { data: profissionais = [], isLoading: loadingProfissionais } = trpc.profissionais.list.useQuery();

  // Buscar escala atual
  const { data: escalaAtual = [], isLoading: loadingEscala } = trpc.profissionais.getEscalaAtual.useQuery();

  // Buscar usuário atual via tRPC
  const { data: currentUser, isLoading: loadingUser } = trpc.auth.me.useQuery();

  // Construir mapa de configs a partir do DB (com fallback)
  const profissionaisConfigs = useMemo((): ProfissionalConfig[] => {
    if (profissionais.length === 0) {
      // Enquanto não carregou do DB, usa fallback (sem "Visão Geral")
      return Object.values(PROFISSIONAIS_CONFIG).filter((c) => c.id !== 0);
    }

    return profissionais
      .filter((p) => p.ativo)
      .map((p, i) => dbToProfissionalConfig(p, i));
  }, [profissionais]);

  // Mapa rápido de ID -> Config
  const configMap = useMemo((): Record<number, ProfissionalConfig> => {
    const map: Record<number, ProfissionalConfig> = {
      0: PROFISSIONAIS_CONFIG[0], // Visão Geral sempre presente
    };
    profissionaisConfigs.forEach((c) => { map[c.id] = c; });
    // Mesclar fallback para IDs que não vieram do DB
    Object.values(PROFISSIONAIS_CONFIG).forEach((c) => {
      if (!(c.id in map)) map[c.id] = c;
    });
    return map;
  }, [profissionaisConfigs]);

  // Detectar profissional logado pelo email do usuário
  const profissionalLogado = useMemo((): ProfissionalConfig | null => {
    if (!currentUser?.email) return null;

    const email = currentUser.email.toLowerCase();

    // Tentar encontrar no banco por email
    const profDb = profissionais.find((p) => p.email?.toLowerCase() === email);
    if (profDb && profDb.id in configMap) {
      return configMap[profDb.id];
    }

    // Fallback por email conhecido
    if (email.includes("rodrigo")) return configMap[1] || PROFISSIONAIS_CONFIG[1];
    if (email.includes("juliane")) return configMap[2] || PROFISSIONAIS_CONFIG[2];
    if (email.includes("cristiane")) return configMap[3] || PROFISSIONAIS_CONFIG[3];
    if (email.includes("danilo")) return configMap[4] || PROFISSIONAIS_CONFIG[4];

    return null;
  }, [currentUser, profissionais, configMap]);

  // Definir profissional ativo baseado no logado
  useEffect(() => {
    if (profissionalLogado && profissionalAtivoId !== profissionalLogado.id) {
      setProfissionalAtivoId(profissionalLogado.id);
    }
  }, [profissionalLogado]);

  // Configuração do profissional ativo
  const profissionalAtivo = configMap[profissionalAtivoId] || PROFISSIONAIS_CONFIG[0];

  // Helpers
  const isGrupoJuriEpVvd = profissionalAtivo.grupo === "juri_ep_vvd" || profissionalAtivo.grupo === "todos";
  const isGrupoVarasCriminais = profissionalAtivo.grupo === "varas_criminais";
  const isVisaoGeral = profissionalAtivoId === 0;

  // Colega: encontrar outro profissional do mesmo grupo
  const colegoId: ProfissionalId | null = useMemo(() => {
    if (profissionalAtivoId === 0) return null;

    const meusConfigs = profissionaisConfigs.filter(
      (c) => c.grupo === profissionalAtivo.grupo && c.id !== profissionalAtivoId
    );

    if (meusConfigs.length > 0) return meusConfigs[0].id;

    // Fallback hardcoded
    if (profissionalAtivoId === 1) return 2;
    if (profissionalAtivoId === 2) return 1;
    if (profissionalAtivoId === 3) return 4;
    if (profissionalAtivoId === 4) return 3;
    return null;
  }, [profissionalAtivoId, profissionalAtivo.grupo, profissionaisConfigs]);

  const colegoConfig = colegoId !== null ? (configMap[colegoId] || null) : null;

  // Descobrir quem está no Júri/EP e quem está na VVD este mês
  const { profissionalJuriEP, profissionalVVD } = useMemo(() => {
    let juriEP: ProfissionalId | null = null;
    let vvd: ProfissionalId | null = null;

    // Procurar na escala por profissionais do grupo juri_ep_vvd
    const juriEpVvdIds = profissionaisConfigs
      .filter((c) => c.grupo === "juri_ep_vvd")
      .map((c) => c.id);

    escalaAtual.forEach((e: any) => {
      if (e.atribuicao === "JURI_EP" && juriEpVvdIds.includes(e.profissionalId)) {
        juriEP = e.profissionalId as ProfissionalId;
      }
      if (e.atribuicao === "VVD" && juriEpVvdIds.includes(e.profissionalId)) {
        vvd = e.profissionalId as ProfissionalId;
      }
    });

    // Default se não tiver escala definida
    if (juriEP === null && vvd === null && juriEpVvdIds.length >= 2) {
      juriEP = juriEpVvdIds[0]; // Primeiro default no Júri
      vvd = juriEpVvdIds[1];    // Segundo default na VVD
    } else if (juriEP === null && vvd === null) {
      juriEP = 1; // Rodrigo default no Júri
      vvd = 2;    // Juliane default na VVD
    }

    return { profissionalJuriEP: juriEP, profissionalVVD: vvd };
  }, [escalaAtual, profissionaisConfigs]);

  // Atribuição atual do profissional selecionado
  const atribuicaoAtual = useMemo((): Atribuicao => {
    if (profissionalAtivoId === 0) return null; // Geral

    // Criminal geral não tem atribuição JURI_EP/VVD
    if (profissionalAtivo.grupo === "varas_criminais") return null;

    const escala = escalaAtual.find((e: any) => e.profissionalId === profissionalAtivoId);
    if (escala?.atribuicao === "JURI_EP" || escala?.atribuicao === "VVD") {
      return escala.atribuicao;
    }

    // Default baseado na lógica
    if (profissionalAtivoId === profissionalJuriEP) return "JURI_EP";
    if (profissionalAtivoId === profissionalVVD) return "VVD";

    return null;
  }, [escalaAtual, profissionalAtivoId, profissionalAtivo.grupo, profissionalJuriEP, profissionalVVD]);

  // Função para mudar profissional ativo
  const setProfissionalAtivo = (id: ProfissionalId) => {
    setProfissionalAtivoId(id);
  };

  const value: ProfissionalContextValue = {
    profissionalLogado,
    profissionalAtivo,
    setProfissionalAtivo,
    isGrupoJuriEpVvd,
    isGrupoVarasCriminais,
    isVisaoGeral,
    colegoId,
    colegoConfig,
    profissionais,
    profissionaisConfigs,
    isLoading: loadingProfissionais || loadingEscala || loadingUser,
    escalaAtual,
    atribuicaoAtual,
    profissionalJuriEP,
    profissionalVVD,
  };

  return (
    <ProfissionalContext.Provider value={value}>
      {children}
    </ProfissionalContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useProfissional() {
  const context = useContext(ProfissionalContext);
  if (context === undefined) {
    throw new Error("useProfissional must be used within a ProfissionalProvider");
  }
  return context;
}

// ============================================
// HELPER: Verificar se demanda pertence ao profissional
// ============================================

export function demandaPertenceAoProfissional(
  demanda: { responsavelId?: number | null; criadoPorId?: number | null },
  profissionalId: ProfissionalId
): boolean {
  if (profissionalId === 0) return true; // Geral vê tudo

  return (
    demanda.responsavelId === profissionalId ||
    demanda.criadoPorId === profissionalId ||
    !demanda.responsavelId // Sem responsável = todos veem
  );
}
