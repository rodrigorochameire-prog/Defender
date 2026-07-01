import * as Icons from "lucide-react";
import { Circle, type LucideIcon } from "lucide-react";

/** Resolves an assignment-menu icon name (string) to a lucide component. */
export function resolveIcon(name: string): LucideIcon {
  const value = (Icons as Record<string, unknown>)[name];
  return typeof value === "function" ? (value as LucideIcon) : Circle;
}
