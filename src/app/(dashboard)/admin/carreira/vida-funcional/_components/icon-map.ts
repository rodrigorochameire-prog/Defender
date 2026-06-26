import {
  Briefcase, Palmtree, Plane, Send, Mail, Handshake, Coins, Zap,
  Luggage, Receipt, FileText, Milestone, type LucideIcon,
} from "lucide-react";

export const VF_ICONS: Record<string, LucideIcon> = {
  Briefcase, Palmtree, Plane, Send, Mail, Handshake, Coins, Zap,
  Luggage, Receipt, FileText, Milestone,
};

export function vfIcon(name: string): LucideIcon {
  return VF_ICONS[name] ?? FileText;
}
