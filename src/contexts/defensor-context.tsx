"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

interface DefensorInfo {
  id: number;
  name: string;
}

interface DefensorContextType {
  selectedDefensorId: number | null; // null = "Visão Geral" (todos do workspace)
  selectedDefensor: DefensorInfo | null;
  defensores: DefensorInfo[];
  setSelectedDefensorId: (id: number | null) => void;
  setDefensores: (defensores: DefensorInfo[]) => void;
  includeAll: boolean; // "Incluir todos os registros" (modo admin, ignora workspace)
  setIncludeAll: (v: boolean) => void;
  isLoading: boolean;
}

const DefensorContext = createContext<DefensorContextType | undefined>(undefined);

const STORAGE_KEY = "defesahub_selected_defensor";
const INCLUDE_ALL_KEY = "defesahub_include_all";

export function DefensorProvider({ children }: { children: ReactNode }) {
  const [selectedDefensorId, setSelectedDefensorIdState] = useState<number | null>(null);
  const [defensores, setDefensores] = useState<DefensorInfo[]>([]);
  const [includeAll, setIncludeAllState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== "null") {
      setSelectedDefensorIdState(Number(saved));
    }
    const savedAll = localStorage.getItem(INCLUDE_ALL_KEY);
    if (savedAll === "true") {
      setIncludeAllState(true);
    }
    setIsLoading(false);
  }, []);

  const setSelectedDefensorId = useCallback((id: number | null) => {
    setSelectedDefensorIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  const setIncludeAll = useCallback((v: boolean) => {
    setIncludeAllState(v);
    localStorage.setItem(INCLUDE_ALL_KEY, String(v));
  }, []);

  const selectedDefensor = defensores.find(d => d.id === selectedDefensorId) ?? null;

  return (
    <DefensorContext.Provider
      value={{
        selectedDefensorId,
        selectedDefensor,
        defensores,
        setSelectedDefensorId,
        setDefensores,
        includeAll,
        setIncludeAll,
        isLoading,
      }}
    >
      {children}
    </DefensorContext.Provider>
  );
}

export function useDefensor() {
  const context = useContext(DefensorContext);
  if (!context) {
    throw new Error("useDefensor must be used within DefensorProvider");
  }
  return context;
}
