"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ExternalLink,
  Globe,
  Scale,
  Users,
  MapPin,
  Building2,
  Archive,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FONTES_OSINT } from "@/config/diligencias";

const CATEGORIA_ICONS: Record<string, React.ElementType> = {
  JURIDICO: Scale,
  SOCIAL: Users,
  GERAL: Globe,
  GEO: MapPin,
  OFICIAL: Building2,
  ARQUIVO: Archive,
  TECNICO: Code,
};

const CATEGORIA_COLORS: Record<string, string> = {
  JURIDICO: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  SOCIAL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  GERAL: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
  GEO: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  OFICIAL: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ARQUIVO: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  TECNICO: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

interface OsintRadarProps {
  className?: string;
  compact?: boolean;
}

export function OsintRadar({ className, compact = false }: OsintRadarProps) {
  const [query, setQuery] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState<string | null>(null);

  const links = useMemo(() => {
    if (!query.trim()) return [];
    const encodedQuery = encodeURIComponent(query.trim());
    return FONTES_OSINT.map((fonte) => ({
      ...fonte,
      href: fonte.url.replace("{query}", encodedQuery),
    })).filter((f) => !selectedCategoria || f.categoria === selectedCategoria);
  }, [query, selectedCategoria]);

  const categorias = useMemo(() => {
    const cats = new Set(FONTES_OSINT.map((f) => f.categoria));
    return Array.from(cats);
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search input */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite o nome, CPF ou termo para pesquisar..."
            className="pl-10"
          />
        </div>
        {!compact && (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
            disabled={!query.trim()}
          >
            <Search className="w-4 h-4" />
            Gerar Links
          </Button>
        )}
      </div>

      {/* Filtros de categoria */}
      {!compact && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedCategoria === null ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-colors",
              selectedCategoria === null && "bg-emerald-600"
            )}
            onClick={() => setSelectedCategoria(null)}
          >
            Todas
          </Badge>
          {categorias.map((cat) => {
            const Icon = CATEGORIA_ICONS[cat] || Globe;
            return (
              <Badge
                key={cat}
                variant={selectedCategoria === cat ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors gap-1",
                  selectedCategoria === cat && "bg-emerald-600"
                )}
                onClick={() =>
                  setSelectedCategoria(selectedCategoria === cat ? null : cat)
                }
              >
                <Icon className="w-3 h-3" />
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Links grid */}
      {query.trim() ? (
        <div className={cn(
          "grid gap-2",
          compact ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        )}>
          {links.map((link) => {
            const Icon = CATEGORIA_ICONS[link.categoria] || Globe;
            return (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border",
                  "hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
                  "transition-all duration-200 group"
                )}
              >
                <div className={cn("p-1.5 rounded-md", CATEGORIA_COLORS[link.categoria])}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="flex-1 text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {link.label}
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-zinc-400">
          <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Digite um nome ou termo para gerar links de pesquisa em fontes abertas
        </div>
      )}
    </div>
  );
}
