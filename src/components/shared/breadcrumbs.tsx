"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
}

// Mapeamento de rotas para labels amigáveis
const ROUTE_LABELS: Record<string, string> = {
  admin: "Painel",
  dashboard: "Dashboard",
  casos: "Casos",
  processos: "Processos",
  demandas: "Demandas",
  assistidos: "Assistidos",
  audiencias: "Audiências",
  prazos: "Prazos",
  juri: "Júri",
  kanban: "Kanban",
  calendario: "Calendário",
  calendar: "Agenda",
  settings: "Configurações",
  profile: "Perfil",
  relatorios: "Relatórios",
  documentos: "Documentos",
  whatsapp: "WhatsApp",
  novo: "Novo",
  nova: "Nova",
  editar: "Editar",
  detalhes: "Detalhes",
  busca: "Busca",
  custodia: "Custódia",
  beneficios: "Benefícios",
  medidas: "Medidas",
  inteligencia: "Inteligência",
  integracoes: "Integrações",
  templates: "Templates",
  notifications: "Notificações",
  workspaces: "Workspaces",
  avaliacao: "Avaliação",
  cockpit: "Cockpit",
  historico: "Histórico",
  investigacao: "Investigação",
  laboratorio: "Laboratório",
  provas: "Provas",
  teses: "Teses",
  jurados: "Jurados",
  profiler: "Profiler",
};

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];
  
  let currentPath = "";
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;
    
    // Pular segmentos numéricos (IDs) mas mantê-los no path
    const isId = /^\d+$/.test(segment) || /^[a-f0-9-]{36}$/i.test(segment);
    
    if (isId) {
      // Para IDs, usar "Detalhes" ou manter o anterior + ID
      breadcrumbs.push({
        label: `#${segment.slice(0, 8)}...`,
        href: currentPath,
      });
    } else {
      const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // Último item não tem link
      const isLast = i === segments.length - 1;
      
      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
      });
    }
  }
  
  return breadcrumbs;
}

export function Breadcrumbs({ items, className, showHome = true }: BreadcrumbsProps) {
  const pathname = usePathname();
  
  // Usar items fornecidos ou gerar automaticamente
  const breadcrumbItems = items || generateBreadcrumbs(pathname);
  
  if (breadcrumbItems.length <= 1) {
    return null; // Não mostrar breadcrumb se só tem 1 nível
  }
  
  return (
    <nav 
      aria-label="Navegação estrutural" 
      className={cn("flex items-center text-sm", className)}
    >
      <ol className="flex items-center gap-1.5">
        {showHome && (
          <>
            <li>
              <Link 
                href="/admin/dashboard" 
                className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="sr-only">Início</span>
              </Link>
            </li>
            <li className="text-muted-foreground/50">
              <ChevronRight className="w-4 h-4" />
            </li>
          </>
        )}
        
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          return (
            <li key={index} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
              )}
              
              {item.href && !isLast ? (
                <Link 
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(
                  "font-medium",
                  isLast ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
