"use client";

import { useState, useMemo } from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  addDays, 
  isWeekend, 
  format, 
  differenceInDays, 
  parseISO,
  isBefore,
  isToday 
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Calculator, 
  Check, 
  ChevronsUpDown, 
  AlertCircle,
  Clock,
  Lock,
  Gavel,
  Search,
  FileText,
  Scale,
  Eye,
  ExternalLink,
  Calendar,
  User,
  MapPin,
  Copy,
  MessageCircle,
  Target,
  ChevronRight,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import Link from "next/link";
import { PrisonerIndicator } from "@/components/shared/prisoner-indicator";

// ========================================
// CONFIGURAÇÕES E TIPOS
// ========================================

// Prazos legais em dias úteis
const PRAZOS_LEGAIS: Record<string, { dias: number; descricao: string }> = {
  "resposta_acusacao": { dias: 10, descricao: "Art. 396-A CPP" },
  "alegacoes_finais": { dias: 5, descricao: "Art. 403 CPP" },
  "apelacao": { dias: 5, descricao: "Art. 593 CPP" },
  "rese": { dias: 5, descricao: "Art. 586 CPP" },
  "agravo_execucao": { dias: 5, descricao: "Art. 197 LEP" },
  "embargos": { dias: 2, descricao: "Art. 619 CPP" },
  "habeas_corpus": { dias: 0, descricao: "Sem prazo" },
  "contrarrazoes_apelacao": { dias: 8, descricao: "Art. 600 CPP" },
  "razoes_apelacao": { dias: 8, descricao: "Art. 600 CPP" },
  "diligencias_422": { dias: 5, descricao: "Art. 422 CPP" },
};

// Fases do Júri (Pipeline Processual)
const FASES_JURI = {
  INQUERITO: { 
    label: "Inquérito", 
    icon: "🔍", 
    color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    borderColor: "border-l-zinc-500"
  },
  INSTRUCAO: { 
    label: "Instrução", 
    icon: "⚖️", 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    borderColor: "border-l-blue-500"
  },
  PLENARIO: { 
    label: "Plenário", 
    icon: "🔥", 
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    borderColor: "border-l-orange-500"
  },
};

// Status com cores funcionais e ORDEM DE PRIORIDADE
// Quanto menor o número, maior a prioridade (aparece no topo)
const STATUS_CONFIG: Record<string, { 
  priority: number;
  bg: string; 
  border: string;
  rowBg: string; // Fundo da linha inteira
}> = {
  "urgente": { 
    priority: 1,
    bg: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300", 
    border: "bg-rose-500",
    rowBg: "bg-red-50 dark:bg-red-950/20"
  },
  "protocolar": { 
    priority: 2,
    bg: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", 
    border: "bg-orange-500",
    rowBg: "bg-orange-50 dark:bg-orange-950/20"
  },
  "a_fazer": { 
    priority: 3,
    bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", 
    border: "bg-amber-500",
    rowBg: "bg-yellow-50 dark:bg-yellow-950/20"
  },
  "em_andamento": { 
    priority: 3, // Mesmo nível de A Fazer
    bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", 
    border: "bg-amber-500",
    rowBg: "bg-yellow-50 dark:bg-yellow-950/20"
  },
  "monitorar": { 
    priority: 4,
    bg: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300", 
    border: "bg-sky-500",
    rowBg: "bg-blue-50 dark:bg-blue-950/20"
  },
  "fila": { 
    priority: 5,
    bg: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300", 
    border: "bg-purple-500",
    rowBg: "bg-purple-50 dark:bg-purple-950/20"
  },
  "protocolado": { 
    priority: 6,
    bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", 
    border: "bg-emerald-500",
    rowBg: "bg-stone-50 dark:bg-stone-950/20"
  },
  "concluido": { 
    priority: 7,
    bg: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400", 
    border: "bg-stone-400",
    rowBg: "bg-stone-50 dark:bg-stone-950/20"
  },
};

// Tipos de ato para o Combobox
const TIPOS_ATO = [
  { value: "resposta_acusacao", label: "Resposta à Acusação", group: "Defesa" },
  { value: "alegacoes_finais", label: "Alegações Finais", group: "Defesa" },
  { value: "diligencias_422", label: "Diligências do 422", group: "Defesa" },
  { value: "apelacao", label: "Apelação", group: "Recursos" },
  { value: "rese", label: "RESE", group: "Recursos" },
  { value: "contrarrazoes_apelacao", label: "Contrarrazões de Apelação", group: "Recursos" },
  { value: "razoes_apelacao", label: "Razões de Apelação", group: "Recursos" },
  { value: "habeas_corpus", label: "Habeas Corpus", group: "Liberdade" },
  { value: "revogacao_prisao", label: "Revogação de Prisão", group: "Liberdade" },
  { value: "agravo_execucao", label: "Agravo em Execução", group: "Execução" },
  { value: "embargos", label: "Embargos", group: "Recursos" },
];

