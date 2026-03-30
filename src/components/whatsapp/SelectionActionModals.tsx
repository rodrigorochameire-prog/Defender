"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookmarkPlus,
  FolderUp,
  Sparkles,
  Loader2,
  FileText,
  Image,
  Mic,
  Video,
  Check,
  FileSearch,
  MapPin,
  Phone,
  Users,
  Calendar,
  Map,
  FileCheck,
  Pencil,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: number;
  waMessageId: string | null;
  direction: string;
  type: string;
  content: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  status: string;
  createdAt: Date;
}

interface ExtractedData {
  endereco?: string | null;
  telefones?: string[];
  relato_fatos?: string | null;
  nomes_testemunhas?: string[];
  datas_relevantes?: { data: string; descricao: string }[];
  locais?: string[];
  documentos_mencionados?: string[];
}

interface SelectionActionModalsProps {
  contactId: number;
  selectedMessageIds: number[];
  selectedMessages: Message[];
  contactName: string;
  assistidoName: string | null;
  assistidoId: number | null;
  showSaveCase: boolean;
  showSaveDrive: boolean;
  showSummary: boolean;
  showExtractData: boolean;
  onCloseSaveCase: () => void;
  onCloseSaveDrive: () => void;
  onCloseSummary: () => void;
  onCloseExtractData: () => void;
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMessagePreview(msg: Message, contactName: string): string {
  const date = new Date(msg.createdAt);
  const dateStr = format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
  const sender = msg.direction === "outbound" ? "Defensor" : contactName;
  let content = msg.content || "";
  if (msg.type === "image") content = content ? `[Imagem] ${content}` : "[Imagem]";
  if (msg.type === "document")
    content = content
      ? `[Documento: ${msg.mediaFilename || "arquivo"}] ${content}`
      : `[Documento: ${msg.mediaFilename || "arquivo"}]`;
  if (msg.type === "audio") content = "[Áudio]";
  if (msg.type === "video") content = "[Vídeo]";
  return `[${dateStr}] ${sender}:\n${content}`;
}

function getMediaIcon(type: string) {
  switch (type) {
    case "image":
      return <Image className="h-4 w-4 text-blue-500" />;
    case "document":
      return <FileText className="h-4 w-4 text-orange-500" />;
    case "audio":
      return <Mic className="h-4 w-4 text-purple-500" />;
    case "video":
      return <Video className="h-4 w-4 text-pink-500" />;
    default:
      return <FileText className="h-4 w-4 text-zinc-400" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SelectionActionModals({
  contactId,
  selectedMessageIds,
  selectedMessages,
  contactName,
  assistidoName,
  assistidoId,
  showSaveCase,
  showSaveDrive,
  showSummary,
  showExtractData,
  onCloseSaveCase,
  onCloseSaveDrive,
  onCloseSummary,
  onCloseExtractData,
  onSuccess,
}: SelectionActionModalsProps) {
  // -- Save to Case state
  const [importante, setImportante] = useState(false);

  // -- Summary state
  const [summaryText, setSummaryText] = useState("");
  const [summaryStructured, setSummaryStructured] = useState<{
    fatos: string[];
    pedidos: string[];
    providencias: string[];
  } | null>(null);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const [summaryEdited, setSummaryEdited] = useState(false);

  // -- Extract Data state
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [extractionDone, setExtractionDone] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<ExtractedData>({});

  // -- Mutations
  const saveToCaseMutation = trpc.whatsappChat.saveToCase.useMutation({
    onSuccess: (data) => {
      toast.success(`Recorte salvo no caso de ${assistidoName}`, {
        description: `${selectedMessages.length} mensagens salvas como anotação`,
      });
      setImportante(false);
      onCloseSaveCase();
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const saveMediaToDriveMutation = trpc.whatsappChat.saveMediaToDrive.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.savedCount} arquivo${data.savedCount !== 1 ? "s" : ""} salvo${data.savedCount !== 1 ? "s" : ""} no Drive`, {
        description: data.files.map((f) => f.name).join(", "),
      });
      onCloseSaveDrive();
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar no Drive: ${error.message}`);
    },
  });

  const generateSummaryMutation = trpc.whatsappChat.generateSummary.useMutation({
    onSuccess: (data) => {
      setSummaryText(data.summary);
      setSummaryStructured(data.structured);
      setSummaryGenerated(true);
    },
    onError: (error) => {
      toast.error(`Erro ao gerar resumo: ${error.message}`);
    },
  });

  const saveSummaryMutation = trpc.whatsappChat.saveSummary.useMutation({
    onSuccess: () => {
      toast.success(`Resumo salvo no caso de ${assistidoName}`);
      resetSummaryState();
      onCloseSummary();
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao salvar resumo: ${error.message}`);
    },
  });

  const extractDataMutation = trpc.whatsappChat.extractData.useMutation({
    onSuccess: (data) => {
      const extracted = data.extracted as ExtractedData;
      setExtractedData(extracted);
      setEditValues(extracted);
      setExtractionDone(true);
      // Auto-select fields that have data
      const fields: Record<string, boolean> = {};
      if (extracted.endereco) fields.endereco = true;
      if (extracted.telefones && extracted.telefones.length > 0) fields.telefone = true;
      if (extracted.relato_fatos) fields.relato_fatos = true;
      if (extracted.nomes_testemunhas && extracted.nomes_testemunhas.length > 0) fields.nomes_testemunhas = true;
      if (extracted.datas_relevantes && extracted.datas_relevantes.length > 0) fields.datas_relevantes = true;
      if (extracted.locais && extracted.locais.length > 0) fields.locais = true;
      if (extracted.documentos_mencionados && extracted.documentos_mencionados.length > 0) fields.documentos_mencionados = true;
      setSelectedFields(fields);
    },
    onError: (error) => {
      toast.error(`Erro ao extrair dados: ${error.message}`);
    },
  });

  const applyExtractedDataMutation = trpc.whatsappChat.applyExtractedData.useMutation({
    onSuccess: () => {
      toast.success(`Dados extraidos aplicados ao cadastro de ${assistidoName}`);
      resetExtractState();
      onCloseExtractData();
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Erro ao aplicar dados: ${error.message}`);
    },
  });

