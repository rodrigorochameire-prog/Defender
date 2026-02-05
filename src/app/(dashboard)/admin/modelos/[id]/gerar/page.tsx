"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileStack,
  ArrowLeft,
  Save,
  Eye,
  Sparkles,
  FileText,
  Building2,
  Briefcase,
  Mail,
  Scale,
  User,
  Loader2,
  Check,
  Copy,
  Download,
  ExternalLink,
  Wand2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Componentes estruturais
import { Breadcrumbs } from "@/components/shared/breadcrumbs";

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

interface VariavelModelo {
  nome: string;
  label: string;
  tipo: "texto" | "numero" | "data" | "texto_longo" | "selecao";
  obrigatoria: boolean;
  origem: "manual" | "assistido" | "processo" | "sistema";
  opcoes?: string[];
  valorPadrao?: string;
}

// ==========================================
// CONSTANTES
// ==========================================

const CATEGORIA_CONFIG: Record<ModeloCategoria, {
  label: string;
  icon: typeof FileText;
  color: string;
}> = {
  PROVIDENCIA_ADMINISTRATIVA: {
    label: "Providência Administrativa",
    icon: Building2,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  PROVIDENCIA_FUNCIONAL: {
    label: "Providência Funcional",
    icon: Briefcase,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  PROVIDENCIA_INSTITUCIONAL: {
    label: "Providência Institucional",
    icon: Building2,
    color: "text-violet-600 bg-violet-50 border-violet-200",
  },
  PECA_PROCESSUAL: {
    label: "Peça Processual",
    icon: Scale,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  COMUNICACAO: {
    label: "Comunicação",
    icon: Mail,
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  OUTRO: {
    label: "Outro",
    icon: FileText,
    color: "text-zinc-600 bg-zinc-50 border-zinc-200",
  },
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function GerarDocumentoPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const modeloId = parseInt(params.id);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [assistidoId, setAssistidoId] = useState<number | null>(null);
  const [processoId, setProcessoId] = useState<number | null>(null);
  const [tituloDocumento, setTituloDocumento] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [generatedDocUrl, setGeneratedDocUrl] = useState<string | null>(null);
  const [generatedDocId, setGeneratedDocId] = useState<number | null>(null);

  // Query do modelo
  const { data: modelo, isLoading } = trpc.modelos.getById.useQuery(
    { id: modeloId },
    { enabled: !isNaN(modeloId) }
  );

  // Query de assistidos para autocomplete
  const { data: assistidos } = trpc.assistidos.list.useQuery({
    limit: 100,
  });

  // Query de processos para autocomplete
  const { data: processos } = trpc.processos.list.useQuery({
    limit: 100,
  });

  // Mutation para auto-preencher variáveis
  const autoPreencherMutation = trpc.modelos.autoPreencherVariaveis.useMutation({
    onSuccess: (data) => {
      setValores((prev) => ({ ...prev, ...data }));
      toast.success("Variáveis preenchidas automaticamente!");
    },
    onError: (error) => {
      toast.error(`Erro ao preencher: ${error.message}`);
    },
  });

  // Mutation para gerar documento
  const gerarMutation = trpc.modelos.gerarDocumento.useMutation({
    onSuccess: (data) => {
      setGeneratedDocId(data.id);
      setGeneratedDocUrl(data.googleDocUrl || null);
      setShowSuccessDialog(true);
      toast.success("Documento gerado com sucesso!");
    },
    onError: (error) => {
      toast.error(`Erro ao gerar documento: ${error.message}`);
    },
  });

  // Extrair variáveis do modelo
  const variaveis = useMemo(() => {
    if (!modelo?.variaveis) return [];
    return modelo.variaveis as VariavelModelo[];
  }, [modelo]);

  // Extrair variáveis do conteúdo que não estão na lista
  const variaveisNoConteudo = useMemo(() => {
    if (!modelo?.conteudo) return [];
    const regex = /\{\{(\w+)\}\}/g;
    const matches = modelo.conteudo.matchAll(regex);
    const found = new Set<string>();
    for (const match of matches) {
      found.add(match[1]);
    }
    return Array.from(found);
  }, [modelo]);

  // Inicializar valores
  useEffect(() => {
    if (modelo) {
      setTituloDocumento(`${modelo.titulo} - ${new Date().toLocaleDateString("pt-BR")}`);

      // Inicializar valores padrão
      const inicial: Record<string, string> = {};
      variaveis.forEach((v) => {
        if (v.valorPadrao) {
          inicial[v.nome] = v.valorPadrao;
        }
      });
      setValores(inicial);
    }
  }, [modelo, variaveis]);

  // Auto-preencher quando assistido ou processo mudar
  const handleAutoPreencher = () => {
    if (!assistidoId && !processoId) {
      toast.error("Selecione um assistido ou processo");
      return;
    }
    autoPreencherMutation.mutate({
      assistidoId: assistidoId || undefined,
      processoId: processoId || undefined,
    });
  };

  // Atualizar valor de variável
  const updateValor = (nome: string, value: string) => {
    setValores((prev) => ({ ...prev, [nome]: value }));
  };

  // Gerar preview do documento
  const previewContent = useMemo(() => {
    if (!modelo?.conteudo) return "";
    let content = modelo.conteudo;

    // Substituir variáveis pelos valores
    Object.entries(valores).forEach(([nome, valor]) => {
      const regex = new RegExp(`\\{\\{${nome}\\}\\}`, "g");
      content = content.replace(regex, valor || `[${nome}]`);
    });

    // Marcar variáveis não preenchidas
    content = content.replace(/\{\{(\w+)\}\}/g, (_, varName) => `[${varName}]`);

    return content;
  }, [modelo, valores]);

  // Verificar se todas as variáveis obrigatórias foram preenchidas
  const variaveisObrigatoriasPendentes = useMemo(() => {
    return variaveis.filter((v) => v.obrigatoria && !valores[v.nome]);
  }, [variaveis, valores]);

  // Gerar documento
  const handleGerar = () => {
    if (!tituloDocumento.trim()) {
      toast.error("Título do documento é obrigatório");
      return;
    }

    if (variaveisObrigatoriasPendentes.length > 0) {
      toast.error(`Preencha todas as variáveis obrigatórias: ${variaveisObrigatoriasPendentes.map(v => v.label).join(", ")}`);
      return;
    }

    gerarMutation.mutate({
      modeloId,
      titulo: tituloDocumento,
      valoresVariaveis: valores,
      assistidoId: assistidoId || undefined,
      processoId: processoId || undefined,
      exportarGoogleDocs: true,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-20 rounded-xl" />
          <div className="grid grid-cols-2 gap-6">
            <Skeleton className="h-96 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!modelo) {
    return (
      <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <FileStack className="w-16 h-16 mx-auto text-zinc-300 mb-4" />
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Modelo não encontrado
          </h2>
          <Link href="/admin/modelos">
            <Button className="mt-4">Voltar para Modelos</Button>
          </Link>
        </div>
      </div>
    );
  }

  const config = CATEGORIA_CONFIG[modelo.categoria as ModeloCategoria] || CATEGORIA_CONFIG.OUTRO;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-6 py-4">
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/admin" },
              { label: "Modelos", href: "/admin/modelos" },
              { label: modelo.titulo, href: `/admin/modelos/${modeloId}` },
              { label: "Gerar Documento" },
            ]}
          />

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/admin/modelos/${modeloId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className={cn("p-2.5 rounded-xl border", config.color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Gerar Documento
                </h1>
                <p className="text-sm text-zinc-500">
                  {modelo.titulo}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "Editar" : "Preview"}
              </Button>
              <Button
                onClick={handleGerar}
                disabled={gerarMutation.isPending}
                className="gap-2"
              >
                {gerarMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {gerarMutation.isPending ? "Gerando..." : "Gerar Documento"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Variáveis */}
          <div className="space-y-6">
            {/* Título do Documento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Título do Documento</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={tituloDocumento}
                  onChange={(e) => setTituloDocumento(e.target.value)}
                  placeholder="Digite o título do documento"
                />
              </CardContent>
            </Card>

            {/* Seleção de Assistido/Processo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Vincular a Assistido/Processo
                </CardTitle>
                <CardDescription>
                  Selecione para preencher automaticamente as variáveis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Assistido</Label>
                    <Select
                      value={assistidoId?.toString() || ""}
                      onValueChange={(v) => setAssistidoId(v ? parseInt(v) : null)}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecionar assistido" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {assistidos?.map((a) => (
                          <SelectItem key={a.id} value={a.id.toString()}>
                            {a.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Processo</Label>
                    <Select
                      value={processoId?.toString() || ""}
                      onValueChange={(v) => setProcessoId(v ? parseInt(v) : null)}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecionar processo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {processos?.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.numeroAutos} - {p.assistido.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleAutoPreencher}
                  disabled={(!assistidoId && !processoId) || autoPreencherMutation.isPending}
                  className="w-full gap-2"
                >
                  {autoPreencherMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  Preencher Automaticamente
                </Button>
              </CardContent>
            </Card>

            {/* Variáveis */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Variáveis</span>
                  {variaveisObrigatoriasPendentes.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {variaveisObrigatoriasPendentes.length} pendente(s)
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Preencha as variáveis para gerar o documento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {variaveisNoConteudo.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    <p className="text-sm">Nenhuma variável no modelo</p>
                  </div>
                ) : (
                  variaveisNoConteudo.map((varName) => {
                    const varConfig = variaveis.find((v) => v.nome === varName);
                    const label = varConfig?.label || varName.replace(/_/g, " ");
                    const tipo = varConfig?.tipo || "texto";
                    const obrigatoria = varConfig?.obrigatoria || false;

                    return (
                      <div key={varName}>
                        <Label className={cn("text-xs", obrigatoria && "flex items-center gap-1")}>
                          {label}
                          {obrigatoria && <span className="text-red-500">*</span>}
                        </Label>
                        {tipo === "texto_longo" ? (
                          <Textarea
                            value={valores[varName] || ""}
                            onChange={(e) => updateValor(varName, e.target.value)}
                            placeholder={`Digite ${label.toLowerCase()}`}
                            rows={3}
                            className="mt-1.5"
                          />
                        ) : tipo === "data" ? (
                          <Input
                            type="date"
                            value={valores[varName] || ""}
                            onChange={(e) => updateValor(varName, e.target.value)}
                            className="mt-1.5"
                          />
                        ) : tipo === "numero" ? (
                          <Input
                            type="number"
                            value={valores[varName] || ""}
                            onChange={(e) => updateValor(varName, e.target.value)}
                            placeholder={`Digite ${label.toLowerCase()}`}
                            className="mt-1.5"
                          />
                        ) : (
                          <Input
                            value={valores[varName] || ""}
                            onChange={(e) => updateValor(varName, e.target.value)}
                            placeholder={`Digite ${label.toLowerCase()}`}
                            className="mt-1.5"
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-6 h-fit">
            <Card className="h-full">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Preview do Documento</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(previewContent);
                    toast.success("Conteúdo copiado!");
                  }}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="prose prose-zinc dark:prose-invert max-w-none p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg min-h-[500px] max-h-[600px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {previewContent.split(/(\[[^\]]+\])/).map((part, i) => {
                      if (part.match(/^\[[^\]]+\]$/)) {
                        return (
                          <span
                            key={i}
                            className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded"
                          >
                            {part}
                          </span>
                        );
                      }
                      return <span key={i}>{part}</span>;
                    })}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de Sucesso */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <Check className="w-5 h-5" />
              Documento Gerado!
            </DialogTitle>
            <DialogDescription>
              Seu documento foi gerado com sucesso e está pronto para uso.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                {tituloDocumento}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                Gerado a partir de: {modelo.titulo}
              </p>
            </div>

            {generatedDocUrl && (
              <a
                href={generatedDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-600">Abrir no Google Docs</span>
              </a>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false);
                router.push("/admin/modelos");
              }}
            >
              Voltar para Modelos
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                // Reset para gerar outro
                setValores({});
                setAssistidoId(null);
                setProcessoId(null);
                setTituloDocumento(`${modelo.titulo} - ${new Date().toLocaleDateString("pt-BR")}`);
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Gerar Outro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
