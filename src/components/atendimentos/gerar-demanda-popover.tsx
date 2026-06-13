"use client";

// Gerar demanda a partir de um atendimento — popover leve (padrão do
// QuickRegistrar), sem acoplar o DemandaCreateModal. Confirma o ato (sugestões
// por atribuição + campo livre) e cria via demandas.createFromForm, vinculando
// assistido + processo. A peça nasce depois, da demanda, pelo fluxo atual.

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ListPlus } from "lucide-react";
import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";
import { AREA_TO_ATOS_LABEL, AREA_TO_ATRIBUICAO_ENUM } from "./config";

interface GerarDemandaPopoverProps {
  assistido: { id: number; nome: string };
  processo: { numeroAutos: string | null } | null;
  area: string | null;
  /** Botão acionador (asChild). */
  children: React.ReactNode;
}

export function GerarDemandaPopover({
  assistido,
  processo,
  area,
  children,
}: GerarDemandaPopoverProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [ato, setAto] = useState("");

  const areaKey = area ?? "CRIMINAL";
  // Catálogo de atos é por label; createFromForm exige um dos 6 enums válidos.
  const atosLabel = AREA_TO_ATOS_LABEL[areaKey] ?? "Criminal Geral";
  const atribuicaoEnum = AREA_TO_ATRIBUICAO_ENUM[areaKey] ?? "SUBSTITUICAO";
  const sugestoes = useMemo(
    () => getAtosPorAtribuicao(atosLabel).filter((a) => a.value !== "Todos").slice(0, 8),
    [atosLabel]
  );

  const criar = trpc.demandas.createFromForm.useMutation({
    onSuccess: () => {
      utils.demandas.list.invalidate();
      setOpen(false);
      setAto("");
      toast.success("Demanda criada na Triagem", {
        action: {
          label: "Ver no Kanban",
          onClick: () => {
            window.location.href = "/admin/demandas";
          },
        },
      });
    },
    onError: (e) => toast.error(`Erro ao criar demanda: ${e.message}`),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        className="w-80 p-3 rounded-xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Gerar demanda — {assistido.nome}
        </p>
        <Label htmlFor="gd-ato" className="text-[11px] text-muted-foreground">
          Ato a praticar
        </Label>
        <Input
          id="gd-ato"
          value={ato}
          onChange={(e) => setAto(e.target.value)}
          placeholder="Ex.: Requerimento de autorização para trabalho"
          autoFocus
          className="h-9 text-sm mt-1"
        />
        {sugestoes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {sugestoes.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setAto(s.label)}
                className="rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            disabled={!ato.trim() || criar.isPending}
            onClick={() =>
              criar.mutate({
                assistidoNome: assistido.nome,
                assistidoId: assistido.id,
                numeroAutos: processo?.numeroAutos ?? undefined,
                atribuicao: atribuicaoEnum,
                ato: ato.trim(),
                status: "triagem",
              })
            }
            className="flex-1 gap-1.5 h-8 text-[12px]"
          >
            {criar.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ListPlus className="w-3.5 h-3.5" />
            )}
            Criar demanda
          </Button>
          <Button size="sm" variant="ghost" asChild className="h-8 text-[12px] text-muted-foreground">
            <Link href="/admin/demandas" onClick={() => setOpen(false)}>
              Kanban
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
