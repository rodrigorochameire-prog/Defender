"use client";

import { useState, useMemo } from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Calculator, 
  Check, 
  ChevronsUpDown, 
  AlertCircle,
  Clock,
  Lock,
  Unlock,
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
import { cn } from "@/lib/utils";
import Link from "next/link";

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

// Status com cores funcionais (alto contraste)
const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  "urgente": { 
    bg: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300", 
    border: "bg-rose-500" 
  },
  "a_fazer": { 
    bg: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", 
    border: "bg-zinc-400" 
  },
  "em_andamento": { 
    bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", 
    border: "bg-amber-500" 
  },
  "protocolar": { 
    bg: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", 
    border: "bg-orange-500" 
  },
  "protocolado": { 
    bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300", 
    border: "bg-emerald-500" 
  },
  "monitorar": { 
    bg: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300", 
    border: "bg-sky-500" 
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
// ========================================

function CalculadoraPrazos({ 
  tipoAto, 
  onCalculate 
}: { 
  tipoAto: string;
  onCalculate: (dataFatal: Date) => void;
}) {
  const [dataExpedicao, setDataExpedicao] = useState<string>("");
  const [dataFatalCalculada, setDataFatalCalculada] = useState<Date | null>(null);

  const calcularPrazoFatal = () => {
    if (!dataExpedicao) return;
    
    const dataExp = parseISO(dataExpedicao);
    
    // 1. Prazo de Leitura (10 dias corridos no PJe)
    let dataCiencia = addDays(dataExp, 10);
    
    // 2. Adicionar Prazo Processual
    const prazoInfo = PRAZOS_LEGAIS[tipoAto] || { dias: 5, descricao: "Prazo padrão" };
    let dataFatal = addDays(dataCiencia, prazoInfo.dias);
    
    // 3. Ajuste de fim de semana (prorroga para próximo dia útil)
    while (isWeekend(dataFatal)) {
      dataFatal = addDays(dataFatal, 1);
    }
    
    setDataFatalCalculada(dataFatal);
    onCalculate(dataFatal);
  };

  const prazoInfo = PRAZOS_LEGAIS[tipoAto] || { dias: 5, descricao: "Prazo padrão" };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-zinc-500" />
        <h4 className="font-semibold text-zinc-900 dark:text-white">
          Calculadora Penal
        </h4>
      </div>
      
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Soma +10 dias (leitura PJe) + prazo legal do ato.
      </p>
      
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Data de Expedição</Label>
          <Input
            type="date"
            value={dataExpedicao}
            onChange={(e) => setDataExpedicao(e.target.value)}
            className="h-9 font-data text-sm"
          />
        </div>
        
        <div className="flex items-center justify-between text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-md">
          <span>Prazo do ato:</span>
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {prazoInfo.dias} dias ({prazoInfo.descricao})
          </span>
        </div>
        
        <Button 
          onClick={calcularPrazoFatal} 
          className="w-full h-8 text-xs"
          disabled={!dataExpedicao}
        >
          Calcular Prazo Fatal
        </Button>
      </div>
      
      {dataFatalCalculada && (
        <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 p-3 border border-emerald-100 dark:border-emerald-800">
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
            Prazo Fatal Estimado
          </span>
          <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-data">
            {format(dataFatalCalculada, "dd 'de' MMMM", { locale: ptBR })}
          </div>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 mt-1">
            {format(dataFatalCalculada, "EEEE", { locale: ptBR })}
          </p>
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
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-lg font-semibold text-zinc-900 dark:text-white">
                {demanda.assistido}
              </SheetTitle>
              <SheetDescription className="text-sm font-data text-zinc-500">
                {demanda.processo}
              </SheetDescription>
            </div>
            
            {isPreso ? (
              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-0">
                <Lock className="w-3 h-3 mr-1" /> Preso
              </Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">
                <Unlock className="w-3 h-3 mr-1" /> Solto
              </Badge>
            )}
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
        "text-[10px] h-5 px-1.5 border-0 rounded-sm font-medium",
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
    return <span className="text-xs text-zinc-400 italic">Sem prazo</span>;
  }
  
  const dataPrazo = parseISO(prazo);
  const diasRestantes = differenceInDays(dataPrazo, new Date());
  const vencido = isBefore(dataPrazo, new Date()) && !isToday(dataPrazo);
  const hoje = isToday(dataPrazo);
  const urgente = diasRestantes <= 3 && diasRestantes >= 0;
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs font-medium",
      vencido && "text-rose-600 dark:text-rose-400",
      hoje && "text-rose-600 dark:text-rose-400",
      urgente && !hoje && "text-amber-600 dark:text-amber-400",
      !vencido && !hoje && !urgente && "text-zinc-600 dark:text-zinc-400"
    )}>
      <Clock className={cn(
        "w-3.5 h-3.5",
        (vencido || hoje) && "text-rose-500",
        urgente && !hoje && "text-amber-500"
      )} />
      <span className="font-data">
        {format(dataPrazo, "dd/MM")}
      </span>
      {vencido && (
        <Badge className="bg-rose-500 text-white text-[9px] h-4 px-1">
          Vencido
        </Badge>
      )}
      {hoje && !vencido && (
        <Badge className="bg-rose-500 text-white text-[9px] h-4 px-1">
          Hoje
        </Badge>
      )}
      {urgente && !hoje && !vencido && (
        <span className="text-[10px] text-amber-600 dark:text-amber-400">
          ({diasRestantes}d)
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
  
  // Filtrar demandas
  const filteredDemandas = useMemo(() => {
    if (!searchTerm) return demandas;
    const term = searchTerm.toLowerCase();
    return demandas.filter(d => 
      d.assistido.toLowerCase().includes(term) ||
      d.processo.includes(term) ||
      d.ato.toLowerCase().includes(term)
    );
  }, [demandas, searchTerm]);
  
  const handleRowClick = (demanda: Demanda) => {
    setSelectedDemanda(demanda);
    setSidePeekOpen(true);
    onDemandaClick?.(demanda);
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    const statusKey = status.toLowerCase().replace(/[0-9_]/g, "").trim();
    if (status.includes("URGENTE")) return STATUS_COLORS.urgente;
    if (status.includes("PROTOCOLAR") && !status.includes("PROTOCOLADO")) return STATUS_COLORS.protocolar;
    if (status.includes("PROTOCOLADO")) return STATUS_COLORS.protocolado;
    if (status.includes("MONITORAR")) return STATUS_COLORS.monitorar;
    if (status.includes("ELABOR") || status.includes("REVIS") || status.includes("BUSCAR")) return STATUS_COLORS.em_andamento;
    return STATUS_COLORS.a_fazer;
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
              <TableHead className="w-[4px] p-0" /> {/* Faixa Colorida */}
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                Status
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                Assistido / Autos
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                Ato
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                Prazo
              </TableHead>
              <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400 w-[180px]">
                Calculadora
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDemandas.map((demanda) => {
              const statusColor = getStatusColor(demanda.status);
              const isPreso = demanda.reuPreso;
              
              return (
                <TableRow 
                  key={demanda.id}
                  className={cn(
                    "group h-16 cursor-pointer transition-colors",
                    "hover:bg-zinc-50 dark:hover:bg-zinc-900/40",
                    "border-b border-zinc-100 dark:border-zinc-800"
                  )}
                  onClick={() => handleRowClick(demanda)}
                >
                  {/* Faixa de Status (Lateral) */}
                  <TableCell className={cn("p-0 w-[4px]", statusColor.border)} />

                  {/* Status Badge */}
                  <TableCell className="py-3">
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "rounded-sm px-2 py-1 font-medium border-0 text-[11px]",
                        statusColor.bg
                      )}
                    >
                      {demanda.status.replace(/[0-9_]/g, "").trim()}
                    </Badge>
                  </TableCell>

                  {/* Assistido e Autos */}
                  <TableCell className="py-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                          {demanda.assistido}
                        </span>
                        {isPreso && (
                          <Lock className="h-3 w-3 text-rose-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {demanda.area === "JURI" && (
                          <FaseJuriBadge fase={demanda.fase || "INSTRUCAO"} />
                        )}
                        <span className="text-xs font-data text-zinc-500 dark:text-zinc-400">
                          {demanda.processo.length > 25 
                            ? demanda.processo.slice(0, 22) + "..." 
                            : demanda.processo
                          }
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Ato (Combobox) */}
                  <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                    <AtoCombobox 
                      value={demanda.tipoAto} 
                      onValueChange={(value) => onAtoChange?.(demanda.id, value)}
                    />
                  </TableCell>

                  {/* Prazo */}
                  <TableCell className="py-3">
                    <PrazoIndicator prazo={demanda.prazo} />
                  </TableCell>

                  {/* Calculadora */}
                  <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 gap-1.5"
                        >
                          <Calculator className="h-3.5 w-3.5 text-zinc-500" />
                          Calcular
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-80 p-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800" 
                        align="end"
                      >
                        <CalculadoraPrazos 
                          tipoAto={demanda.tipoAto}
                          onCalculate={(data) => console.log("Prazo:", data)}
                        />
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {filteredDemandas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-zinc-500">
                    <FileText className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-sm">Nenhuma demanda encontrada</p>
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
