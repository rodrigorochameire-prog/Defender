"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Bell,
  FileText,
  LogOut,
  ClipboardList,
  TrendingUp,
  MessageSquare,
  PanelLeft,
  User,
  MessageCircle,
  Settings,
  BarChart3,
  Scale,
  Gavel,
  FileSearch,
  Clock,
  AlertTriangle,
  Calculator,
  FolderOpen,
  UserCheck,
  Building2,
  Briefcase,
  Timer,
  Target,
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
    label: "Principal",
    color: "emerald",
    items: [
      { icon: LayoutDashboard, label: "Sala de Guerra", path: "/admin" },
      { icon: Users, label: "Assistidos", path: "/admin/assistidos" },
      { icon: Scale, label: "Processos", path: "/admin/processos" },
    ],
  },
  {
    label: "Prazos e Demandas",
    color: "slate",
    items: [
      { icon: Clock, label: "Demandas", path: "/admin/demandas" },
      { icon: AlertTriangle, label: "Prazos Urgentes", path: "/admin/prazos" },
      { icon: Target, label: "Kanban", path: "/admin/kanban" },
    ],
  },
  {
    label: "Agenda",
    color: "slate",
    items: [
      { icon: Calendar, label: "Calendário", path: "/admin/calendar" },
      { icon: Gavel, label: "Tribunal do Júri", path: "/admin/juri" },
      { icon: Briefcase, label: "Audiências", path: "/admin/audiencias" },
      { icon: UserCheck, label: "Atendimentos", path: "/admin/atendimentos" },
    ],
  },
  {
    label: "Documentos",
    color: "slate",
    items: [
      { icon: FileText, label: "Peças e Docs", path: "/admin/documentos" },
      { icon: FolderOpen, label: "Templates", path: "/admin/templates" },
    ],
  },
  {
    label: "Ferramentas",
    color: "slate",
    items: [
      { icon: Calculator, label: "Calculadoras", path: "/admin/calculadoras" },
      { icon: FileSearch, label: "Buscar Processos", path: "/admin/busca" },
    ],
  },
  {
    label: "Comunicação",
    color: "slate",
    items: [
      { icon: MessageCircle, label: "WhatsApp", path: "/admin/whatsapp" },
      { icon: Bell, label: "Notificações", path: "/admin/notifications" },
    ],
  },
  {
    label: "Gestão",
    color: "slate",
    items: [
      { icon: Building2, label: "Defensoria", path: "/admin/defensoria" },
      { icon: BarChart3, label: "Relatórios", path: "/admin/relatorios" },
      { icon: Settings, label: "Configurações", path: "/admin/settings" },
    ],
  },
];

// Sistema de cores minimalista jurídico
const colorClasses = {
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    iconActive: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-zinc-800/50",
    bgHover: "hover:bg-zinc-800/70",
    bgActive: "bg-emerald-900/40",
    border: "border-emerald-600/30",
    glow: "",
  },
  slate: {
    icon: "text-zinc-400",
    iconActive: "text-emerald-400",
    bg: "bg-zinc-800/30",
    bgHover: "hover:bg-zinc-800/50",
    bgActive: "bg-zinc-700/50",
    border: "border-zinc-600/30",
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
  const { signOut } = useClerk();
  const { state, toggleSidebar, setOpen, openMobile, setOpenMobile } = useSidebar();
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
    await signOut({ redirectUrl: "/" });
  }

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-zinc-800 bg-zinc-900 shadow-2xl"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-zinc-800">
            <div className="flex items-center gap-3 px-6 transition-all w-full">
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight text-zinc-100">
                    DefesaHub
                  </span>
                  <span className="text-[10px] font-medium tracking-widest uppercase text-zinc-500">
                    Gestão Jurídica
                  </span>
                </div>
              )}
              {isCollapsed && (
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Scale className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-3 py-3 overflow-y-auto flex-1">
            <SidebarMenu className={isCollapsed ? "gap-0.5" : "gap-1"}>
              {/* Toggle Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleSidebar}
                  tooltip={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
                  className={`${isCollapsed ? "h-9" : "h-10"} hover:bg-zinc-800 transition-all duration-200`}
                >
                  <PanelLeft className="h-5 w-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    {isCollapsed ? "Expandir" : "Recolher"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <div className="h-px bg-zinc-800 my-2" />

              {/* Menu Groups */}
              {menuGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  {!isCollapsed && (
                    <div className="px-3 py-2 mt-4 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                        {group.label}
                      </span>
                    </div>
                  )}

                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.path ||
                      (item.path !== "/admin" && pathname.startsWith(item.path + "/"));
                    const colors = colorClasses[group.color as keyof typeof colorClasses] || colorClasses.slate;

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={`${isCollapsed ? "h-9" : "h-10"} transition-all duration-200 rounded-lg group relative overflow-hidden ${
                            isActive
                              ? `${colors.bgActive} ring-1 ${colors.border}`
                              : `${colors.bgHover}`
                          }`}
                        >
                          <Link
                            href={item.path}
                            prefetch={true}
                            onClick={() => {
                              if (isMobile && openMobile) {
                                setOpenMobile(false);
                              }
                            }}
                          >
                            <item.icon
                              className={`transition-colors duration-200 ${
                                isActive
                                  ? `${colors.iconActive} h-[18px] w-[18px]`
                                  : `h-[18px] w-[18px] text-zinc-400 group-hover:text-zinc-200`
                              }`}
                              strokeWidth={isActive ? 2 : 1.5}
                            />
                            <span className={`text-sm transition-colors duration-200 ${
                              isActive 
                                ? "font-medium text-zinc-100" 
                                : "font-normal text-zinc-400 group-hover:text-zinc-200"
                            }`}>
                              {item.label}
                            </span>
                            {isActive && !isCollapsed && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {groupIndex < menuGroups.length - 1 && (
                    <div
                      className={isCollapsed 
                        ? "h-px mx-2 my-2 bg-zinc-800" 
                        : "h-px mx-3 my-2 bg-zinc-800/50"
                      }
                    />
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-zinc-800">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-zinc-800 transition-all duration-200 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 group">
                  <Avatar className="h-9 w-9 border border-zinc-700">
                    <AvatarFallback className="text-xs font-semibold bg-zinc-800 text-zinc-300">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-none text-zinc-200">
                        {userName}
                      </p>
                      {userEmail && (
                        <p className="text-xs text-zinc-500 truncate mt-1">
                          {userEmail}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800">
                <DropdownMenuItem
                  onClick={() => router.push("/admin/profile")}
                  className="cursor-pointer text-zinc-300 hover:text-zinc-100 focus:text-zinc-100"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-400 focus:text-red-300"
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
          <div className="flex border-b border-border h-14 items-center justify-between bg-background px-4 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-muted hover:bg-muted/80 transition-colors" />
              <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <Scale className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-sm">
                  {activeMenuItem?.label ?? "DefesaHub"}
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <NotificationsPopover />
              <ThemeToggle />
            </div>
          </div>
        )}
        {!isMobile && (
          <div className="flex border-b border-border h-16 items-center justify-between bg-card px-6 sticky top-0 z-40">
            <Link
              href="/admin"
              className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  DefesaHub
                </span>
                <span className="text-xs text-muted-foreground">
                  Sistema de Gestão Jurídica
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <NotificationsPopover />
              <ThemeToggle />
            </div>
          </div>
        )}
        <main className="flex-1 p-6 md:p-8 min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
