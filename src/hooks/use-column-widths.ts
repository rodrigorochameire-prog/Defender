"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "defender_column_widths";

const DEFAULT_WIDTHS: Record<string, number> = {
  index: 32,
  status: 100,
  assistido: 240,
  processo: 220,
  ato: 140,
  prazo: 80,
  providencias: 120,
  acoes: 40,
};

export function useColumnWidths() {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTHS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_WIDTHS, ...JSON.parse(saved) } : DEFAULT_WIDTHS;
    } catch {
      return DEFAULT_WIDTHS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {}
  }, [widths]);

  const setColumnWidth = useCallback((columnId: string, width: number) => {
    setWidths(prev => ({ ...prev, [columnId]: Math.max(40, width) }));
  }, []);

  const resetWidths = useCallback(() => {
    setWidths(DEFAULT_WIDTHS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { widths, setColumnWidth, resetWidths };
}
