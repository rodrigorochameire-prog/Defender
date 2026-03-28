"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Plus, Scale, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DelitosTabProps {
  processoId: number;
}

function mesesParaTexto(meses: number): string {
  if (meses < 12) return `${meses} meses`;
  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (resto === 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos}a ${resto}m`;
}

interface BeneficioBadgeProps {
  label: string;
  cabe: boolean | null | undefined;
}

function BeneficioBadge({ label, cabe }: BeneficioBadgeProps) {
  if (cabe === null || cabe === undefined) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
        cabe
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
      )}
    >
      {cabe ? (
        <CheckCircle className="h-2.5 w-2.5" />
      ) : (
        <XCircle className="h-2.5 w-2.5" />
      )}
      {label}
    </span>
  );
}

export function DelitosTab({ processoId }: DelitosTabProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tipoDelito: "",
    artigoBase: "",
    penaMinimaMeses: "",
    penaMaximaMeses: "",
    envolveuViolencia: false,
    observacoes: "",
  });

  const { data: delitos = [], isLoading } = trpc.delitos.listByProcesso.useQuery(
    { processoId },
    { enabled: !isNaN(processoId) }
  );

  const createMutation = trpc.delitos.create.useMutation({
    onSuccess: () => {
      toast.success("Delito adicionado");
      void utils.delitos.listByProcesso.invalidate({ processoId });
      setOpen(false);
      setForm({
        tipoDelito: "",
        artigoBase: "",
        penaMinimaMeses: "",
        penaMaximaMeses: "",
        envolveuViolencia: false,
        observacoes: "",
      });
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tipoDelito.trim() || !form.artigoBase.trim()) {
      toast.error("Tipo e artigo base são obrigatórios");
      return;
    }
    createMutation.mutate({
      processoId,
      tipoDelito: form.tipoDelito.trim(),
      artigoBase: form.artigoBase.trim(),
      penaMinimaMeses: form.penaMinimaMeses ? Number(form.penaMinimaMeses) : undefined,
      penaMaximaMeses: form.penaMaximaMeses ? Number(form.penaMaximaMeses) : undefined,
      envolveuViolencia: form.envolveuViolencia,
      observacoes: form.observacoes.trim() || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Carregando delitos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header com botão */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Scale className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            Delitos Imputados
          </span>
          {delitos.length > 0 && (
            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">
              {delitos.length}
            </span>
          )}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 border-zinc-200 dark:border-zinc-700"
            >
              <Plus className="h-3 w-3" />
              Adicionar Delito
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Novo Delito</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Delito *</Label>
                <Input
                  value={form.tipoDelito}
                  onChange={(e) => setForm((f) => ({ ...f, tipoDelito: e.target.value }))}
                  placeholder="Ex: Homicídio Qualificado"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Artigo Base *</Label>
                <Input
                  value={form.artigoBase}
                  onChange={(e) => setForm((f) => ({ ...f, artigoBase: e.target.value }))}
                  placeholder="Ex: art. 121 §2º CP"
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pena Mínima (meses)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.penaMinimaMeses}
                    onChange={(e) => setForm((f) => ({ ...f, penaMinimaMeses: e.target.value }))}
                    placeholder="Ex: 144"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pena Máxima (meses)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.penaMaximaMeses}
                    onChange={(e) => setForm((f) => ({ ...f, penaMaximaMeses: e.target.value }))}
                    placeholder="Ex: 360"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="violencia"
                  checked={form.envolveuViolencia}
                  onChange={(e) => setForm((f) => ({ ...f, envolveuViolencia: e.target.checked }))}
                  className="rounded border-zinc-300"
                />
                <Label htmlFor="violencia" className="text-xs cursor-pointer">
                  Envolveu violência ou grave ameaça
                </Label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <Input
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Notas adicionais..."
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de delitos */}
      {delitos.length === 0 ? (
        <div className="text-center py-10 text-zinc-400">
          <Scale className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Nenhum delito registrado</p>
          <p className="text-[10px] mt-0.5 text-zinc-300">
            Adicione os delitos imputados ao assistido
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {delitos.map((delito) => (
            <div
              key={delito.id}
              className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                      {delito.tipoDelito}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 font-mono border-zinc-200 dark:border-zinc-700 text-zinc-500"
                    >
                      {delito.artigoBase}
                    </Badge>
                  </div>

                  {/* Penas */}
                  {(delito.penaMinimaMeses || delito.penaMaximaMeses) && (
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Pena:{" "}
                      {delito.penaMinimaMeses && mesesParaTexto(delito.penaMinimaMeses)}
                      {delito.penaMinimaMeses && delito.penaMaximaMeses && " – "}
                      {delito.penaMaximaMeses && mesesParaTexto(delito.penaMaximaMeses)}
                    </p>
                  )}

                  {/* Benefícios */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <BeneficioBadge label="ANPP" cabe={delito.cabeAnpp} />
                    <BeneficioBadge label="Sursis" cabe={delito.cabeSursis} />
                    <BeneficioBadge label="Transação" cabe={delito.cabeTransacao} />
                    <BeneficioBadge label="Substituição" cabe={delito.cabeSubstituicao} />
                  </div>

                  {/* Observações */}
                  {delito.observacoes && (
                    <p className="text-[10px] text-zinc-400 mt-1 italic">{delito.observacoes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
