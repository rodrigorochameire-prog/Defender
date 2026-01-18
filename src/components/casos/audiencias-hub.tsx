"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Calendar as CalendarIcon,
  List,
  Columns3,
  Search,
  Filter,
  Clock,
  MapPin,
  User,
  FileText,
  ChevronRight,
  GripVertical,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  Plus,
  ExternalLink,
  Scale,
  Lock,
  Unlock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast, differenceInDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==========================================
// TIPOS
// ==========================================

interface Audiencia {
  id: number;
  dataAudiencia: Date;
  horario?: string | null;
  tipo: string;
  status: "A_DESIGNAR" | "DESIGNADA" | "REALIZADA" | "AGUARDANDO_ATA" | "CONCLUIDA" | "ADIADA" | "CANCELADA";
  sala?: string | null;
  local?: string | null;
  juiz?: string | null;
  promotor?: string | null;
  anotacoes?: string | null;
  resumoDefesa?: string | null;
  googleCalendarEventId?: string | null;
  // Relacionamentos
  casoId?: number | null;
  casoTitulo?: string | null;
  assistidoId?: number | null;
  assistidoNome?: string | null;
  assistidoFoto?: string | null;
  assistidoPreso?: boolean;
  processoId?: number | null;
  numeroAutos?: string | null;
  vara?: string | null;
  comarca?: string | null;
  defensorNome?: string | null;
}

interface AudienciasHubProps {
  audiencias: Audiencia[];
  onAudienciaClick?: (audiencia: Audiencia) => void;
  onAudienciaUpdate?: (id: number, data: Partial<Audiencia>) => Promise<void>;
  onCreateTask?: (audiencia: Audiencia, taskType: string) => void;
}

// ==========================================
// CONSTANTES
// ==========================================

