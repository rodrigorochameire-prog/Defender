"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Timer,
  Calendar,
  X,
  Save,
  Trash2,
  Copy,
  ArrowUpRight,
  BarChart3,
  Target,
  List,
  LayoutGrid,
  Lock,
  User,
  Scale,
  Gavel,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  Columns,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { format, differenceInDays, parseISO, isToday, isTomorrow, isPast, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Tipos
interface Demanda {
  id: number;
  assistido: string;
  processo: string;
  ato: string;
  tipoAto: string;
  prazo: string;
  dataEntrada: string;
  dataIntimacao?: string;
  status: string;
  prioridade: string;
  providencias: string | null;
  area: string;
  reuPreso: boolean;
  defensor?: string;
  observacoes?: string;
}

// Status disponíveis
const STATUS_OPTIONS = [
  { value: "2_ATENDER", label: "Atender", color: "bg-red-500", textColor: "text-red-700" },
  { value: "4_MONITORAR", label: "Monitorar", color: "bg-blue-500", textColor: "text-blue-700" },
  { value: "5_FILA", label: "Em Fila", color: "bg-amber-500", textColor: "text-amber-700" },
  { value: "6_ELABORANDO", label: "Elaborando", color: "bg-purple-500", textColor: "text-purple-700" },
  { value: "7_PROTOCOLADO", label: "Protocolado", color: "bg-emerald-500", textColor: "text-emerald-700" },
  { value: "7_CIENCIA", label: "Ciência", color: "bg-teal-500", textColor: "text-teal-700" },
  { value: "7_SEM_ATUACAO", label: "Sem Atuação", color: "bg-slate-400", textColor: "text-slate-600" },
  { value: "CONCLUIDO", label: "Concluído", color: "bg-green-600", textColor: "text-green-700" },
  { value: "ARQUIVADO", label: "Arquivado", color: "bg-gray-400", textColor: "text-gray-600" },
];

// Prioridades
const PRIORIDADE_OPTIONS = [
  { value: "REU_PRESO", label: "Réu Preso", color: "bg-red-700" },
  { value: "URGENTE", label: "Urgente", color: "bg-red-500" },
  { value: "ALTA", label: "Alta", color: "bg-orange-500" },
  { value: "NORMAL", label: "Normal", color: "bg-slate-400" },
  { value: "BAIXA", label: "Baixa", color: "bg-slate-300" },
];

// Áreas
const AREA_OPTIONS = [
  { value: "JURI", label: "Júri", icon: Gavel, color: "purple" },
  { value: "EXECUCAO_PENAL", label: "Execução Penal", icon: Lock, color: "blue" },
  { value: "VIOLENCIA_DOMESTICA", label: "Violência Doméstica", icon: User, color: "pink" },
  { value: "SUBSTITUICAO", label: "Substituição", icon: RefreshCw, color: "orange" },
  { value: "CURADORIA", label: "Curadoria", icon: User, color: "teal" },
  { value: "FAMILIA", label: "Família", icon: User, color: "green" },
  { value: "CIVEL", label: "Cível", icon: Scale, color: "slate" },
  { value: "FAZENDA_PUBLICA", label: "Fazenda Pública", icon: Scale, color: "indigo" },
];

// Tipos de Ato
const TIPO_ATO_OPTIONS = [
  { value: "manifestacao", label: "Manifestação" },
  { value: "recurso", label: "Recurso" },
  { value: "peticao", label: "Petição" },
  { value: "audiencia", label: "Audiência" },
  { value: "julgamento", label: "Julgamento" },
  { value: "prazo", label: "Prazo" },
  { value: "diligencia", label: "Diligência" },
];

// Dados mockados ampliados
const mockDemandas: Demanda[] = [
  { 
    id: 1, 
    assistido: "Diego Bonfim Almeida",
    processo: "8012906-74.2025.8.05.0039",
    ato: "Resposta à Acusação",
    tipoAto: "manifestacao",
    prazo: "2026-01-17",
    dataEntrada: "2026-01-10",
    dataIntimacao: "2026-01-08",
    status: "2_ATENDER",
    prioridade: "REU_PRESO",
    providencias: "Requerer diligências, verificar câmeras de segurança do local",
    area: "JURI",
    reuPreso: true,
    defensor: "Dr. Rodrigo",
    observacoes: "Caso complexo, réu nega autoria",
  },
  { 
    id: 2, 
    assistido: "Maria Silva Santos",
    processo: "0001234-56.2025.8.05.0039",
    ato: "Alegações Finais",
    tipoAto: "manifestacao",
    prazo: "2026-01-18",
    dataEntrada: "2026-01-08",
    dataIntimacao: "2026-01-05",
    status: "5_FILA",
    prioridade: "ALTA",
    providencias: "Analisar provas, preparar tese de absolvição por legítima defesa",
    area: "JURI",
    reuPreso: false,
    defensor: "Dra. Juliane",
  },
  { 
    id: 3, 
    assistido: "José Carlos Oliveira",
    processo: "0005678-90.2025.8.05.0039",
    ato: "Agravo em Execução",
    tipoAto: "recurso",
    prazo: "2026-01-20",
    dataEntrada: "2026-01-05",
    dataIntimacao: "2026-01-03",
    status: "4_MONITORAR",
    prioridade: "NORMAL",
    providencias: "Aguardando decisão do agravo, verificar publicação",
    area: "EXECUCAO_PENAL",
    reuPreso: true,
    defensor: "Dr. Marcos",
  },
  { 
    id: 4, 
    assistido: "Ana Paula Costa",
    processo: "0009012-34.2025.8.05.0039",
    ato: "Pedido de Relaxamento",
    tipoAto: "peticao",
    prazo: "2026-01-17",
    dataEntrada: "2026-01-12",
    dataIntimacao: "2026-01-10",
    status: "2_ATENDER",
    prioridade: "URGENTE",
    providencias: "Prisão ilegal, prazo de 30 dias expirado",
    area: "VIOLENCIA_DOMESTICA",
    reuPreso: true,
    defensor: "Dr. Rodrigo",
  },
  { 
    id: 5, 
    assistido: "Roberto Ferreira Lima",
    processo: "0003456-78.2025.8.05.0039",
    ato: "Memoriais",
    tipoAto: "manifestacao",
    prazo: "2026-01-20",
    dataEntrada: "2026-01-10",
    status: "7_PROTOCOLADO",
    prioridade: "NORMAL",
    providencias: null,
    area: "JURI",
    reuPreso: false,
    defensor: "Dr. Rodrigo",
  },
  { 
    id: 6, 
    assistido: "Carlos Eduardo Silva",
    processo: "0007890-12.2025.8.05.0039",
    ato: "Revisão Criminal",
    tipoAto: "recurso",
    prazo: "2026-01-25",
    dataEntrada: "2026-01-02",
    status: "6_ELABORANDO",
    prioridade: "NORMAL",
    providencias: "Estudar processo, identificar erros processuais e novas provas",
    area: "SUBSTITUICAO",
    reuPreso: false,
    defensor: "Dra. Juliane",
  },
  { 
    id: 7, 
    assistido: "Marcos Antonio Pereira",
    processo: "0002345-67.2025.8.05.0039",
    ato: "Progressão de Regime",
    tipoAto: "peticao",
    prazo: "2026-01-19",
    dataEntrada: "2026-01-11",
    status: "5_FILA",
    prioridade: "ALTA",
    providencias: "Verificar atestado de comportamento carcerário",
    area: "EXECUCAO_PENAL",
    reuPreso: true,
    defensor: "Dr. Marcos",
  },
  { 
    id: 8, 
    assistido: "Fernanda Oliveira Santos",
    processo: "0008765-43.2025.8.05.0039",
    ato: "Habeas Corpus",
    tipoAto: "peticao",
    prazo: "2026-01-17",
    dataEntrada: "2026-01-15",
    status: "2_ATENDER",
    prioridade: "URGENTE",
    providencias: "HC liberatório - constrangimento ilegal por excesso de prazo",
    area: "JURI",
    reuPreso: true,
    defensor: "Dr. Rodrigo",
  },
  { 
    id: 9, 
    assistido: "Lucas Almeida Costa",
    processo: "0004321-98.2025.8.05.0039",
    ato: "Contrarrazões de Apelação",
    tipoAto: "manifestacao",
    prazo: "2026-01-22",
    dataEntrada: "2026-01-13",
    status: "5_FILA",
    prioridade: "NORMAL",
    providencias: "Analisar razões do MP e preparar contrarrazões",
    area: "JURI",
    reuPreso: false,
    defensor: "Dra. Juliane",
  },
  { 
    id: 10, 
    assistido: "Pedro Henrique Souza",
    processo: "0006543-21.2025.8.05.0039",
    ato: "Livramento Condicional",
    tipoAto: "peticao",
    prazo: "2026-01-24",
    dataEntrada: "2026-01-14",
    status: "4_MONITORAR",
    prioridade: "NORMAL",
    providencias: "Aguardando parecer do MP",
    area: "EXECUCAO_PENAL",
    reuPreso: true,
    defensor: "Dr. Marcos",
  },
];

// Funções utilitárias
function getStatusConfig(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[2];
}

function getPrioridadeConfig(prioridade: string) {
  return PRIORIDADE_OPTIONS.find(p => p.value === prioridade) || PRIORIDADE_OPTIONS[3];
}

function getAreaConfig(area: string) {
  return AREA_OPTIONS.find(a => a.value === area) || AREA_OPTIONS[0];
}

function getPrazoInfo(prazoStr: string) {
  const prazo = parseISO(prazoStr);
  const hoje = new Date();
  const dias = differenceInDays(prazo, hoje);
  
  if (isPast(prazo) && !isToday(prazo)) {
    return { text: `${Math.abs(dias)}d atrasado`, className: "text-red-600 font-bold bg-red-50 dark:bg-red-950/50", icon: AlertTriangle, urgent: true };
  }
  if (isToday(prazo)) {
    return { text: "HOJE", className: "text-red-600 font-bold bg-red-50 dark:bg-red-950/50", icon: Timer, urgent: true };
  }
  if (isTomorrow(prazo)) {
    return { text: "Amanhã", className: "text-orange-600 font-semibold bg-orange-50 dark:bg-orange-950/50", icon: Clock, urgent: true };
  }
  if (dias <= 3) {
    return { text: `${dias}d`, className: "text-orange-500 bg-orange-50 dark:bg-orange-950/30", icon: Clock, urgent: false };
  }
  if (dias <= 7) {
    return { text: `${dias}d`, className: "text-amber-600 bg-amber-50 dark:bg-amber-950/30", icon: Calendar, urgent: false };
  }
  return { text: format(prazo, "dd/MM", { locale: ptBR }), className: "text-muted-foreground", icon: Calendar, urgent: false };
}

// Componente de Badge de Status
function StatusBadge({ status }: { status: string }) {
  const config = getStatusConfig(status);
  return (
    <Badge className={cn("font-semibold", config.color, "text-white hover:opacity-90")}>
      {config.label}
    </Badge>
  );
}

// Componente de Badge de Prioridade
function PrioridadeBadge({ prioridade, reuPreso }: { prioridade: string; reuPreso: boolean }) {
  if (reuPreso) {
    return (
      <Badge className="bg-red-700 text-white font-bold animate-pulse">
        <Lock className="h-3 w-3 mr-1" />
        RÉU PRESO
      </Badge>
    );
  }
  const config = getPrioridadeConfig(prioridade);
  return (
    <Badge className={cn("font-semibold", config.color, "text-white")}>
      {config.label}
    </Badge>
  );
}

// Componente de Badge de Área
function AreaBadge({ area }: { area: string }) {
  const config = getAreaConfig(area);
  const colorClasses: Record<string, string> = {
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    pink: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
    teal: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
    green: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    slate: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
    indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", colorClasses[config.color])}>
      {config.label}
    </Badge>
  );
}

// Modal de Edição/Criação de Demanda
function DemandaModal({ 
  demanda, 
  isOpen, 
  onClose, 
  onSave,
  mode = "edit"
}: { 
  demanda?: Demanda | null; 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: Partial<Demanda>) => void;
  mode?: "create" | "edit";
}) {
  const [formData, setFormData] = useState<Partial<Demanda>>(
    demanda || {
      assistido: "",
      processo: "",
      ato: "",
      tipoAto: "manifestacao",
      prazo: format(addDays(new Date(), 15), "yyyy-MM-dd"),
      dataEntrada: format(new Date(), "yyyy-MM-dd"),
      status: "5_FILA",
      prioridade: "NORMAL",
      providencias: "",
      area: "JURI",
      reuPreso: false,
    }
  );

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {mode === "create" ? "Nova Demanda" : "Editar Demanda"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Preencha os dados da nova demanda" : "Atualize os dados da demanda"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Assistido e Processo */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assistido">Assistido *</Label>
              <Input
                id="assistido"
                value={formData.assistido || ""}
                onChange={(e) => setFormData({ ...formData, assistido: e.target.value })}
                placeholder="Nome do assistido"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processo">Nº do Processo *</Label>
              <Input
                id="processo"
                value={formData.processo || ""}
                onChange={(e) => setFormData({ ...formData, processo: e.target.value })}
                placeholder="0000000-00.0000.0.00.0000"
                className="font-mono"
              />
            </div>
          </div>

          {/* Ato e Tipo */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ato">Ato Processual *</Label>
              <Input
                id="ato"
                value={formData.ato || ""}
                onChange={(e) => setFormData({ ...formData, ato: e.target.value })}
                placeholder="Ex: Resposta à Acusação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipoAto">Tipo de Ato</Label>
              <Select value={formData.tipoAto} onValueChange={(v) => setFormData({ ...formData, tipoAto: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPO_ATO_OPTIONS.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Datas */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="prazo">Prazo Fatal *</Label>
              <Input
                id="prazo"
                type="date"
                value={formData.prazo || ""}
                onChange={(e) => setFormData({ ...formData, prazo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataEntrada">Data de Entrada</Label>
              <Input
                id="dataEntrada"
                type="date"
                value={formData.dataEntrada || ""}
                onChange={(e) => setFormData({ ...formData, dataEntrada: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataIntimacao">Data da Intimação</Label>
              <Input
                id="dataIntimacao"
                type="date"
                value={formData.dataIntimacao || ""}
                onChange={(e) => setFormData({ ...formData, dataIntimacao: e.target.value })}
              />
            </div>
          </div>

          {/* Status, Prioridade, Área */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", status.color)} />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={formData.prioridade} onValueChange={(v) => setFormData({ ...formData, prioridade: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADE_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", p.color)} />
                        {p.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={formData.area} onValueChange={(v) => setFormData({ ...formData, area: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_OPTIONS.map((area) => (
                    <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Réu Preso */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
            <Checkbox
              id="reuPreso"
              checked={formData.reuPreso}
              onCheckedChange={(checked) => setFormData({ ...formData, reuPreso: checked as boolean })}
            />
            <div className="flex-1">
              <Label htmlFor="reuPreso" className="text-red-700 dark:text-red-400 font-semibold cursor-pointer">
                <Lock className="h-4 w-4 inline mr-2" />
                Réu Preso
              </Label>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                Marque se o assistido está preso (prioridade máxima)
              </p>
            </div>
          </div>

          {/* Providências */}
          <div className="space-y-2">
            <Label htmlFor="providencias">Providências / O que fazer</Label>
            <Textarea
              id="providencias"
              value={formData.providencias || ""}
              onChange={(e) => setFormData({ ...formData, providencias: e.target.value })}
              placeholder="Descreva as providências necessárias..."
              rows={3}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes || ""}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Save className="h-4 w-4" />
            {mode === "create" ? "Criar Demanda" : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Componente Principal
export default function DemandasPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [prioridadeFilter, setPrioridadeFilter] = useState("all");
  const [reuPresoFilter, setReuPresoFilter] = useState<boolean | null>(null);
  const [activeView, setActiveView] = useState<"table" | "kanban" | "timeline">("table");
  const [sortField, setSortField] = useState<"prazo" | "assistido" | "area" | "status">("prazo");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("edit");
  const [demandas, setDemandas] = useState<Demanda[]>(mockDemandas);

  // Colunas visíveis
  const [visibleColumns, setVisibleColumns] = useState({
    prazo: true,
    assistido: true,
    processo: true,
    ato: true,
    area: true,
    status: true,
    prioridade: true,
    providencias: true,
    defensor: false,
    dataEntrada: false,
  });

  // Filtrar e ordenar demandas
  const filteredDemandas = useMemo(() => {
    let result = demandas.filter((demanda) => {
      const matchesSearch = 
        demanda.assistido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        demanda.processo.includes(searchTerm) ||
        demanda.ato.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (demanda.providencias?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || demanda.status === statusFilter;
      const matchesArea = areaFilter === "all" || demanda.area === areaFilter;
      const matchesPrioridade = prioridadeFilter === "all" || demanda.prioridade === prioridadeFilter;
      const matchesReuPreso = reuPresoFilter === null || demanda.reuPreso === reuPresoFilter;
      return matchesSearch && matchesStatus && matchesArea && matchesPrioridade && matchesReuPreso;
    });

    // Ordenar
    result.sort((a, b) => {
      // Réu preso sempre primeiro
      if (a.reuPreso && !b.reuPreso) return -1;
      if (!a.reuPreso && b.reuPreso) return 1;

      let comparison = 0;
      switch (sortField) {
        case "prazo":
          comparison = new Date(a.prazo).getTime() - new Date(b.prazo).getTime();
          break;
        case "assistido":
          comparison = a.assistido.localeCompare(b.assistido);
          break;
        case "area":
          comparison = a.area.localeCompare(b.area);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [demandas, searchTerm, statusFilter, areaFilter, prioridadeFilter, reuPresoFilter, sortField, sortOrder]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: demandas.length,
    atender: demandas.filter(d => d.status === "2_ATENDER").length,
    fila: demandas.filter(d => d.status === "5_FILA" || d.status === "6_ELABORANDO").length,
    monitorar: demandas.filter(d => d.status === "4_MONITORAR").length,
    protocolado: demandas.filter(d => d.status === "7_PROTOCOLADO" || d.status === "7_CIENCIA").length,
    reuPreso: demandas.filter(d => d.reuPreso).length,
    vencidos: demandas.filter(d => isPast(parseISO(d.prazo)) && !isToday(parseISO(d.prazo)) && !["7_PROTOCOLADO", "CONCLUIDO", "ARQUIVADO"].includes(d.status)).length,
    hoje: demandas.filter(d => isToday(parseISO(d.prazo))).length,
  }), [demandas]);

  // Handlers
  const handleOpenCreate = () => {
    setSelectedDemanda(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (demanda: Demanda) => {
    setSelectedDemanda(demanda);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = (data: Partial<Demanda>) => {
    if (modalMode === "create") {
      const newDemanda: Demanda = {
        ...data as Demanda,
        id: Math.max(...demandas.map(d => d.id)) + 1,
      };
      setDemandas([...demandas, newDemanda]);
    } else if (selectedDemanda) {
      setDemandas(demandas.map(d => d.id === selectedDemanda.id ? { ...d, ...data } : d));
    }
  };

  const handleUpdateStatus = (id: number, newStatus: string) => {
    setDemandas(demandas.map(d => d.id === id ? { ...d, status: newStatus } : d));
  };

  const handleDelete = (id: number) => {
    setDemandas(demandas.filter(d => d.id !== id));
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Premium */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="icon-primary">
            <FileText />
          </div>
          <div className="page-header-info">
            <h1>Demandas</h1>
            <p>Gestão de prazos e atos processuais</p>
          </div>
        </div>
        <div className="page-header-actions">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Demanda
          </Button>
        </div>
      </div>

      {/* Stats Cards Premium */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
        <Card className="stat-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="stat-card-icon">
                <FileText />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card fatal">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.reuPreso}</p>
                <p className="text-xs text-muted-foreground">Réu Preso</p>
              </div>
              <Lock className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card fatal">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.atender}</p>
                <p className="text-xs text-muted-foreground">Atender</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card urgente">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.hoje}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
              <Timer className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.fila}</p>
                <p className="text-xs text-muted-foreground">Em Fila</p>
              </div>
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{stats.monitorar}</p>
                <p className="text-xs text-muted-foreground">Monitorar</p>
              </div>
              <Eye className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card success">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.protocolado}</p>
                <p className="text-xs text-muted-foreground">Protocolado</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className={cn("stat-card", stats.vencidos > 0 && "fatal")}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-2xl font-bold", stats.vencidos > 0 && "text-red-600")}>{stats.vencidos}</p>
                <p className="text-xs text-muted-foreground">Vencidos</p>
              </div>
              <AlertTriangle className={cn("h-5 w-5", stats.vencidos > 0 ? "text-red-500" : "text-muted-foreground")} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Visualização */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar assistido, processo, ato..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", s.color)} />
                      {s.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Áreas</SelectItem>
                {AREA_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={reuPresoFilter === true ? "destructive" : "outline"}
              size="sm"
              onClick={() => setReuPresoFilter(reuPresoFilter === true ? null : true)}
              className="gap-1"
            >
              <Lock className="h-3 w-3" />
              Réu Preso
            </Button>

            {(statusFilter !== "all" || areaFilter !== "all" || reuPresoFilter !== null || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setAreaFilter("all");
                  setReuPresoFilter(null);
                }}
                className="gap-1 text-muted-foreground"
              >
                <X className="h-3 w-3" />
                Limpar
              </Button>
            )}
          </div>

          {/* Controles de Visualização */}
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="table" className="gap-1">
                <List className="h-4 w-4" />
                Tabela
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
            </TabsList>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Columns className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-semibold">Colunas Visíveis</div>
                <DropdownMenuSeparator />
                {Object.entries(visibleColumns).map(([key, value]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={value}
                    onCheckedChange={(checked) => setVisibleColumns({ ...visibleColumns, [key]: checked })}
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Visualização em Tabela */}
        <TabsContent value="table" className="mt-0">
          <Card className="section-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      {visibleColumns.prazo && (
                        <TableHead className="w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort("prazo")}>
                          <div className="flex items-center gap-1">
                            Prazo
                            {sortField === "prazo" && (sortOrder === "asc" ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.assistido && (
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("assistido")}>
                          <div className="flex items-center gap-1">
                            Assistido
                            {sortField === "assistido" && (sortOrder === "asc" ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.processo && <TableHead>Processo</TableHead>}
                      {visibleColumns.ato && <TableHead>Ato</TableHead>}
                      {visibleColumns.area && (
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("area")}>
                          <div className="flex items-center gap-1">
                            Área
                            {sortField === "area" && (sortOrder === "asc" ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.status && (
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("status")}>
                          <div className="flex items-center gap-1">
                            Status
                            {sortField === "status" && (sortOrder === "asc" ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />)}
                          </div>
                        </TableHead>
                      )}
                      {visibleColumns.prioridade && <TableHead>Prioridade</TableHead>}
                      {visibleColumns.providencias && <TableHead className="max-w-[200px]">Providências</TableHead>}
                      {visibleColumns.defensor && <TableHead>Defensor</TableHead>}
                      {visibleColumns.dataEntrada && <TableHead>Entrada</TableHead>}
                      <TableHead className="w-[50px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDemandas.map((demanda) => {
                      const prazoInfo = getPrazoInfo(demanda.prazo);
                      const PrazoIcon = prazoInfo.icon;
                      return (
                        <TableRow 
                          key={demanda.id} 
                          className={cn(
                            "hover:bg-muted/30 transition-colors",
                            demanda.reuPreso && "bg-red-50/50 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30",
                            prazoInfo.urgent && !demanda.reuPreso && "bg-orange-50/30 dark:bg-orange-950/10"
                          )}
                        >
                          {visibleColumns.prazo && (
                            <TableCell>
                              <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit", prazoInfo.className)}>
                                <PrazoIcon className="h-3.5 w-3.5" />
                                <span className="text-xs font-semibold">{prazoInfo.text}</span>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.assistido && (
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {demanda.reuPreso && <Lock className="h-3.5 w-3.5 text-red-500" />}
                                <span className="font-medium">{demanda.assistido}</span>
                              </div>
                            </TableCell>
                          )}
                          {visibleColumns.processo && (
                            <TableCell>
                              <span className="font-mono text-xs text-muted-foreground">{demanda.processo}</span>
                            </TableCell>
                          )}
                          {visibleColumns.ato && (
                            <TableCell>
                              <span className="font-medium">{demanda.ato}</span>
                            </TableCell>
                          )}
                          {visibleColumns.area && (
                            <TableCell><AreaBadge area={demanda.area} /></TableCell>
                          )}
                          {visibleColumns.status && (
                            <TableCell>
                              <Select
                                value={demanda.status}
                                onValueChange={(v) => handleUpdateStatus(demanda.id, v)}
                              >
                                <SelectTrigger className="h-7 w-[120px] text-xs">
                                  <StatusBadge status={demanda.status} />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                      <div className="flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", s.color)} />
                                        {s.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          )}
                          {visibleColumns.prioridade && (
                            <TableCell>
                              <PrioridadeBadge prioridade={demanda.prioridade} reuPreso={demanda.reuPreso} />
                            </TableCell>
                          )}
                          {visibleColumns.providencias && (
                            <TableCell className="max-w-[200px]">
                              <p className="text-xs text-muted-foreground truncate">{demanda.providencias || "-"}</p>
                            </TableCell>
                          )}
                          {visibleColumns.defensor && (
                            <TableCell>
                              <span className="text-sm">{demanda.defensor || "-"}</span>
                            </TableCell>
                          )}
                          {visibleColumns.dataEntrada && (
                            <TableCell>
                              <span className="text-xs text-muted-foreground">
                                {demanda.dataEntrada ? format(parseISO(demanda.dataEntrada), "dd/MM", { locale: ptBR }) : "-"}
                              </span>
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenEdit(demanda)} className="cursor-pointer">
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleUpdateStatus(demanda.id, "7_PROTOCOLADO")}
                                  className="cursor-pointer text-emerald-600"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Marcar Protocolado
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(demanda.id)}
                                  className="cursor-pointer text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {filteredDemandas.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground mb-1">Nenhuma demanda encontrada</p>
                  <p className="text-sm text-muted-foreground">Tente ajustar os filtros ou adicione uma nova demanda</p>
                  <Button onClick={handleOpenCreate} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    Nova Demanda
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contador de resultados */}
          {filteredDemandas.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Mostrando <span className="font-semibold text-foreground">{filteredDemandas.length}</span> de{" "}
                <span className="font-semibold text-foreground">{demandas.length}</span> demandas
              </p>
              <p>
                <span className="font-semibold text-red-600">{stats.reuPreso}</span> réus presos •{" "}
                <span className="font-semibold text-orange-600">{stats.atender + stats.hoje}</span> urgentes
              </p>
            </div>
          )}
        </TabsContent>

        {/* Visualização Kanban */}
        <TabsContent value="kanban" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Coluna Atender */}
            <Card className="section-card">
              <CardHeader className="pb-3 border-b border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <CardTitle className="text-sm font-semibold text-red-700 dark:text-red-400">Atender</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    {demandas.filter(d => d.status === "2_ATENDER").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 min-h-[300px]">
                {demandas.filter(d => d.status === "2_ATENDER").map((demanda) => (
                  <div
                    key={demanda.id}
                    onClick={() => handleOpenEdit(demanda)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                      demanda.reuPreso 
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" 
                        : "bg-card border-border hover:border-red-300"
                    )}
                  >
                    {demanda.reuPreso && (
                      <Badge className="bg-red-700 text-white text-[10px] mb-2">
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        RÉU PRESO
                      </Badge>
                    )}
                    <p className="font-semibold text-sm">{demanda.assistido}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{demanda.ato}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn("text-xs font-semibold", getPrazoInfo(demanda.prazo).className.split(" ")[0])}>
                        {getPrazoInfo(demanda.prazo).text}
                      </span>
                      <AreaBadge area={demanda.area} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Coluna Em Fila */}
            <Card className="section-card">
              <CardHeader className="pb-3 border-b border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-400">Em Fila</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    {demandas.filter(d => d.status === "5_FILA" || d.status === "6_ELABORANDO").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 min-h-[300px]">
                {demandas.filter(d => d.status === "5_FILA" || d.status === "6_ELABORANDO").map((demanda) => (
                  <div
                    key={demanda.id}
                    onClick={() => handleOpenEdit(demanda)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                      demanda.reuPreso 
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" 
                        : "bg-card border-border hover:border-amber-300"
                    )}
                  >
                    {demanda.reuPreso && (
                      <Badge className="bg-red-700 text-white text-[10px] mb-2">
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        RÉU PRESO
                      </Badge>
                    )}
                    <p className="font-semibold text-sm">{demanda.assistido}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{demanda.ato}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn("text-xs font-semibold", getPrazoInfo(demanda.prazo).className.split(" ")[0])}>
                        {getPrazoInfo(demanda.prazo).text}
                      </span>
                      <AreaBadge area={demanda.area} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Coluna Monitorar */}
            <Card className="section-card">
              <CardHeader className="pb-3 border-b border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-400">Monitorar</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-300">
                    {demandas.filter(d => d.status === "4_MONITORAR").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 min-h-[300px]">
                {demandas.filter(d => d.status === "4_MONITORAR").map((demanda) => (
                  <div
                    key={demanda.id}
                    onClick={() => handleOpenEdit(demanda)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                      demanda.reuPreso 
                        ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" 
                        : "bg-card border-border hover:border-blue-300"
                    )}
                  >
                    {demanda.reuPreso && (
                      <Badge className="bg-red-700 text-white text-[10px] mb-2">
                        <Lock className="h-2.5 w-2.5 mr-1" />
                        RÉU PRESO
                      </Badge>
                    )}
                    <p className="font-semibold text-sm">{demanda.assistido}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{demanda.ato}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={cn("text-xs font-semibold", getPrazoInfo(demanda.prazo).className.split(" ")[0])}>
                        {getPrazoInfo(demanda.prazo).text}
                      </span>
                      <AreaBadge area={demanda.area} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Coluna Protocolado */}
            <Card className="section-card">
              <CardHeader className="pb-3 border-b border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Protocolado</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                    {demandas.filter(d => d.status === "7_PROTOCOLADO" || d.status === "7_CIENCIA").length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3 space-y-2 min-h-[300px]">
                {demandas.filter(d => d.status === "7_PROTOCOLADO" || d.status === "7_CIENCIA").map((demanda) => (
                  <div
                    key={demanda.id}
                    onClick={() => handleOpenEdit(demanda)}
                    className="p-3 rounded-xl border bg-card border-border hover:border-emerald-300 cursor-pointer transition-all hover:shadow-md"
                  >
                    <p className="font-semibold text-sm">{demanda.assistido}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{demanda.ato}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge className="bg-emerald-500 text-white text-[10px]">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                        Concluído
                      </Badge>
                      <AreaBadge area={demanda.area} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Edição/Criação */}
      <DemandaModal
        demanda={selectedDemanda}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedDemanda(null);
        }}
        onSave={handleSave}
        mode={modalMode}
      />
    </div>
  );
}
