"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Dog,
  Calendar,
  Users,
  CreditCard,
  Bell,
  Syringe,
  FileText,
  LogOut,
  Pill,
  ClipboardList,
  TrendingUp,
  MessageSquare,
  Shield,
  PanelLeft,
  Heart,
  Brain,
  UtensilsCrossed,
  UserCog,
  User,
  GraduationCap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontSizeToggle } from "@/components/font-size-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";
import { logoutAction } from "@/app/(dashboard)/actions";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  children: ReactNode;
  userName: string;
  userEmail?: string;
}

const menuGroups = [
  {
    label: "Operacional",
    color: "blue",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: Dog, label: "Pets", path: "/admin/pets" },
      { icon: Calendar, label: "Calendário", path: "/admin/calendar" },
    ],
  },
  {
    label: "Cuidados",
    color: "red",
    items: [
      { icon: Heart, label: "Central de Saúde", path: "/admin/health" },
      { icon: UtensilsCrossed, label: "Alimentação", path: "/admin/food" },
      { icon: Brain, label: "Comportamento", path: "/admin/behavior" },
      { icon: GraduationCap, label: "Treinamento", path: "/admin/training" },
      { icon: ClipboardList, label: "Logs Diários", path: "/admin/logs" },
    ],
  },
  {
    label: "Comunicação",
    color: "orange",
    items: [
      { icon: MessageSquare, label: "Mural", path: "/admin/wall" },
      { icon: FileText, label: "Documentos", path: "/admin/documents" },
    ],
  },
  {
    label: "Financeiro",
    color: "green",
    items: [
      { icon: TrendingUp, label: "Finanças", path: "/admin/finances" },
    ],
  },
  {
    label: "Gestão",
    color: "purple",
    items: [
      { icon: Users, label: "Tutores", path: "/admin/tutors" },
    ],
  },
];

// Sistema de cores harmonioso e organizado
// - Operacional (azul): Dashboard, Pets, Calendário
// - Cuidados (rosa): Saúde, Alimentação, Comportamento, Treinamento, Logs
// - Comunicação (laranja): Mural, Documentos  
// - Financeiro (verde): Finanças
// - Gestão (slate): Tutores
const colorClasses = {
  blue: {
    icon: "text-blue-500 dark:text-blue-400",
    iconActive: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50/60 dark:bg-blue-950/40",
    bgHover: "hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
    bgActive: "bg-blue-50/80 dark:bg-blue-950/50",
    border: "border-blue-200/50 dark:border-blue-700/30",
    glow: "",
  },
  red: {
    icon: "text-rose-500 dark:text-rose-400",
    iconActive: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50/60 dark:bg-rose-950/40",
    bgHover: "hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
    bgActive: "bg-rose-50/80 dark:bg-rose-950/50",
    border: "border-rose-200/50 dark:border-rose-700/30",
    glow: "",
  },
  orange: {
    icon: "text-orange-500 dark:text-orange-400",
    iconActive: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50/60 dark:bg-orange-950/40",
    bgHover: "hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
    bgActive: "bg-orange-50/80 dark:bg-orange-950/50",
    border: "border-orange-200/50 dark:border-orange-700/30",
    glow: "",
  },
  green: {
    icon: "text-emerald-500 dark:text-emerald-400",
    iconActive: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50/60 dark:bg-emerald-950/40",
    bgHover: "hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
    bgActive: "bg-emerald-50/80 dark:bg-emerald-950/50",
    border: "border-emerald-200/50 dark:border-emerald-700/30",
    glow: "",
  },
  purple: {
    icon: "text-slate-500 dark:text-slate-400",
    iconActive: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50/60 dark:bg-slate-800/40",
    bgHover: "hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
    bgActive: "bg-slate-100/80 dark:bg-slate-800/50",
    border: "border-slate-200/50 dark:border-slate-700/30",
    glow: "",
  },
};

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 260;
const MAX_WIDTH = 420;

export function AdminSidebar({ children, userName, userEmail }: AdminSidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      setSidebarWidth(parseInt(saved, 10));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <AdminSidebarContent
        setSidebarWidth={setSidebarWidth}
        userName={userName}
        userEmail={userEmail}
      >
        {children}
      </AdminSidebarContent>
    </SidebarProvider>
  );
}

