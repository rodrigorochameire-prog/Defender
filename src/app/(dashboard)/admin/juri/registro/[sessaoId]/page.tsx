"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  FileCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Scale,
  Sparkles,
  Save,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================
type Step = 1 | 2 | 3;

type DocType = "quesitos" | "sentenca" | "ata";

interface UploadedDoc {
  id: number;
  tipo: DocType;
  fileName: string;
  url: string;
  status: "uploading" | "uploaded" | "processing" | "done" | "error";
  dadosExtraidos?: Record<string, unknown>;
  error?: string;
}

interface FormDataContexto {
  juizPresidente: string;
  promotor: string;
  duracaoMinutos: number | undefined;
  localFato: string;
  tipoPenal: string;
  tesePrincipal: string;
  reuPrimario: boolean;
  reuIdade: number | undefined;
  vitimaGenero: string;
  vitimaIdade: number | undefined;
  usouAlgemas: boolean;
  incidentesProcessuais: string;
}

interface FormDataDosimetria {
  penaBase: string;
  circunstanciasJudiciais: string;
  agravantes: string;
  atenuantes: string;
  causasAumento: string;
  causasDiminuicao: string;
  penaTotalMeses: number | undefined;
  regimeInicial: string;
  detracaoInicio: string;
  detracaoFim: string;
  detracaoDias: number | undefined;
  dataFato: string;
  fracaoProgressao: string;
  incisoAplicado: string;
  vedadoLivramento: boolean;
  resultouMorte: boolean;
  reuReincidente: boolean;
}

interface QuesitosResultado {
  quesitoId: number;
  numero: number;
  texto: string;
  tipo: string | null;
  resultado: "sim" | "nao" | "prejudicado" | "";
  ordemVotacao: number | undefined;
  fromAI: boolean;
}

// ============================================
// FIELD HELPER
// ============================================
function AIBadge() {
  return (
    <Badge className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 text-[9px] border-0 ml-1.5 gap-0.5">
      <Sparkles className="w-2.5 h-2.5" />
      AI
    </Badge>
  );
}

function FieldLabel({ children, ai }: { children: React.ReactNode; ai?: boolean }) {
  return (
    <Label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center">
      {children}
      {ai && <AIBadge />}
    </Label>
  );
}

