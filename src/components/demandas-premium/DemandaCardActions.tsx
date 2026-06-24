"use client";

import Link from "next/link";
import { ChevronRight, Edit, Archive, ArchiveRestore, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface DemandaCardActionsProps {
  /** Destino da ação principal "Abrir". */
  href: string;
  arquivado?: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

/**
 * Rodapé de ações do card de demanda (Fase 3 — anatomia do item):
 * uma ação principal visível ("Abrir") + as secundárias recolhidas num overflow "⋯".
 * Antes eram 4 botões competindo (Abrir/Editar/Arquivar/Excluir).
 */
export function DemandaCardActions({
  href,
  arquivado,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: DemandaCardActionsProps) {
  return (
    <div className="flex gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
      {/* Ação principal */}
      <Link href={href} className="flex-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          <ChevronRight className="w-3.5 h-3.5 mr-1.5" />
          Abrir
        </Button>
      </Link>

      {/* Ações secundárias → overflow */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Mais ações"
            onClick={(e) => e.stopPropagation()}
            className="h-8 w-8 p-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="w-3.5 h-3.5 mr-2" />
            Editar
          </DropdownMenuItem>
          {arquivado ? (
            <DropdownMenuItem onClick={onUnarchive}>
              <ArchiveRestore className="w-3.5 h-3.5 mr-2" />
              Restaurar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="w-3.5 h-3.5 mr-2" />
              Arquivar
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-red-600 dark:text-red-400 focus:text-red-700 dark:focus:text-red-300"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