function AdminSidebarContent({
  children,
  setSidebarWidth,
  userName,
  userEmail,
}: {
  children: ReactNode;
  setSidebarWidth: (width: number) => void;
  userName: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, toggleSidebar, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const activeMenuItem = menuGroups
    .flatMap((g) => g.items)
    .find(
      (item) =>
        pathname === item.path ||
        (item.path !== "/admin" && pathname.startsWith(item.path + "/"))
    );

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  async function handleLogout() {
    await logoutAction();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-border/40 bg-gradient-to-b from-card/95 via-card to-card/90 backdrop-blur-xl shadow-xl"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-14 justify-center border-b border-border/20">
            <div className="flex items-center gap-3 px-6 transition-all w-full">
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Administração
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-3 py-2 overflow-y-auto flex-1">
            <SidebarMenu className={isCollapsed ? "gap-0.5" : "gap-2"}>
              {/* Toggle Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleSidebar}
                  tooltip={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
                  className={`${isCollapsed ? "h-9" : "h-12"} hover:bg-primary/10 transition-all duration-300`}
                >
                  <PanelLeft className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                    {isCollapsed ? "Expandir" : "Recolher Menu"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <div className="h-px bg-border/40 my-2" />

              {/* Menu Groups */}
              {menuGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  {!isCollapsed && (
                    <div className="px-3 py-2 mt-4 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {group.label}
                      </span>
                    </div>
                  )}

                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.path ||
                      (item.path !== "/admin" && pathname.startsWith(item.path + "/"));
                    const colors = colorClasses[group.color as keyof typeof colorClasses];

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={`${isCollapsed ? "h-9" : "h-12"} transition-all duration-200 rounded-xl group relative overflow-hidden ${
                            isActive
                              ? `${colors.bgActive} shadow-sm ring-1 ${colors.border}`
                              : `${colors.bgHover}`
                          }`}
                        >
                          <Link
                            href={item.path}
                            prefetch={true}
                            onClick={() => {
                              if (isMobile && state === "expanded") {
                                setOpen(false);
                              }
                            }}
                          >
                            {/* Ícone SEMPRE colorido */}
                            <item.icon
                              className={`h-6 w-6 relative z-10 transition-transform duration-200 group-hover:scale-105 ${colors.icon}`}
                            />
                            {/* Texto SEMPRE neutro */}
                            <span className={`relative z-10 text-sm ${
                              isActive 
                                ? "font-medium text-foreground" 
                                : "text-muted-foreground group-hover:text-foreground"
                            }`}>
                              {item.label}
                            </span>
                            {isActive && !isCollapsed && (
                              <div className={`ml-auto w-1.5 h-1.5 rounded-full ${colors.icon}`} />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {groupIndex < menuGroups.length - 1 && (
                    <div
                      className={`h-px bg-border/20 mx-3 ${isCollapsed ? "my-1" : "my-3"}`}
                    />
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border/40 bg-gradient-to-t from-primary/5 to-transparent">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 transition-all duration-300 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group shadow-sm hover:shadow-md">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 blur-lg rounded-full" />
                    <Avatar className="h-11 w-11 border-2 border-primary/30 shadow-lg relative ring-2 ring-background">
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/25 to-accent/15 text-primary">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate leading-none text-foreground">
                        {userName}
                      </p>
                      {userEmail && (
                        <p className="text-xs text-muted-foreground truncate mt-1.5 font-medium">
                          {userEmail}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 shadow-2xl border-border/40">
                <DropdownMenuItem
                  onClick={() => router.push("/admin/profile")}
                  className="cursor-pointer font-medium"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive font-semibold"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <div
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-gradient-to-b hover:from-primary/40 hover:via-accent/30 hover:to-primary/40 transition-all duration-300 ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="ml-0">
        {isMobile && (
          <div className="flex border-b border-border/40 h-16 items-center justify-between bg-background/95 backdrop-blur-xl px-4 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-10 w-10 rounded-xl bg-accent/50 hover:bg-primary/20 transition-colors" />
              <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm ring-1 ring-primary/30">
                  <Image
                    src="/tetecare-logo.png"
                    alt="Tetê Care"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover scale-110"
                  />
                </div>
                <span className="font-semibold text-sm">
                  {activeMenuItem?.label ?? "Admin"}
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
              <NotificationsPopover />
              <FontSizeToggle />
              <ThemeToggle />
            </div>
          </div>
        )}
        {!isMobile && (
          <div className="flex border-b border-border/40 h-14 items-center justify-center bg-background/95 backdrop-blur-xl px-6 sticky top-0 z-40 gap-3 shadow-sm relative">
            <Link
              href="/admin"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-lg ring-2 ring-primary/30 dark:ring-primary/50">
                <Image
                  src="/tetecare-logo.png"
                  alt="Tetê Care"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover scale-110"
                />
              </div>
              <span
                className="text-xl font-semibold tracking-tight text-foreground"
                style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
              >
                Tetê Care
              </span>
            </Link>
            <div className="flex items-center gap-1.5 absolute right-6">
              <NotificationsPopover />
              <FontSizeToggle />
              <ThemeToggle />
            </div>
          </div>
        )}
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}