// ============================================
// STEP INDICATOR
// ============================================
function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Revisar" },
    { num: 3, label: "Confirmar" },
  ];

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((s, i) => {
        const isActive = s.num === current;
        const isDone = s.num < current;
        return (
          <div key={s.num} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "w-8 sm:w-12 h-px mx-1",
                  isDone ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-700"
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  isActive
                    ? "bg-emerald-600 text-white"
                    : isDone
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                    : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                )}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:inline",
                  isActive
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-500 dark:text-neutral-400"
                )}
              >
                {s.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// DROPZONE CARD
// ============================================
function DropzoneCard({
  tipo,
  label,
  doc,
  onFileSelect,
}: {
  tipo: DocType;
  label: string;
  doc?: UploadedDoc;
  onFileSelect: (tipo: DocType, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(tipo, file);
    },
    [tipo, onFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(tipo, file);
    },
    [tipo, onFileSelect]
  );

  const statusIcon = () => {
    if (!doc) return <Upload className="w-6 h-6 text-neutral-400" />;
    switch (doc.status) {
      case "uploading":
      case "processing":
        return <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />;
      case "done":
        return <FileCheck className="w-6 h-6 text-emerald-500" />;
      case "error":
        return <AlertCircle className="w-6 h-6 text-rose-500" />;
      default:
        return <FileText className="w-6 h-6 text-neutral-400" />;
    }
  };

  const statusText = () => {
    if (!doc) return "Arrastar ou clicar para enviar";
    switch (doc.status) {
      case "uploading":
        return "Enviando...";
      case "uploaded":
        return "Enviado. Processando...";
      case "processing":
        return "Extraindo dados com IA...";
      case "done":
        return doc.fileName;
      case "error":
        return doc.error || "Erro no processamento";
      default:
        return doc.fileName;
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border-2 border-dashed p-6 text-center transition-all cursor-pointer",
        isDragOver
          ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20"
          : doc?.status === "done"
          ? "border-emerald-300 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/10"
          : doc?.status === "error"
          ? "border-rose-300 dark:border-rose-800/50 bg-rose-50/30 dark:bg-rose-950/10"
          : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !doc && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleChange}
        className="hidden"
      />
      <div className="flex flex-col items-center gap-2">
        {statusIcon()}
        <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{label}</p>
        <p className="text-[11px] text-neutral-500 truncate max-w-full">{statusText()}</p>
        {doc?.status === "done" && (
          <Badge className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[9px] border-0">
            Dados extraidos
          </Badge>
        )}
      </div>
    </div>
  );
}

// ============================================
// UPLOAD STEP (STEP 1)
// ============================================
function UploadStep({
  sessaoJuriId,
  docs,
  setDocs,
  onNext,
  existingDocs,
}: {
  sessaoJuriId: number;
  docs: UploadedDoc[];
  setDocs: React.Dispatch<React.SetStateAction<UploadedDoc[]>>;
  onNext: () => void;
  existingDocs: Array<{ id: number; tipo: string; fileName: string | null; url: string; statusProcessamento: string | null; dadosExtraidos: unknown }>;
}) {
  const uploadMutation = trpc.avaliacaoJuri.uploadDocumento.useMutation();
  const processarMutation = trpc.avaliacaoJuri.processarDocumento.useMutation();

  // Populate from existing docs on mount
  useEffect(() => {
    if (existingDocs.length > 0 && docs.length === 0) {
      const mapped: UploadedDoc[] = existingDocs.map((d) => ({
        id: d.id,
        tipo: d.tipo as DocType,
        fileName: d.fileName || "",
        url: d.url,
        status: d.statusProcessamento === "concluido" ? "done" as const : "uploaded" as const,
        dadosExtraidos: d.dadosExtraidos as Record<string, unknown> | undefined,
      }));
      setDocs(mapped);
    }
  }, [existingDocs, docs.length, setDocs]);

  const handleFileSelect = useCallback(
    async (tipo: DocType, file: File) => {
      // Add placeholder doc
      const tempId = -Date.now();
      const newDoc: UploadedDoc = {
        id: tempId,
        tipo,
        fileName: file.name,
        url: "",
        status: "uploading",
      };
      setDocs((prev) => [...prev.filter((d) => d.tipo !== tipo), newDoc]);

      try {
        // Step 1: Upload to storage
        const formData = new FormData();
        formData.append("file", file);
        formData.append("sessaoJuriId", String(sessaoJuriId));
        formData.append("tipo", tipo);

        const uploadRes = await fetch("/api/juri/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ error: "Falha no upload" }));
          throw new Error(err.error || "Falha no upload");
        }

        const { url, fileName } = await uploadRes.json();

        // Step 2: Register document in DB
        const dbDoc = await uploadMutation.mutateAsync({
          sessaoJuriId,
          tipo,
          fileUrl: url,
          fileName: fileName || file.name,
        });

        setDocs((prev) =>
          prev.map((d) =>
            d.id === tempId
              ? { ...d, id: dbDoc.id, url, fileName: fileName || file.name, status: "processing" }
              : d
          )
        );

        // Step 3: Process with AI
        const processed = await processarMutation.mutateAsync({ documentoId: dbDoc.id });

        setDocs((prev) =>
          prev.map((d) =>
            d.id === dbDoc.id
              ? {
                  ...d,
                  status: "done",
                  dadosExtraidos: processed.dadosExtraidos as Record<string, unknown> | undefined,
                }
              : d
          )
        );

        toast.success(`${label(tipo)} processado com sucesso`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Erro desconhecido";
        setDocs((prev) =>
          prev.map((d) =>
            d.id === tempId || d.tipo === tipo
              ? { ...d, status: "error", error: msg }
              : d
          )
        );
        toast.error(`Falha ao processar ${label(tipo)}: ${msg}`);
      }
    },
    [sessaoJuriId, uploadMutation, processarMutation, setDocs]
  );

  const getDocByTipo = (tipo: DocType) => docs.find((d) => d.tipo === tipo);
  const hasAnyProcessed = docs.some((d) => d.status === "done");
  const isAnyProcessing = docs.some((d) => d.status === "uploading" || d.status === "processing");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Upload de Documentos</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Envie documentos da sessao para extracaoo automatica de dados. Aceita PDF, JPG, PNG.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <DropzoneCard
          tipo="quesitos"
          label="Quesitos"
          doc={getDocByTipo("quesitos")}
          onFileSelect={handleFileSelect}
        />
        <DropzoneCard
          tipo="sentenca"
          label="Sentenca"
          doc={getDocByTipo("sentenca")}
          onFileSelect={handleFileSelect}
        />
        <DropzoneCard
          tipo="ata"
          label="Ata"
          doc={getDocByTipo("ata")}
          onFileSelect={handleFileSelect}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onNext}
          disabled={isAnyProcessing}
          className="text-sm"
        >
          Pular
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
        {hasAnyProcessed && (
          <Button
            onClick={onNext}
            disabled={isAnyProcessing}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
          >
            Proximo
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}

function label(tipo: DocType): string {
  const labels: Record<DocType, string> = {
    quesitos: "Quesitos",
    sentenca: "Sentenca",
    ata: "Ata",
  };
  return labels[tipo];
}

// ============================================
// REVIEW STEP (STEP 2)
// ============================================
function ReviewStep({
  contexto,
  setContexto,
  dosimetria,
  setDosimetria,
  quesitosData,
  setQuesitosData,
  aiFields,
  onNext,
  onBack,
}: {
  contexto: FormDataContexto;
  setContexto: React.Dispatch<React.SetStateAction<FormDataContexto>>;
  dosimetria: FormDataDosimetria;
  setDosimetria: React.Dispatch<React.SetStateAction<FormDataDosimetria>>;
  quesitosData: QuesitosResultado[];
  setQuesitosData: React.Dispatch<React.SetStateAction<QuesitosResultado[]>>;
  aiFields: Set<string>;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Revisar Dados</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Verifique e complete os dados extraidos. Campos com{" "}
          <AIBadge /> foram pre-preenchidos pela IA.
        </p>
      </div>

      <Tabs defaultValue="quesitos" className="w-full">
        <TabsList className="w-full bg-neutral-100 dark:bg-neutral-800 p-1 h-auto flex-wrap">
          <TabsTrigger value="quesitos" className="text-xs flex-1">Quesitos</TabsTrigger>
          <TabsTrigger value="dosimetria" className="text-xs flex-1">Dosimetria</TabsTrigger>
          <TabsTrigger value="contexto" className="text-xs flex-1">Contexto</TabsTrigger>
          <TabsTrigger value="perfil" className="text-xs flex-1">Perfil</TabsTrigger>
          <TabsTrigger value="detracao" className="text-xs flex-1">Detracao</TabsTrigger>
        </TabsList>

        {/* QUESITOS TAB */}
        <TabsContent value="quesitos">
          <Card className="border-neutral-100 dark:border-neutral-800">
            <CardContent className="pt-4 space-y-3">
              {quesitosData.length === 0 ? (
                <p className="text-sm text-neutral-500 py-4 text-center">
                  Nenhum quesito encontrado. Os quesitos serao carregados dos documentos processados ou do cadastro da sessao.
                </p>
              ) : (
                quesitosData.map((q, i) => (
                  <div
                    key={q.quesitoId || i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700"
                  >
                    <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-600 dark:text-neutral-400 shrink-0">
                      {q.numero}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm text-neutral-800 dark:text-neutral-200">{q.texto}</p>
                      {q.tipo && (
                        <Badge variant="outline" className="text-[9px]">
                          {q.tipo}
                        </Badge>
                      )}
                      <div className="flex items-center gap-2">
                        <Select
                          value={q.resultado}
                          onValueChange={(v) => {
                            setQuesitosData((prev) =>
                              prev.map((item, idx) =>
                                idx === i
                                  ? { ...item, resultado: v as "sim" | "nao" | "prejudicado" }
                                  : item
                              )
                            );
                          }}
                        >
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue placeholder="Resultado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sim">Sim</SelectItem>
                            <SelectItem value="nao">Nao</SelectItem>
                            <SelectItem value="prejudicado">Prejudicado</SelectItem>
                          </SelectContent>
                        </Select>
                        {q.fromAI && <AIBadge />}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOSIMETRIA TAB */}
        <TabsContent value="dosimetria">
          <Card className="border-neutral-100 dark:border-neutral-800">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("dosimetria.penaBase")}>Pena Base</FieldLabel>
                  <Input
                    value={dosimetria.penaBase}
                    onChange={(e) => setDosimetria((p) => ({ ...p, penaBase: e.target.value }))}
                    placeholder="Ex: 12 anos"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("dosimetria.penaTotalMeses")}>Pena Total (meses)</FieldLabel>
                  <Input
                    type="number"
                    value={dosimetria.penaTotalMeses ?? ""}
                    onChange={(e) =>
                      setDosimetria((p) => ({
                        ...p,
                        penaTotalMeses: e.target.value ? parseInt(e.target.value) : undefined,
                      }))
                    }
                    placeholder="Ex: 144"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel ai={aiFields.has("dosimetria.circunstanciasJudiciais")}>
                  Circunstancias Judiciais
                </FieldLabel>
                <Input
                  value={dosimetria.circunstanciasJudiciais}
                  onChange={(e) =>
                    setDosimetria((p) => ({ ...p, circunstanciasJudiciais: e.target.value }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("dosimetria.agravantes")}>Agravantes</FieldLabel>
                  <Input
                    value={dosimetria.agravantes}
                    onChange={(e) => setDosimetria((p) => ({ ...p, agravantes: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("dosimetria.atenuantes")}>Atenuantes</FieldLabel>
                  <Input
                    value={dosimetria.atenuantes}
                    onChange={(e) => setDosimetria((p) => ({ ...p, atenuantes: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("dosimetria.causasAumento")}>Causas de Aumento</FieldLabel>
                  <Input
                    value={dosimetria.causasAumento}
                    onChange={(e) => setDosimetria((p) => ({ ...p, causasAumento: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("dosimetria.causasDiminuicao")}>Causas de Diminuicao</FieldLabel>
                  <Input
                    value={dosimetria.causasDiminuicao}
                    onChange={(e) =>
                      setDosimetria((p) => ({ ...p, causasDiminuicao: e.target.value }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("dosimetria.regimeInicial")}>Regime Inicial</FieldLabel>
                  <Select
                    value={dosimetria.regimeInicial}
                    onValueChange={(v) => setDosimetria((p) => ({ ...p, regimeInicial: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fechado">Fechado</SelectItem>
                      <SelectItem value="semiaberto">Semiaberto</SelectItem>
                      <SelectItem value="aberto">Aberto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("dosimetria.fracaoProgressao")}>
                    Fracao de Progressao
                  </FieldLabel>
                  <Input
                    value={dosimetria.fracaoProgressao}
                    onChange={(e) =>
                      setDosimetria((p) => ({ ...p, fracaoProgressao: e.target.value }))
                    }
                    placeholder="Ex: 2/5"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel ai={aiFields.has("dosimetria.incisoAplicado")}>Inciso Aplicado</FieldLabel>
                <Input
                  value={dosimetria.incisoAplicado}
                  onChange={(e) =>
                    setDosimetria((p) => ({ ...p, incisoAplicado: e.target.value }))
                  }
                  placeholder="Ex: Art. 112, V, LEP"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={dosimetria.vedadoLivramento}
                    onCheckedChange={(v) => setDosimetria((p) => ({ ...p, vedadoLivramento: v }))}
                  />
                  <FieldLabel ai={aiFields.has("dosimetria.vedadoLivramento")}>
                    Vedado Livramento
                  </FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={dosimetria.resultouMorte}
                    onCheckedChange={(v) => setDosimetria((p) => ({ ...p, resultouMorte: v }))}
                  />
                  <FieldLabel ai={aiFields.has("dosimetria.resultouMorte")}>Resultou Morte</FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={dosimetria.reuReincidente}
                    onCheckedChange={(v) => setDosimetria((p) => ({ ...p, reuReincidente: v }))}
                  />
                  <FieldLabel ai={aiFields.has("dosimetria.reuReincidente")}>
                    Reu Reincidente
                  </FieldLabel>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONTEXTO TAB */}
        <TabsContent value="contexto">
          <Card className="border-neutral-100 dark:border-neutral-800">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("juizPresidente")}>Juiz Presidente</FieldLabel>
                  <Input
                    value={contexto.juizPresidente}
                    onChange={(e) => setContexto((p) => ({ ...p, juizPresidente: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("promotor")}>Promotor(a)</FieldLabel>
                  <Input
                    value={contexto.promotor}
                    onChange={(e) => setContexto((p) => ({ ...p, promotor: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("duracaoMinutos")}>Duracao (min)</FieldLabel>
                  <Input
                    type="number"
                    value={contexto.duracaoMinutos ?? ""}
                    onChange={(e) =>
                      setContexto((p) => ({
                        ...p,
                        duracaoMinutos: e.target.value ? parseInt(e.target.value) : undefined,
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("localFato")}>Local do Fato</FieldLabel>
                  <Input
                    value={contexto.localFato}
                    onChange={(e) => setContexto((p) => ({ ...p, localFato: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("tipoPenal")}>Tipo Penal</FieldLabel>
                  <Select
                    value={contexto.tipoPenal}
                    onValueChange={(v) => setContexto((p) => ({ ...p, tipoPenal: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homicidio_simples">Homicidio Simples</SelectItem>
                      <SelectItem value="homicidio_qualificado">Homicidio Qualificado</SelectItem>
                      <SelectItem value="homicidio_privilegiado">Homicidio Privilegiado</SelectItem>
                      <SelectItem value="homicidio_privilegiado_qualificado">Privilegiado-Qualificado</SelectItem>
                      <SelectItem value="homicidio_tentado">Homicidio Tentado</SelectItem>
                      <SelectItem value="feminicidio">Feminicidio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("tesePrincipal")}>Tese Principal</FieldLabel>
                  <Input
                    value={contexto.tesePrincipal}
                    onChange={(e) => setContexto((p) => ({ ...p, tesePrincipal: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel ai={aiFields.has("incidentesProcessuais")}>
                  Incidentes Processuais
                </FieldLabel>
                <Input
                  value={contexto.incidentesProcessuais}
                  onChange={(e) =>
                    setContexto((p) => ({ ...p, incidentesProcessuais: e.target.value }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERFIL TAB */}
        <TabsContent value="perfil">
          <Card className="border-neutral-100 dark:border-neutral-800">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("reuIdade")}>Idade do Reu</FieldLabel>
                  <Input
                    type="number"
                    value={contexto.reuIdade ?? ""}
                    onChange={(e) =>
                      setContexto((p) => ({
                        ...p,
                        reuIdade: e.target.value ? parseInt(e.target.value) : undefined,
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch
                    checked={contexto.reuPrimario}
                    onCheckedChange={(v) => setContexto((p) => ({ ...p, reuPrimario: v }))}
                  />
                  <FieldLabel ai={aiFields.has("reuPrimario")}>Reu Primario</FieldLabel>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("vitimaGenero")}>Genero da Vitima</FieldLabel>
                  <Select
                    value={contexto.vitimaGenero}
                    onValueChange={(v) => setContexto((p) => ({ ...p, vitimaGenero: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("vitimaIdade")}>Idade da Vitima</FieldLabel>
                  <Input
                    type="number"
                    value={contexto.vitimaIdade ?? ""}
                    onChange={(e) =>
                      setContexto((p) => ({
                        ...p,
                        vitimaIdade: e.target.value ? parseInt(e.target.value) : undefined,
                      }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={contexto.usouAlgemas}
                  onCheckedChange={(v) => setContexto((p) => ({ ...p, usouAlgemas: v }))}
                />
                <FieldLabel ai={aiFields.has("usouAlgemas")}>Usou Algemas no Plenario</FieldLabel>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DETRACAO TAB */}
        <TabsContent value="detracao">
          <Card className="border-neutral-100 dark:border-neutral-800">
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("dosimetria.detracaoInicio")}>
                    Inicio da Detracao
                  </FieldLabel>
                  <Input
                    type="date"
                    value={dosimetria.detracaoInicio}
                    onChange={(e) =>
                      setDosimetria((p) => ({ ...p, detracaoInicio: e.target.value }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel ai={aiFields.has("dosimetria.detracaoFim")}>Fim da Detracao</FieldLabel>
                  <Input
                    type="date"
                    value={dosimetria.detracaoFim}
                    onChange={(e) =>
                      setDosimetria((p) => ({ ...p, detracaoFim: e.target.value }))
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <FieldLabel ai={aiFields.has("dosimetria.detracaoDias")}>
                  Dias de Detracao
                </FieldLabel>
                <Input
                  type="number"
                  value={dosimetria.detracaoDias ?? ""}
                  onChange={(e) =>
                    setDosimetria((p) => ({
                      ...p,
                      detracaoDias: e.target.value ? parseInt(e.target.value) : undefined,
                    }))
                  }
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel ai={aiFields.has("dosimetria.dataFato")}>Data do Fato</FieldLabel>
                <Input
                  type="date"
                  value={dosimetria.dataFato}
                  onChange={(e) =>
                    setDosimetria((p) => ({ ...p, dataFato: e.target.value }))
                  }
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="text-sm">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar
        </Button>
        <Button
          onClick={onNext}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
        >
          Proximo
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// CONFIRM STEP (STEP 3)
// ============================================
function ConfirmStep({
  sessaoJuriId,
  contexto,
  dosimetria,
  quesitosData,
  resultado,
  assistidoNome,
  onBack,
}: {
  sessaoJuriId: number;
  contexto: FormDataContexto;
  dosimetria: FormDataDosimetria;
  quesitosData: QuesitosResultado[];
  resultado: string | null;
  assistidoNome: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const salvarMutation = trpc.avaliacaoJuri.salvarRegistro.useMutation({
    onSuccess: () => {
      utils.avaliacaoJuri.registroPendentes.invalidate();
      toast.success("Registro salvo com sucesso!");
      router.push("/admin/juri");
    },
    onError: (err) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  const handleSalvar = () => {
    const quesitosResultados = quesitosData
      .filter((q): q is QuesitosResultado & { resultado: "sim" | "nao" | "prejudicado" } => !!q.resultado && q.resultado.length > 0)
      .map((q) => ({
        quesitoId: q.quesitoId,
        resultado: q.resultado as "sim" | "nao" | "prejudicado",
        ordemVotacao: q.ordemVotacao,
      }));

    salvarMutation.mutate({
      sessaoJuriId,
      juizPresidente: contexto.juizPresidente || undefined,
      promotor: contexto.promotor || undefined,
      duracaoMinutos: contexto.duracaoMinutos,
      localFato: contexto.localFato || undefined,
      tipoPenal: (contexto.tipoPenal as "homicidio_simples" | "homicidio_qualificado" | "homicidio_privilegiado" | "homicidio_privilegiado_qualificado" | "homicidio_tentado" | "feminicidio") || undefined,
      tesePrincipal: contexto.tesePrincipal || undefined,
      reuPrimario: contexto.reuPrimario,
      reuIdade: contexto.reuIdade,
      vitimaGenero: contexto.vitimaGenero || undefined,
      vitimaIdade: contexto.vitimaIdade,
      usouAlgemas: contexto.usouAlgemas,
      incidentesProcessuais: contexto.incidentesProcessuais || undefined,
      dosimetria: {
        penaBase: dosimetria.penaBase || undefined,
        circunstanciasJudiciais: dosimetria.circunstanciasJudiciais || undefined,
        agravantes: dosimetria.agravantes || undefined,
        atenuantes: dosimetria.atenuantes || undefined,
        causasAumento: dosimetria.causasAumento || undefined,
        causasDiminuicao: dosimetria.causasDiminuicao || undefined,
        penaTotalMeses: dosimetria.penaTotalMeses,
        regimeInicial: (dosimetria.regimeInicial as "fechado" | "semiaberto" | "aberto") || undefined,
        detracaoInicio: dosimetria.detracaoInicio || undefined,
        detracaoFim: dosimetria.detracaoFim || undefined,
        detracaoDias: dosimetria.detracaoDias,
        dataFato: dosimetria.dataFato || undefined,
        fracaoProgressao: dosimetria.fracaoProgressao || undefined,
        incisoAplicado: dosimetria.incisoAplicado || undefined,
        vedadoLivramento: dosimetria.vedadoLivramento,
        resultouMorte: dosimetria.resultouMorte,
        reuReincidente: dosimetria.reuReincidente,
      },
      quesitosResultados: quesitosResultados.length > 0 ? quesitosResultados : undefined,
    });
  };

  const isCondenacao = resultado === "condenacao" || resultado === "CONDENACAO";
  const quesitosComResultado = quesitosData.filter((q) => q.resultado);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Confirmar Registro</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Revise o resumo e confirme o salvamento.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Contexto Summary */}
        <Card className="border-neutral-100 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Contexto da Sessao
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <SummaryRow label="Juiz" value={contexto.juizPresidente} />
            <SummaryRow label="Promotor" value={contexto.promotor} />
            <SummaryRow label="Tipo Penal" value={formatTipoPenal(contexto.tipoPenal)} />
            <SummaryRow label="Tese" value={contexto.tesePrincipal} />
            <SummaryRow label="Duracao" value={contexto.duracaoMinutos ? `${contexto.duracaoMinutos} min` : ""} />
            <SummaryRow label="Reu Primario" value={contexto.reuPrimario ? "Sim" : "Nao"} />
          </CardContent>
        </Card>

        {/* Dosimetria Summary */}
        <Card className="border-neutral-100 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Dosimetria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <SummaryRow label="Pena Base" value={dosimetria.penaBase} />
            <SummaryRow label="Pena Total" value={dosimetria.penaTotalMeses ? `${dosimetria.penaTotalMeses} meses` : ""} />
            <SummaryRow label="Regime" value={dosimetria.regimeInicial} />
            <SummaryRow label="Fracao Prog." value={dosimetria.fracaoProgressao} />
            <SummaryRow label="Detracao" value={dosimetria.detracaoDias ? `${dosimetria.detracaoDias} dias` : ""} />
          </CardContent>
        </Card>
      </div>

      {/* Quesitos Summary */}
      {quesitosComResultado.length > 0 && (
        <Card className="border-neutral-100 dark:border-neutral-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Quesitos ({quesitosComResultado.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-1.5">
              {quesitosComResultado.map((q) => (
                <div
                  key={q.quesitoId}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className="font-mono text-neutral-500 w-5 text-right">{q.numero}.</span>
                  <span className="flex-1 text-neutral-700 dark:text-neutral-300 truncate">
                    {q.texto}
                  </span>
                  <Badge
                    className={cn(
                      "text-[9px] border-0",
                      q.resultado === "sim"
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                        : q.resultado === "nao"
                        ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400"
                        : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
                    )}
                  >
                    {q.resultado === "sim" ? "SIM" : q.resultado === "nao" ? "NAO" : "PREJUDICADO"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Condenacao link */}
      {isCondenacao && (
        <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Condenacao registrada
                </span>
              </div>
              <Link href="/admin/juri/calculadora">
                <Button variant="outline" size="sm" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/40">
                  Calcular execucao penal
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="text-sm">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar
        </Button>
        <Button
          onClick={handleSalvar}
          disabled={salvarMutation.isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
        >
          {salvarMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1" />
          )}
          Confirmar e Salvar
        </Button>
      </div>
    </div>
  );
}

// Summary row helper
function SummaryRow({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-800 dark:text-neutral-200 text-right max-w-[60%] truncate">
        {value}
      </span>
    </div>
  );
}

function formatTipoPenal(v: string): string {
  const map: Record<string, string> = {
    homicidio_simples: "Homicidio Simples",
    homicidio_qualificado: "Homicidio Qualificado",
    homicidio_privilegiado: "Homicidio Privilegiado",
    homicidio_privilegiado_qualificado: "Privilegiado-Qualificado",
    homicidio_tentado: "Homicidio Tentado",
    feminicidio: "Feminicidio",
  };
  return map[v] || v;
}

// ============================================
// MAIN PAGE
// ============================================
export default function RegistroPage({
  params,
}: {
  params: Promise<{ sessaoId: string }>;
}) {
  const { sessaoId } = use(params);
  const sessaoJuriId = parseInt(sessaoId);
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Document upload state
  const [docs, setDocs] = useState<UploadedDoc[]>([]);

  // Form state
  const [contexto, setContexto] = useState<FormDataContexto>({
    juizPresidente: "",
    promotor: "",
    duracaoMinutos: undefined,
    localFato: "",
    tipoPenal: "",
    tesePrincipal: "",
    reuPrimario: false,
    reuIdade: undefined,
    vitimaGenero: "",
    vitimaIdade: undefined,
    usouAlgemas: false,
    incidentesProcessuais: "",
  });

  const [dosimetria, setDosimetria] = useState<FormDataDosimetria>({
    penaBase: "",
    circunstanciasJudiciais: "",
    agravantes: "",
    atenuantes: "",
    causasAumento: "",
    causasDiminuicao: "",
    penaTotalMeses: undefined,
    regimeInicial: "",
    detracaoInicio: "",
    detracaoFim: "",
    detracaoDias: undefined,
    dataFato: "",
    fracaoProgressao: "",
    incisoAplicado: "",
    vedadoLivramento: false,
    resultouMorte: false,
    reuReincidente: false,
  });

  const [quesitosData, setQuesitosData] = useState<QuesitosResultado[]>([]);
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());

  // Fetch existing registro data
  const { data: registro, isLoading } = trpc.avaliacaoJuri.getRegistro.useQuery(
    { sessaoJuriId },
    { enabled: !isNaN(sessaoJuriId) }
  );

  // Initialize form from existing data + extracted docs
  const initialized = useRef(false);
  useEffect(() => {
    if (!registro || initialized.current) return;
    initialized.current = true;

    const newAiFields = new Set<string>();

    // Pre-fill contexto from sessao
    setContexto({
      juizPresidente: registro.juizPresidente || "",
      promotor: registro.promotor || "",
      duracaoMinutos: registro.duracaoMinutos ?? undefined,
      localFato: registro.localFato || "",
      tipoPenal: registro.tipoPenal || "",
      tesePrincipal: registro.tesePrincipal || "",
      reuPrimario: registro.reuPrimario ?? false,
      reuIdade: registro.reuIdade ?? undefined,
      vitimaGenero: registro.vitimaGenero || "",
      vitimaIdade: registro.vitimaIdade ?? undefined,
      usouAlgemas: registro.usouAlgemas ?? false,
      incidentesProcessuais: registro.incidentesProcessuais || "",
    });

    // Pre-fill dosimetria
    if (registro.dosimetria && registro.dosimetria.length > 0) {
      const d = registro.dosimetria[0];
      setDosimetria({
        penaBase: d.penaBase || "",
        circunstanciasJudiciais: d.circunstanciasJudiciais || "",
        agravantes: d.agravantes || "",
        atenuantes: d.atenuantes || "",
        causasAumento: d.causasAumento || "",
        causasDiminuicao: d.causasDiminuicao || "",
        penaTotalMeses: d.penaTotalMeses ?? undefined,
        regimeInicial: d.regimeInicial || "",
        detracaoInicio: d.detracaoInicio || "",
        detracaoFim: d.detracaoFim || "",
        detracaoDias: d.detracaoDias ?? undefined,
        dataFato: d.dataFato || "",
        fracaoProgressao: d.fracaoProgressao || "",
        incisoAplicado: d.incisoAplicado || "",
        vedadoLivramento: d.vedadoLivramento ?? false,
        resultouMorte: d.resultouMorte ?? false,
        reuReincidente: d.reuReincidente ?? false,
      });

      if (d.extraidoPorIA) {
        // Mark all dosimetria fields as AI
        Object.keys(d).forEach((k) => {
          if ((d as Record<string, unknown>)[k]) {
            newAiFields.add(`dosimetria.${k}`);
          }
        });
      }
    }

    // Pre-fill quesitos
    if (registro.quesitos && registro.quesitos.length > 0) {
      setQuesitosData(
        registro.quesitos.map((q) => ({
          quesitoId: q.id,
          numero: q.numero,
          texto: q.texto,
          tipo: q.tipo,
          resultado: (q.resultado as "sim" | "nao" | "prejudicado") || "",
          ordemVotacao: q.ordemVotacao ?? undefined,
          fromAI: q.geradoPorIA ?? false,
        }))
      );
    }

    // Merge AI-extracted data from documents
    if (registro.documentos) {
      for (const doc of registro.documentos) {
        if (doc.statusProcessamento === "concluido" && doc.dadosExtraidos) {
          const extracted = doc.dadosExtraidos as Record<string, unknown>;

          // Merge into contexto
          if (extracted.juiz_presidente && !registro.juizPresidente) {
            setContexto((p) => ({ ...p, juizPresidente: String(extracted.juiz_presidente) }));
            newAiFields.add("juizPresidente");
          }
          if (extracted.promotor && !registro.promotor) {
            setContexto((p) => ({ ...p, promotor: String(extracted.promotor) }));
            newAiFields.add("promotor");
          }
          if (extracted.tipo_penal && !registro.tipoPenal) {
            setContexto((p) => ({ ...p, tipoPenal: String(extracted.tipo_penal) }));
            newAiFields.add("tipoPenal");
          }
          if (extracted.tese_principal && !registro.tesePrincipal) {
            setContexto((p) => ({ ...p, tesePrincipal: String(extracted.tese_principal) }));
            newAiFields.add("tesePrincipal");
          }

          // Merge dosimetria from extracted
          if (extracted.pena_base) {
            setDosimetria((p) => ({ ...p, penaBase: p.penaBase || String(extracted.pena_base) }));
            newAiFields.add("dosimetria.penaBase");
          }
          if (extracted.pena_total_meses) {
            setDosimetria((p) => ({
              ...p,
              penaTotalMeses: p.penaTotalMeses ?? Number(extracted.pena_total_meses),
            }));
            newAiFields.add("dosimetria.penaTotalMeses");
          }
          if (extracted.regime_inicial) {
            setDosimetria((p) => ({
              ...p,
              regimeInicial: p.regimeInicial || String(extracted.regime_inicial),
            }));
            newAiFields.add("dosimetria.regimeInicial");
          }

          // Merge quesitos from extracted
          if (extracted.quesitos && Array.isArray(extracted.quesitos) && quesitosData.length === 0) {
            const aiQuesitos = (extracted.quesitos as Array<Record<string, unknown>>).map((q, i) => ({
              quesitoId: 0,
              numero: Number(q.numero) || i + 1,
              texto: String(q.texto || ""),
              tipo: String(q.tipo || "") || null,
              resultado: (String(q.resultado || "") as "sim" | "nao" | "prejudicado") || ("" as const),
              ordemVotacao: undefined,
              fromAI: true,
            }));
            if (aiQuesitos.length > 0) {
              setQuesitosData((prev) => (prev.length === 0 ? aiQuesitos : prev));
            }
          }
        }
      }
    }

    setAiFields(newAiFields);
  }, [registro]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm text-neutral-500">Carregando sessao...</p>
        </div>
      </div>
    );
  }

  if (!registro) {
    return (
      <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11] flex items-center justify-center">
        <Card className="max-w-sm border-neutral-200 dark:border-neutral-800">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 mb-1">
              Sessao nao encontrada
            </p>
            <p className="text-xs text-neutral-500 mb-4">ID: {sessaoId}</p>
            <Link href="/admin/juri">
              <Button size="sm" variant="outline" className="text-xs">
                <ArrowLeft className="w-3 h-3 mr-1" />
                Voltar ao Hub
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const assistidoNome = registro.assistidoNome || registro.processo?.assistido?.nome || "Reu";

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0f0f11]">
      {/* Header with stepper */}
      <div className="px-4 md:px-6 py-4 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin/juri">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-neutral-600">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-bold text-neutral-900 dark:text-neutral-50">Registro Pos-Juri</h1>
              <p className="text-[10px] text-neutral-500">{assistidoNome}</p>
            </div>
          </div>
          <StepIndicator current={step} />
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        {step === 1 && (
          <UploadStep
            sessaoJuriId={sessaoJuriId}
            docs={docs}
            setDocs={setDocs}
            onNext={() => setStep(2)}
            existingDocs={registro.documentos || []}
          />
        )}
        {step === 2 && (
          <ReviewStep
            contexto={contexto}
            setContexto={setContexto}
            dosimetria={dosimetria}
            setDosimetria={setDosimetria}
            quesitosData={quesitosData}
            setQuesitosData={setQuesitosData}
            aiFields={aiFields}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <ConfirmStep
            sessaoJuriId={sessaoJuriId}
            contexto={contexto}
            dosimetria={dosimetria}
            quesitosData={quesitosData}
            resultado={registro.resultado}
            assistidoNome={assistidoNome}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  );
}
