"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe,
  MapPin,
  FileText,
  MapPinned,
  Phone,
  Folder,
  Microscope,
  Users,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Save,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Diligencia,
  CATEGORIAS_DILIGENCIA,
  STATUS_DILIGENCIA,
  EXECUTOR_DILIGENCIA,
  STATUS_OPTIONS,
  CategoriaDigilenciaKey,
  StatusDiligenciaKey,
} from "@/config/diligencias";

// Mapeamento de ícones
const CATEGORIA_ICONS: Record<CategoriaDigilenciaKey, React.ElementType> = {
  SOCIAL: Globe,
  CAMPO: MapPin,
  OFICIAL: FileText,
  GEO: MapPinned,
  TELEFONIA: Phone,
  DOCUMENTAL: Folder,
  PERICIAL: Microscope,
  TESTEMUNHAL: Users,
};

// Cores por categoria
const CATEGORIA_COLORS: Record<CategoriaDigilenciaKey, string> = {
  SOCIAL: "border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/20",
  CAMPO: "border-l-green-500 bg-green-50/30 dark:bg-green-950/20",
  OFICIAL: "border-l-purple-500 bg-purple-50/30 dark:bg-purple-950/20",
  GEO: "border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/20",
  TELEFONIA: "border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/20",
  DOCUMENTAL: "border-l-zinc-500 bg-zinc-50/30 dark:bg-zinc-950/20",
  PERICIAL: "border-l-cyan-500 bg-cyan-50/30 dark:bg-cyan-950/20",
  TESTEMUNHAL: "border-l-amber-500 bg-amber-50/30 dark:bg-amber-950/20",
};

// Cores de status
const STATUS_BADGE_COLORS: Record<StatusDiligenciaKey, string> = {
  NAO_INICIADA: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  EM_ANDAMENTO: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  AGUARDANDO: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  CONCLUIDA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  INFRUTIFERA: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CANCELADA: "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400",
};

interface DiligenciaCardProps {
  diligencia: Diligencia;
  onUpdate: (diligencia: Diligencia) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export function DiligenciaCard({
  diligencia,
  onUpdate,
  onDelete,
  compact = false,
}: DiligenciaCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotas, setEditingNotas] = useState(false);
  const [notas, setNotas] = useState(diligencia.notas || "");

  const categoria = CATEGORIAS_DILIGENCIA[diligencia.categoria];
  const status = STATUS_DILIGENCIA[diligencia.status];
  const executor = diligencia.executor
    ? EXECUTOR_DILIGENCIA[diligencia.executor]
    : null;
  const Icon = CATEGORIA_ICONS[diligencia.categoria];

  const handleStatusChange = (newStatus: StatusDiligenciaKey) => {
    onUpdate({
      ...diligencia,
      status: newStatus,
      dataConclusao:
        newStatus === "CONCLUIDA" || newStatus === "INFRUTIFERA"
          ? new Date().toISOString()
          : diligencia.dataConclusao,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleChecklistToggle = (itemId: string) => {
    const updatedChecklist = diligencia.checklist?.map((item) =>
      item.id === itemId ? { ...item, concluido: !item.concluido } : item
    );
    onUpdate({
      ...diligencia,
      checklist: updatedChecklist,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveNotas = () => {
    onUpdate({
      ...diligencia,
      notas,
      updatedAt: new Date().toISOString(),
    });
    setEditingNotas(false);
  };

  const checklistProgress = diligencia.checklist
    ? {
        total: diligencia.checklist.length,
        concluidos: diligencia.checklist.filter((i) => i.concluido).length,
      }
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 transition-all duration-200 hover:shadow-md",
        CATEGORIA_COLORS[diligencia.categoria]
      )}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className={cn(
                "p-2 rounded-lg shrink-0",
                `bg-${categoria.cor}-100 dark:bg-${categoria.cor}-900/30`
              )}
            >
              <Icon
                className={cn("w-4 h-4", `text-${categoria.cor}-600 dark:text-${categoria.cor}-400`)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  {categoria.label}
                </span>
                {diligencia.prazo && (
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(diligencia.prazo).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                {diligencia.titulo}
              </h3>
              {diligencia.descricao && !compact && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                  {diligencia.descricao}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px] font-medium border-0",
                      STATUS_BADGE_COLORS[diligencia.status]
                    )}
                  >
                    {status.emoji} {status.label}
                  </Badge>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value as StatusDiligenciaKey)}
                    className={cn(
                      "text-xs",
                      diligencia.status === opt.value && "bg-zinc-100 dark:bg-zinc-800"
                    )}
                  >
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setExpanded(!expanded)}>
                  {expanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" /> Recolher
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" /> Expandir
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingNotas(true)}>
                  <Edit3 className="w-4 h-4 mr-2" /> Editar notas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(diligencia.id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {executor && (
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <User className="w-3 h-3" />
              {executor.label}
              {diligencia.executorNome && `: ${diligencia.executorNome}`}
            </span>
          )}
          {checklistProgress && (
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {checklistProgress.concluidos}/{checklistProgress.total}
            </span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
          {/* Checklist */}
          {diligencia.checklist && diligencia.checklist.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                Checklist
              </h4>
              <div className="space-y-2">
                {diligencia.checklist.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={item.concluido}
                      onCheckedChange={() => handleChecklistToggle(item.id)}
                      className="mt-0.5"
                    />
                    <span
                      className={cn(
                        "flex-1",
                        item.concluido && "line-through text-zinc-400"
                      )}
                    >
                      {item.texto}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Notas e Resultado
            </h4>
            {editingNotas ? (
              <div className="space-y-2">
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Adicione notas sobre esta diligência..."
                  className="min-h-[80px] text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNotas} className="gap-1">
                    <Save className="w-3 h-3" /> Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNotas(diligencia.notas || "");
                      setEditingNotas(false);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={cn(
                  "text-sm",
                  diligencia.notas
                    ? "text-zinc-700 dark:text-zinc-300"
                    : "text-zinc-400 italic cursor-pointer hover:text-zinc-600"
                )}
                onClick={() => setEditingNotas(true)}
              >
                {diligencia.notas || "Clique para adicionar notas..."}
              </p>
            )}
          </div>

          {/* Resultado (se concluída/infrutífera) */}
          {(diligencia.status === "CONCLUIDA" ||
            diligencia.status === "INFRUTIFERA") &&
            diligencia.resultado && (
              <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Resultado
                </h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {diligencia.resultado}
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
