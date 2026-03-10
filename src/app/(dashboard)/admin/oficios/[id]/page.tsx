"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  FileText,
  ExternalLink,
  Download,
  Sparkles,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Loader2,
  Wand2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface ReviewResult {
  score: number;
  sugestoes: Array<{ tipo: string; descricao: string; trecho?: string; sugestao?: string }>;
  tomAdequado: boolean;
  formalidadeOk: boolean;
  dadosCorretos: boolean;
  conteudoRevisado: string | null;
  modelo: string;
}

export default function OficioEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tipoOficio, setTipoOficio] = useState("comunicacao");
  const [destinatario, setDestinatario] = useState("");
  const [urgencia, setUrgencia] = useState<"normal" | "urgente" | "urgentissimo">("normal");
  const [status, setStatus] = useState("rascunho");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // IA states
  const [generating, setGenerating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [improving, setImproving] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [instrucaoGerar, setInstrucaoGerar] = useState("");
  const [showGerarInput, setShowGerarInput] = useState(false);
  const [instrucaoMelhorar, setInstrucaoMelhorar] = useState("");
  const [showMelhorarInput, setShowMelhorarInput] = useState(false);

  // Export states
  const [exportingGDocs, setExportingGDocs] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Fetch oficio data
  const { data: oficio, isLoading, refetch } = trpc.oficios.getById.useQuery(
    { id },
    { enabled: !!id && id > 0 }
  );

  const updateMutation = trpc.oficios.update.useMutation({
    onSuccess: () => {
      setSaving(false);
      setDirty(false);
      toast.success("Oficio salvo");
    },
    onError: (err) => {
      setSaving(false);
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const gerarMutation = trpc.oficios.gerarComIA.useMutation({
    onSuccess: (data) => {
      setConteudo(data.conteudo);
      setDirty(true);
      setGenerating(false);
      setShowGerarInput(false);
      setInstrucaoGerar("");
      toast.success(`Corpo gerado com ${data.modelo} (${data.tokensEntrada + data.tokensSaida} tokens)`);
      refetch();
    },
    onError: (err) => {
      setGenerating(false);
      toast.error("Erro ao gerar: " + err.message);
    },
  });

  const revisarMutation = trpc.oficios.revisarComIA.useMutation({
    onSuccess: (data) => {
      setReviewResult(data);
      setShowReview(true);
      setReviewing(false);
      toast.success(`Revisao concluida — Score: ${data.score}/100`);
    },
    onError: (err) => {
      setReviewing(false);
      toast.error("Erro ao revisar: " + err.message);
    },
  });

  const melhorarMutation = trpc.oficios.melhorarComIA.useMutation({
    onSuccess: (data) => {
      setConteudo(data.conteudo);
      setDirty(true);
      setImproving(false);
      setShowMelhorarInput(false);
      setInstrucaoMelhorar("");
      toast.success(`Texto melhorado com ${data.modelo}`);
      refetch();
    },
    onError: (err) => {
      setImproving(false);
      toast.error("Erro ao melhorar: " + err.message);
    },
  });

  const exportGDocsMutation = trpc.oficios.exportarGoogleDocs.useMutation({
    onSuccess: (data) => {
      setExportingGDocs(false);
      refetch();
      if (data.updated) {
        toast.success("Google Doc atualizado com sucesso");
      } else {
        toast.success("Google Doc criado com sucesso");
      }
      window.open(data.googleDocUrl, "_blank");
    },
    onError: (err) => {
      setExportingGDocs(false);
      toast.error("Erro ao exportar: " + err.message);
    },
  });

  const exportPDFMutation = trpc.oficios.exportarPDF.useMutation({
    onSuccess: (data) => {
      setExportingPDF(false);
      // Decodificar base64 e criar blob para download
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`PDF baixado (${(data.size / 1024).toFixed(0)} KB)`);
    },
    onError: (err) => {
      setExportingPDF(false);
      toast.error("Erro ao gerar PDF: " + err.message);
    },
  });

  // Load data into form
  useEffect(() => {
    if (oficio) {
      setTitulo(oficio.titulo);
      setConteudo(oficio.conteudoFinal);
      const meta = oficio.metadata as Record<string, string> | null;
      if (meta) {
        setTipoOficio(meta.tipoOficio || "comunicacao");
        setDestinatario(meta.destinatario || "");
        setUrgencia((meta.urgencia as "normal" | "urgente" | "urgentissimo") || "normal");
        setStatus(meta.status || "rascunho");
      }
    }
  }, [oficio]);

  const handleSave = () => {
    setSaving(true);
    updateMutation.mutate({
      id,
      titulo,
      conteudoFinal: conteudo,
      metadata: {
        tipoOficio,
        destinatario,
        urgencia,
        status: status as "rascunho" | "revisao" | "enviado" | "arquivado",
      },
    });
  };

  const handleContentChange = (value: string) => {
    setConteudo(value);
    setDirty(true);
  };

  const handleGerar = () => {
    if (!id) return;
    // Salvar antes de gerar se dirty
    if (dirty) {
      handleSave();
    }
    setGenerating(true);
    gerarMutation.mutate({
      oficioId: id,
      tipoOficio,
      templateBase: conteudo || "",
      instrucoes: instrucaoGerar,
    });
  };

  const handleRevisar = () => {
    if (!id) return;
    // Salvar antes de revisar se dirty
    if (dirty) {
      handleSave();
    }
    setReviewing(true);
    revisarMutation.mutate({
      oficioId: id,
    });
  };

  const handleMelhorar = () => {
    if (!id || !instrucaoMelhorar.trim()) return;
    if (dirty) {
      handleSave();
    }
    setImproving(true);
    melhorarMutation.mutate({
      oficioId: id,
      instrucao: instrucaoMelhorar,
    });
  };

  const handleAplicarRevisao = () => {
    if (reviewResult?.conteudoRevisado) {
      setConteudo(reviewResult.conteudoRevisado);
      setDirty(true);
      toast.success("Versao revisada aplicada");
    }
  };

  const handleExportGDocs = () => {
    if (!id) return;
    // Salvar antes de exportar se dirty
    if (dirty) {
      handleSave();
    }
    setExportingGDocs(true);
    exportGDocsMutation.mutate({ id });
  };

  const handleExportPDF = () => {
    if (!id) return;
    // Salvar antes de exportar se dirty
    if (dirty) {
      handleSave();
    }
    setExportingPDF(true);
    exportPDFMutation.mutate({ id });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!oficio && id > 0) {
    return (
      <div className="text-center py-20">
        <FileText className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
        <p className="text-zinc-500">Oficio nao encontrado</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push("/admin/oficios")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const isIABusy = generating || reviewing || improving;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-100"
            onClick={() => router.push("/admin/oficios")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">
              {titulo || "Novo Oficio"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {oficio?.assistidoNome && (
                <span className="text-xs text-zinc-500">{oficio.assistidoNome}</span>
              )}
              {oficio?.processoNumero && (
                <span className="text-xs text-zinc-500 font-mono">
                  {oficio.processoNumero}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-500/20">
              Nao salvo
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300"
            disabled={!dirty || saving}
            onClick={handleSave}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            Salvar
          </Button>
          {oficio?.googleDocUrl && (
            <Button variant="ghost" size="sm" className="text-zinc-400" asChild>
              <a href={oficio.googleDocUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Google Doc
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Metadata Bar */}
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/50 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Titulo</label>
            <Input
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                setDirty(true);
              }}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 text-sm"
              placeholder="Titulo do oficio"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Tipo</label>
            <Select
              value={tipoOficio}
              onValueChange={(v) => {
                setTipoOficio(v);
                setDirty(true);
              }}
            >
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-300 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {TIPOS_OFICIO.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Destinatario</label>
            <Input
              value={destinatario}
              onChange={(e) => {
                setDestinatario(e.target.value);
                setDirty(true);
              }}
              className="bg-zinc-800/50 border-zinc-700 text-zinc-100 text-sm"
              placeholder="Ex: Juiz da 1a Vara Criminal"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Urgencia</label>
            <Select
              value={urgencia}
              onValueChange={(v) => {
                setUrgencia(v as typeof urgencia);
                setDirty(true);
              }}
            >
              <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-300 text-sm">
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
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-zinc-700/30 bg-zinc-900/50">
        {/* Toolbar */}
        <div className="flex items-center gap-1 p-2 border-b border-zinc-800">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setDirty(true);
            }}
          >
            <SelectTrigger className="w-[130px] h-7 bg-zinc-800/50 border-zinc-700 text-zinc-400 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="revisao">Em Revisao</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="arquivado">Arquivado</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {/* Melhorar com IA */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-400 hover:text-amber-300"
            disabled={isIABusy || !conteudo.trim()}
            onClick={() => setShowMelhorarInput(!showMelhorarInput)}
          >
            {improving ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Wand2 className="w-3 h-3 mr-1" />
            )}
            Melhorar
          </Button>

          {/* Gerar corpo com IA */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-violet-400 hover:text-violet-300"
            disabled={isIABusy}
            onClick={() => setShowGerarInput(!showGerarInput)}
          >
            {generating ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 mr-1" />
            )}
            Gerar corpo
          </Button>

          {/* Revisar */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-blue-400 hover:text-blue-300"
            disabled={isIABusy || conteudo.trim().length < 50}
            onClick={handleRevisar}
          >
            {reviewing ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <MessageSquare className="w-3 h-3 mr-1" />
            )}
            Revisar
          </Button>
        </div>

        {/* Gerar Input */}
        {showGerarInput && (
          <div className="flex items-center gap-2 p-2 border-b border-zinc-800 bg-violet-500/5">
            <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
            <Input
              value={instrucaoGerar}
              onChange={(e) => setInstrucaoGerar(e.target.value)}
              placeholder="Instrucoes para gerar o corpo (ex: tom formal, mencionar artigo 121...)"
              className="flex-1 h-7 bg-zinc-800/50 border-zinc-700 text-zinc-200 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleGerar()}
            />
            <Button
              size="sm"
              className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white"
              disabled={generating}
              onClick={handleGerar}
            >
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : "Gerar"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500"
              onClick={() => { setShowGerarInput(false); setInstrucaoGerar(""); }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Melhorar Input */}
        {showMelhorarInput && (
          <div className="flex items-center gap-2 p-2 border-b border-zinc-800 bg-amber-500/5">
            <Wand2 className="w-4 h-4 text-amber-400 shrink-0" />
            <Input
              value={instrucaoMelhorar}
              onChange={(e) => setInstrucaoMelhorar(e.target.value)}
              placeholder="O que melhorar? (ex: mais formal, corrigir ortografia, simplificar)"
              className="flex-1 h-7 bg-zinc-800/50 border-zinc-700 text-zinc-200 text-xs"
              onKeyDown={(e) => e.key === "Enter" && instrucaoMelhorar.trim() && handleMelhorar()}
            />
            <Button
              size="sm"
              className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white"
              disabled={improving || !instrucaoMelhorar.trim()}
              onClick={handleMelhorar}
            >
              {improving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Aplicar"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500"
              onClick={() => { setShowMelhorarInput(false); setInstrucaoMelhorar(""); }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* IA Processing Indicator */}
        {isIABusy && (
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 border-b border-zinc-800">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
            <span className="text-xs text-zinc-400">
              {generating && "Gemini 2.5 Pro gerando corpo do oficio..."}
              {reviewing && "Claude Sonnet revisando oficio..."}
              {improving && "Claude Sonnet melhorando texto..."}
            </span>
          </div>
        )}

        {/* Content Area */}
        <Textarea
          value={conteudo}
          onChange={(e) => handleContentChange(e.target.value)}
          className="min-h-[500px] border-0 rounded-none bg-transparent text-zinc-200 text-sm
            font-mono leading-relaxed p-6 resize-y focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder={`DEFENSORIA PUBLICA DO ESTADO DA BAHIA
Nucleo Criminal de Camacari

OFICIO N. ___/2026

Camacari, __ de ________ de 2026.

Ao Excelentissimo Senhor...

[corpo do oficio]

Atenciosamente,

[Nome do Defensor]
Defensor(a) Publico(a)`}
          disabled={isIABusy}
        />
      </div>

      {/* Review Panel */}
      {reviewResult && (
        <div className="rounded-xl border border-blue-500/20 bg-zinc-900/50 overflow-hidden">
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full flex items-center justify-between p-3 hover:bg-zinc-800/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 text-sm font-medium ${
                reviewResult.score >= 80 ? "text-emerald-400" :
                reviewResult.score >= 60 ? "text-yellow-400" : "text-red-400"
              }`}>
                {reviewResult.score >= 80 ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : reviewResult.score >= 60 ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                Score: {reviewResult.score}/100
              </div>
              <div className="flex items-center gap-2">
                {reviewResult.tomAdequado && (
                  <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/20">
                    Tom OK
                  </Badge>
                )}
                {reviewResult.formalidadeOk && (
                  <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/20">
                    Formalidade OK
                  </Badge>
                )}
                {reviewResult.dadosCorretos && (
                  <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/20">
                    Dados OK
                  </Badge>
                )}
                {!reviewResult.tomAdequado && (
                  <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/20">
                    Tom inadequado
                  </Badge>
                )}
                {!reviewResult.formalidadeOk && (
                  <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/20">
                    Formalidade
                  </Badge>
                )}
                {!reviewResult.dadosCorretos && (
                  <Badge variant="outline" className="text-[9px] text-red-400 border-red-500/20">
                    Dados incorretos
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">{reviewResult.modelo}</span>
              {showReview ? (
                <ChevronUp className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </div>
          </button>

          {showReview && (
            <div className="border-t border-zinc-800 p-4 space-y-3">
              {reviewResult.sugestoes.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-2">
                    Sugestoes ({reviewResult.sugestoes.length})
                  </h4>
                  <div className="space-y-2">
                    {reviewResult.sugestoes.map((s, i) => (
                      <div
                        key={i}
                        className="flex gap-2 p-2 rounded-lg bg-zinc-800/30 border border-zinc-700/20"
                      >
                        <Badge variant="outline" className="text-[9px] text-zinc-400 border-zinc-600 shrink-0 mt-0.5">
                          {s.tipo}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300">{s.descricao}</p>
                          {s.trecho && (
                            <p className="text-[10px] text-zinc-600 mt-1 font-mono truncate">
                              {s.trecho}
                            </p>
                          )}
                          {s.sugestao && (
                            <p className="text-[10px] text-emerald-400/70 mt-0.5">
                              Sugestao: {s.sugestao}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviewResult.conteudoRevisado && (
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                  <Button
                    size="sm"
                    className="text-xs bg-blue-600 hover:bg-blue-500 text-white"
                    onClick={handleAplicarRevisao}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Aplicar versao revisada
                  </Button>
                  <span className="text-[10px] text-zinc-600">
                    Substitui o conteudo atual pela versao corrigida
                  </span>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-500"
                onClick={() => { setReviewResult(null); setShowReview(false); }}
              >
                <X className="w-3 h-3 mr-1" />
                Fechar revisao
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Export Bar */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-700/30 bg-zinc-900/50 p-3">
        <span className="text-xs text-zinc-500">
          {conteudo.length} caracteres
          {oficio?.createdAt && (
            <> | Criado em {new Date(oficio.createdAt).toLocaleDateString("pt-BR")}</>
          )}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-400 text-xs hover:text-zinc-200 hover:border-zinc-500 cursor-pointer"
            disabled={exportingPDF || !conteudo.trim()}
            onClick={handleExportPDF}
          >
            {exportingPDF ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <Download className="w-3 h-3 mr-1.5" />
            )}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-400 text-xs hover:text-zinc-200 hover:border-zinc-500 cursor-pointer"
            disabled={exportingGDocs || !conteudo.trim()}
            onClick={handleExportGDocs}
          >
            {exportingGDocs ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3 h-3 mr-1.5" />
            )}
            Google Docs
          </Button>
        </div>
      </div>
    </div>
  );
}
