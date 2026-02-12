"use client";

/**
 * Botão de Extração Inteligente
 *
 * Dispara o modal de extração inteligente de documentos.
 * Pode ser usado em dois modos:
 * 1. Modo listagem: com arquivos pré-selecionados
 * 2. Modo página: abre modal de seleção de arquivos
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { SmartExtractModal } from "./SmartExtractModal";
import { cn } from "@/lib/utils";

export interface SmartExtractButtonProps {
  // Modo listagem: arquivos já selecionados
  selectedFileIds?: number[];

  // Contexto da entidade (obrigatório)
  entityType: "assistido" | "processo" | "caso";
  entityId: number;
  driveFolderId?: string;

  // IDs para enriquecimento (opcional - usa entityType/entityId se não fornecido)
  assistidoId?: number;
  processoId?: number;
  casoId?: number;

  // Callback quando extração é concluída
  onExtractComplete?: () => void;

  // Estilização
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;

  // Texto personalizado
  label?: string;

  // Desabilitar botão
  disabled?: boolean;
}

export function SmartExtractButton({
  selectedFileIds,
  entityType,
  entityId,
  driveFolderId,
  assistidoId,
  processoId,
  casoId,
  onExtractComplete,
  variant = "default",
  size = "default",
  className,
  label,
  disabled,
}: SmartExtractButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Determinar se o botão deve estar desabilitado
  const isDisabled =
    disabled ||
    // Modo listagem: precisa ter arquivos selecionados
    (selectedFileIds !== undefined && selectedFileIds.length === 0);

  // Determinar o label do botão
  const buttonLabel =
    label ||
    (selectedFileIds && selectedFileIds.length > 0
      ? `Extrair Dados (${selectedFileIds.length})`
      : "Extrair Dados");

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleExtractComplete = () => {
    setIsModalOpen(false);
    onExtractComplete?.();
  };

  // Determinar IDs para enriquecimento baseado no contexto
  const resolvedAssistidoId = assistidoId ?? (entityType === "assistido" ? entityId : undefined);
  const resolvedProcessoId = processoId ?? (entityType === "processo" ? entityId : undefined);
  const resolvedCasoId = casoId ?? (entityType === "caso" ? entityId : undefined);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn(
          "gap-2",
          // Estilo especial quando tem arquivos selecionados
          selectedFileIds &&
            selectedFileIds.length > 0 &&
            "bg-emerald-600 hover:bg-emerald-700 text-white",
          className
        )}
        onClick={handleClick}
        disabled={isDisabled}
      >
        <Sparkles className="h-4 w-4" />
        {size !== "icon" && buttonLabel}
      </Button>

      <SmartExtractModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        entityType={entityType}
        entityId={entityId}
        driveFolderId={driveFolderId}
        preSelectedFileIds={selectedFileIds}
        assistidoId={resolvedAssistidoId}
        processoId={resolvedProcessoId}
        casoId={resolvedCasoId}
        onComplete={handleExtractComplete}
      />
    </>
  );
}