interface Demanda {
  id: number;
  assistido: string;
  assistidoId?: number;
  assistidoFoto?: string | null; // URL da foto do assistido
  processo: string;
  tipoAto: string;
  ato: string;
  prazo: string | null;
  dataIntimacao?: string;
  status: string;
  prisao: string;
  reuPreso: boolean;
  fase?: string;
  area?: string;
  defensor?: string;
  observacoes?: string;
}

interface DemandasTableProps {
  demandas: Demanda[];
  onDemandaClick?: (demanda: Demanda) => void;
  onStatusChange?: (id: number, status: string) => void;
  onAtoChange?: (id: number, ato: string) => void;
}

// ========================================
// COMPONENTE: Calculadora de Prazos Penais
// Com prerrogativa de prazo em DOBRO para Defensores Públicos
// Fundamento: Art. 44, I, LC 80/94 e Art. 186 CPC (subsidiário)
// ========================================

function CalculadoraPrazos({ 
  tipoAto, 
  onCalculate 
}: { 
  tipoAto: string;
  onCalculate: (dataFatal: Date) => void;
}) {
  const [dataExpedicao, setDataExpedicao] = useState<string>("");
  const [prazoEmDobro, setPrazoEmDobro] = useState<boolean>(true); // Padrão: ativado para DP
  const [dataFatalCalculada, setDataFatalCalculada] = useState<Date | null>(null);
  const [detalhesCalculo, setDetalhesCalculo] = useState<{
    dataCiencia: Date;
    prazoSimples: number;
    prazoDobrado: number;
  } | null>(null);

  const calcularPrazoFatal = () => {
    if (!dataExpedicao) return;
    
    const dataExp = parseISO(dataExpedicao);
    
    // 1. Prazo de Leitura (10 dias corridos no PJe/Projudi)
    const dataCiencia = addDays(dataExp, 10);
    
    // 2. Prazo Processual base
    const prazoInfo = PRAZOS_LEGAIS[tipoAto] || { dias: 5, descricao: "Prazo padrão" };
    const prazoSimples = prazoInfo.dias;
    
    // 3. Aplicar prazo em DOBRO se for Defensor Público (Art. 44, I, LC 80/94)
    const prazoDobrado = prazoEmDobro ? prazoSimples * 2 : prazoSimples;
    
    // 4. Calcular data fatal
    let dataFatal = addDays(dataCiencia, prazoDobrado);
    
    // 5. Ajuste de fim de semana (prorroga para próximo dia útil)
    while (isWeekend(dataFatal)) {
      dataFatal = addDays(dataFatal, 1);
    }
    
    setDataFatalCalculada(dataFatal);
    setDetalhesCalculo({ dataCiencia, prazoSimples, prazoDobrado });
    onCalculate(dataFatal);
  };

  const prazoInfo = PRAZOS_LEGAIS[tipoAto] || { dias: 5, descricao: "Prazo padrão" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-zinc-500" />
        <h4 className="font-semibold text-zinc-900 dark:text-white">
          Calculadora Penal - DP
        </h4>
      </div>
      
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        +10 dias (leitura) + prazo legal × 2 (Defensor Público)
      </p>
      
      <div className="space-y-3">
        {/* Data de Expedição */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Data de Expedição</Label>
          <Input
            type="date"
            value={dataExpedicao}
            onChange={(e) => setDataExpedicao(e.target.value)}
            className="h-9 font-data text-sm"
          />
        </div>
        
        {/* Toggle Prazo em Dobro */}
        <div 
          className={cn(
            "flex items-center justify-between p-2.5 rounded-md border cursor-pointer transition-colors",
            prazoEmDobro 
              ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800" 
              : "bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800"
          )}
          onClick={() => setPrazoEmDobro(!prazoEmDobro)}
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded-sm border-2 flex items-center justify-center transition-colors",
              prazoEmDobro 
                ? "bg-emerald-500 border-emerald-500" 
                : "border-zinc-300 dark:border-zinc-600"
            )}>
              {prazoEmDobro && <Check className="h-3 w-3 text-white" />}
            </div>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Prazo em Dobro (DP)
            </span>
          </div>
          <span className="text-xs text-zinc-500">
            Art. 44, I, LC 80/94
          </span>
        </div>
        
        {/* Info do Prazo */}
        <div className="space-y-1.5 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-md">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Prazo legal:</span>
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {prazoInfo.dias} dias
            </span>
          </div>
          {prazoEmDobro && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-600 dark:text-emerald-400">Com dobro (DP):</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                {prazoInfo.dias * 2} dias
              </span>
            </div>
          )}
          <p className="text-xs text-zinc-400 mt-1">
            {prazoInfo.descricao}
          </p>
        </div>
        
        <Button 
          onClick={calcularPrazoFatal} 
          className="w-full h-9 text-xs font-medium"
          disabled={!dataExpedicao}
        >
          <Calculator className="h-3.5 w-3.5 mr-1.5" />
          Calcular Prazo Fatal
        </Button>
      </div>
      
      {/* Resultado */}
      {dataFatalCalculada && detalhesCalculo && (
        <div className="space-y-2">
          {/* Data Fatal */}
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 p-3 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                Prazo Fatal
              </span>
              {prazoEmDobro && (
                <Badge className="bg-emerald-500 text-white text-xs h-4 px-1.5">
                  ×2 DP
                </Badge>
              )}
            </div>
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 font-data mt-1">
              {format(dataFatalCalculada, "dd/MM/yyyy")}
            </div>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
              {format(dataFatalCalculada, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          
          {/* Detalhes do Cálculo */}
          <div className="text-xs text-zinc-500 space-y-0.5 p-2 bg-zinc-50 dark:bg-zinc-900 rounded-md">
            <p>📅 Expedição: {dataExpedicao}</p>
            <p>📖 Ciência (10d): {format(detalhesCalculo.dataCiencia, "dd/MM/yyyy")}</p>
            <p>⏱️ Prazo: {detalhesCalculo.prazoSimples}d {prazoEmDobro && `× 2 = ${detalhesCalculo.prazoDobrado}d`}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// COMPONENTE: Combobox de Atos
// ========================================

function AtoCombobox({ 
  value, 
  onValueChange 
}: { 
  value: string; 
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  
  const selectedAto = TIPOS_ATO.find(ato => ato.value === value);
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[180px] justify-between text-xs h-8 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
        >
          <span className="truncate">
            {selectedAto?.label || "Selecionar ato..."}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar ato..." className="h-9" />
          <CommandList>
            <CommandEmpty>Nenhum ato encontrado.</CommandEmpty>
            {["Defesa", "Recursos", "Liberdade", "Execução"].map((group) => (
              <CommandGroup key={group} heading={group}>
                {TIPOS_ATO.filter(ato => ato.group === group).map((ato) => (
                  <CommandItem
                    key={ato.value}
                    value={ato.value}
                    onSelect={() => {
                      onValueChange(ato.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === ato.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {ato.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ========================================
// COMPONENTE: Side Peek (Sheet Lateral)
// ========================================

function DemandaSidePeek({ 
  demanda, 
  open, 
  onClose 
}: { 
  demanda: Demanda | null; 
  open: boolean; 
  onClose: () => void;
}) {
  if (!demanda) return null;
  
  const isPreso = demanda.reuPreso;
  
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="space-y-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start gap-4">
            {/* Foto do Assistido - Maior na Side Peek */}
            <Avatar className={cn(
              "h-16 w-16 flex-shrink-0 border-2",
              isPreso 
                ? "border-rose-300 dark:border-rose-700" 
                : "border-emerald-300 dark:border-emerald-700"
            )}>
              <AvatarImage 
                src={demanda.assistidoFoto || undefined} 
                alt={demanda.assistido}
                className="object-cover"
              />
              <AvatarFallback className={cn(
                "text-lg font-semibold",
                isPreso 
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              )}>
                {getInitials(demanda.assistido)}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <SheetTitle className="text-lg font-semibold text-zinc-900 dark:text-white truncate">
                    {demanda.assistido}
                  </SheetTitle>
                  <SheetDescription className="text-sm font-data text-zinc-500 truncate">
                    {demanda.processo}
                  </SheetDescription>
                </div>
                
                <PrisonerIndicator preso={isPreso} size="sm" />
              </div>
            </div>
          </div>
        </SheetHeader>
        
        <div className="py-6 space-y-6">
          {/* Ato e Prazo */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Demanda Atual
            </h4>
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <p className="font-medium text-zinc-900 dark:text-white">{demanda.ato}</p>
              {demanda.prazo && (
                <p className="text-sm text-zinc-500 mt-1 font-data">
                  Prazo: {format(parseISO(demanda.prazo), "dd/MM/yyyy")}
                </p>
              )}
            </div>
          </div>
          
          {/* Calculadora de Prazos */}
          <div className="p-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
            <CalculadoraPrazos 
              tipoAto={demanda.tipoAto} 
              onCalculate={(data) => console.log("Prazo calculado:", data)}
            />
          </div>
          
          {/* Observações */}
          {demanda.observacoes && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Observações
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {demanda.observacoes}
              </p>
            </div>
          )}
          
          {/* Ações */}
          <div className="flex gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link href={`/admin/assistidos/${demanda.assistidoId || 1}`} className="flex-1">
              <Button variant="outline" className="w-full gap-2 text-xs">
                <User className="h-3.5 w-3.5" />
                Ver Assistido
              </Button>
            </Link>
            <Link href={`/admin/demandas/${demanda.id}`} className="flex-1">
              <Button className="w-full gap-2 text-xs">
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir Demanda
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ========================================
// COMPONENTE: Badge de Fase do Júri
// ========================================

function FaseJuriBadge({ fase }: { fase: string }) {
  const faseConfig = FASES_JURI[fase as keyof typeof FASES_JURI] || FASES_JURI.INSTRUCAO;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs h-5 px-1.5 border-0 rounded-sm font-medium",
        faseConfig.color
      )}
    >
      {faseConfig.icon} {faseConfig.label}
    </Badge>
  );
}

// ========================================
// COMPONENTE: Indicador de Prazo
// ========================================

function PrazoIndicator({ prazo }: { prazo: string | null }) {
  if (!prazo) {
    return <span className="text-sm text-zinc-400">—</span>;
  }
  
  const dataPrazo = parseISO(prazo);
  const diasRestantes = differenceInDays(dataPrazo, new Date());
  const vencido = isBefore(dataPrazo, new Date()) && !isToday(dataPrazo);
  const hoje = isToday(dataPrazo);
  const urgente = diasRestantes <= 3 && diasRestantes >= 0;
  
  return (
    <div className="flex flex-col gap-0.5">
      <span className={cn(
        "text-sm font-mono font-medium",
        vencido && "text-zinc-800 dark:text-zinc-200",
        hoje && "text-zinc-800 dark:text-zinc-200",
        urgente && !hoje && "text-zinc-800 dark:text-zinc-200",
        !vencido && !hoje && !urgente && "text-zinc-700 dark:text-zinc-300"
      )}>
        {format(dataPrazo, "dd/MM/yyyy")}
      </span>
      {vencido && (
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Vencido
        </span>
      )}
      {hoje && !vencido && (
        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Hoje
        </span>
      )}
      {urgente && !hoje && !vencido && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {diasRestantes}d restantes
        </span>
      )}
    </div>
  );
}

// ========================================
// COMPONENTE PRINCIPAL: Tabela de Demandas
// ========================================

export function DemandasTable({ 
  demandas, 
  onDemandaClick,
  onStatusChange,
  onAtoChange 
}: DemandasTableProps) {
  const [selectedDemanda, setSelectedDemanda] = useState<Demanda | null>(null);
  const [sidePeekOpen, setSidePeekOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filtrar e ORDENAR demandas por prioridade
  const filteredDemandas = useMemo(() => {
    let filtered = demandas;
    
    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = demandas.filter(d => 
        d.assistido.toLowerCase().includes(term) ||
        d.processo.includes(term) ||
        d.ato.toLowerCase().includes(term)
      );
    }
    
    // Ordenação por prioridade (URGENTE primeiro, CONCLUÍDO por último)
    return [...filtered].sort((a, b) => {
      const priorityA = getStatusConfig(a.status).priority;
      const priorityB = getStatusConfig(b.status).priority;
      
      // Se mesma prioridade, ordena por prazo (mais próximo primeiro)
      if (priorityA === priorityB) {
        if (a.prazo && b.prazo) {
          return parseISO(a.prazo).getTime() - parseISO(b.prazo).getTime();
        }
        if (a.prazo) return -1;
        if (b.prazo) return 1;
      }
      
      return priorityA - priorityB;
    });
  }, [demandas, searchTerm]);
  
  const handleRowClick = (demanda: Demanda) => {
    setSelectedDemanda(demanda);
    setSidePeekOpen(true);
    onDemandaClick?.(demanda);
  };

  // Função para obter configuração do status
  const getStatusConfig = (status: string) => {
    const statusKey = status.toLowerCase().replace(/[0-9_\s]/g, "").trim();
    
    if (status.toLowerCase().includes("urgente")) return STATUS_CONFIG.urgente;
    if (status.toLowerCase().includes("protocolar") && !status.toLowerCase().includes("protocolado")) return STATUS_CONFIG.protocolar;
    if (status.toLowerCase().includes("protocolado")) return STATUS_CONFIG.protocolado;
    if (status.toLowerCase().includes("monitorar")) return STATUS_CONFIG.monitorar;
    if (status.toLowerCase().includes("fila")) return STATUS_CONFIG.fila;
    if (status.toLowerCase().includes("conclu")) return STATUS_CONFIG.concluido;
    if (status.toLowerCase().includes("elabor") || status.toLowerCase().includes("revis") || status.toLowerCase().includes("buscar")) return STATUS_CONFIG.em_andamento;
    
    return STATUS_CONFIG.a_fazer;
  };

  return (
    <>
      {/* Barra de Busca */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Buscar assistido, processo, ato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
        </div>
      </div>

      {/* Tabela Notion-Like */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px] text-xs uppercase tracking-wide font-semibold text-zinc-700 dark:text-zinc-300">
                Status
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide font-semibold text-zinc-700 dark:text-zinc-300">
                Assistido
              </TableHead>
              <TableHead className="w-[180px] text-xs uppercase tracking-wide font-semibold text-zinc-700 dark:text-zinc-300">
                Ato
              </TableHead>
              <TableHead className="w-[200px] text-xs uppercase tracking-wide font-semibold text-zinc-700 dark:text-zinc-300">
                Providências
              </TableHead>
              <TableHead className="w-[110px] text-xs uppercase tracking-wide font-semibold text-zinc-700 dark:text-zinc-300">
                Expedição
              </TableHead>
              <TableHead className="w-[100px] text-xs uppercase tracking-wide font-semibold text-zinc-700 dark:text-zinc-300">
                Prazo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDemandas.map((demanda) => {
              const statusConfig = getStatusConfig(demanda.status);
              const isPreso = demanda.reuPreso;
              
              return (
                <TableRow 
                  key={demanda.id}
                  className={cn(
                    "group cursor-pointer transition-all duration-200",
                    "hover:shadow-sm hover:scale-[1.01]",
                    "border-b border-zinc-200 dark:border-zinc-700",
                    statusConfig.rowBg
                  )}
                  onClick={() => handleRowClick(demanda)}
                >
                  {/* Status Badge - Primeira coluna */}
                  <TableCell className="py-4">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "rounded px-2.5 py-1 font-semibold border-0 text-xs",
                        statusConfig.bg
                      )}
                    >
                      {demanda.status.replace(/[0-9_]/g, "").trim()}
                    </Badge>
                  </TableCell>

                  {/* Assistido - Com Foto e cadeado discreto */}
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      {/* Foto do Assistido */}
                      <Avatar className="h-10 w-10 flex-shrink-0 border border-zinc-200 dark:border-zinc-700">
                        <AvatarImage 
                          src={demanda.assistidoFoto || undefined} 
                          alt={demanda.assistido}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-sm font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                          {getInitials(demanda.assistido)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Nome e Processo */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base text-zinc-900 dark:text-zinc-50 truncate">
                            {demanda.assistido}
                          </span>
                          {/* Indicador prisional discreto */}
                          <PrisonerIndicator preso={isPreso} size="xs" />
                        </div>
                        <div className="flex items-center gap-2">
                          {demanda.area === "JURI" && (
                            <FaseJuriBadge fase={demanda.fase || "INSTRUCAO"} />
                          )}
                          <span className="text-sm font-mono text-zinc-600 dark:text-zinc-400 truncate">
                            {demanda.processo.length > 25 
                              ? demanda.processo.slice(0, 22) + "..." 
                              : demanda.processo
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Ato */}
                  <TableCell className="py-4">
                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      {demanda.ato}
                    </span>
                  </TableCell>

                  {/* Providências */}
                  <TableCell className="py-4">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {demanda.observacoes || "—"}
                    </span>
                  </TableCell>

                  {/* Data de Expedição */}
                  <TableCell className="py-4">
                    {demanda.dataIntimacao ? (
                      <span className="text-sm font-mono text-zinc-700 dark:text-zinc-300">
                        {format(parseISO(demanda.dataIntimacao), "dd/MM/yyyy")}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-400">—</span>
                    )}
                  </TableCell>

                  {/* Prazo */}
                  <TableCell className="py-4">
                    <PrazoIndicator prazo={demanda.prazo} />
                  </TableCell>
                </TableRow>
              );
            })}
            
            {filteredDemandas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3 text-zinc-500">
                    <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-base">Nenhuma demanda encontrada</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Side Peek */}
      <DemandaSidePeek 
        demanda={selectedDemanda}
        open={sidePeekOpen}
        onClose={() => setSidePeekOpen(false)}
      />
    </>
  );
}
