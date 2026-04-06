"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  ArrowLeft,
  Calendar,
  User,
  Scale,
  Save,
  Plus,
  Clock,
  Lock,
  Calculator,
  Loader2,
  Info,
  Check,
  AlertTriangle,
  ChevronsUpDown,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";

export default function NovaDemandaPage() {
  const router = useRouter();
  const { hasArea } = usePermissions();
  const isCriminal = hasArea("CRIMINAL") || hasArea("JURI") || hasArea("EXECUCAO_PENAL") || hasArea("VIOLENCIA_DOMESTICA");
  const searchParams = useSearchParams();
  const processoIdParam = searchParams.get("processoId");
  const assistidoIdParam = searchParams.get("assistidoId");

  // Form state
  const [formData, setFormData] = useState({
    processoId: processoIdParam || "",
    assistidoId: assistidoIdParam || "",
    ato: "",
    tipoAto: "",
    tipoPrazoCodigo: "",
    area: "CRIMINAL",
    prazo: "",
    dataEntrada: new Date().toISOString().split("T")[0],
    dataExpedicao: new Date().toISOString().split("T")[0],
    status: "5_TRIAGEM",
    providencias: "",
    reuPreso: false,
  });

  // Cálculo automático
  const [usarCalculoAutomatico, setUsarCalculoAutomatico] = useState(true);
  const [resultadoCalculo, setResultadoCalculo] = useState<any>(null);
  const [tempoLeitura, setTempoLeitura] = useState(10);
  const [aplicarDobro, setAplicarDobro] = useState(true);

  // Combobox state
  const [processoOpen, setProcessoOpen] = useState(false);
  const [assistidoOpen, setAssistidoOpen] = useState(false);
  const [processoSearch, setProcessoSearch] = useState("");
  const [assistidoSearch, setAssistidoSearch] = useState("");
  const [debouncedProcessoSearch, setDebouncedProcessoSearch] = useState("");
  const [debouncedAssistidoSearch, setDebouncedAssistidoSearch] = useState("");

  // Debounce effects
  useEffect(() => {
    const t = setTimeout(() => setDebouncedProcessoSearch(processoSearch), 300);
    return () => clearTimeout(t);
  }, [processoSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAssistidoSearch(assistidoSearch), 300);
    return () => clearTimeout(t);
  }, [assistidoSearch]);

  // Queries — search-based, only load when combobox is open
  const { data: processos, isLoading: loadingProcessos } =
    trpc.processos.list.useQuery(
      { search: debouncedProcessoSearch || undefined, limit: 20 },
      { enabled: processoOpen }
    );
  const { data: assistidos, isLoading: loadingAssistidos } =
    trpc.assistidos.list.useQuery(
      { search: debouncedAssistidoSearch || undefined },
      { enabled: assistidoOpen }
    );

  // Preload selected items for display (when IDs come from URL params or selection)
  const [selectedProcessoItem, setSelectedProcessoItem] = useState<{
    id: number; numeroAutos: string | null; assistidoNome?: string | null;
    assistidoId: number | null; assistidoStatusPrisional?: string | null;
  } | null>(null);
  const [selectedAssistidoItem, setSelectedAssistidoItem] = useState<{
    id: number; nome: string; statusPrisional: string | null;
  } | null>(null);

  // Fetch by ID for URL-param preloading
  const { data: preloadedProcesso } = trpc.processos.getById.useQuery(
    { id: parseInt(processoIdParam!) },
    { enabled: !!processoIdParam && !selectedProcessoItem }
  );
  const { data: preloadedAssistido } = trpc.assistidos.getById.useQuery(
    { id: parseInt(assistidoIdParam!) },
    { enabled: !!assistidoIdParam && !selectedAssistidoItem }
  );

  useEffect(() => {
    if (preloadedProcesso && !selectedProcessoItem) {
      setSelectedProcessoItem({
        id: preloadedProcesso.id,
        numeroAutos: preloadedProcesso.numeroAutos,
        assistidoId: preloadedProcesso.assistidoId ?? null,
        assistidoNome: (preloadedProcesso as any).assistido?.nome ?? null,
        assistidoStatusPrisional: (preloadedProcesso as any).assistido?.statusPrisional ?? null,
      });
    }
  }, [preloadedProcesso]);

  useEffect(() => {
    if (preloadedAssistido && !selectedAssistidoItem) {
      setSelectedAssistidoItem({
        id: preloadedAssistido.id,
        nome: preloadedAssistido.nome,
        statusPrisional: preloadedAssistido.statusPrisional ?? null,
      });
    }
  }, [preloadedAssistido]);
  const { data: tiposPrazo, isLoading: loadingTipos } =
    trpc.prazos.listTiposPrazo.useQuery({
      areaDireito: formData.area as any,
      apenasAtivos: true,
    });

  // Mutation para criar demanda
  const createMutation = trpc.demandas.create.useMutation({
    onSuccess: () => {
      toast.success("Demanda criada com sucesso!");
      router.push("/admin/demandas");
    },
    onError: (error) => {
      toast.error(`Erro ao criar demanda: ${error.message}`);
    },
  });

  // Mutation para calcular prazo
  const calcularMutation = trpc.prazos.calcularPrazo.useMutation({
    onSuccess: (data) => {
      setResultadoCalculo(data);
      // Atualizar prazo automaticamente
      setFormData((prev) => ({ ...prev, prazo: data.dataTermoFinal }));
    },
    onError: (error) => {
      toast.error(`Erro ao calcular prazo: ${error.message}`);
    },
  });

  // Handler para selecionar processo (auto-preenche assistido e reuPreso)
  const handleProcessoSelect = (p: {
    id: number; numeroAutos: string | null;
    assistidoId: number | null;
    assistido?: { id: number | null; nome: string | null; statusPrisional: string | null } | null;
  }) => {
    setSelectedProcessoItem({
      id: p.id,
      numeroAutos: p.numeroAutos,
      assistidoId: p.assistidoId,
      assistidoNome: p.assistido?.nome ?? null,
      assistidoStatusPrisional: p.assistido?.statusPrisional ?? null,
    });
    const newData: Partial<typeof formData> = { processoId: p.id.toString() };
    if (p.assistidoId) {
      newData.assistidoId = p.assistidoId.toString();
      if (p.assistido) {
        setSelectedAssistidoItem({
          id: p.assistido.id!,
          nome: p.assistido.nome ?? "",
          statusPrisional: p.assistido.statusPrisional ?? null,
        });
      }
      if (p.assistido?.statusPrisional && p.assistido.statusPrisional !== "SOLTO") {
        newData.reuPreso = true;
      }
    }
    setFormData((prev) => ({ ...prev, ...newData }));
    setProcessoOpen(false);
    setProcessoSearch("");
  };

  // Handler para selecionar assistido
  const handleAssistidoSelect = (a: {
    id: number; nome: string; statusPrisional: string | null;
  }) => {
    setSelectedAssistidoItem(a);
    setFormData((prev) => ({ ...prev, assistidoId: a.id.toString() }));
    setAssistidoOpen(false);
    setAssistidoSearch("");
  };

  // Quando tipo de prazo mudar, calcular automaticamente
  useEffect(() => {
    if (usarCalculoAutomatico && formData.tipoPrazoCodigo && formData.dataExpedicao) {
      calcularMutation.mutate({
        tipoPrazoCodigo: formData.tipoPrazoCodigo,
        dataExpedicao: formData.dataExpedicao,
        areaDireito: formData.area as any,
        aplicarDobro,
        tempoLeituraDias: tempoLeitura,
      });
    }
  }, [formData.tipoPrazoCodigo, formData.dataExpedicao, formData.area, aplicarDobro, tempoLeitura, usarCalculoAutomatico]);

  const tipoSelecionado = tiposPrazo?.find(
    (t) => t.codigo === formData.tipoPrazoCodigo
  );

  const handleChange = (name: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Se mudar o ato manualmente, tentar encontrar tipo de prazo correspondente
    if (name === "ato" && typeof value === "string" && tiposPrazo) {
      const atoLower = value.toLowerCase();
      const tipoMatch = tiposPrazo.find(
        (t) =>
          t.nome.toLowerCase().includes(atoLower) ||
          atoLower.includes(t.nome.toLowerCase().split(" ")[0])
      );
      if (tipoMatch) {
        setFormData((prev) => ({
          ...prev,
          tipoPrazoCodigo: tipoMatch.codigo,
          ato: value,
        }));
      }
    }

    // Se selecionar tipo de prazo, atualizar ato
    if (name === "tipoPrazoCodigo" && tiposPrazo) {
      const tipo = tiposPrazo.find((t) => t.codigo === value);
      if (tipo && !formData.ato) {
        setFormData((prev) => ({ ...prev, ato: tipo.nome }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.processoId) {
      toast.error("Selecione um processo");
      return;
    }

    if (!formData.assistidoId) {
      toast.error("Selecione um assistido");
      return;
    }

    if (!formData.ato) {
      toast.error("Informe o ato processual");
      return;
    }

    createMutation.mutate({
      processoId: parseInt(formData.processoId),
      assistidoId: parseInt(formData.assistidoId),
      ato: formData.ato,
      prazo: formData.prazo || undefined,
      dataEntrada: formData.dataEntrada || undefined,
      status: formData.status as any,
      providencias: formData.providencias || undefined,
      reuPreso: formData.reuPreso,
    });
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/admin/demandas">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex-shrink-0">
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-violet-700 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Nova Demanda
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 hidden sm:block">
              Registre uma nova demanda com cálculo automático de prazo
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Assistido e Processo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Assistido e Processo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Processo — combobox com busca */}
              <div className="space-y-2">
                <Label>Processo *</Label>
                <Popover open={processoOpen} onOpenChange={setProcessoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={processoOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate text-left">
                        {selectedProcessoItem
                          ? selectedProcessoItem.numeroAutos || `Processo #${selectedProcessoItem.id}`
                          : <span className="text-muted-foreground">Buscar processo...</span>}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar por número ou assunto..."
                        value={processoSearch}
                        onValueChange={setProcessoSearch}
                      />
                      <CommandList>
                        {loadingProcessos && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                            Buscando...
                          </div>
                        )}
                        {!loadingProcessos && processos?.length === 0 && (
                          <CommandEmpty>Nenhum processo encontrado.</CommandEmpty>
                        )}
                        {!loadingProcessos && !processos && (
                          <div className="py-4 text-center text-sm text-muted-foreground">
                            Digite para buscar
                          </div>
                        )}
                        <CommandGroup>
                          {processos?.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.id.toString()}
                              onSelect={() => handleProcessoSelect(p)}
                              className="flex flex-col items-start gap-0.5 py-2"
                            >
                              <div className="flex items-center gap-2 w-full">
                                <Check
                                  className={cn(
                                    "h-3 w-3 shrink-0",
                                    formData.processoId === p.id.toString() ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span className="font-medium text-sm">
                                  {p.numeroAutos || `Processo #${p.id}`}
                                </span>
                              </div>
                              {(p.assistido?.nome || p.assunto) && (
                                <div className="pl-5 text-xs text-muted-foreground">
                                  {p.assistido?.nome && <span>{p.assistido.nome}</span>}
                                  {p.assistido?.nome && p.assunto && <span> · </span>}
                                  {p.assunto && <span className="truncate">{p.assunto}</span>}
                                </div>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Assistido — combobox com busca */}
              <div className="space-y-2">
                <Label>Assistido *</Label>
                <Popover open={assistidoOpen} onOpenChange={setAssistidoOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={assistidoOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className="flex items-center gap-2 truncate">
                        {selectedAssistidoItem ? (
                          <>
                            <span className="truncate">{selectedAssistidoItem.nome}</span>
                            {selectedAssistidoItem.statusPrisional &&
                              selectedAssistidoItem.statusPrisional !== "SOLTO" && (
                              <Badge variant="danger" className="text-[10px] px-1 py-0 shrink-0">
                                PRESO
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Buscar assistido...</span>
                        )}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar por nome ou CPF..."
                        value={assistidoSearch}
                        onValueChange={setAssistidoSearch}
                      />
                      <CommandList>
                        {loadingAssistidos && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                            Buscando...
                          </div>
                        )}
                        {!loadingAssistidos && assistidos?.length === 0 && (
                          <CommandEmpty>Nenhum assistido encontrado.</CommandEmpty>
                        )}
                        {!loadingAssistidos && !assistidos && (
                          <div className="py-4 text-center text-sm text-muted-foreground">
                            Digite para buscar
                          </div>
                        )}
                        <CommandGroup>
                          {assistidos?.map((a) => (
                            <CommandItem
                              key={a.id}
                              value={a.id.toString()}
                              onSelect={() => handleAssistidoSelect({
                                id: a.id,
                                nome: a.nome,
                                statusPrisional: a.statusPrisional ?? null,
                              })}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3 shrink-0",
                                  formData.assistidoId === a.id.toString() ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex-1 truncate">{a.nome}</span>
                              {a.statusPrisional && a.statusPrisional !== "SOLTO" && (
                                <Badge variant="danger" className="ml-2 text-[10px] px-1 py-0">
                                  PRESO
                                </Badge>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {isCriminal && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reuPreso"
                  checked={formData.reuPreso}
                  onCheckedChange={(checked) =>
                    handleChange("reuPreso", checked as boolean)
                  }
                />
                <label
                  htmlFor="reuPreso"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                >
                  <Lock className="w-3 h-3 text-rose-500" />
                  Réu Preso (prioridade máxima)
                </label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ato Processual */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Ato Processual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipoPrazo">Tipo de Prazo</Label>
                <Select
                  value={formData.tipoPrazoCodigo}
                  onValueChange={(v) => handleChange("tipoPrazoCodigo", v === "_none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione para cálculo automático" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Prazo manual</SelectItem>
                    {tiposPrazo?.map((tipo) => (
                      <SelectItem key={tipo.codigo} value={tipo.codigo}>
                        {tipo.nome} ({tipo.prazoLegalDias}d
                        {tipo.aplicarDobroDefensoria ? " x2" : ""})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tipoSelecionado && (
                  <p className="text-xs text-muted-foreground">
                    {tipoSelecionado.descricao}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ato">Ato / Descrição *</Label>
                <Input
                  id="ato"
                  value={formData.ato}
                  onChange={(e) => handleChange("ato", e.target.value)}
                  placeholder="Ex: Contrarrazões de Apelação"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Área do Direito</Label>
              <Select
                value={formData.area}
                onValueChange={(v) => handleChange("area", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: "CRIMINAL", label: "Criminal (dias corridos)" },
                    { value: "JURI", label: "Júri (dias corridos)" },
                    { value: "EXECUCAO_PENAL", label: "Execução Penal (dias corridos)" },
                    { value: "VIOLENCIA_DOMESTICA", label: "Violência Doméstica (dias corridos)" },
                    { value: "INFANCIA_JUVENTUDE", label: "Infância e Juventude (dias corridos)" },
                    { value: "CIVEL", label: "Cível (dias úteis)" },
                    { value: "FAMILIA", label: "Família (dias úteis)" },
                    { value: "FAZENDA_PUBLICA", label: "Fazenda Pública (dias úteis)" },
                    { value: "TRABALHISTA", label: "Trabalhista (dias úteis)" },
                  ]
                    .filter((opt) => hasArea(opt.value))
                    .map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cálculo de Prazo */}
        <Card className={cn(usarCalculoAutomatico && "border-blue-200 dark:border-blue-800")}>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Cálculo de Prazo
              </span>
              <div className="flex items-center gap-2">
                <Switch
                  checked={usarCalculoAutomatico}
                  onCheckedChange={setUsarCalculoAutomatico}
                  id="calculo-auto"
                />
                <Label htmlFor="calculo-auto" className="text-sm font-normal">
                  Automático
                </Label>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usarCalculoAutomatico ? (
              <>
                {/* Configurações do cálculo */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Data da Expedição
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Data em que a intimação foi expedida pelo tribunal</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      type="date"
                      value={formData.dataExpedicao}
                      onChange={(e) => handleChange("dataExpedicao", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tempo de Leitura</Label>
                    <Select
                      value={tempoLeitura.toString()}
                      onValueChange={(v) => setTempoLeitura(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Já abri (0 dias)</SelectItem>
                        <SelectItem value="5">5 dias</SelectItem>
                        <SelectItem value="10">10 dias (padrão)</SelectItem>
                        <SelectItem value="15">15 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="aplicarDobro"
                      checked={aplicarDobro}
                      onCheckedChange={(checked) => setAplicarDobro(checked as boolean)}
                    />
                    <label htmlFor="aplicarDobro" className="text-sm">
                      Prazo em dobro (Defensoria)
                    </label>
                  </div>
                </div>

                {/* Resultado do cálculo */}
                {calcularMutation.isPending && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculando prazo...
                  </div>
                )}

                {resultadoCalculo && (
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                    <div className="flex items-center gap-2 mb-3">
                      <Check className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800 dark:text-green-200">
                        Prazo Calculado
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                        <div className="text-xs text-muted-foreground">Expedição</div>
                        <div className="font-medium text-sm">{resultadoCalculo.dataExpedicao}</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                        <div className="text-xs text-muted-foreground">Leitura</div>
                        <div className="font-medium text-sm">{resultadoCalculo.dataLeitura}</div>
                      </div>
                      <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                        <div className="text-xs text-muted-foreground">Início</div>
                        <div className="font-medium text-sm">{resultadoCalculo.dataTermoInicial}</div>
                      </div>
                      <div className="text-center p-2 bg-green-100 dark:bg-green-900 rounded border-2 border-green-500">
                        <div className="text-xs text-green-700 dark:text-green-300 font-medium">
                          PRAZO FATAL
                        </div>
                        <div className="font-bold text-lg text-green-800 dark:text-green-200">
                          {resultadoCalculo.dataTermoFinal}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {resultadoCalculo.prazoBaseDias} dias base
                      </Badge>
                      {resultadoCalculo.aplicouDobro && (
                        <Badge variant="default" className="bg-blue-600">
                          x2 = {resultadoCalculo.prazoComDobroDias} dias
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {resultadoCalculo.contadoEmDiasUteis ? "Dias úteis" : "Dias corridos"}
                      </Badge>
                    </div>
                  </div>
                )}

                {!formData.tipoPrazoCodigo && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm">
                      Selecione um tipo de prazo para cálculo automático
                    </span>
                  </div>
                )}
              </>
            ) : (
              /* Prazo manual */
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="prazo">Prazo Fatal</Label>
                  <Input
                    id="prazo"
                    type="date"
                    value={formData.prazo}
                    onChange={(e) => handleChange("prazo", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataEntrada">Data de Entrada</Label>
                  <Input
                    id="dataEntrada"
                    type="date"
                    value={formData.dataEntrada}
                    onChange={(e) => handleChange("dataEntrada", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataIntimacao">Data da Intimação</Label>
                  <Input
                    id="dataIntimacao"
                    type="date"
                    value={formData.dataExpedicao}
                    onChange={(e) => handleChange("dataExpedicao", e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Campo de prazo editável (sempre visível) */}
            {usarCalculoAutomatico && resultadoCalculo && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Ajustar prazo manualmente (se necessário)
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>O cálculo é automático, mas você pode ajustar se precisar</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  type="date"
                  value={formData.prazo}
                  onChange={(e) => handleChange("prazo", e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => handleChange("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="URGENTE">Urgente</SelectItem>
                  <SelectItem value="2_ATENDER">Atender</SelectItem>
                  <SelectItem value="5_TRIAGEM">Triagem</SelectItem>
                  <SelectItem value="4_MONITORAR">Monitorar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Providências */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Providências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Descreva as providências necessárias..."
              rows={4}
              value={formData.providencias}
              onChange={(e) => handleChange("providencias", e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button variant="outline" type="button" asChild>
            <Link href="/admin/demandas">Cancelar</Link>
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Demanda
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
