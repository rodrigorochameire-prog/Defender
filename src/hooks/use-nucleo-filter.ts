"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePermissions } from "./use-permissions";

// Tipos de núcleos da Defensoria
export type Nucleo = "ESPECIALIZADOS" | "VARA_1" | "VARA_2" | "TODOS";

// Configuração dos núcleos
export const NUCLEOS_CONFIG: Record<Nucleo, {
  label: string;
  description: string;
  color: string;
  bgColor: string;
}> = {
  ESPECIALIZADOS: {
    label: "Especializados",
    description: "Júri, Violência Doméstica, Execução Penal",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
  },
  VARA_1: {
    label: "1ª Vara Criminal",
    description: "Criminal Geral",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  VARA_2: {
    label: "2ª Vara Criminal",
    description: "Criminal Geral",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
  },
  TODOS: {
    label: "Todos",
    description: "Visualizar todos os núcleos",
    color: "text-zinc-600 dark:text-zinc-400",
    bgColor: "bg-zinc-100 dark:bg-zinc-800",
  },
};

// Chave para persistência
const NUCLEO_FILTER_KEY = "defender-nucleo-filter";

export function useNucleoFilter() {
  const { user } = usePermissions();
  const [nucleoSelecionado, setNucleoSelecionado] = useState<Nucleo>("TODOS");
  const [mostrarOutrosNucleos, setMostrarOutrosNucleos] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Carregar preferência salva
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(NUCLEO_FILTER_KEY);
    if (saved && saved in NUCLEOS_CONFIG) {
      setNucleoSelecionado(saved as Nucleo);
    } else if (user?.nucleo) {
      // Padrão: núcleo do usuário
      setNucleoSelecionado(user.nucleo as Nucleo);
    }
  }, [user?.nucleo]);

  // Salvar preferência
  const selecionarNucleo = useCallback((nucleo: Nucleo) => {
    setNucleoSelecionado(nucleo);
    localStorage.setItem(NUCLEO_FILTER_KEY, nucleo);
  }, []);

  // Núcleo do usuário atual
  const nucleoUsuario = useMemo(() => {
    return (user as any)?.nucleo as Nucleo | undefined;
  }, [user]);

  // Verificar se é admin
  const isAdmin = useMemo(() => {
    return (user as any)?.isAdmin === true || user?.role === "admin";
  }, [user]);

  // Pode ver todos os assistidos/processos?
  const podeVerTodos = useMemo(() => {
    if (isAdmin) return true;
    return (user as any)?.podeVerTodosAssistidos !== false;
  }, [user, isAdmin]);

  // Função para filtrar dados por núcleo
  const filtrarPorNucleo = useCallback(<T extends { defensorId?: number | null; nucleo?: string | null }>(
    dados: T[],
    defensorIdUsuario: number
  ): T[] => {
    if (!mounted) return dados;
    
    // Se mostrando todos e pode ver todos, retorna tudo
    if (nucleoSelecionado === "TODOS" && podeVerTodos) {
      return dados;
    }

    // Se não pode ver todos, filtra apenas os próprios
    if (!podeVerTodos) {
      return dados.filter(item => item.defensorId === defensorIdUsuario);
    }

    // Filtra por núcleo
    return dados.filter(item => {
      // Sempre mostra os próprios
      if (item.defensorId === defensorIdUsuario) return true;
      
      // Se tem núcleo definido, filtra
      if (item.nucleo && nucleoSelecionado !== "TODOS") {
        return item.nucleo === nucleoSelecionado;
      }
      
      return mostrarOutrosNucleos;
    });
  }, [mounted, nucleoSelecionado, podeVerTodos, mostrarOutrosNucleos]);

  // Função para verificar se deve mostrar item de outro defensor
  const deveExibir = useCallback((
    itemDefensorId: number | null | undefined,
    itemNucleo: string | null | undefined,
    usuarioId: number
  ): boolean => {
    if (!mounted) return true;
    
    // Sempre mostra os próprios
    if (itemDefensorId === usuarioId) return true;
    
    // Admin vê tudo
    if (isAdmin) return true;
    
    // Se não pode ver outros, oculta
    if (!podeVerTodos) return false;
    
    // Filtro por núcleo
    if (nucleoSelecionado === "TODOS") return mostrarOutrosNucleos;
    
    return itemNucleo === nucleoSelecionado;
  }, [mounted, isAdmin, podeVerTodos, nucleoSelecionado, mostrarOutrosNucleos]);

  return {
    nucleoSelecionado,
    selecionarNucleo,
    nucleoUsuario,
    isAdmin,
    podeVerTodos,
    mostrarOutrosNucleos,
    setMostrarOutrosNucleos,
    filtrarPorNucleo,
    deveExibir,
    nucleosConfig: NUCLEOS_CONFIG,
    mounted,
  };
}

// Hook para verificar afastamentos ativos
export function useAfastamentosAtivos() {
  const { user } = usePermissions();
  const [afastamentosAtivos, setAfastamentosAtivos] = useState<{
    defensorId: number;
    defensorNome: string;
    tipo: string;
    dataFim?: string;
  }[]>([]);

  // TODO: Buscar afastamentos do banco de dados
  // Por enquanto, retorna array vazio
  
  const estouCobrindo = useMemo(() => {
    return afastamentosAtivos.length > 0;
  }, [afastamentosAtivos]);

  const defensorCobertos = useMemo(() => {
    return afastamentosAtivos.map(a => a.defensorId);
  }, [afastamentosAtivos]);

  return {
    afastamentosAtivos,
    estouCobrindo,
    defensorCobertos,
  };
}
