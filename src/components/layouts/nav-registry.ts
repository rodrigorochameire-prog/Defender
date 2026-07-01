import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Calendar, FileText, Users } from "lucide-react";
import {
  COLLAPSIBLE_MENU_GROUPS,
  UTILITIES_MENU,
  type AssignmentMenuItem,
  type MenuSection,
  type UserRole,
} from "@/contexts/assignment-context";

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

export type LauncherGroup = { title: string; items: AssignmentMenuItem[] };

function roleAllows(item: AssignmentMenuItem, role: UserRole): boolean {
  return !item.requiredRoles || item.requiredRoles.includes(role);
}

/**
 * Combines the current assignment's modules with the global collapsible groups
 * and the utilities menu ("Sistema"), filtered by role and deduped by path.
 */
export function getLauncherGroups(
  modules: MenuSection[],
  role: UserRole,
): LauncherGroup[] {
  const sourceGroups: LauncherGroup[] = [
    ...modules.map((m) => ({ title: m.title, items: m.items })),
    ...COLLAPSIBLE_MENU_GROUPS.map((g) => ({ title: g.title, items: g.items })),
    { title: "Sistema", items: UTILITIES_MENU },
  ];

  const seen = new Set<string>();
  const result: LauncherGroup[] = [];
  for (const group of sourceGroups) {
    const items = group.items.filter((it) => {
      if (!roleAllows(it, role)) return false;
      if (seen.has(it.path)) return false;
      seen.add(it.path);
      return true;
    });
    if (items.length > 0) result.push({ title: group.title, items });
  }
  return result;
}
