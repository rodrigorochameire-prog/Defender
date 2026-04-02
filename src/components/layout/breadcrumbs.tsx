"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home, ClipboardList, Calendar, Users, Scale, FolderOpen, FileText, Settings, BarChart3, MessageSquare, Gavel, Heart, Shield, Newspaper, Map, Brain, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const ROUTE_ICONS: Record<string, LucideIcon> = {
  demandas: ClipboardList,
  agenda: Calendar,
  assistidos: Users,
  processos: Scale,
  drive: FolderOpen,
  modelos: FileText,
  settings: Settings,
  relatorios: BarChart3,
  whatsapp: MessageSquare,
  juri: Gavel,
  vvd: Heart,
  custodia: Shield,
  diligencias: Brain,
  equipe: Users,
};

// Mapeamento de rotas para labels amigáveis
const ROUTE_LABELS: Record<string, string> = {
  admin: "Dashboard",
  intimacoes: "Solar",
  demandas: "Demandas",
  agenda: "Agenda",
  casos: "Casos",
  assistidos: "Assistidos",
  processos: "Processos",
  drive: "Drive",
  modelos: "Modelos",
  diligencias: "Investigação",
  logica: "Lógica",
  equipe: "Equipe",
  juri: "Júri",
  vvd: "VVD",
  calculadoras: "Calculadoras",
  beneficios: "Benefícios",
  custodia: "Custódia",
  whatsapp: "WhatsApp",
  settings: "Configurações",
  usuarios: "Usuários",
  relatorios: "Relatórios",
  novo: "Novo",
  editar: "Editar",
  chat: "Chat",
};

interface BreadcrumbItem {
  label: string;
  href: string;
  isLast: boolean;
  isId: boolean;
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function isNumericId(str: string): boolean {
  return /^\d+$/.test(str);
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [];

    let currentPath = "";

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      const isId = isUUID(segment) || isNumericId(segment);

      // Pula o segmento "admin" no início, mas mantém o caminho
      if (segment === "admin" && index === 0) {
        return;
      }

      // Para IDs, usa um label genérico
      let label = ROUTE_LABELS[segment] || segment;
      if (isId) {
        // Tenta inferir o tipo baseado no segmento anterior
        const previousSegment = segments[index - 1];
        if (previousSegment === "assistidos") label = "Detalhes";
        else if (previousSegment === "casos") label = "Caso";
        else if (previousSegment === "processos") label = "Processo";
        else if (previousSegment === "demandas") label = "Demanda";
        else label = "#" + segment.slice(0, 8);
      }

      items.push({
        label,
        href: currentPath,
        isLast,
        isId,
      });
    });

    return items;
  }, [pathname]);

  // Se não há breadcrumbs ou só tem um item, não mostra
  if (breadcrumbs.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Home className="w-4 h-4 text-muted-foreground" />
        <span className="font-semibold text-foreground">Dashboard</span>
      </div>
    );
  }

  // When only 1 breadcrumb (listing page like /admin/demandas),
  // just show home icon — the page header already shows the title
  const isListingPage = breadcrumbs.length === 1 && !breadcrumbs[0].isId;
  const lastItem = breadcrumbs[breadcrumbs.length - 1];
  const parentItem = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2] : null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs overflow-hidden">
      <Link
        href="/admin"
        className="flex items-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors shrink-0"
        title="Dashboard"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {/* Listing pages: home > icon only (page header already shows title) */}
      {isListingPage && lastItem && (() => {
        const segment = pathname.split("/").filter(Boolean).pop() ?? "";
        const RouteIcon = ROUTE_ICONS[segment];
        return (
          <>
            <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600 shrink-0" />
            {RouteIcon ? (
              <RouteIcon className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" title={lastItem.label} />
            ) : (
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]" title={lastItem.label}>
                {lastItem.label}
              </span>
            )}
          </>
        );
      })()}

      {/* Detail pages: show parent > current */}
      {!isListingPage && parentItem && (() => {
        const segment = pathname.split("/").filter(Boolean).find(s => ROUTE_ICONS[s]);
        const RouteIcon = segment ? ROUTE_ICONS[segment] : null;
        return (
          <>
            <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600 shrink-0" />
            <Link
              href={parentItem.href}
              className="inline-flex items-center gap-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
              title={parentItem.label}
            >
              {RouteIcon && <RouteIcon className="w-3 h-3" />}
              <span className="truncate max-w-[100px]">{parentItem.label}</span>
            </Link>
          </>
        );
      })()}

      {!isListingPage && lastItem && (
        <>
          <ChevronRight className="w-3 h-3 text-zinc-300 dark:text-zinc-600 shrink-0" />
          <span
            className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]"
            title={lastItem.label}
          >
            {lastItem.label}
          </span>
        </>
      )}
    </nav>
  );
}
