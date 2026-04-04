"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";

const themeConfig = {
  light: {
    icon: Sun,
    iconClass: "h-4 w-4 text-amber-500",
    buttonClass:
      "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 hover:border-emerald-500/50",
    ariaLabel: "Modo claro",
  },
  dark: {
    icon: Moon,
    iconClass: "h-4 w-4 text-blue-300",
    buttonClass:
      "bg-muted hover:bg-muted border-border hover:border-emerald-500/50",
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
      className={`relative h-8 w-8 rounded-full border transition-all duration-200 ${config.buttonClass}`}
      aria-label={config.ariaLabel}
    >
      <Icon className={config.iconClass} />
    </Button>
  );
}

// Alias para compatibilidade
export const ThemeToggleSimple = ThemeToggle;
