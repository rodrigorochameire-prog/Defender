"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ABAS = [
  { value: "manifestacao", label: "Manifestação" },
  { value: "ciencia", label: "Ciência" },
  { value: "razoes", label: "Razões/Contrarrazões" },
] as const;

export function SeeuIntimacoesImportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selecionadas, setSelecionadas] = useState<string[]>(
    ABAS.map((a) => a.value),
  );

  useEffect(() => {
    if (!isOpen) {
      setSelecionadas(ABAS.map((a) => a.value));
    }
  }, [isOpen]);

  const criar = trpc.seeuIntimacoes.criarImportJob.useMutation({
    onSuccess: (res) => {
      toast.success("Importação iniciada com sucesso");
      onClose();
      router.push(`/admin/demandas/importar/${res.taskId}?system=seeu`);
    },
    onError: (e) => toast.error("Erro ao iniciar importação: " + e.message),
  });

  const toggle = (v: string) =>
    setSelecionadas((s) =>
      s.includes(v) ? s.filter((x) => x !== v) : [...s, v],
    );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-white dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
            Importar intimações do SEEU
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400 dark:text-neutral-500">
            Selecione as abas da Mesa do Defensor a raspar (Execução Penal)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Abas */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Abas
            </p>
            {ABAS.map((a) => (
              <label
                key={a.value}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selecionadas.includes(a.value)}
                  onChange={() => toggle(a.value)}
                  className="rounded"
                />
                {a.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 text-sm border-neutral-300 dark:border-neutral-700"
          >
            Cancelar
          </Button>
          <Button
            disabled={selecionadas.length === 0 || criar.isPending}
            onClick={() =>
              criar.mutate({
                atribuicoes: ["EXECUCAO_PENAL"],
                abas: selecionadas as ("manifestacao" | "ciencia" | "razoes")[],
              })
            }
            className="h-9 px-4 text-sm bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {criar.isPending ? "Iniciando…" : "Iniciar importação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
