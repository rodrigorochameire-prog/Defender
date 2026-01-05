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

// Cores mais suaves e harmoniosas
const colorClasses = {
  blue: {
    icon: "text-blue-500/80 dark:text-blue-400",
    iconHover: "group-hover:text-blue-600 dark:group-hover:text-blue-300",
    iconActive: "text-blue-600 dark:text-blue-300",
    bg: "bg-blue-50/50 dark:bg-blue-950/30",
    bgHover: "hover:bg-blue-50/70 dark:hover:bg-blue-950/40",
    bgActive: "bg-blue-100/70 dark:bg-blue-900/40",
    border: "border-blue-100 dark:border-blue-800/30",
    glow: "dark:shadow-blue-500/10",
  },
  orange: {
    icon: "text-orange-500/80 dark:text-orange-400",
    iconHover: "group-hover:text-orange-600 dark:group-hover:text-orange-300",
    iconActive: "text-orange-600 dark:text-orange-300",
    bg: "bg-orange-50/50 dark:bg-orange-950/30",
    bgHover: "hover:bg-orange-50/70 dark:hover:bg-orange-950/40",
    bgActive: "bg-orange-100/70 dark:bg-orange-900/40",
    border: "border-orange-100 dark:border-orange-800/30",
    glow: "dark:shadow-orange-500/10",
  },
  red: {
    icon: "text-rose-500/80 dark:text-rose-400",
    iconHover: "group-hover:text-rose-600 dark:group-hover:text-rose-300",
    iconActive: "text-rose-600 dark:text-rose-300",
    bg: "bg-rose-50/50 dark:bg-rose-950/30",
    bgHover: "hover:bg-rose-50/70 dark:hover:bg-rose-950/40",
    bgActive: "bg-rose-100/70 dark:bg-rose-900/40",
    border: "border-rose-100 dark:border-rose-800/30",
    glow: "dark:shadow-rose-500/10",
  },
  green: {
    icon: "text-emerald-500/80 dark:text-emerald-400",
    iconHover: "group-hover:text-emerald-600 dark:group-hover:text-emerald-300",
    iconActive: "text-emerald-600 dark:text-emerald-300",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/30",
    bgHover: "hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40",
    bgActive: "bg-emerald-100/70 dark:bg-emerald-900/40",
    border: "border-emerald-100 dark:border-emerald-800/30",
    glow: "dark:shadow-emerald-500/10",
  },
  purple: {
    icon: "text-violet-500/80 dark:text-violet-400",
    iconHover: "group-hover:text-violet-600 dark:group-hover:text-violet-300",
    iconActive: "text-violet-600 dark:text-violet-300",
    bg: "bg-violet-50/50 dark:bg-violet-950/30",
    bgHover: "hover:bg-violet-50/70 dark:hover:bg-violet-950/40",
    bgActive: "bg-violet-100/70 dark:bg-violet-900/40",
    border: "border-violet-100 dark:border-violet-800/30",
    glow: "dark:shadow-violet-500/10",
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
                          className={`${isCollapsed ? "h-9" : "h-12"} transition-all duration-200 font-medium rounded-xl group relative overflow-hidden ${
                            isActive
                              ? `${colors.bgActive} shadow-lg ring-1 ${colors.border} ${colors.glow} dark:shadow-lg`
                              : `${colors.bgHover} text-muted-foreground hover:text-foreground hover:shadow-md dark:hover:shadow-lg`
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
                            {isActive && (
                              <div
                                className={`absolute inset-0 ${colors.bg} opacity-40`}
                              />
                            )}
                            <item.icon
                              className={`h-5 w-5 relative z-10 transition-transform duration-200 ${
                                isActive
                                  ? `${colors.iconActive}`
                                  : `${colors.iconHover} group-hover:scale-110`
                              }`}
                            />
                            <span className="relative z-10 font-medium text-sm">
                              {item.label}
                            </span>
                            {isActive && !isCollapsed && (
                              <div
                                className={`ml-auto w-1.5 h-1.5 rounded-full bg-current ${colors.iconActive}`}
                              />
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
                <Image
                  src="/tetecare-logo.png"
                  alt="Tetê Care"
                  width={32}
                  height={32}
                  className="rounded-lg object-cover shadow-sm"
                />
                <span className="font-semibold text-sm">
                  {activeMenuItem?.label ?? "Admin"}
                </span>
              </Link>
            </div>
            <ThemeToggle />
          </div>
        )}
        {!isMobile && (
          <div className="flex border-b border-border/40 h-16 items-center justify-center bg-background/95 backdrop-blur-xl px-6 sticky top-0 z-40 gap-3 shadow-sm relative">
            <Link
              href="/admin"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 blur-xl rounded-full" />
                <Image
                  src="/tetecare-logo.png"
                  alt="Tetê Care"
                  width={44}
                  height={44}
                  className="rounded-xl object-cover relative shadow-lg ring-2 ring-black/80 dark:ring-black/90"
                />
              </div>
              <span
                className="text-2xl font-semibold tracking-tight text-foreground"
                style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
              >
                Tetê Care
              </span>
            </Link>
            <div className="flex items-center gap-3 absolute right-6">
              <ThemeToggle />
            </div>
          </div>
        )}
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}

