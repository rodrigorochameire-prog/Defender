"use client";

import Link from "next/link";
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
  Target,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: Users, label: "Assistidos", path: "/admin/assistidos" },
      { icon: Scale, label: "Processos", path: "/admin/processos" },
      { icon: Calendar, label: "Calendário", path: "/admin/calendar" },
    ],
  },
  {
    label: "Demandas",
    items: [
      { icon: Clock, label: "Demandas", path: "/admin/demandas" },
      { icon: AlertTriangle, label: "Prazos", path: "/admin/prazos" },
      { icon: Target, label: "Kanban", path: "/admin/kanban" },
    ],
  },
  {
    label: "Audiências",
    items: [
      { icon: Gavel, label: "Júri", path: "/admin/juri" },
      { icon: Briefcase, label: "Audiências", path: "/admin/audiencias" },
      { icon: UserCheck, label: "Atendimentos", path: "/admin/atendimentos" },
    ],
  },
  {
    label: "Documentos",
    items: [
      { icon: FileText, label: "Peças e Docs", path: "/admin/documentos" },
      { icon: FolderOpen, label: "Templates", path: "/admin/templates" },
    ],
  },
  {
    label: "Ferramentas",
    items: [
      { icon: Calculator, label: "Calculadoras", path: "/admin/calculadoras" },
      { icon: FileSearch, label: "Buscar", path: "/admin/busca" },
    ],
  },
  {
    label: "Comunicação",
    items: [
      { icon: MessageCircle, label: "WhatsApp", path: "/admin/whatsapp" },
      { icon: Bell, label: "Notificações", path: "/admin/notifications" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { icon: Building2, label: "Defensoria", path: "/admin/defensoria" },
      { icon: BarChart3, label: "Relatórios", path: "/admin/relatorios" },
      { icon: Settings, label: "Configurações", path: "/admin/settings" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 240;
const MAX_WIDTH = 380;

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
  const { state, toggleSidebar, openMobile, setOpenMobile } = useSidebar();
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
          className="border-r border-[hsl(155_15%_90%)] dark:border-[hsl(160_12%_14%)] bg-[hsl(155_15%_98%)] dark:bg-[hsl(160_15%_5%)] backdrop-blur-xl"
          disableTransition={isResizing}
        >
          {/* Header com gradiente verde sutil */}
          <SidebarHeader className="h-14 justify-center border-b border-[hsl(155_15%_92%)] dark:border-[hsl(160_12%_12%)] bg-gradient-to-r from-[hsl(158_30%_96%)] to-transparent dark:from-[hsl(158_20%_8%)] dark:to-transparent">
            <div className="flex items-center gap-3 px-5 transition-all w-full">
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[hsl(158_40%_35%)] dark:text-[hsl(158_40%_55%)]">
                    Administração
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2.5 py-3 overflow-y-auto flex-1">
            <SidebarMenu className={isCollapsed ? "gap-0.5" : "gap-1"}>
              {/* Toggle Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleSidebar}
                  tooltip={isCollapsed ? "Expandir" : "Recolher"}
                  className={cn(
                    "h-10 rounded-xl transition-all duration-200",
                    "hover:bg-[hsl(158_20%_94%)] dark:hover:bg-[hsl(158_15%_12%)]",
                    "text-[hsl(160_10%_45%)] dark:text-[hsl(150_8%_55%)]"
                  )}
                >
                  <PanelLeft className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[13px] font-medium">
                    {isCollapsed ? "Expandir" : "Recolher"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <div className="h-px bg-[hsl(155_15%_90%)] dark:bg-[hsl(160_12%_14%)] my-2 mx-2" />

              {/* Menu Groups */}
              {menuGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  {!isCollapsed && (
                    <div className="px-3 py-2 mt-3 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(160_8%_50%)] dark:text-[hsl(150_6%_45%)]">
                        {group.label}
                      </span>
                    </div>
                  )}

                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.path ||
                      (item.path !== "/admin" && pathname.startsWith(item.path + "/"));

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={cn(
                            "h-10 transition-all duration-200 rounded-xl group relative",
                            isActive
                              ? "bg-[hsl(158_35%_92%)] dark:bg-[hsl(158_25%_12%)] shadow-sm ring-1 ring-[hsl(158_30%_88%)] dark:ring-[hsl(158_20%_18%)]"
                              : "hover:bg-[hsl(155_15%_95%)] dark:hover:bg-[hsl(160_12%_10%)]"
                          )}
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
                              className={cn(
                                "transition-colors duration-200",
                                isActive
                                  ? "h-5 w-5 text-[hsl(158_55%_38%)] dark:text-[hsl(158_50%_52%)]"
                                  : "h-[18px] w-[18px] text-[hsl(160_8%_45%)] dark:text-[hsl(150_6%_50%)] group-hover:text-[hsl(158_40%_40%)] dark:group-hover:text-[hsl(158_35%_55%)]"
                              )}
                              strokeWidth={isActive ? 2 : 1.5}
                            />
                            <span
                              className={cn(
                                "text-[13px] transition-colors duration-200",
                                isActive
                                  ? "font-semibold text-[hsl(160_15%_20%)] dark:text-[hsl(150_10%_90%)]"
                                  : "font-medium text-[hsl(160_8%_40%)] dark:text-[hsl(150_6%_60%)] group-hover:text-[hsl(160_12%_25%)] dark:group-hover:text-[hsl(150_8%_75%)]"
                              )}
                            >
                              {item.label}
                            </span>
                            {isActive && !isCollapsed && (
                              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[hsl(158_55%_42%)] dark:bg-[hsl(158_50%_50%)]" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {groupIndex < menuGroups.length - 1 && (
                    <div
                      className={cn(
                        "my-2 mx-2",
                        isCollapsed
                          ? "h-[2px] bg-[hsl(155_12%_88%)] dark:bg-[hsl(160_10%_15%)] rounded-full"
                          : "h-px bg-[hsl(155_15%_92%)] dark:bg-[hsl(160_12%_12%)]"
                      )}
                    />
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer com gradiente verde sutil */}
          <SidebarFooter className="p-3 border-t border-[hsl(155_15%_92%)] dark:border-[hsl(160_12%_12%)] bg-gradient-to-t from-[hsl(158_25%_96%)] to-transparent dark:from-[hsl(158_15%_7%)] dark:to-transparent">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[hsl(158_20%_94%)] dark:hover:bg-[hsl(158_15%_12%)] transition-all duration-200 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(158_55%_42%)/0.4] group">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-[hsl(158_30%_85%)] dark:border-[hsl(158_20%_25%)] shadow-sm ring-1 ring-white dark:ring-transparent">
                      <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-[hsl(158_40%_92%)] to-[hsl(158_35%_88%)] dark:from-[hsl(158_30%_18%)] dark:to-[hsl(158_25%_14%)] text-[hsl(158_50%_35%)] dark:text-[hsl(158_45%_60%)]">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate text-[hsl(160_15%_20%)] dark:text-[hsl(150_10%_88%)]">
                        {userName}
                      </p>
                      {userEmail && (
                        <p className="text-[11px] text-[hsl(160_8%_50%)] dark:text-[hsl(150_6%_50%)] truncate mt-0.5">
                          {userEmail}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 shadow-xl border-[hsl(155_15%_90%)] dark:border-[hsl(160_12%_18%)]">
                <DropdownMenuItem
                  onClick={() => router.push("/admin/profile")}
                  className="cursor-pointer font-medium text-[13px]"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive font-medium text-[13px]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize Handle */}
        <div
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors duration-200",
            "hover:bg-[hsl(158_40%_75%)] dark:hover:bg-[hsl(158_30%_30%)]",
            isCollapsed && "hidden"
          )}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="ml-0">
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex border-b border-[hsl(155_15%_92%)] dark:border-[hsl(160_12%_14%)] h-14 items-center justify-between bg-[hsl(155_15%_99%)]/95 dark:bg-[hsl(160_15%_6%)]/95 backdrop-blur-xl px-4 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-xl bg-[hsl(158_20%_95%)] dark:bg-[hsl(158_15%_12%)] hover:bg-[hsl(158_25%_92%)] dark:hover:bg-[hsl(158_18%_16%)] transition-colors" />
              <Link href="/admin" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-[hsl(158_55%_42%)] to-[hsl(160_50%_35%)] flex items-center justify-center shadow-sm">
                  <Scale className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-[13px] text-[hsl(160_15%_20%)] dark:text-[hsl(150_10%_88%)]">
                  {activeMenuItem?.label ?? "DefesaHub"}
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-1">
              <NotificationsPopover />
              <FontSizeToggle />
              <ThemeToggle />
            </div>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <div className="flex border-b border-[hsl(155_15%_92%)] dark:border-[hsl(160_12%_14%)] h-16 items-center justify-center bg-[hsl(155_15%_99%)]/95 dark:bg-[hsl(160_15%_6%)]/95 backdrop-blur-xl px-6 sticky top-0 z-40 relative">
            <Link
              href="/admin"
              className="flex items-center gap-3 hover:opacity-90 transition-opacity duration-200"
            >
              <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-[hsl(158_55%_42%)] to-[hsl(160_50%_32%)] flex items-center justify-center shadow-lg ring-1 ring-[hsl(158_40%_75%)] dark:ring-[hsl(158_30%_25%)]">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-xl font-bold tracking-tight text-[hsl(160_15%_15%)] dark:text-[hsl(150_10%_92%)]"
                  style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
                >
                  DefesaHub
                </span>
                <span className="text-[10px] text-[hsl(160_8%_50%)] dark:text-[hsl(150_6%_50%)] font-medium tracking-wide">
                  Sistema de Gestão Jurídica
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-1.5 absolute right-6">
              <NotificationsPopover />
              <FontSizeToggle />
              <ThemeToggle />
            </div>
          </div>
        )}

        <main className="flex-1 p-5 md:p-6 min-h-screen overflow-x-hidden max-w-full bg-[hsl(150_10%_98%)] dark:bg-[hsl(160_15%_6%)]">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
