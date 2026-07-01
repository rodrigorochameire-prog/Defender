import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Calendar, FileText, Users } from "lucide-react";

export type BottomTab = {
  label: string;
  icon: LucideIcon;
  path: string;
  /** When true, the tab is active only on an exact pathname match. */
  matchExact?: boolean;
};

/** The 4 fixed bottom-bar tabs. "Mais" is rendered separately by MobileBottomNav. */
export const BOTTOM_TABS: BottomTab[] = [
  { label: "Home", icon: LayoutDashboard, path: "/admin", matchExact: true },
  { label: "Agenda", icon: Calendar, path: "/admin/agenda" },
  { label: "Demandas", icon: FileText, path: "/admin/demandas" },
  { label: "Assistidos", icon: Users, path: "/admin/assistidos" },
];

export function isTabActive(pathname: string, tab: BottomTab): boolean {
  if (tab.matchExact) return pathname === tab.path;
  return pathname === tab.path || pathname.startsWith(tab.path + "/");
}
