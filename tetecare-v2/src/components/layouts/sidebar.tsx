"use client";

import Link from "next/link";
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
  { href: "/admin/bookings", label: "Reservas", icon: FileText },
  { href: "/admin/credits", label: "Créditos", icon: CreditCard },
  { href: "/admin/notifications", label: "Notificações", icon: Bell },
  { href: "/admin/settings", label: "Configurações", icon: Settings },
];

const tutorNavItems: NavItem[] = [
  { href: "/tutor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tutor/pets", label: "Meus Pets", icon: Dog },
  { href: "/tutor/calendar", label: "Calendário", icon: Calendar },
  { href: "/tutor/bookings", label: "Reservas", icon: FileText },
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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-lg">🐾</span>
            </div>
            <span className="font-bold text-xl text-gray-900">TeteCare</span>
          </div>
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
