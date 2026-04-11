"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";

const themeConfig = {
  light: {
    icon: Sun,
    iconClass: "h-3.5 w-3.5 text-amber-400/80",
    buttonClass: "bg-transparent hover:bg-white/[0.08] border-none",
    ariaLabel: "Modo claro",
  },
  dark: {
    icon: Moon,
    iconClass: "h-3.5 w-3.5 text-blue-300/80",
    buttonClass: "bg-transparent hover:bg-white/[0.08] border-none",
    ariaLabel: "Modo noturno",
  },
} as const;

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const config = themeConfig[theme];
  const Icon = config.icon;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={`relative h-7 w-7 rounded-full border transition-all duration-200 ${config.buttonClass}`}
      aria-label={config.ariaLabel}
    >
      <Icon className={config.iconClass} />
    </Button>
  );
}

// Alias para compatibilidade
export const ThemeToggleSimple = ThemeToggle;
