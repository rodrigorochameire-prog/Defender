"use client";

import { useState, useCallback, useEffect } from "react";

const RECENT_STORAGE_KEY = "ombuds:recent-assistidos";
const MAX_RECENT = 5;

export function useRecentAssistidos() {
  const [recentIds, setRecentIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) setRecentIds(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const addRecent = useCallback((id: number) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { recentIds, addRecent };
}
