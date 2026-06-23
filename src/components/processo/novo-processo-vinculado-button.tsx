"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NovoProcessoVinculadoDialog } from "./novo-processo-vinculado-dialog";

interface Props {
  processoOrigemId: number;
  /** Quando fornecido, ao criar o processo a demanda é movida para o novo processo. */
  moverDemandaId?: number;
  variant?: "dark" | "light";
  label?: string;
}

export function NovoProcessoVinculadoButton({
  processoOrigemId,
  moverDemandaId,
  variant = "light",
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const dark = variant === "dark";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors",
          dark
            ? "text-white/40 hover:text-white/80 hover:bg-white/[0.06]"
            : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:text-neutral-200 dark:hover:bg-neutral-900",
        )}
      >
        <Plus className="w-3 h-3" />
        {label ?? "Novo vinculado"}
      </button>
      <NovoProcessoVinculadoDialog
        open={open}
        onOpenChange={setOpen}
        processoOrigemId={processoOrigemId}
        moverDemandaId={moverDemandaId}
      />
    </>
  );
}
