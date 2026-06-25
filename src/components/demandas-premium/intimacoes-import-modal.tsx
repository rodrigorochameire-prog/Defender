"use client";

import { useState } from "react";
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

const ATRIBUICOES = [
  { value: "VVD_CAMACARI", label: "Violência Doméstica" },
  { value: "JURI_CAMACARI", label: "Júri" },
] as const;

export function IntimacoesImportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [selecionadas, setSelecionadas] = useState<string[]>(["VVD_CAMACARI"]);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [limit, setLimit] = useState(80);

  const criar = trpc.intimacoes.criarImportJob.useMutation({
    onSuccess: (res) => {
      onClose();
      router.push(`/admin/demandas/importar/${res.taskId}`);
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
            Importar intimações do PJe
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400 dark:text-neutral-500">
            Selecione as atribuições e configure o intervalo de datas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Atribuições */}
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Atribuições
            </p>
            {ATRIBUICOES.map((a) => (
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
            <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-not-allowed">
              <input type="checkbox" disabled className="rounded" />
              Execução Penal (em breve)
            </label>
          </div>

          {/* Intervalo de datas + limite */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                De
              </span>
              <input
                type="date"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Até
              </span>
              <input
                type="date"
                value={until}
                onChange={(e) => setUntil(e.target.value)}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Limite de itens
              </span>
              <input
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-2 py-1.5 text-sm bg-white dark:bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </label>
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
                atribuicoes: selecionadas as ("VVD_CAMACARI" | "JURI_CAMACARI")[],
                since: since || undefined,
                until: until || undefined,
                limit,
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
