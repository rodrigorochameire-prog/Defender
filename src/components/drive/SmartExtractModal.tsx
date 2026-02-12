"use client";

/**
 * Modal Principal de Extração Inteligente
 *
 * Orquestra o fluxo completo:
 * 1. Seleção de arquivos (se não vier pré-selecionado)
 * 2. Processamento com progresso
 * 3. Revisão de sugestões
 * 4. Aplicação dos campos selecionados
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import {
  SuggestionsReviewPanel,
  type EntitySuggestions,
} from "./SuggestionsReviewPanel";
import { FileSelectionModal } from "./FileSelectionModal";

// Estados do fluxo
type ModalStep = "select" | "processing" | "review" | "applying" | "done";

export interface SmartExtractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "assistido" | "processo" | "caso";
  entityId: number;
  driveFolderId?: string;
  preSelectedFileIds?: number[];
  assistidoId?: number;
  processoId?: number;
  casoId?: number;
  onComplete?: () => void;
}

// Detalhes de extração de um arquivo
interface ExtractionDetail {
  file_name: string;
  status: "success" | "error" | "skipped";
  content_type: string;
  content_preview?: string;
  error?: string;
}

export function SmartExtractModal({
  open,
  onOpenChange,
  entityType,
  entityId,
  driveFolderId,
  preSelectedFileIds,
  assistidoId,
  processoId,
  casoId,
  onComplete,
}: SmartExtractModalProps) {
  // Estados
  const [step, setStep] = useState<ModalStep>(
    preSelectedFileIds?.length ? "processing" : "select"
  );
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>(
    preSelectedFileIds || []
  );
  const [suggestions, setSuggestions] = useState<EntitySuggestions | null>(
    null
  );
  const [confidence, setConfidence] = useState<number | undefined>();
  const [extractionDetails, setExtractionDetails] = useState<
    ExtractionDetail[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [appliedResults, setAppliedResults] = useState<Record<
    string,
    boolean
  > | null>(null);

  // Campos selecionados para aplicar
  const [selectedFields, setSelectedFields] = useState<{
    assistido: Set<string>;
    processo: Set<string>;
    caso: Set<string>;
  }>({
    assistido: new Set(),
    processo: new Set(),
    caso: new Set(),
  });

  // Mutations tRPC
  const extractMutation = trpc.smartExtract.extractMultiple.useMutation();
  const applyMutation = trpc.smartExtract.applySuggestions.useMutation();

  // Determinar quais entidades são alvos baseado no contexto
  const targetEntities = useMemo(() => {
    const entities: ("assistido" | "processo" | "caso")[] = [];
    if (assistidoId) entities.push("assistido");
    if (processoId) entities.push("processo");
    if (casoId) entities.push("caso");
    // Se nenhum ID foi passado, usar o entityType atual
    if (entities.length === 0) entities.push(entityType);
    return entities;
  }, [assistidoId, processoId, casoId, entityType]);

  // Reset ao fechar
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep(preSelectedFileIds?.length ? "processing" : "select");
      setSelectedFileIds(preSelectedFileIds || []);
      setSuggestions(null);
      setConfidence(undefined);
      setExtractionDetails([]);
      setError(null);
      setAppliedResults(null);
      setSelectedFields({
        assistido: new Set(),
        processo: new Set(),
        caso: new Set(),
      });
    }
    onOpenChange(open);
  };

  // Iniciar extração
  const startExtraction = useCallback(
    async (fileIds: number[]) => {
      setStep("processing");
      setError(null);
      setSelectedFileIds(fileIds);

      try {
        const result = await extractMutation.mutateAsync({
          fileIds,
          targetEntities,
          assistidoId,
          processoId,
          casoId,
        });

        if (result.success && result.suggestions) {
          setSuggestions(result.suggestions as EntitySuggestions);
          setConfidence(result.confidence ?? undefined);
          setExtractionDetails(
            (result.extraction_details as ExtractionDetail[]) || []
          );

          // Pre-selecionar todos os campos por padrão
          const newSelectedFields = {
            assistido: new Set<string>(),
            processo: new Set<string>(),
            caso: new Set<string>(),
          };

          const sug = result.suggestions as EntitySuggestions;
          if (sug.assistido) {
            Object.keys(sug.assistido).forEach((k) =>
              newSelectedFields.assistido.add(k)
            );
          }
          if (sug.processo) {
            Object.keys(sug.processo).forEach((k) =>
              newSelectedFields.processo.add(k)
            );
          }
          if (sug.caso) {
            Object.keys(sug.caso).forEach((k) => newSelectedFields.caso.add(k));
          }

          setSelectedFields(newSelectedFields);
          setStep("review");
        } else {
          setError(result.error || "Erro desconhecido na extração");
          setStep("select");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro na extração");
        setStep("select");
      }
    },
    [extractMutation, targetEntities, assistidoId, processoId, casoId]
  );

  // Aplicar sugestões selecionadas
  const applySuggestions = useCallback(async () => {
    if (!suggestions) return;

    setStep("applying");
    setError(null);

    try {
      // Montar objeto com apenas os campos selecionados
      const selectedFieldsObj: {
        assistido?: Record<string, unknown>;
        processo?: Record<string, unknown>;
        caso?: Record<string, unknown>;
      } = {};

      if (suggestions.assistido && selectedFields.assistido.size > 0) {
        selectedFieldsObj.assistido = {};
        selectedFields.assistido.forEach((key) => {
          if (suggestions.assistido?.[key] !== undefined) {
            selectedFieldsObj.assistido![key] = suggestions.assistido[key];
          }
        });
      }

      if (suggestions.processo && selectedFields.processo.size > 0) {
        selectedFieldsObj.processo = {};
        selectedFields.processo.forEach((key) => {
          if (suggestions.processo?.[key] !== undefined) {
            selectedFieldsObj.processo![key] = suggestions.processo[key];
          }
        });
      }

      if (suggestions.caso && selectedFields.caso.size > 0) {
        selectedFieldsObj.caso = {};
        selectedFields.caso.forEach((key) => {
          if (suggestions.caso?.[key] !== undefined) {
            selectedFieldsObj.caso![key] = suggestions.caso[key];
          }
        });
      }

      const result = await applyMutation.mutateAsync({
        assistidoId,
        processoId,
        casoId,
        selectedFields: selectedFieldsObj,
      });

      setAppliedResults(result.results);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao aplicar campos");
      setStep("review");
    }
  }, [
    suggestions,
    selectedFields,
    applyMutation,
    assistidoId,
    processoId,
    casoId,
  ]);

  // Toggle de campo individual
  const toggleField = (
    entityType: "assistido" | "processo" | "caso",
    fieldKey: string
  ) => {
    setSelectedFields((prev) => {
      const newSet = new Set(prev[entityType]);
      if (newSet.has(fieldKey)) {
        newSet.delete(fieldKey);
      } else {
        newSet.add(fieldKey);
      }
      return { ...prev, [entityType]: newSet };
    });
  };

  // Toggle de todos os campos de uma entidade
  const toggleAllFields = (
    entityType: "assistido" | "processo" | "caso",
    selected: boolean
  ) => {
    if (!suggestions) return;

    setSelectedFields((prev) => {
      const newSet = new Set<string>();
      if (selected && suggestions[entityType]) {
        Object.keys(suggestions[entityType]!).forEach((k) => newSet.add(k));
      }
      return { ...prev, [entityType]: newSet };
    });
  };

  // Contar campos selecionados
  const totalSelectedFields =
    selectedFields.assistido.size +
    selectedFields.processo.size +
    selectedFields.caso.size;

  // Ref para controlar se a extração já foi iniciada
  const hasStartedRef = useRef(false);

  // Efeito para iniciar extração se já veio com arquivos pré-selecionados
  useEffect(() => {
    if (
      open &&
      preSelectedFileIds?.length &&
      step === "processing" &&
      !hasStartedRef.current &&
      !extractMutation.isPending
    ) {
      hasStartedRef.current = true;
      startExtraction(preSelectedFileIds);
    }
  }, [open, preSelectedFileIds, step, extractMutation.isPending, startExtraction]);

  // Reset ref quando modal fecha
  useEffect(() => {
    if (!open) {
      hasStartedRef.current = false;
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Extração Inteligente
            </DialogTitle>
            <DialogDescription>
              {step === "select" &&
                "Selecione os arquivos para extrair dados automaticamente"}
              {step === "processing" && "Processando arquivos..."}
              {step === "review" &&
                "Revise as sugestões e selecione quais campos deseja aplicar"}
              {step === "applying" && "Aplicando campos selecionados..."}
              {step === "done" && "Extração concluída!"}
            </DialogDescription>
          </DialogHeader>

          {/* Conteúdo baseado no step */}
          <div className="min-h-[400px]">
            {/* Step: Select */}
            {step === "select" && (
              <div className="flex flex-col items-center justify-center h-[400px]">
                <FileText className="h-16 w-16 text-zinc-300 mb-4" />
                <p className="text-zinc-600 mb-4">
                  Selecione os arquivos que deseja processar
                </p>
                <Button
                  onClick={() => {
                    // Abrir modal de seleção
                    // Isso será tratado pelo FileSelectionModal separado
                  }}
                >
                  Selecionar Arquivos
                </Button>
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
            )}

            {/* Step: Processing */}
            {step === "processing" && (
              <div className="flex flex-col items-center justify-center h-[400px]">
                <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
                <p className="text-lg font-medium mb-2">
                  Processando {selectedFileIds.length} arquivo(s)...
                </p>
                <p className="text-sm text-zinc-500 mb-4">
                  Extraindo texto, analisando conteúdo e gerando sugestões
                </p>
                <Progress value={undefined} className="w-64" />

                {/* Lista de arquivos sendo processados */}
                {extractionDetails.length > 0 && (
                  <div className="mt-6 w-full max-w-md space-y-2">
                    {extractionDetails.map((detail, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm text-zinc-600"
                      >
                        {detail.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : detail.status === "error" ? (
                          <X className="h-4 w-4 text-red-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        <span className="truncate">{detail.file_name}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {detail.content_type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step: Review */}
            {step === "review" && suggestions && (
              <SuggestionsReviewPanel
                suggestions={suggestions}
                confidence={confidence}
                selectedFields={selectedFields}
                onToggleField={toggleField}
                onToggleAll={toggleAllFields}
              />
            )}

            {/* Step: Applying */}
            {step === "applying" && (
              <div className="flex flex-col items-center justify-center h-[400px]">
                <Loader2 className="h-12 w-12 text-emerald-500 animate-spin mb-4" />
                <p className="text-lg font-medium">
                  Aplicando {totalSelectedFields} campo(s)...
                </p>
              </div>
            )}

            {/* Step: Done */}
            {step === "done" && appliedResults && (
              <div className="flex flex-col items-center justify-center h-[400px]">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4" />
                <p className="text-lg font-medium mb-4">
                  Extração concluída com sucesso!
                </p>

                {/* Resultado por entidade */}
                <div className="space-y-2">
                  {appliedResults.assistido !== undefined && (
                    <div className="flex items-center gap-2">
                      {appliedResults.assistido ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <X className="h-5 w-5 text-red-500" />
                      )}
                      <span>
                        Assistido:{" "}
                        {appliedResults.assistido
                          ? "Atualizado"
                          : "Erro ao atualizar"}
                      </span>
                    </div>
                  )}
                  {appliedResults.processo !== undefined && (
                    <div className="flex items-center gap-2">
                      {appliedResults.processo ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <X className="h-5 w-5 text-red-500" />
                      )}
                      <span>
                        Processo:{" "}
                        {appliedResults.processo
                          ? "Atualizado"
                          : "Erro ao atualizar"}
                      </span>
                    </div>
                  )}
                  {appliedResults.caso !== undefined && (
                    <div className="flex items-center gap-2">
                      {appliedResults.caso ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <X className="h-5 w-5 text-red-500" />
                      )}
                      <span>
                        Caso:{" "}
                        {appliedResults.caso
                          ? "Atualizado"
                          : "Erro ao atualizar"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer com ações */}
          <DialogFooter>
            {step === "select" && (
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
            )}

            {step === "review" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setStep("select")}
                  className="mr-auto"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <Button variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={applySuggestions}
                  disabled={totalSelectedFields === 0}
                  className="gap-2"
                >
                  Aplicar {totalSelectedFields} campo(s)
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {step === "done" && (
              <Button
                onClick={() => {
                  handleOpenChange(false);
                  onComplete?.();
                }}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Concluir
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de seleção de arquivos (se step === "select" e sem pré-seleção) */}
      {step === "select" && !preSelectedFileIds?.length && (
        <FileSelectionModal
          open={open && step === "select"}
          onOpenChange={(isOpen) => {
            if (!isOpen) handleOpenChange(false);
          }}
          entityType={entityType}
          entityId={entityId}
          driveFolderId={driveFolderId}
          onSelect={(fileIds) => {
            if (fileIds.length > 0) {
              startExtraction(fileIds);
            }
          }}
        />
      )}
    </>
  );
}
