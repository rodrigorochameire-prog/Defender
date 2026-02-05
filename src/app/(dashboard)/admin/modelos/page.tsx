"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileStack,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit3,
  Copy,
  Trash2,
  FileText,
  Mail,
  Briefcase,
  Scale,
  Building2,
  Sparkles,
  Clock,
  LayoutGrid,
  List,
  Filter,
  Download,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";

// Componentes estruturais
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { PageHeader } from "@/components/shared/section-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KPICardPremium, KPIGrid } from "@/components/shared/kpi-card-premium";

// ==========================================
// TIPOS
// ==========================================

type ModeloCategoria =
  | "PROVIDENCIA_ADMINISTRATIVA"
  | "PROVIDENCIA_FUNCIONAL"
  | "PROVIDENCIA_INSTITUCIONAL"
  | "PECA_PROCESSUAL"
  | "COMUNICACAO"
  | "OUTRO";

// ==========================================
// CONSTANTES
// ==========================================

const CATEGORIA_CONFIG: Record<ModeloCategoria, {
  label: string;
  shortLabel: string;
  icon: typeof FileText;
  color: string;
  gradient: "emerald" | "blue" | "amber" | "rose" | "violet" | "zinc";
}> = {
  PROVIDENCIA_ADMINISTRATIVA: {
    label: "Providência Administrativa",
    shortLabel: "Adm.",
    icon: Building2,
    color: "text-blue-600 bg-blue-50 border-blue-200",
    gradient: "blue",
  },
  PROVIDENCIA_FUNCIONAL: {
    label: "Providência Funcional",
    shortLabel: "Func.",
    icon: Briefcase,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    gradient: "emerald",
  },
  PROVIDENCIA_INSTITUCIONAL: {
    label: "Providência Institucional",
    shortLabel: "Inst.",
    icon: Building2,
    color: "text-violet-600 bg-violet-50 border-violet-200",
    gradient: "violet",
  },
  PECA_PROCESSUAL: {
    label: "Peça Processual",
    shortLabel: "Proc.",
    icon: Scale,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    gradient: "amber",
  },
  COMUNICACAO: {
    label: "Comunicação",
    shortLabel: "Com.",
    icon: Mail,
    color: "text-rose-600 bg-rose-50 border-rose-200",
    gradient: "rose",
  },
  OUTRO: {
    label: "Outro",
    shortLabel: "Outro",
    icon: FileText,
    color: "text-zinc-600 bg-zinc-50 border-zinc-200",
    gradient: "zinc",
  },
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function ModelosPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");

  // Query de modelos
  const { data: modelosData, isLoading } = trpc.modelos.list.useQuery({
    categoria: categoriaFilter !== "all" ? categoriaFilter as ModeloCategoria : undefined,
    search: search || undefined,
  });

  // Query de estatísticas
  const { data: stats } = trpc.modelos.stats.useQuery();

  // Filtrar modelos
  const modelosFiltrados = useMemo(() => {
    if (!modelosData?.modelos) return [];
    return modelosData.modelos;
  }, [modelosData]);

  // Stats cards
  const statsCards = useMemo(() => {
    if (!stats) {
      return {
        totalModelos: 0,
        totalGerados: 0,
        porCategoria: [] as Array<{ categoria: string; count: number }>,
        maisUsados: [],
      };
    }
    return stats;
  }, [stats]);

  // Converter porCategoria para objeto
  const porCategoriaObj = useMemo(() => {
    const obj: Record<string, number> = {};
    statsCards.porCategoria.forEach((item) => {
      obj[item.categoria] = item.count;
    });
    return obj;
  }, [statsCards.porCategoria]);

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/admin" },
              { label: "Modelos" },
            ]}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <FileStack className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Banco de Modelos
                </h1>
                <p className="text-sm text-zinc-500">
                  Modelos de documentos com variáveis dinâmicas
                </p>
              </div>
            </div>

            <Link href="/admin/modelos/novo">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Modelo
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Stats */}
        <KPIGrid columns={5}>
          <KPICardPremium
            title="Total de Modelos"
            value={statsCards.totalModelos}
            icon={FileStack}
            gradient="zinc"
            size="sm"
          />
          <KPICardPremium
            title="Administrativos"
            value={porCategoriaObj.PROVIDENCIA_ADMINISTRATIVA || 0}
            icon={Building2}
            gradient="blue"
            size="sm"
          />
          <KPICardPremium
            title="Funcionais"
            value={porCategoriaObj.PROVIDENCIA_FUNCIONAL || 0}
            icon={Briefcase}
            gradient="emerald"
            size="sm"
          />
          <KPICardPremium
            title="Peças Processuais"
            value={porCategoriaObj.PECA_PROCESSUAL || 0}
            icon={Scale}
            gradient="amber"
            size="sm"
          />
          <KPICardPremium
            title="Documentos Gerados"
            value={statsCards.totalGerados}
            icon={Sparkles}
            gradient="violet"
            size="sm"
          />
        </KPIGrid>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Buscar modelos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filtro de Categoria */}
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 mr-2 text-zinc-400" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {Object.entries(CATEGORIA_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "grid"
                  ? "bg-white dark:bg-zinc-700 shadow-sm"
                  : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 rounded-md transition-colors",
                viewMode === "list"
                  ? "bg-white dark:bg-zinc-700 shadow-sm"
                  : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : modelosFiltrados.length === 0 ? (
          <EmptyState
            icon={<FileStack className="w-12 h-12" />}
            title="Nenhum modelo encontrado"
            description={
              search || categoriaFilter !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Crie seu primeiro modelo de documento"
            }
            action={
              <Link href="/admin/modelos/novo">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Criar Modelo
                </Button>
              </Link>
            }
          />
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modelosFiltrados.map((modelo) => (
              <ModeloCard key={modelo.id} modelo={modelo} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {modelosFiltrados.map((modelo) => (
              <ModeloListItem key={modelo.id} modelo={modelo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// CARD DE MODELO
// ==========================================

interface ModeloCardProps {
  modelo: {
    id: number;
    titulo: string;
    descricao: string | null;
    categoria: string;
    tipoPeca: string | null;
    totalUsos: number;
    createdAt: Date;
    tags?: string[] | null;
  };
}

function ModeloCard({ modelo }: ModeloCardProps) {
  const config = CATEGORIA_CONFIG[modelo.categoria as ModeloCategoria] || CATEGORIA_CONFIG.OUTRO;
  const Icon = config.icon;
  const numTags = modelo.tags?.length || 0;

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200">
      {/* Top accent */}
      <div className={cn("h-1", config.color.split(" ")[1])} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className={cn("p-2 rounded-lg", config.color)}>
            <Icon className="w-4 h-4" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/modelos/${modelo.id}`} className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Visualizar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/modelos/${modelo.id}?edit=true`} className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/admin/modelos/${modelo.id}/gerar`} className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Gerar Documento
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-center gap-2">
                <Copy className="w-4 h-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-4 h-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2">
            {modelo.titulo}
          </h3>
          {modelo.descricao && (
            <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
              {modelo.descricao}
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px] font-medium">
            {config.shortLabel}
          </Badge>
          {modelo.tipoPeca && (
            <Badge variant="secondary" className="text-[10px]">
              {modelo.tipoPeca}
            </Badge>
          )}
          {numTags > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {numTags} tags
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(modelo.createdAt), "dd/MM/yyyy", { locale: ptBR })}
          </div>
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {modelo.totalUsos} usos
          </div>
        </div>
      </div>

      {/* Hover overlay */}
      <Link
        href={`/admin/modelos/${modelo.id}/gerar`}
        className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4"
      >
        <Button size="sm" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Gerar Documento
        </Button>
      </Link>
    </div>
  );
}

// ==========================================
// ITEM DE LISTA
// ==========================================

function ModeloListItem({ modelo }: ModeloCardProps) {
  const config = CATEGORIA_CONFIG[modelo.categoria as ModeloCategoria] || CATEGORIA_CONFIG.OUTRO;
  const Icon = config.icon;
  const numTags = modelo.tags?.length || 0;

  return (
    <div className="group flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
      {/* Icon */}
      <div className={cn("p-2.5 rounded-lg shrink-0", config.color)}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {modelo.titulo}
          </h3>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {config.shortLabel}
          </Badge>
        </div>
        {modelo.descricao && (
          <p className="mt-0.5 text-sm text-zinc-500 truncate">
            {modelo.descricao}
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="hidden md:flex items-center gap-6 text-sm text-zinc-500 shrink-0">
        {modelo.tipoPeca && (
          <span>{modelo.tipoPeca}</span>
        )}
        <span>{numTags} tags</span>
        <span>{modelo.totalUsos} usos</span>
        <span>{format(new Date(modelo.createdAt), "dd/MM/yyyy")}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/admin/modelos/${modelo.id}/gerar`}>
          <Button size="sm" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Gerar
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/modelos/${modelo.id}`} className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Visualizar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/modelos/${modelo.id}?edit=true`} className="flex items-center gap-2">
                <Edit3 className="w-4 h-4" />
                Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <Copy className="w-4 h-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-4 h-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
