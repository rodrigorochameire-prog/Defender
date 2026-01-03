"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Dog,
  Calendar,
  Users,
  CreditCard,
  Bell,
  Settings,
  Syringe,
  FileText,
  LogOut,
  Pill,
  ClipboardList,
  TrendingUp,
  MessageSquare,
  Shield,
  BarChart3,
  ShoppingBag,
  Wallet,
  Star,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  userRole: "admin" | "user";
  userName: string;
  onLogout: () => void;
}

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pets", label: "Pets", icon: Dog },
  { href: "/admin/tutors", label: "Tutores", icon: Users },
  { href: "/admin/calendar", label: "Calendário", icon: Calendar },
  { href: "/admin/vaccines", label: "Vacinas", icon: Syringe },
  { href: "/admin/medications", label: "Medicamentos", icon: Pill },
  { href: "/admin/preventives", label: "Preventivos", icon: Shield },
  { href: "/admin/food", label: "Alimentação", icon: ShoppingBag },
  { href: "/admin/logs", label: "Logs Diários", icon: ClipboardList },
  { href: "/admin/documents", label: "Documentos", icon: FileText },
  { href: "/admin/wall", label: "Mural", icon: MessageSquare },
  { href: "/admin/packages", label: "Pacotes", icon: Wallet },
  { href: "/admin/finances", label: "Finanças", icon: TrendingUp },
  { href: "/admin/audit-logs", label: "Auditoria", icon: Shield },
  { href: "/admin/notification-templates", label: "Templates", icon: Bell },
  { href: "/admin/notifications", label: "Notificações", icon: Bell },
];

const tutorNavItems: NavItem[] = [
  { href: "/tutor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tutor/pets", label: "Meus Pets", icon: Dog },
  { href: "/tutor/calendar", label: "Calendário", icon: Calendar },
  { href: "/tutor/bookings", label: "Reservas", icon: FileText },
  { href: "/tutor/vaccines", label: "Vacinas", icon: Syringe },
  { href: "/tutor/medications", label: "Medicamentos", icon: Pill },
  { href: "/tutor/food", label: "Alimentação", icon: ShoppingBag },
  { href: "/tutor/logs", label: "Logs Diários", icon: ClipboardList },
  { href: "/tutor/documents", label: "Documentos", icon: FileText },
  { href: "/tutor/analytics", label: "Estatísticas", icon: Activity },
  { href: "/tutor/reports", label: "Relatórios", icon: BarChart3 },
  { href: "/tutor/reviews", label: "Avaliações", icon: Star },
  { href: "/tutor/wall", label: "Mural", icon: MessageSquare },
  { href: "/tutor/credits", label: "Créditos", icon: CreditCard },
  { href: "/tutor/notifications", label: "Notificações", icon: Bell },
];

export function Sidebar({ userRole, userName, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const navItems = userRole === "admin" ? adminNavItems : tutorNavItems;

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/tetecare-logo.png"
              alt="Tetê Care"
              width={32}
              height={32}
              className="rounded-lg object-cover"
            />
            <span className="font-bold text-xl text-gray-900">Tetê Care</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" &&
                item.href !== "/tutor" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary text-white text-sm">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {userName}
              </p>
              <p className="text-xs text-gray-500">
                {userRole === "admin" ? "Administrador" : "Tutor"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </aside>
  );
}
