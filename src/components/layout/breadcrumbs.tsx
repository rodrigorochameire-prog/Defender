"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

// Mapeamento de rotas para labels amigáveis
const ROUTE_LABELS: Record<string, string> = {
  admin: "Dashboard",
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
  workspaces: "Workspaces",
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
        <Home className="w-4 h-4 text-zinc-400" />
        <span className="font-semibold text-zinc-100">Dashboard</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm overflow-hidden">
      {/* Home icon sempre presente */}
      <Link
        href="/admin"
        className="flex items-center text-zinc-400 hover:text-emerald-400 transition-colors shrink-0"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center gap-1 min-w-0">
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />

          {item.isLast ? (
            <span
              className={cn(
                "font-semibold truncate max-w-[150px]",
                item.isId ? "text-zinc-300" : "text-zinc-100"
              )}
              title={item.label}
            >
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className={cn(
                "hover:text-emerald-400 transition-colors truncate max-w-[120px]",
                item.isId ? "text-zinc-500" : "text-zinc-400"
              )}
              title={item.label}
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
