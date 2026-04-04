"use client";

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { QuickRegister } from "./quick-register";
import { AtendimentoTimeline } from "./atendimento-timeline";
import { FilterPopover, type FilterState, INITIAL_FILTERS } from "./filter-popover";
import { RegistroCompletoSheet } from "./registro-completo-sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SubTab = "todos" | "assistido" | "familiares" | "gravacoes";

interface AtendimentosTabProps {
  assistidoId: number;
  processoIdAtivo?: number;
  assistidoNome?: string;
  processos: Array<{ id: number; numeroAutos: string }>;
}

const subTabs: { key: SubTab; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "assistido", label: "Com assistido" },
  { key: "familiares", label: "Familiares" },
  { key: "gravacoes", label: "Gravações" },
];

export function AtendimentosTab({
  assistidoId,
  processoIdAtivo,
  processos,
}: AtendimentosTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("todos");
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const queryParams = useMemo(() => {
    const params: Record<string, any> = {
      assistidoId,
      limit: 50,
      offset: 0,
    };

    // SubTab filters
    if (subTab === "assistido") params.interlocutor = "assistido";
    if (subTab === "gravacoes") params.hasRecording = true;
    // "familiares" — filter client-side since router only supports single interlocutor

    // Popover filters
    if (filters.tipos.length > 0) params.tipo = filters.tipos;
    if (filters.statuses.length > 0) params.status = filters.statuses;
    if (filters.periodo !== "all") {
      const now = new Date();
      if (filters.periodo === "week") {
        params.dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      } else if (filters.periodo === "month") {
        params.dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      } else if (filters.periodo === "year") {
        params.dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    return params;
  }, [assistidoId, subTab, filters]);

  const { data, isLoading } = trpc.atendimentos.list.useQuery(queryParams);

  const displayItems = useMemo(() => {
    const items = data?.items ?? [];
    if (subTab === "familiares") {
      return items.filter(
        (item) =>
          item.atendimento.interlocutor &&
          item.atendimento.interlocutor !== "assistido"
      );
    }
    return items;
  }, [data?.items, subTab]);

  const utils = trpc.useUtils();

  const deleteMutation = trpc.atendimentos.delete.useMutation({
    onSuccess: () => {
      toast.success("Atendimento excluído");
      utils.atendimentos.list.invalidate();
      setDeleteId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleInvalidate = useCallback(() => {
    utils.atendimentos.list.invalidate();
  }, [utils]);

  return (
    <div className="flex flex-col">
      {/* 1. Quick Register */}
      <QuickRegister
        assistidoId={assistidoId}
        processoIdAtivo={processoIdAtivo}
        processos={processos}
        onOpenFullForm={() => {
          setEditingAtendimento(null);
          setSheetOpen(true);
        }}
        onSuccess={handleInvalidate}
      />

      {/* 2. SubTabs */}
      <div className="flex items-center gap-0.5 mx-0 mt-3 mb-0 overflow-x-auto rounded-lg bg-neutral-100 dark:bg-neutral-800 p-1">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0",
              subTab === tab.key
                ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-white/5"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. Filter line */}
      <div className="mt-2">
        <FilterPopover
          filters={filters}
          onApply={setFilters}
          total={data?.total ?? 0}
        />
      </div>

      {/* 4. Timeline */}
      <div className="mt-2">
        <AtendimentoTimeline
          items={displayItems as any}
          processos={processos}
          isLoading={isLoading}
          onEdit={(atendimento) => {
            setEditingAtendimento(atendimento);
            setSheetOpen(true);
          }}
          onDelete={(id) => setDeleteId(id)}
        />
      </div>

      {/* Sheet (hidden until opened) */}
      <RegistroCompletoSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        assistidoId={assistidoId}
        processoIdAtivo={processoIdAtivo}
        processos={processos}
        atendimento={editingAtendimento}
        onSuccess={handleInvalidate}
      />

      {/* Delete confirm dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
