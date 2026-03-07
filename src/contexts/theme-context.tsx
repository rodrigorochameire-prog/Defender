"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

export type Theme = "light" | "medium" | "dark";

const THEME_ORDER: Theme[] = ["light", "medium", "dark"];

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: Theme;
  /** Whether 'medium' or 'dark' — useful for components that need dark-style text */
  isDarkSidebar: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage - default to light
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const validThemes: Theme[] = ["light", "medium", "dark"];
    const initialTheme = stored && validThemes.includes(stored) ? stored : "light";
    setThemeState(initialTheme);
    setMounted(true);
  }, []);

  // Apply theme classes to document
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "medium", "dark");
    root.classList.add(theme);
    // Keep 'dark' class for Tailwind dark: variants in dark AND medium (sidebar only uses custom CSS)
    // For medium: pages stay light-ish, only sidebar goes dark via .medium selectors
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const idx = THEME_ORDER.indexOf(prev);
      return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    });
  }, []);

  const isDarkSidebar = theme === "medium" || theme === "dark";

  const value = useMemo(
    () => ({ theme, resolvedTheme: theme, isDarkSidebar, setTheme, toggleTheme }),
    [theme, isDarkSidebar, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