  const resetSummaryState = () => {
    setSummaryText("");
    setSummaryStructured(null);
    setSummaryGenerated(false);
    setSummaryEdited(false);
  };

  const resetExtractState = () => {
    setExtractedData(null);
    setExtractionDone(false);
    setSelectedFields({});
    setEditingField(null);
    setEditValues({});
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleApplyExtractedData = () => {
    if (!assistidoId) return;

    const dataToApply: Record<string, unknown> = {};
    if (selectedFields.endereco && editValues.endereco) {
      dataToApply.endereco = editValues.endereco;
    }
    if (selectedFields.telefone && editValues.telefones && editValues.telefones.length > 0) {
      dataToApply.telefone = editValues.telefones[0];
    }
    if (selectedFields.relato_fatos && editValues.relato_fatos) {
      dataToApply.relato_fatos = editValues.relato_fatos;
    }
    if (selectedFields.nomes_testemunhas && editValues.nomes_testemunhas && editValues.nomes_testemunhas.length > 0) {
      dataToApply.nomes_testemunhas = editValues.nomes_testemunhas;
    }
    if (selectedFields.datas_relevantes && editValues.datas_relevantes && editValues.datas_relevantes.length > 0) {
      dataToApply.datas_relevantes = editValues.datas_relevantes;
    }
    if (selectedFields.locais && editValues.locais && editValues.locais.length > 0) {
      dataToApply.locais = editValues.locais;
    }
    if (selectedFields.documentos_mencionados && editValues.documentos_mencionados && editValues.documentos_mencionados.length > 0) {
      dataToApply.documentos_mencionados = editValues.documentos_mencionados;
    }

    if (Object.keys(dataToApply).length === 0) {
      toast.error("Selecione pelo menos um campo para aplicar");
      return;
    }

    applyExtractedDataMutation.mutate({
      assistidoId,
      data: dataToApply as {
        endereco?: string;
        telefone?: string;
        relato_fatos?: string;
        nomes_testemunhas?: string[];
        datas_relevantes?: { data: string; descricao: string }[];
        locais?: string[];
        documentos_mencionados?: string[];
      },
    });
  };

  // Preview content for save case modal
  const previewContent = selectedMessages
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => formatMessagePreview(m, contactName))
    .join("\n\n");

