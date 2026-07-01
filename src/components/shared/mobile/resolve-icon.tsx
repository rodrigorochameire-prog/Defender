import * as Icons from "lucide-react";
import { Circle, type LucideIcon } from "lucide-react";

/** Resolves an assignment-menu icon name (string) to a lucide component. */
export function resolveIcon(name: string): LucideIcon {
  const map = Icons as unknown as Record<string, LucideIcon>;
  return map[name] ?? Circle;
}
