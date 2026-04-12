"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Sparkles,
  Search,
  Loader2,
  User,
  Scale,
  ChevronRight,
  ChevronLeft,
  Mail,
  Wand2,
  Check,
  FolderOpen,
} from "lucide-react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import DocumentContextPicker from "@/components/oficios/DocumentContextPicker";

const TIPOS_OFICIO = [
  { value: "requisitorio", label: "Requisitorio" },
  { value: "comunicacao", label: "Comunicacao" },
  { value: "encaminhamento", label: "Encaminhamento" },
  { value: "solicitacao_providencias", label: "Solic. Providencias" },
  { value: "intimacao", label: "Intimacao" },
  { value: "pedido_informacao", label: "Pedido de Info" },
  { value: "manifestacao", label: "Manifestacao" },
  { value: "representacao", label: "Representacao" },
  { value: "parecer_tecnico", label: "Parecer Tecnico" },
  { value: "convite", label: "Convite" },
  { value: "resposta_oficio", label: "Resposta" },
  { value: "certidao", label: "Certidao" },
];

export default function NovoOficioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-fill from query params (e.g., from demanda page)
  const preAssistidoId = searchParams.get("assistidoId")
    ? Number(searchParams.get("assistidoId"))
    : undefined;
  const preProcessoId = searchParams.get("processoId")
    ? Number(searchParams.get("processoId"))
    : undefined;
  const preDemandaId = searchParams.get("demandaId")
    ? Number(searchParams.get("demandaId"))
    : undefined;
  const preTipo = searchParams.get("tipo") || undefined;

  // ========================================
  // TAB: "template" | "ia"
  // ========================================
  const [activeTab, setActiveTab] = useState<"template" | "ia">(
    preTipo ? "ia" : "template"
  );

  // ========================================
  // TEMPLATE FLOW STATE
  // ========================================
  const [step, setStep] = useState<"template" | "config">("template");
  const [searchTemplate, setSearchTemplate] = useState("");
  const [tipoOficio, setTipoOficio] = useState(preTipo || "comunicacao");
  const [titulo, setTitulo] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [urgencia, setUrgencia] = useState<"normal" | "urgente" | "urgentissimo">("normal");
  const [selectedModeloId, setSelectedModeloId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  // ========================================
  // IA FLOW STATE
  // ========================================
  const [iaStep, setIaStep] = useState<1 | 2 | 3>(1);
  const [iaIdeia, setIaIdeia] = useState("");
  const [iaTipo, setIaTipo] = useState(preTipo || "requisitorio");
  const [iaDestinatario, setIaDestinatario] = useState("");
  const [iaUrgencia, setIaUrgencia] = useState<"normal" | "urgente" | "urgentissimo">("normal");
  const [iaGenerating, setIaGenerating] = useState(false);

  // Document context
  const [selectedDriveFileIds, setSelectedDriveFileIds] = useState<number[]>([]);
  const [selectedDocumentoIds, setSelectedDocumentoIds] = useState<number[]>([]);

  // ========================================
  // SHARED: Assistido/Processo
  // ========================================
  const [assistidoSearch, setAssistidoSearch] = useState("");
  const [assistidoId, setAssistidoId] = useState<number | undefined>(preAssistidoId);
  const [assistidoNome, setAssistidoNome] = useState("");
  const [showAssistido, setShowAssistido] = useState(false);
  const [processoId, setProcessoId] = useState<number | undefined>(preProcessoId);
  const [processoNumero, setProcessoNumero] = useState("");

  // ========================================
  // QUERIES
  // ========================================
  const { data: templates, isLoading: templatesLoading } = trpc.oficios.templates.useQuery(
    { search: searchTemplate || undefined },
    { enabled: activeTab === "template" && step === "template" }
  );

  const { data: assistidosData } = trpc.assistidos.list.useQuery(
    { search: assistidoSearch },
    { enabled: assistidoSearch.length >= 2 }
  );

  const { data: assistidoDetail } = trpc.assistidos.getById.useQuery(
    { id: assistidoId! },
    { enabled: !!assistidoId }
  );
  const processosData = assistidoDetail?.processos;

  // ========================================
  // MUTATIONS
  // ========================================
  const createMutation = trpc.oficios.create.useMutation({
    onSuccess: (data) => {
      setCreating(false);
      toast.success("Oficio criado");
      router.push(`/admin/oficios/${data.id}`);
    },
    onError: (err) => {
      setCreating(false);
      toast.error("Erro ao criar: " + err.message);
    },
  });

  const gerarMutation = trpc.oficios.gerarDeTemplate.useMutation({
    onSuccess: (data) => {
      setCreating(false);
      toast.success("Oficio gerado do template");
      router.push(`/admin/oficios/${data.id}`);
    },
    onError: (err) => {
      setCreating(false);
      toast.error("Erro ao gerar: " + err.message);
    },
  });

  const gerarSonnetMutation = trpc.oficios.gerarComSonnet.useMutation({
    onSuccess: (data) => {
      setIaGenerating(false);
      toast.success("Oficio gerado com IA!", {
        description: `${data.tokensEntrada + data.tokensSaida} tokens · $${data.custoEstimado?.toFixed(4) || "0"}`,
      });
      router.push(`/admin/oficios/${data.id}`);
    },
    onError: (err) => {
      setIaGenerating(false);
      toast.error("Erro ao gerar com IA: " + err.message);
    },
  });

  // ========================================
  // TEMPLATE FLOW HANDLERS
  // ========================================
  const handleSelectTemplate = (tmpl: {
    id: number;
    titulo: string;
    conteudo: string;
    formatacao: unknown;
  }) => {
    if (tmpl.id === 0) {
      setSelectedModeloId(null);
      setStep("config");
    } else {
      setSelectedModeloId(tmpl.id);
      const fmt = tmpl.formatacao as Record<string, unknown> | null;
      if (fmt?.tipoOficio) setTipoOficio(fmt.tipoOficio as string);
      if (fmt?.destinatarioPadrao) setDestinatario(fmt.destinatarioPadrao as string);
      setTitulo(tmpl.titulo);
      setStep("config");
    }
  };

  const handleCreate = () => {
    if (!titulo.trim()) {
      toast.error("Titulo obrigatorio");
      return;
    }
    setCreating(true);

    if (selectedModeloId) {
      gerarMutation.mutate({
        modeloId: selectedModeloId,
        assistidoId,
        processoId,
        demandaId: preDemandaId,
        titulo,
      });
    } else {
      createMutation.mutate({
        titulo,
        conteudoFinal: "",
        tipoOficio,
        destinatario,
        urgencia,
        assistidoId,
        processoId,
        demandaId: preDemandaId,
      });
    }
  };

  // ========================================
  // IA FLOW HANDLERS
  // ========================================
  const handleGenerateIA = () => {
    if (iaIdeia.trim().length < 10) {
      toast.error("Descreva a ideia com pelo menos 10 caracteres");
      return;
    }
    setIaGenerating(true);
    gerarSonnetMutation.mutate({
      tipoOficio: iaTipo,
      ideia: iaIdeia,
      destinatario: iaDestinatario || undefined,
      urgencia: iaUrgencia,
      assistidoId,
      processoId,
      demandaId: preDemandaId,
      contextDriveFileIds: selectedDriveFileIds,
      contextDocumentoIds: selectedDocumentoIds,
    });
  };

  const iaTipoLabel = TIPOS_OFICIO.find((t) => t.value === iaTipo)?.label || iaTipo;

  // ========================================
  // SHARED ASSISTIDO/PROCESSO PICKER
  // ========================================
  const AssistidoProcessoPicker = () => (
    <>
      {/* Assistido */}
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Assistido (opcional)</label>
        <Popover open={showAssistido} onOpenChange={setShowAssistido}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-start bg-muted/50 border-border text-foreground font-normal"
            >
              <User className="w-4 h-4 mr-2 text-muted-foreground" />
              {assistidoNome || "Selecionar assistido..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0 bg-popover border-border">
            <Command>
              <CommandInput
                placeholder="Buscar por nome ou CPF..."
                value={assistidoSearch}
                onValueChange={setAssistidoSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {assistidoSearch.length < 2 ? "Digite pelo menos 2 caracteres" : "Nenhum assistido encontrado"}
                </CommandEmpty>
                {assistidosData && assistidosData.length > 0 && (
                  <CommandGroup>
                    {assistidosData.map((a) => (
                      <CommandItem
                        key={a.id}
                        value={`${a.nome} ${a.cpf || ""}`}
                        onSelect={() => {
                          setAssistidoId(a.id);
                          setAssistidoNome(a.nome);
                          setShowAssistido(false);
                          setProcessoId(undefined);
                          setProcessoNumero("");
                        }}
                      >
                        <User className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                        <span className="text-foreground">{a.nome}</span>
                        {a.cpf && (
                          <span className="ml-2 text-xs text-muted-foreground font-mono">{a.cpf}</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {assistidoId && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground mt-1"
            onClick={() => {
              setAssistidoId(undefined);
              setAssistidoNome("");
              setProcessoId(undefined);
              setProcessoNumero("");
              setSelectedDriveFileIds([]);
              setSelectedDocumentoIds([]);
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Processo */}
      {assistidoId && (
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">Processo (opcional)</label>
          {processosData && processosData.length > 0 ? (
            <Select
              value={processoId ? String(processoId) : ""}
              onValueChange={(v) => {
                const pid = Number(v);
                setProcessoId(pid);
                const proc = processosData.find((p) => p.id === pid);
                setProcessoNumero(proc?.numeroAutos || "");
              }}
            >
              <SelectTrigger className="bg-muted/50 border-border text-foreground">
                <SelectValue placeholder="Selecionar processo..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {processosData.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    <span className="font-mono text-xs">{p.numeroAutos}</span>
                    {p.vara && <span className="text-muted-foreground ml-2">{p.vara}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground/60">
              Nenhum processo vinculado a este assistido
            </p>
          )}
        </div>
      )}
    </>
  );

  // ========================================
  // BACK BUTTON HANDLER
  // ========================================
  const handleBack = () => {
    if (activeTab === "ia") {
      if (iaStep > 1) {
        setIaStep((iaStep - 1) as 1 | 2);
      } else {
        router.push("/admin/oficios");
      }
    } else {
      if (step === "config") {
        setStep("template");
      } else {
        router.push("/admin/oficios");
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      <CollapsiblePageHeader title="Novo Ofício" icon={Mail}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleBack}
              className="h-8 px-3 rounded-xl bg-white/[0.08] text-white/80 ring-1 ring-white/[0.05] hover:bg-white/[0.14] hover:text-white transition-all duration-150 cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-[#525252] flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white text-[15px] font-semibold tracking-tight leading-tight">Novo Ofício</h1>
              <p className="text-[10px] text-white/55 hidden sm:block">
                {activeTab === "ia"
                  ? `Passo ${iaStep} de 3 — Gerar com IA`
                  : step === "template"
                    ? "Escolha um template ou comece em branco"
                    : "Configure o ofício"}
              </p>
            </div>
          </div>
        </div>
      </CollapsiblePageHeader>

      <div className="px-5 md:px-8 py-3 md:py-4 max-w-2xl mx-auto space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-muted/40 rounded-xl border border-border/40">
        <button
          onClick={() => setActiveTab("template")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-medium transition-all
            ${activeTab === "template"
              ? "bg-muted text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Template
        </button>
        <button
          onClick={() => setActiveTab("ia")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-medium transition-all
            ${activeTab === "ia"
              ? "bg-violet-500/15 text-violet-600 dark:text-violet-300 shadow-sm border border-violet-500/20"
              : "text-muted-foreground hover:text-violet-600 dark:hover:text-violet-300 hover:bg-violet-500/5"
            }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Gerar com IA
        </button>
      </div>

      {/* ========================================
          TEMPLATE TAB
          ======================================== */}
      {activeTab === "template" && (
        <>
          {/* Step 1: Template Selection */}
          {step === "template" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar template..."
                  value={searchTemplate}
                  onChange={(e) => setSearchTemplate(e.target.value)}
                  className="pl-9 bg-muted/50 border-border text-foreground"
                />
              </div>

              <button
                onClick={() => handleSelectTemplate({ id: 0, titulo: "", conteudo: "", formatacao: null })}
                className="w-full text-left p-4 rounded-xl border border-dashed border-border/60
                  hover:border-emerald-500/40 bg-muted/20 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  <div className="flex-1">
                    <span className="font-medium text-foreground">Criar em branco</span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Comece do zero ou use IA para gerar o corpo
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-emerald-400 transition-colors" />
                </div>
              </button>

              {templatesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : templates && templates.length > 0 ? (
                <div className="space-y-2">
                  {templates.map((tmpl) => {
                    const fmt = tmpl.formatacao as Record<string, unknown> | null;
                    const tipo = (fmt?.tipoOficio as string) || "";
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => handleSelectTemplate(tmpl)}
                        className="w-full text-left p-3 rounded-xl border border-border/40 bg-muted/20
                          hover:bg-muted/60 hover:border-emerald-500/30 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-foreground truncate">{tmpl.titulo}</span>
                            </div>
                            {tmpl.descricao && (
                              <p className="text-xs text-muted-foreground line-clamp-2 ml-6">{tmpl.descricao}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 ml-6">
                              {tipo && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                                  {tipo}
                                </Badge>
                              )}
                              {tmpl.area && (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                                  {tmpl.area}
                                </Badge>
                              )}
                              {tmpl.totalUsos && tmpl.totalUsos > 0 && (
                                <span className="text-[10px] text-muted-foreground/60">{tmpl.totalUsos}x usado</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-emerald-400 shrink-0 mt-1 transition-colors" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="text-muted-foreground text-sm">
                    {searchTemplate ? "Nenhum template encontrado" : "Nenhum template cadastrado"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === "config" && (
            <div className="space-y-4">
              {preDemandaId && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <Mail className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-300">
                    Vinculado a demanda #{preDemandaId}
                    {preTipo && (
                      <span className="ml-1.5 text-emerald-400/70">
                        &middot; Tipo sugerido: {TIPOS_OFICIO.find(t => t.value === preTipo)?.label || preTipo}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {selectedModeloId && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <FileText className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-violet-600 dark:text-violet-300">
                    Usando template: {titulo}
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Titulo do oficio *</label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                  placeholder="Ex: Oficio de Requisicao de Prontuario"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Tipo</label>
                  <Select value={tipoOficio} onValueChange={setTipoOficio}>
                    <SelectTrigger className="bg-muted/50 border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {TIPOS_OFICIO.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Urgencia</label>
                  <Select value={urgencia} onValueChange={(v) => setUrgencia(v as typeof urgencia)}>
                    <SelectTrigger className="bg-muted/50 border-border text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="urgentissimo">Urgentissimo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Destinatario</label>
                <Input
                  value={destinatario}
                  onChange={(e) => setDestinatario(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                  placeholder="Ex: MM. Juiz da 1a Vara Criminal de Camacari"
                />
              </div>

              <AssistidoProcessoPicker />

              <div className="pt-4 border-t border-border">
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                  disabled={!titulo.trim() || creating}
                  onClick={handleCreate}
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4 mr-2" />
                  )}
                  {selectedModeloId ? "Gerar do template" : "Criar oficio"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================
          IA TAB — 3-Step Wizard
          ======================================== */}
      {activeTab === "ia" && (
        <>
          {/* IA Step 1: Tipo + Ideia */}
          {iaStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Wand2 className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-violet-600 dark:text-violet-300">
                  Claude Sonnet vai gerar o oficio completo a partir da sua ideia
                </span>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Tipo de oficio *</label>
                <Select value={iaTipo} onValueChange={setIaTipo}>
                  <SelectTrigger className="bg-muted/50 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {TIPOS_OFICIO.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Destinatario (opcional)</label>
                <Input
                  value={iaDestinatario}
                  onChange={(e) => setIaDestinatario(e.target.value)}
                  className="bg-muted/50 border-border text-foreground"
                  placeholder="Ex: MM. Juiz da 1a Vara Criminal de Camacari"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Urgencia</label>
                <Select value={iaUrgencia} onValueChange={(v) => setIaUrgencia(v as typeof iaUrgencia)}>
                  <SelectTrigger className="bg-muted/50 border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="urgentissimo">Urgentissimo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Descreva sua ideia *</label>
                <Textarea
                  value={iaIdeia}
                  onChange={(e) => setIaIdeia(e.target.value)}
                  className="bg-muted/50 border-border text-foreground min-h-[120px] resize-none"
                  placeholder="Ex: Preciso requisitar prontuario medico do Hospital Geral de Camacari para instruir os autos do processo. O assistido foi atendido no dia 15/01/2026 e o prontuario e essencial para a defesa..."
                />
                <span className="text-[10px] text-muted-foreground/60 mt-1 block">
                  {iaIdeia.length} caracteres {iaIdeia.length < 10 && iaIdeia.length > 0 && "(minimo 10)"}
                </span>
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white"
                  disabled={iaIdeia.trim().length < 10}
                  onClick={() => setIaStep(2)}
                >
                  Proximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* IA Step 2: Assistido/Processo + Documentos */}
          {iaStep === 2 && (
            <div className="space-y-4">
              <AssistidoProcessoPicker />

              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">
                  Documentos como contexto
                </label>
                <DocumentContextPicker
                  assistidoId={assistidoId}
                  processoId={processoId}
                  selectedDriveFileIds={selectedDriveFileIds}
                  selectedDocumentoIds={selectedDocumentoIds}
                  onDriveFileIdsChange={setSelectedDriveFileIds}
                  onDocumentoIdsChange={setSelectedDocumentoIds}
                />
              </div>

              <div className="pt-4 border-t border-border flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-foreground"
                  onClick={() => setIaStep(1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
                  onClick={() => setIaStep(3)}
                >
                  Proximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* IA Step 3: Confirmar + Gerar */}
          {iaStep === 3 && !iaGenerating && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Resumo da geracao</h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="ml-1.5 text-foreground">{iaTipoLabel}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Urgencia:</span>
                    <span className="ml-1.5 text-foreground capitalize">{iaUrgencia}</span>
                  </div>
                  {iaDestinatario && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Destinatario:</span>
                      <span className="ml-1.5 text-foreground">{iaDestinatario}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ideia</span>
                  <p className="text-xs text-foreground/80 mt-1 leading-relaxed">&ldquo;{iaIdeia}&rdquo;</p>
                </div>

                {assistidoNome && (
                  <div className="pt-2 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground">Assistido:</span>
                    <span className="ml-1.5 text-foreground">{assistidoNome}</span>
                    {processoNumero && (
                      <>
                        <span className="text-muted-foreground/60 mx-1.5">&middot;</span>
                        <span className="text-muted-foreground font-mono">{processoNumero}</span>
                      </>
                    )}
                  </div>
                )}

                {(selectedDocumentoIds.length > 0 || selectedDriveFileIds.length > 0) && (
                  <div className="pt-2 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground">Contexto:</span>
                    <span className="ml-1.5 text-foreground">
                      {selectedDocumentoIds.length + selectedDriveFileIds.length} documento
                      {selectedDocumentoIds.length + selectedDriveFileIds.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-border text-foreground"
                  onClick={() => setIaStep(2)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-violet-600 hover:bg-violet-500 text-white gap-2"
                  onClick={handleGenerateIA}
                >
                  <Sparkles className="w-4 h-4" />
                  Gerar Oficio com IA
                </Button>
              </div>

              <p className="text-center text-[10px] text-muted-foreground/60">
                Claude Sonnet &middot; Tempo estimado: 15-30 segundos
              </p>
            </div>
          )}

          {/* IA Loading State */}
          {iaGenerating && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-8 text-center space-y-4">
              <div className="relative">
                <Sparkles className="w-10 h-10 mx-auto text-violet-400 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-violet-600 dark:text-violet-300">
                  Gerando oficio com Claude Sonnet...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Extraindo documentos, preparando contexto e gerando o corpo completo
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-violet-500 h-full rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