  // Media messages for Drive modal
  const mediaMessages = selectedMessages.filter(
    (m) => m.type !== "text" && m.mediaUrl
  );

  // Count selected fields
  const selectedFieldCount = Object.values(selectedFields).filter(Boolean).length;

  return (
    <>
      {/* ================================================================ */}
      {/* MODAL: Salvar no Caso                                           */}
      {/* ================================================================ */}
      <Dialog open={showSaveCase} onOpenChange={(open) => !open && onCloseSaveCase()}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-emerald-600" />
              Salvar no Caso
            </DialogTitle>
            <DialogDescription>
              {selectedMessages.length} mensagem{selectedMessages.length !== 1 ? "s" : ""} de{" "}
              <strong>{contactName}</strong> serão salvas como anotação no caso de{" "}
              <strong>{assistidoName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto rounded-lg border border-zinc-200 dark:border-border bg-zinc-50 dark:bg-background p-3">
            <pre className="text-xs whitespace-pre-wrap text-zinc-700 dark:text-foreground/80 font-mono leading-relaxed">
              {previewContent}
            </pre>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="importante"
              checked={importante}
              onCheckedChange={(checked) => setImportante(checked === true)}
            />
            <label htmlFor="importante" className="text-sm text-zinc-600 dark:text-muted-foreground cursor-pointer">
              Marcar como importante
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onCloseSaveCase}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                saveToCaseMutation.mutate({
                  contactId,
                  messageIds: selectedMessageIds,
                  importante,
                })
              }
              disabled={saveToCaseMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saveToCaseMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BookmarkPlus className="h-4 w-4 mr-2" />
              )}
              Salvar Anotação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* MODAL: Salvar no Drive                                          */}
      {/* ================================================================ */}
      <Dialog open={showSaveDrive} onOpenChange={(open) => !open && onCloseSaveDrive()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderUp className="h-5 w-5 text-blue-600" />
              Salvar no Drive
            </DialogTitle>
            <DialogDescription>
              {mediaMessages.length} arquivo{mediaMessages.length !== 1 ? "s" : ""} de mídia
              serão salvos na pasta do assistido <strong>{assistidoName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {mediaMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-card border border-zinc-200 dark:border-border"
              >
                {getMediaIcon(msg.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-zinc-900 dark:text-foreground">
                    {msg.mediaFilename || `${msg.type}_${format(new Date(msg.createdAt), "HHmm")}`}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {msg.mediaMimeType} · {format(new Date(msg.createdAt), "dd/MM HH:mm")}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {msg.type}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-xs text-zinc-500 dark:text-muted-foreground bg-zinc-100 dark:bg-card rounded-md px-3 py-2">
            Destino: <strong>{assistidoName}</strong> / 05 - Outros
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={onCloseSaveDrive}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                saveMediaToDriveMutation.mutate({
                  contactId,
                  messageIds: selectedMessageIds,
                })
              }
              disabled={saveMediaToDriveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saveMediaToDriveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <FolderUp className="h-4 w-4 mr-2" />
                  Salvar {mediaMessages.length} arquivo{mediaMessages.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* MODAL: Resumo IA                                                */}
      {/* ================================================================ */}
      <Dialog
        open={showSummary}
        onOpenChange={(open) => {
          if (!open) {
            resetSummaryState();
            onCloseSummary();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Resumo com IA
            </DialogTitle>
            <DialogDescription>
              {summaryGenerated
                ? "Revise e edite o resumo antes de salvar como anotação."
                : `Gerando resumo de ${selectedMessages.length} mensagens...`}
            </DialogDescription>
          </DialogHeader>

          {!summaryGenerated ? (
            // Loading state — auto-trigger generation
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              {generateSummaryMutation.isPending ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                  <p className="text-sm text-zinc-500">Analisando mensagens com IA...</p>
                </>
              ) : (
                <Button
                  onClick={() =>
                    generateSummaryMutation.mutate({
                      contactId,
                      messageIds: selectedMessageIds,
                    })
                  }
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Resumo
                </Button>
              )}
            </div>
          ) : (
            // Summary display
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Structured sections */}
              {summaryStructured && (
                <div className="grid gap-3">
                  {summaryStructured.fatos.length > 0 && (
                    <div className="rounded-lg border border-zinc-200 dark:border-border p-3">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Fatos Relatados
                      </h4>
                      <ul className="space-y-1">
                        {summaryStructured.fatos.map((f, i) => (
                          <li key={i} className="text-sm text-zinc-700 dark:text-foreground/80 flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">•</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryStructured.pedidos.length > 0 && (
                    <div className="rounded-lg border border-zinc-200 dark:border-border p-3">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Pedidos / Demandas
                      </h4>
                      <ul className="space-y-1">
                        {summaryStructured.pedidos.map((p, i) => (
                          <li key={i} className="text-sm text-zinc-700 dark:text-foreground/80 flex items-start gap-2">
                            <span className="text-blue-500 mt-0.5">•</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryStructured.providencias.length > 0 && (
                    <div className="rounded-lg border border-zinc-200 dark:border-border p-3">
                      <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Providências Necessárias
                      </h4>
                      <ul className="space-y-1">
                        {summaryStructured.providencias.map((p, i) => (
                          <li key={i} className="text-sm text-zinc-700 dark:text-foreground/80 flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">•</span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Editable summary */}
              <div>
                <label className="text-xs font-medium text-zinc-500 mb-1 block">
                  Resumo (editável)
                </label>
                <Textarea
                  value={summaryText}
                  onChange={(e) => {
                    setSummaryText(e.target.value);
                    setSummaryEdited(true);
                  }}
                  className="min-h-[120px] text-sm"
                  placeholder="Resumo gerado pela IA..."
                />
              </div>
            </div>
          )}

          {summaryGenerated && (
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetSummaryState(); onCloseSummary(); }}>
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  saveSummaryMutation.mutate({
                    contactId,
                    messageIds: selectedMessageIds,
                    summary: summaryText,
                    editedByUser: summaryEdited,
                  })
                }
                disabled={saveSummaryMutation.isPending || !summaryText.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {saveSummaryMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Salvar como Anotação
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* MODAL: Extrair Dados                                            */}
      {/* ================================================================ */}
      <Dialog
        open={showExtractData}
        onOpenChange={(open) => {
          if (!open) {
            resetExtractState();
            onCloseExtractData();
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-amber-600" />
              Extrair Dados com IA
            </DialogTitle>
            <DialogDescription>
              {extractionDone
                ? "Revise os dados extraidos e selecione quais aplicar ao cadastro."
                : `Extraindo dados de ${selectedMessages.length} mensagens...`}
            </DialogDescription>
          </DialogHeader>

          {!extractionDone ? (
            // Loading / trigger state
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              {extractDataMutation.isPending ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                  <p className="text-sm text-zinc-500">Extraindo dados das mensagens...</p>
                  <p className="text-xs text-zinc-400">Endereco, telefones, relato, testemunhas...</p>
                </>
              ) : (
                <Button
                  onClick={() =>
                    extractDataMutation.mutate({
                      contactId,
                      messageIds: selectedMessageIds,
                    })
                  }
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <FileSearch className="h-4 w-4 mr-2" />
                  Extrair Dados
                </Button>
              )}
            </div>
          ) : (
            // Extracted data display
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                {/* Endereco */}
                {editValues.endereco && (
                  <ExtractedField
                    icon={<MapPin className="h-4 w-4 text-red-500" />}
                    label="Endereco"
                    fieldKey="endereco"
                    selected={selectedFields.endereco || false}
                    onToggle={() => toggleField("endereco")}
                    editing={editingField === "endereco"}
                    onEdit={() => setEditingField(editingField === "endereco" ? null : "endereco")}
                  >
                    {editingField === "endereco" ? (
                      <Input
                        value={editValues.endereco || ""}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, endereco: e.target.value }))}
                        className="text-sm"
                      />
                    ) : (
                      <p className="text-sm text-zinc-700 dark:text-foreground/80">{editValues.endereco}</p>
                    )}
                  </ExtractedField>
                )}

                {/* Telefones */}
                {editValues.telefones && editValues.telefones.length > 0 && (
                  <ExtractedField
                    icon={<Phone className="h-4 w-4 text-green-500" />}
                    label="Telefones"
                    fieldKey="telefone"
                    selected={selectedFields.telefone || false}
                    onToggle={() => toggleField("telefone")}
                    editing={editingField === "telefone"}
                    onEdit={() => setEditingField(editingField === "telefone" ? null : "telefone")}
                  >
                    {editingField === "telefone" ? (
                      <Input
                        value={editValues.telefones?.join(", ") || ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            telefones: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                          }))
                        }
                        className="text-sm"
                        placeholder="Separados por virgula"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {editValues.telefones.map((tel, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-mono">
                            {tel}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </ExtractedField>
                )}

                {/* Relato dos Fatos */}
                {editValues.relato_fatos && (
                  <ExtractedField
                    icon={<FileText className="h-4 w-4 text-blue-500" />}
                    label="Relato dos Fatos"
                    fieldKey="relato_fatos"
                    selected={selectedFields.relato_fatos || false}
                    onToggle={() => toggleField("relato_fatos")}
                    editing={editingField === "relato_fatos"}
                    onEdit={() => setEditingField(editingField === "relato_fatos" ? null : "relato_fatos")}
                  >
                    {editingField === "relato_fatos" ? (
                      <Textarea
                        value={editValues.relato_fatos || ""}
                        onChange={(e) => setEditValues((prev) => ({ ...prev, relato_fatos: e.target.value }))}
                        className="text-sm min-h-[100px]"
                      />
                    ) : (
                      <p className="text-sm text-zinc-700 dark:text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {editValues.relato_fatos}
                      </p>
                    )}
                  </ExtractedField>
                )}

                {/* Testemunhas */}
                {editValues.nomes_testemunhas && editValues.nomes_testemunhas.length > 0 && (
                  <ExtractedField
                    icon={<Users className="h-4 w-4 text-indigo-500" />}
                    label="Testemunhas"
                    fieldKey="nomes_testemunhas"
                    selected={selectedFields.nomes_testemunhas || false}
                    onToggle={() => toggleField("nomes_testemunhas")}
                    editing={editingField === "nomes_testemunhas"}
                    onEdit={() => setEditingField(editingField === "nomes_testemunhas" ? null : "nomes_testemunhas")}
                  >
                    {editingField === "nomes_testemunhas" ? (
                      <Input
                        value={editValues.nomes_testemunhas?.join(", ") || ""}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            nomes_testemunhas: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                          }))
                        }
                        className="text-sm"
                        placeholder="Separados por virgula"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {editValues.nomes_testemunhas.map((nome, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {nome}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </ExtractedField>
                )}

                {/* Datas Relevantes */}
                {editValues.datas_relevantes && editValues.datas_relevantes.length > 0 && (
                  <ExtractedField
                    icon={<Calendar className="h-4 w-4 text-orange-500" />}
                    label="Datas Relevantes"
                    fieldKey="datas_relevantes"
                    selected={selectedFields.datas_relevantes || false}
                    onToggle={() => toggleField("datas_relevantes")}
                    editing={false}
                    onEdit={() => {}}
                    hideEditButton
                  >
                    <div className="space-y-1.5">
                      {editValues.datas_relevantes.map((d, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <Badge variant="secondary" className="text-[10px] font-mono shrink-0 mt-0.5">
                            {d.data}
                          </Badge>
                          <span className="text-zinc-700 dark:text-foreground/80">{d.descricao}</span>
                        </div>
                      ))}
                    </div>
                  </ExtractedField>
                )}

                {/* Locais */}
                {editValues.locais && editValues.locais.length > 0 && (
                  <ExtractedField
                    icon={<Map className="h-4 w-4 text-teal-500" />}
                    label="Locais"
                    fieldKey="locais"
                    selected={selectedFields.locais || false}
                    onToggle={() => toggleField("locais")}
                    editing={false}
                    onEdit={() => {}}
                    hideEditButton
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {editValues.locais.map((local, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {local}
                        </Badge>
                      ))}
                    </div>
                  </ExtractedField>
                )}

                {/* Documentos Mencionados */}
                {editValues.documentos_mencionados && editValues.documentos_mencionados.length > 0 && (
                  <ExtractedField
                    icon={<FileCheck className="h-4 w-4 text-cyan-500" />}
                    label="Documentos Mencionados"
                    fieldKey="documentos_mencionados"
                    selected={selectedFields.documentos_mencionados || false}
                    onToggle={() => toggleField("documentos_mencionados")}
                    editing={false}
                    onEdit={() => {}}
                    hideEditButton
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {editValues.documentos_mencionados.map((doc, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {doc}
                        </Badge>
                      ))}
                    </div>
                  </ExtractedField>
                )}

                {/* No data extracted */}
                {!editValues.endereco &&
                  (!editValues.telefones || editValues.telefones.length === 0) &&
                  !editValues.relato_fatos &&
                  (!editValues.nomes_testemunhas || editValues.nomes_testemunhas.length === 0) &&
                  (!editValues.datas_relevantes || editValues.datas_relevantes.length === 0) &&
                  (!editValues.locais || editValues.locais.length === 0) &&
                  (!editValues.documentos_mencionados || editValues.documentos_mencionados.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-sm text-zinc-500">Nenhum dado foi extraido das mensagens selecionadas.</p>
                      <p className="text-xs text-zinc-400 mt-1">Tente selecionar mais mensagens com informações cadastrais.</p>
                    </div>
                  )}
              </div>
            </ScrollArea>
          )}

          {extractionDone && selectedFieldCount > 0 && (
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetExtractState(); onCloseExtractData(); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleApplyExtractedData}
                disabled={applyExtractedDataMutation.isPending || selectedFieldCount === 0}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {applyExtractedDataMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Aplicar {selectedFieldCount} campo{selectedFieldCount !== 1 ? "s" : ""} ao Cadastro
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Extracted field row
// ---------------------------------------------------------------------------

function ExtractedField({
  icon,
  label,
  fieldKey,
  selected,
  onToggle,
  editing,
  onEdit,
  hideEditButton,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  fieldKey: string;
  selected: boolean;
  onToggle: () => void;
  editing: boolean;
  onEdit: () => void;
  hideEditButton?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        selected
          ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20"
          : "border-zinc-200 dark:border-border bg-zinc-50/50 dark:bg-background/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Checkbox
          id={`field-${fieldKey}`}
          checked={selected}
          onCheckedChange={() => onToggle()}
        />
        {icon}
        <Label
          htmlFor={`field-${fieldKey}`}
          className="text-xs font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer flex-1"
        >
          {label}
        </Label>
        {!hideEditButton && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3 text-zinc-400" />
          </Button>
        )}
      </div>
      <div className="ml-8">{children}</div>
    </div>
  );
}