const TIPOS_AUDIENCIA = {
  INSTRUCAO: { label: "Instrução", icon: "⚖️", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  CUSTODIA: { label: "Custódia", icon: "🔒", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  CONCILIACAO: { label: "Conciliação", icon: "🤝", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  JUSTIFICACAO: { label: "Justificação", icon: "📋", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  ADMONICAO: { label: "Admonição", icon: "👨‍⚖️", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  UNA: { label: "Una", icon: "📑", color: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400" },
  PLENARIO_JURI: { label: "Plenário", icon: "🎭", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  CONTINUACAO: { label: "Continuação", icon: "➡️", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  OUTRA: { label: "Outra", icon: "📌", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400" },
};

const STATUS_AUDIENCIA = {
  A_DESIGNAR: { label: "A Designar", color: "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400" },
  DESIGNADA: { label: "Designada", color: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  REALIZADA: { label: "Realizada", color: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  AGUARDANDO_ATA: { label: "Aguardando Ata", color: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  CONCLUIDA: { label: "Concluída", color: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  ADIADA: { label: "Adiada", color: "border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  CANCELADA: { label: "Cancelada", color: "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

const KANBAN_COLUMNS = [
  { id: "A_DESIGNAR", title: "A Designar", icon: Timer },
  { id: "DESIGNADA", title: "Designadas", icon: CalendarIcon },
  { id: "REALIZADA", title: "Realizadas", icon: CheckCircle2 },
  { id: "AGUARDANDO_ATA", title: "Aguardando Ata", icon: FileText },
  { id: "CONCLUIDA", title: "Concluídas", icon: CheckCircle2 },
];

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function DateIndicator({ date }: { date: Date }) {
  const today = new Date();
  const diffDays = differenceInDays(date, today);
  
  if (isPast(date) && !isToday(date)) {
    return (
      <span className="text-rose-600 dark:text-rose-400 font-medium text-xs">
        Passou
      </span>
    );
  }
  
  if (isToday(date)) {
    return (
      <Badge className="bg-rose-600 text-white text-[10px] px-1.5 py-0">
        HOJE
      </Badge>
    );
  }
  
  if (isTomorrow(date)) {
    return (
      <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
        AMANHÃ
      </Badge>
    );
  }
  
  if (diffDays <= 7) {
    return (
      <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">
        {diffDays} dias
      </span>
    );
  }
  
  return null;
}

function AudienciaCard({ 
  audiencia, 
  onClick,
  compact = false 
}: { 
  audiencia: Audiencia; 
  onClick?: () => void;
  compact?: boolean;
}) {
  const tipoConfig = TIPOS_AUDIENCIA[audiencia.tipo as keyof typeof TIPOS_AUDIENCIA] || TIPOS_AUDIENCIA.OUTRA;
  const statusConfig = STATUS_AUDIENCIA[audiencia.status] || STATUS_AUDIENCIA.A_DESIGNAR;
  
  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-200",
        "bg-white dark:bg-zinc-950",
        "border border-zinc-200 dark:border-zinc-800",
        "hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md",
        audiencia.assistidoPreso ? "border-l-[3px] border-l-rose-500" : "border-l-[3px] border-l-emerald-500"
      )}
      onClick={onClick}
    >
      <div className={cn("p-3", compact && "p-2")}>
        {/* Topo: Data e Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
              {format(audiencia.dataAudiencia, "dd/MM/yyyy")}
            </span>
            {audiencia.horario && (
              <span className="text-xs text-zinc-400">
                {audiencia.horario}
              </span>
            )}
            <DateIndicator date={audiencia.dataAudiencia} />
          </div>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusConfig.color)}>
            {statusConfig.label}
          </Badge>
        </div>

        {/* Tipo e Local */}
        <div className="flex items-center gap-2 mb-2">
          <Badge className={cn("text-xs", tipoConfig.color)}>
            {tipoConfig.icon} {tipoConfig.label}
          </Badge>
          {audiencia.sala && (
            <span className="text-xs text-zinc-500">
              Sala {audiencia.sala}
            </span>
          )}
        </div>

        {/* Assistido */}
        {audiencia.assistidoNome && (
          <div className="flex items-center gap-2 mb-2">
            <Avatar className={cn(
              "w-6 h-6 ring-2",
              audiencia.assistidoPreso ? "ring-rose-500" : "ring-emerald-500"
            )}>
              <AvatarImage src={audiencia.assistidoFoto || undefined} />
              <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-zinc-800">
                {audiencia.assistidoNome?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {audiencia.assistidoNome}
            </span>
            {audiencia.assistidoPreso ? (
              <Lock className="w-3 h-3 text-rose-500" />
            ) : (
              <Unlock className="w-3 h-3 text-emerald-500" />
            )}
          </div>
        )}

        {/* Processo */}
        {audiencia.numeroAutos && !compact && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            <Scale className="w-3 h-3" />
            <span className="truncate">{audiencia.numeroAutos}</span>
          </div>
        )}

        {/* Resumo da Defesa */}
        {audiencia.resumoDefesa && !compact && (
          <div className="mt-2 pt-2 border-t border-dashed border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 italic">
              &ldquo;{audiencia.resumoDefesa}&rdquo;
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ==========================================
// VISUALIZAÇÃO LISTA
// ==========================================

function ListView({ 
  audiencias, 
  onAudienciaClick 
}: { 
  audiencias: Audiencia[]; 
  onAudienciaClick?: (a: Audiencia) => void;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50 dark:bg-zinc-900/50">
            <TableHead className="w-[120px] text-[10px] uppercase text-zinc-500 font-medium">Data/Hora</TableHead>
            <TableHead className="text-[10px] uppercase text-zinc-500 font-medium">Tipo</TableHead>
            <TableHead className="text-[10px] uppercase text-zinc-500 font-medium">Assistido</TableHead>
            <TableHead className="text-[10px] uppercase text-zinc-500 font-medium">Processo</TableHead>
            <TableHead className="text-[10px] uppercase text-zinc-500 font-medium">Local</TableHead>
            <TableHead className="w-[100px] text-[10px] uppercase text-zinc-500 font-medium">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {audiencias.map((audiencia) => {
            const tipoConfig = TIPOS_AUDIENCIA[audiencia.tipo as keyof typeof TIPOS_AUDIENCIA] || TIPOS_AUDIENCIA.OUTRA;
            const statusConfig = STATUS_AUDIENCIA[audiencia.status] || STATUS_AUDIENCIA.A_DESIGNAR;
            
            return (
              <TableRow 
                key={audiencia.id}
                className={cn(
                  "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors",
                  audiencia.assistidoPreso && "border-l-[3px] border-l-rose-500"
                )}
                onClick={() => onAudienciaClick?.(audiencia)}
              >
                <TableCell className="py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
                      {format(audiencia.dataAudiencia, "dd/MM/yy")}
                    </span>
                    {audiencia.horario && (
                      <span className="text-[10px] text-zinc-500">{audiencia.horario}</span>
                    )}
                    <DateIndicator date={audiencia.dataAudiencia} />
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn("text-xs", tipoConfig.color)}>
                    {tipoConfig.icon} {tipoConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {audiencia.assistidoNome && (
                    <div className="flex items-center gap-2">
                      <Avatar className={cn(
                        "w-6 h-6 ring-1",
                        audiencia.assistidoPreso ? "ring-rose-500" : "ring-emerald-500"
                      )}>
                        <AvatarImage src={audiencia.assistidoFoto || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {audiencia.assistidoNome?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                        {audiencia.assistidoNome}
                      </span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-zinc-500 truncate max-w-[180px] block">
                    {audiencia.numeroAutos}
                  </span>
                  {audiencia.vara && (
                    <span className="text-[10px] text-zinc-400">{audiencia.vara}</span>
                  )}
                </TableCell>
                <TableCell>
                  {audiencia.local && (
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{audiencia.local}</span>
                    </div>
                  )}
                  {audiencia.sala && (
                    <span className="text-[10px] text-zinc-400">Sala {audiencia.sala}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusConfig.color)}>
                    {statusConfig.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ==========================================
// VISUALIZAÇÃO KANBAN
// ==========================================

function KanbanView({ 
  audiencias, 
  onAudienciaClick 
}: { 
  audiencias: Audiencia[]; 
  onAudienciaClick?: (a: Audiencia) => void;
}) {
  const groupedAudiencias = useMemo(() => {
    const groups: Record<string, Audiencia[]> = {};
    KANBAN_COLUMNS.forEach(col => {
      groups[col.id] = audiencias.filter(a => a.status === col.id);
    });
    return groups;
  }, [audiencias]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((column) => {
        const Icon = column.icon;
        const items = groupedAudiencias[column.id] || [];
        
        return (
          <div 
            key={column.id}
            className="flex-shrink-0 w-[300px]"
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-3 px-1">
              <Icon className="w-4 h-4 text-zinc-500" />
              <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {column.title}
              </h3>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">
                {items.length}
              </Badge>
            </div>

            {/* Column Content */}
            <div className={cn(
              "space-y-2 min-h-[200px] p-2 rounded-lg",
              "bg-zinc-50 dark:bg-zinc-900/30",
              "border border-dashed border-zinc-200 dark:border-zinc-800"
            )}>
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-[100px] text-xs text-zinc-400">
                  Nenhuma audiência
                </div>
              ) : (
                items.map((audiencia) => (
                  <AudienciaCard
                    key={audiencia.id}
                    audiencia={audiencia}
                    onClick={() => onAudienciaClick?.(audiencia)}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// SIDE PEEK (Detalhes da Audiência)
// ==========================================

function AudienciaSidePeek({
  audiencia,
  open,
  onClose,
  onUpdate,
  onCreateTask,
}: {
  audiencia: Audiencia | null;
  open: boolean;
  onClose: () => void;
  onUpdate?: (id: number, data: Partial<Audiencia>) => Promise<void>;
  onCreateTask?: (audiencia: Audiencia, taskType: string) => void;
}) {
  const [anotacoes, setAnotacoes] = useState(audiencia?.anotacoes || "");
  const [isSaving, setIsSaving] = useState(false);

  if (!audiencia) return null;

  const tipoConfig = TIPOS_AUDIENCIA[audiencia.tipo as keyof typeof TIPOS_AUDIENCIA] || TIPOS_AUDIENCIA.OUTRA;
  const statusConfig = STATUS_AUDIENCIA[audiencia.status] || STATUS_AUDIENCIA.A_DESIGNAR;

  const handleSaveAnotacoes = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    try {
      await onUpdate(audiencia.id, { anotacoes });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[450px] sm:max-w-[450px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            {audiencia.assistidoFoto && (
              <Avatar className={cn(
                "w-12 h-12 ring-2",
                audiencia.assistidoPreso ? "ring-rose-500" : "ring-emerald-500"
              )}>
                <AvatarImage src={audiencia.assistidoFoto} />
                <AvatarFallback>{audiencia.assistidoNome?.charAt(0)}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <SheetTitle className="text-left">
                {audiencia.assistidoNome || "Audiência"}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={cn("text-xs", tipoConfig.color)}>
                  {tipoConfig.icon} {tipoConfig.label}
                </Badge>
                <Badge variant="outline" className={cn("text-[10px]", statusConfig.color)}>
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4 space-y-6">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-medium">Data</label>
              <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                {format(audiencia.dataAudiencia, "dd/MM/yyyy")}
              </p>
            </div>
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-medium">Horário</label>
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                {audiencia.horario || "-"}
              </p>
            </div>
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-medium">Local</label>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {audiencia.local || "-"}
              </p>
            </div>
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-medium">Sala</label>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {audiencia.sala || "-"}
              </p>
            </div>
          </div>

          {/* Processo */}
          {audiencia.numeroAutos && (
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <label className="text-[10px] uppercase text-zinc-500 font-medium">Processo</label>
              <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100 mt-1">
                {audiencia.numeroAutos}
              </p>
              {audiencia.vara && (
                <p className="text-xs text-zinc-500 mt-0.5">{audiencia.vara} - {audiencia.comarca}</p>
              )}
            </div>
          )}

          {/* Resumo da Defesa */}
          {audiencia.resumoDefesa && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <label className="text-[10px] uppercase text-amber-700 dark:text-amber-400 font-medium">
                Resumo da Defesa
              </label>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1 italic">
                &ldquo;{audiencia.resumoDefesa}&rdquo;
              </p>
            </div>
          )}

          {/* Participantes */}
          <div>
            <label className="text-[10px] uppercase text-zinc-500 font-medium mb-2 block">
              Participantes
            </label>
            <div className="space-y-2">
              {audiencia.juiz && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-500">Juiz:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{audiencia.juiz}</span>
                </div>
              )}
              {audiencia.promotor && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-500">Promotor:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{audiencia.promotor}</span>
                </div>
              )}
              {audiencia.defensorNome && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-500">Defensor:</span>
                  <span className="text-zinc-700 dark:text-zinc-300">{audiencia.defensorNome}</span>
                </div>
              )}
            </div>
          </div>

          {/* Anotações / Ata */}
          <div>
            <label className="text-[10px] uppercase text-zinc-500 font-medium mb-2 block">
              Anotações da Audiência
            </label>
            <Textarea
              value={anotacoes}
              onChange={(e) => setAnotacoes(e.target.value)}
              placeholder="Registre o que ocorreu na audiência..."
              className="min-h-[120px] text-sm"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-zinc-400">
                As anotações são versionadas para auditoria.
              </p>
              <Button 
                size="sm" 
                onClick={handleSaveAnotacoes}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>

          {/* Ações */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <label className="text-[10px] uppercase text-zinc-500 font-medium mb-2 block">
              Gerar Tarefa
            </label>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCreateTask?.(audiencia, "memoriais")}
              >
                <FileText className="w-4 h-4 mr-1" />
                Memoriais
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCreateTask?.(audiencia, "recurso")}
              >
                <ChevronRight className="w-4 h-4 mr-1" />
                Recurso
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onCreateTask?.(audiencia, "alegacoes")}
              >
                <FileText className="w-4 h-4 mr-1" />
                Alegações
              </Button>
            </div>
          </div>

          {/* Google Calendar Link */}
          {audiencia.googleCalendarEventId && (
            <a
              href={`https://calendar.google.com/calendar/event?eid=${audiencia.googleCalendarEventId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Ver no Google Calendar
            </a>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function AudienciasHub({
  audiencias,
  onAudienciaClick,
  onAudienciaUpdate,
  onCreateTask,
}: AudienciasHubProps) {
  const [viewMode, setViewMode] = useState<"lista" | "kanban">("lista");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [selectedAudiencia, setSelectedAudiencia] = useState<Audiencia | null>(null);
  const [sidePeekOpen, setSidePeekOpen] = useState(false);

  const filteredAudiencias = useMemo(() => {
    return audiencias.filter((a) => {
      const matchesSearch = 
        !searchTerm ||
        a.assistidoNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.numeroAutos?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.casoTitulo?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === "all" || a.status === filterStatus;
      const matchesTipo = filterTipo === "all" || a.tipo === filterTipo;

      return matchesSearch && matchesStatus && matchesTipo;
    });
  }, [audiencias, searchTerm, filterStatus, filterTipo]);

  const handleAudienciaClick = (audiencia: Audiencia) => {
    setSelectedAudiencia(audiencia);
    setSidePeekOpen(true);
    onAudienciaClick?.(audiencia);
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
              <CalendarIcon className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Agenda de Audiências
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {filteredAudiencias.length} audiências encontradas
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "lista" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("lista")}
                  className={viewMode === "lista" ? "bg-zinc-900 dark:bg-zinc-100" : ""}
                >
                  <List className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modo Lista</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === "kanban" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("kanban")}
                  className={viewMode === "kanban" ? "bg-zinc-900 dark:bg-zinc-100" : ""}
                >
                  <Columns3 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Modo Kanban</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por assistido, processo ou caso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-950"
            />
          </div>

          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {Object.entries(TIPOS_AUDIENCIA).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.icon} {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(STATUS_AUDIENCIA).map(([key, val]) => (
                <SelectItem key={key} value={key}>
                  {val.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {viewMode === "lista" ? (
          <ListView 
            audiencias={filteredAudiencias} 
            onAudienciaClick={handleAudienciaClick}
          />
        ) : (
          <KanbanView 
            audiencias={filteredAudiencias} 
            onAudienciaClick={handleAudienciaClick}
          />
        )}

        {/* Empty State */}
        {filteredAudiencias.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
            <p className="text-zinc-500 dark:text-zinc-400">
              Nenhuma audiência encontrada com os filtros selecionados.
            </p>
          </div>
        )}

        {/* Side Peek */}
        <AudienciaSidePeek
          audiencia={selectedAudiencia}
          open={sidePeekOpen}
          onClose={() => setSidePeekOpen(false)}
          onUpdate={onAudienciaUpdate}
          onCreateTask={onCreateTask}
        />
      </div>
    </TooltipProvider>
  );
}
