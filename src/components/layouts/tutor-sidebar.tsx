"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Dog,
  Calendar,
  CreditCard,
  Syringe,
  FileText,
  LogOut,
  Pill,
  ClipboardList,
  MessageSquare,
  PanelLeft,
  User,
  BarChart3,
  CalendarCheck,
  GraduationCap,
  Heart,
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

interface TutorSidebarProps {
  children: ReactNode;
  userName: string;
  userEmail?: string;
}

const menuGroups = [
  {
    label: "Principal",
    color: "blue",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/tutor" },
      { icon: Dog, label: "Meus Pets", path: "/tutor/pets" },
      { icon: Calendar, label: "Calendário", path: "/tutor/calendar" },
      { icon: CalendarCheck, label: "Reservas", path: "/tutor/bookings" },
    ],
  },
  {
    label: "Saúde",
    color: "red",
    items: [
      { icon: Heart, label: "Central de Saúde", path: "/tutor/health" },
      { icon: GraduationCap, label: "Treinamento", path: "/tutor/training" },
      { icon: ClipboardList, label: "Logs Diários", path: "/tutor/logs" },
    ],
  },
  {
    label: "Comunicação",
    color: "orange",
    items: [
      { icon: MessageSquare, label: "Mural", path: "/tutor/wall" },
      { icon: FileText, label: "Documentos", path: "/tutor/documents" },
    ],
  },
  {
    label: "Financeiro",
    color: "green",
    items: [
      { icon: CreditCard, label: "Créditos", path: "/tutor/credits" },
      { icon: BarChart3, label: "Relatórios", path: "/tutor/reports" },
    ],
  },
];

const colorClasses = {
  blue: {
    icon: "text-cyan-600",
    iconHover: "group-hover:text-cyan-600",
    iconActive: "text-cyan-600",
    bg: "bg-cyan-50",
    bgHover: "hover:bg-cyan-50",
    bgActive: "bg-cyan-100",
    border: "border-cyan-200",
  },
  orange: {
    icon: "text-orange-600",
    iconHover: "group-hover:text-orange-600",
    iconActive: "text-orange-600",
    bg: "bg-orange-50",
    bgHover: "hover:bg-orange-50",
    bgActive: "bg-orange-100",
    border: "border-orange-200",
  },
  red: {
    icon: "text-red-600",
    iconHover: "group-hover:text-red-600",
    iconActive: "text-red-600",
    bg: "bg-red-50",
    bgHover: "hover:bg-red-50",
    bgActive: "bg-red-100",
    border: "border-red-200",
  },
  green: {
    icon: "text-green-600",
    iconHover: "group-hover:text-green-600",
    iconActive: "text-green-600",
    bg: "bg-green-50",
    bgHover: "hover:bg-green-50",
    bgActive: "bg-green-100",
    border: "border-green-200",
  },
};

const SIDEBAR_WIDTH_KEY = "tutor-sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 240;
const MAX_WIDTH = 400;

export function TutorSidebar({ children, userName, userEmail }: TutorSidebarProps) {
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
      <TutorSidebarContent
        setSidebarWidth={setSidebarWidth}
        userName={userName}
        userEmail={userEmail}
      >
        {children}
      </TutorSidebarContent>
    </SidebarProvider>
  );
}

function TutorSidebarContent({
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
        (item.path !== "/tutor" && pathname.startsWith(item.path + "/"))
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
                  <span className="text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    Portal do Tutor
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-3 py-2 overflow-y-auto flex-1">
            <SidebarMenu className={isCollapsed ? "gap-0.5" : "gap-2"}>
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
                      (item.path !== "/tutor" && pathname.startsWith(item.path + "/"));
                    const colors = colorClasses[group.color as keyof typeof colorClasses];

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={`${isCollapsed ? "h-9" : "h-12"} transition-all duration-300 font-medium rounded-xl group relative overflow-hidden ${
                            isActive
                              ? `${colors.bgActive} shadow-lg ring-2 ${colors.border}`
                              : `${colors.bgHover} text-muted-foreground hover:text-foreground hover:shadow-md`
                          }`}
                        >
                          <Link
                            href={item.path}
                            onClick={() => {
                              if (isMobile && state === "expanded") {
                                setOpen(false);
                              }
                            }}
                          >
                            {isActive && (
                              <div
                                className={`absolute inset-0 ${colors.bg} opacity-50 animate-pulse`}
                              />
                            )}
                            <item.icon
                              className={`h-6 w-6 relative z-10 transition-all duration-300 ${
                                isActive
                                  ? `${colors.iconActive} drop-shadow-md`
                                  : `${colors.iconHover} group-hover:scale-110`
                              }`}
                            />
                            <span className="relative z-10 font-semibold">
                              {item.label}
                            </span>
                            {isActive && !isCollapsed && (
                              <div
                                className={`ml-auto w-2 h-2 rounded-full ${colors.iconActive} animate-pulse shadow-lg`}
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

          <SidebarFooter className="p-3 border-t border-border/40 bg-gradient-to-t from-cyan-500/5 to-transparent">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gradient-to-r hover:from-cyan-500/10 hover:to-cyan-500/5 transition-all duration-300 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 group shadow-sm hover:shadow-md">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 blur-lg rounded-full" />
                    <Avatar className="h-11 w-11 border-2 border-cyan-500/30 shadow-lg relative ring-2 ring-background">
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-cyan-500/25 to-blue-500/15 text-cyan-600">
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
                  onClick={() => router.push("/tutor/profile")}
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
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-gradient-to-b hover:from-cyan-400/40 hover:via-blue-300/30 hover:to-cyan-400/40 transition-all duration-300 ${
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
              <SidebarTrigger className="h-10 w-10 rounded-xl bg-accent/50 hover:bg-cyan-500/20 transition-colors" />
              <Link href="/tutor" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Image
                  src="/tetecare-logo.png"
                  alt="Tetê Care"
                  width={32}
                  height={32}
                  className="rounded-lg object-cover shadow-sm"
                />
                <span className="font-semibold text-sm">
                  {activeMenuItem?.label ?? "Portal"}
                </span>
              </Link>
            </div>
            <ThemeToggle />
          </div>
        )}
        {!isMobile && (
          <div className="flex border-b border-border/40 h-16 items-center justify-center bg-background/95 backdrop-blur-xl px-6 sticky top-0 z-40 gap-3 shadow-sm relative">
            <Link
              href="/tutor"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/5 blur-xl rounded-full" />
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

