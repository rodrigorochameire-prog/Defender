"use client";

import { useState } from "react";
import { Plus, FileText, MessageSquare, NotebookPen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EventFormDiligencia } from "./event-form-diligencia";
import { EventFormAtendimento } from "./event-form-atendimento";
// Stub — Task 14 implements Observação form

interface Props {
  demandaId: number;
}

type FormKey = null | "diligencia" | "atendimento" | "observacao";

export function TimelineFAB({ demandaId }: Props) {
  const [open, setOpen] = useState<FormKey>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Registrar novo evento"
            className="absolute bottom-6 right-6 size-12 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-colors flex items-center justify-center"
          >
            <Plus className="size-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          <DropdownMenuItem onClick={() => setOpen("diligencia")}>
            <FileText className="size-4 mr-2" /> Diligência
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen("atendimento")}>
            <MessageSquare className="size-4 mr-2" /> Atendimento
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpen("observacao")}>
            <NotebookPen className="size-4 mr-2" /> Observação
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EventFormDiligencia
        demandaId={demandaId}
        open={open === "diligencia"}
        onOpenChange={(v) => setOpen(v ? "diligencia" : null)}
      />
      <EventFormAtendimento
        demandaId={demandaId}
        open={open === "atendimento"}
        onOpenChange={(v) => setOpen(v ? "atendimento" : null)}
      />
      {/* Task 14: form para observação */}
    </>
  );
}
