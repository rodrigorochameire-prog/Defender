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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Users, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtractedPerson {
  name: string;
  role: string; // REU, INVESTIGADO, CUSTODIADO, etc.
}

interface SelectAssistedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedPersons: ExtractedPerson[];
  onConfirm: (selectedNames: string[]) => void;
  isLoading?: boolean;
}

export function SelectAssistedModal({
  open,
  onOpenChange,
  extractedPersons,
  onConfirm,
  isLoading = false,
}: SelectAssistedModalProps) {
  const [selectedNames, setSelectedNames] = React.useState<Set<string>>(new Set());

  // Reset selection when modal opens
  React.useEffect(() => {
    if (open) {
      // Por padrão, selecionar todos
      setSelectedNames(new Set(extractedPersons.map((p) => p.name)));
    }
  }, [open, extractedPersons]);

  const togglePerson = (name: string) => {
    const newSet = new Set(selectedNames);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setSelectedNames(newSet);
  };

  const selectAll = () => {
    setSelectedNames(new Set(extractedPersons.map((p) => p.name)));
  };

  const selectNone = () => {
    setSelectedNames(new Set());
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedNames));
  };

  const getRoleBadgeColor = (role: string) => {
    const roleUpper = role.toUpperCase();
    if (roleUpper.includes("REU") || roleUpper.includes("RÉU")) {
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    }
    if (roleUpper.includes("INVESTIGADO")) {
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    }
    if (roleUpper.includes("CUSTODIADO")) {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
    if (roleUpper.includes("FLAGRANTEADO")) {
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    }
    return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Selecione os Assistidos
          </DialogTitle>
          <DialogDescription>
            Foram encontradas múltiplas partes no documento. Selecione quais estão sendo assistidas pela Defensoria Pública.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Aviso */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Nem todas as partes listadas podem ser assistidas pela Defensoria. Confirme apenas os assistidos corretos.
            </p>
          </div>

          {/* Ações rápidas */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} className="text-xs h-7">
              Selecionar todos
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone} className="text-xs h-7">
              Limpar seleção
            </Button>
            <span className="text-xs text-zinc-500 ml-auto">
              {selectedNames.size} de {extractedPersons.length} selecionados
            </span>
          </div>

          {/* Lista de pessoas */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {extractedPersons.map((person, index) => {
              const isSelected = selectedNames.has(person.name);
              return (
                <div
                  key={`${person.name}-${index}`}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                  )}
                  onClick={() => togglePerson(person.name)}
                >
                  <Checkbox
                    id={`person-${index}`}
                    checked={isSelected}
                    onCheckedChange={() => togglePerson(person.name)}
                  />
                  <Label
                    htmlFor={`person-${index}`}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {person.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase",
                        getRoleBadgeColor(person.role)
                      )}
                    >
                      {person.role}
                    </span>
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedNames.size === 0 || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? (
              "Processando..."
            ) : (
              <>
                Confirmar ({selectedNames.size})
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
