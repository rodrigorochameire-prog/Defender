"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, User, Plus, FolderOpen, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HomonymiaSuggestion {
  id: number;
  nome: string;
  cpf?: string | null;
  atribuicao?: string | null;
  processosCount?: number;
  driveFolderId?: string | null;
  similarity: "exact" | "similar" | "first_last";
}

interface HomonymiaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedName: string;
  suggestions: HomonymiaSuggestion[];
  onSelect: (selection: { type: "existing"; assistidoId: number } | { type: "new" }) => void;
  isLoading?: boolean;
}

export function HomonymiaModal({
  open,
  onOpenChange,
  extractedName,
  suggestions,
  onSelect,
  isLoading = false,
}: HomonymiaModalProps) {
  const [selectedOption, setSelectedOption] = React.useState<string | null>(null);

  // Reset selection when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedOption(null);
    }
  }, [open]);

  const handleConfirm = () => {
    if (!selectedOption) return;

    if (selectedOption === "new") {
      onSelect({ type: "new" });
    } else {
      const assistidoId = parseInt(selectedOption, 10);
      onSelect({ type: "existing", assistidoId });
    }
  };

  const getSimilarityBadge = (similarity: HomonymiaSuggestion["similarity"]) => {
    switch (similarity) {
      case "exact":
        return (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            Nome Idêntico
          </Badge>
        );
      case "similar":
        return (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            Nome Similar
          </Badge>
        );
      case "first_last":
        return (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Primeiro/Último Nome
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Possível Homonímia Detectada
          </DialogTitle>
          <DialogDescription>
            Foram encontrados assistidos com nomes similares. Selecione o assistido correto ou crie um novo registro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nome extraído */}
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Nome extraído do documento:</p>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{extractedName}</p>
          </div>

          {/* Lista de sugestões */}
          <RadioGroup value={selectedOption || ""} onValueChange={setSelectedOption}>
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    selectedOption === String(suggestion.id)
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  )}
                  onClick={() => setSelectedOption(String(suggestion.id))}
                >
                  <RadioGroupItem value={String(suggestion.id)} id={`option-${suggestion.id}`} />
                  <Label
                    htmlFor={`option-${suggestion.id}`}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{suggestion.nome}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {suggestion.cpf && (
                            <span className="text-xs text-zinc-500 font-mono">
                              CPF: {suggestion.cpf}
                            </span>
                          )}
                          {suggestion.processosCount !== undefined && suggestion.processosCount > 0 && (
                            <span className="text-xs text-zinc-400">
                              {suggestion.processosCount} processo{suggestion.processosCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSimilarityBadge(suggestion.similarity)}
                      {suggestion.driveFolderId && (
                        <FolderOpen className="w-4 h-4 text-emerald-500" title="Pasta no Drive" />
                      )}
                    </div>
                  </Label>
                </div>
              ))}

              {/* Opção de criar novo */}
              <div
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                  selectedOption === "new"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 border-dashed"
                )}
                onClick={() => setSelectedOption("new")}
              >
                <RadioGroupItem value="new" id="option-new" />
                <Label
                  htmlFor="option-new"
                  className="flex-1 cursor-pointer flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Criar novo assistido</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Registrar &ldquo;{extractedName}&rdquo; como novo assistido
                    </p>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedOption || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? (
              "Processando..."
            ) : (
              <>
                Confirmar
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
