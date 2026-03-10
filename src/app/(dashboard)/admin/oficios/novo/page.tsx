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
  Mail,
} from "lucide-react";
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

  const [step, setStep] = useState<"template" | "config">("template");
  const [searchTemplate, setSearchTemplate] = useState("");
  const [tipoOficio, setTipoOficio] = useState(preTipo || "comunicacao");
  const [titulo, setTitulo] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [urgencia, setUrgencia] = useState<"normal" | "urgente" | "urgentissimo">("normal");
  const [selectedModeloId, setSelectedModeloId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  // Assistido search
  const [assistidoSearch, setAssistidoSearch] = useState("");
  const [assistidoId, setAssistidoId] = useState<number | undefined>(preAssistidoId);
  const [assistidoNome, setAssistidoNome] = useState("");
  const [showAssistido, setShowAssistido] = useState(false);

  // Processo search
  const [processoId, setProcessoId] = useState<number | undefined>(preProcessoId);
  const [processoNumero, setProcessoNumero] = useState("");
  const [showProcesso, setShowProcesso] = useState(false);

  // Templates
  const { data: templates, isLoading: templatesLoading } = trpc.oficios.templates.useQuery(
    { search: searchTemplate || undefined },
    { enabled: step === "template" }
  );

  // Assistidos search
  const { data: assistidosData } = trpc.assistidos.list.useQuery(
    { search: assistidoSearch, limit: 10 },
    { enabled: assistidoSearch.length >= 2 }
  );

  // Assistido detail (for processos)
  const { data: assistidoDetail } = trpc.assistidos.getById.useQuery(
    { id: assistidoId! },
    { enabled: !!assistidoId }
  );
  const processosData = assistidoDetail?.processos;

  // Create mutation
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

  // Generate from template
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

  const handleSelectTemplate = (tmpl: {
    id: number;
    titulo: string;
    conteudo: string;
    formatacao: unknown;
  }) => {
    if (tmpl.id === 0) {
      // Em branco
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
      // Gerar a partir de template
      gerarMutation.mutate({
        modeloId: selectedModeloId,
        assistidoId,
        processoId,
        demandaId: preDemandaId,
        titulo,
      });
    } else {
      // Criar em branco
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-zinc-100"
          onClick={() => step === "config" ? setStep("template") : router.push("/admin/oficios")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Novo Oficio</h1>
          <p className="text-xs text-zinc-500">
            {step === "template" ? "Escolha um template ou comece em branco" : "Configure o oficio"}
          </p>
        </div>
      </div>

      {/* Step 1: Template Selection */}
      {step === "template" && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              placeholder="Buscar template..."
              value={searchTemplate}
              onChange={(e) => setSearchTemplate(e.target.value)}
              className="pl-9 bg-zinc-800/50 border-zinc-700 text-zinc-100"
            />
          </div>

          {/* Em branco */}
          <button
            onClick={() => handleSelectTemplate({ id: 0, titulo: "", conteudo: "", formatacao: null })}
            className="w-full text-left p-4 rounded-xl border border-dashed border-zinc-600
              hover:border-emerald-500/40 bg-zinc-800/20 hover:bg-zinc-800/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <div className="flex-1">
                <span className="font-medium text-zinc-200">Criar em branco</span>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Comece do zero ou use IA para gerar o corpo
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
            </div>
          </button>

          {/* Templates */}
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
                    className="w-full text-left p-3 rounded-xl border border-zinc-700/30 bg-zinc-800/30
                      hover:bg-zinc-800/70 hover:border-emerald-500/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span className="font-medium text-zinc-100 truncate">{tmpl.titulo}</span>
                        </div>
                        {tmpl.descricao && (
                          <p className="text-xs text-zinc-500 line-clamp-2 ml-6">{tmpl.descricao}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 ml-6">
                          {tipo && (
                            <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-600">
                              {tipo}
                            </Badge>
                          )}
                          {tmpl.area && (
                            <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-600">
                              {tmpl.area}
                            </Badge>
                          )}
                          {tmpl.totalUsos && tmpl.totalUsos > 0 && (
                            <span className="text-[10px] text-zinc-600">{tmpl.totalUsos}x usado</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 shrink-0 mt-1 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <p className="text-zinc-500 text-sm">
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
              <span className="text-xs text-emerald-300">
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
              <span className="text-xs text-violet-300">
                Usando template: {titulo}
              </span>
            </div>
          )}

          {/* Titulo */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Titulo do oficio *</label>
            <Input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              placeholder="Ex: Oficio de Requisicao de Prontuario"
            />
          </div>

          {/* Tipo + Urgencia */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Tipo</label>
              <Select value={tipoOficio} onValueChange={setTipoOficio}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {TIPOS_OFICIO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Urgencia</label>
              <Select value={urgencia} onValueChange={(v) => setUrgencia(v as typeof urgencia)}>
                <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="urgentissimo">Urgentissimo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Destinatario */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Destinatario</label>
            <Input
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100"
              placeholder="Ex: MM. Juiz da 1a Vara Criminal de Camacari"
            />
          </div>

          {/* Assistido */}
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block">Assistido (opcional)</label>
            <Popover open={showAssistido} onOpenChange={setShowAssistido}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-start bg-zinc-800/50 border-zinc-700 text-zinc-300 font-normal"
                >
                  <User className="w-4 h-4 mr-2 text-zinc-500" />
                  {assistidoNome || "Selecionar assistido..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0 bg-zinc-900 border-zinc-700">
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
                            <User className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                            <span className="text-zinc-200">{a.nome}</span>
                            {a.cpf && (
                              <span className="ml-2 text-xs text-zinc-500 font-mono">{a.cpf}</span>
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
                className="text-xs text-zinc-500 mt-1"
                onClick={() => {
                  setAssistidoId(undefined);
                  setAssistidoNome("");
                  setProcessoId(undefined);
                  setProcessoNumero("");
                }}
              >
                Limpar
              </Button>
            )}
          </div>

          {/* Processo (se tiver assistido) */}
          {assistidoId && (
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Processo (opcional)</label>
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
                  <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-300">
                    <SelectValue placeholder="Selecionar processo..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {processosData.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        <span className="font-mono text-xs">{p.numeroAutos}</span>
                        {p.vara && <span className="text-zinc-500 ml-2">{p.vara}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-zinc-600">
                  Nenhum processo vinculado a este assistido
                </p>
              )}
            </div>
          )}

          {/* Create Button */}
          <div className="pt-4 border-t border-zinc-800">
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
    </div>
  );
}
