"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Plus, Baby, Shield, CheckCircle, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AtosInfracionaisTabProps {
  processoId: number;
}

const REMISSAO_CONFIG: Record<string, { label: string; className: string }> = {
  CONCEDIDA_MP: {
    label: "Remissao MP",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  CONCEDIDA_JUIZ: {
    label: "Remissao Juiz",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  NEGADA: {
    label: "Remissao Negada",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function AtosInfracionaisTab({ processoId }: AtosInfracionaisTabProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [remissaoDialog, setRemissaoDialog] = useState<number | null>(null);
  const [form, setForm] = useState({
    atoEquiparado: "",
    artigoEquiparado: "",
    envolveuViolencia: false,
    envolveuGraveAmeaca: false,
    idadeNaData: "",
    observacoes: "",
  });
  const [remissaoForm, setRemissaoForm] = useState({
    remissao: "" as "CONCEDIDA_MP" | "CONCEDIDA_JUIZ" | "NEGADA" | "",
    dataRemissao: "",
  });

  const { data: atos = [], isLoading } = trpc.atosInfracionais.listByProcesso.useQuery(
    { processoId },
    { enabled: !isNaN(processoId) }
  );

  const createMutation = trpc.atosInfracionais.create.useMutation({
    onSuccess: () => {
      toast.success("Ato infracional adicionado");
      void utils.atosInfracionais.listByProcesso.invalidate({ processoId });
      setOpen(false);
      setForm({
        atoEquiparado: "",
        artigoEquiparado: "",
        envolveuViolencia: false,
        envolveuGraveAmeaca: false,
        idadeNaData: "",
        observacoes: "",
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const remissaoMutation = trpc.atosInfracionais.updateRemissao.useMutation({
    onSuccess: () => {
      toast.success("Remissao registrada");
      void utils.atosInfracionais.listByProcesso.invalidate({ processoId });
      setRemissaoDialog(null);
      setRemissaoForm({ remissao: "", dataRemissao: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.atoEquiparado.trim() || !form.artigoEquiparado.trim()) {
      toast.error("Ato equiparado e artigo sao obrigatorios");
      return;
    }
    createMutation.mutate({
      processoId,
      atoEquiparado: form.atoEquiparado.trim(),
      artigoEquiparado: form.artigoEquiparado.trim(),
      envolveuViolencia: form.envolveuViolencia,
      envolveuGraveAmeaca: form.envolveuGraveAmeaca,
      idadeNaData: form.idadeNaData ? Number(form.idadeNaData) : undefined,
      observacoes: form.observacoes.trim() || undefined,
    });
  }

  function handleRemissaoSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!remissaoForm.remissao || remissaoDialog === null) {
      toast.error("Selecione o tipo de remissao");
      return;
    }
    remissaoMutation.mutate({
      id: remissaoDialog,
      remissao: remissaoForm.remissao as "CONCEDIDA_MP" | "CONCEDIDA_JUIZ" | "NEGADA",
      dataRemissao: remissaoForm.dataRemissao || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Carregando atos infracionais...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Baby className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            Atos Infracionais
          </span>
          {atos.length > 0 && (
            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">
              {atos.length}
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
              Adicionar Ato
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-sm">Novo Ato Infracional</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 mt-2">
              <div className="space-y-1">
                <Label className="text-xs">Ato Equiparado *</Label>
                <Input
                  value={form.atoEquiparado}
                  onChange={(e) => setForm((f) => ({ ...f, atoEquiparado: e.target.value }))}
                  placeholder="Ex: Roubo, Trafico, Lesao Corporal"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Artigo Equiparado *</Label>
                <Input
                  value={form.artigoEquiparado}
                  onChange={(e) => setForm((f) => ({ ...f, artigoEquiparado: e.target.value }))}
                  placeholder="Ex: art. 157 CP, art. 33 Lei 11.343"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Idade na Data do Ato</Label>
                <Input
                  type="number"
                  min="12"
                  max="17"
                  value={form.idadeNaData}
                  onChange={(e) => setForm((f) => ({ ...f, idadeNaData: e.target.value }))}
                  placeholder="Ex: 16"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="violencia-ato"
                    checked={form.envolveuViolencia}
                    onChange={(e) => setForm((f) => ({ ...f, envolveuViolencia: e.target.checked }))}
                    className="rounded border-zinc-300"
                  />
                  <Label htmlFor="violencia-ato" className="text-xs cursor-pointer">
                    Violencia
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="grave-ameaca"
                    checked={form.envolveuGraveAmeaca}
                    onChange={(e) => setForm((f) => ({ ...f, envolveuGraveAmeaca: e.target.checked }))}
                    className="rounded border-zinc-300"
                  />
                  <Label htmlFor="grave-ameaca" className="text-xs cursor-pointer">
                    Grave Ameaca
                  </Label>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observacoes</Label>
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

      {/* Remissao Dialog */}
      <Dialog open={remissaoDialog !== null} onOpenChange={(v) => !v && setRemissaoDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Registrar Remissao</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRemissaoSubmit} className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de Remissao *</Label>
              <Select
                value={remissaoForm.remissao}
                onValueChange={(v) => setRemissaoForm((f) => ({ ...f, remissao: v as typeof f.remissao }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONCEDIDA_MP" className="text-sm">Concedida pelo MP</SelectItem>
                  <SelectItem value="CONCEDIDA_JUIZ" className="text-sm">Concedida pelo Juiz</SelectItem>
                  <SelectItem value="NEGADA" className="text-sm">Negada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data da Remissao</Label>
              <Input
                type="date"
                value={remissaoForm.dataRemissao}
                onChange={(e) => setRemissaoForm((f) => ({ ...f, dataRemissao: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setRemissaoDialog(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={remissaoMutation.isPending}
              >
                {remissaoMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Registrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lista de atos */}
      {atos.length === 0 ? (
        <div className="text-center py-10 text-zinc-400">
          <Baby className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">Nenhum ato infracional registrado</p>
          <p className="text-[10px] mt-0.5 text-zinc-300">
            Adicione os atos infracionais equiparados
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {atos.map((ato) => {
            const remConfig = ato.remissao ? REMISSAO_CONFIG[ato.remissao] : null;
            return (
              <div
                key={ato.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 bg-white dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                        {ato.atoEquiparado}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 font-mono border-zinc-200 dark:border-zinc-700 text-zinc-500"
                      >
                        {ato.artigoEquiparado}
                      </Badge>
                      {ato.idadeNaData && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-full">
                          {ato.idadeNaData} anos
                        </span>
                      )}
                    </div>

                    {/* Violence badges */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ato.envolveuViolencia && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                          <Shield className="h-2.5 w-2.5" />
                          Violencia
                        </span>
                      )}
                      {ato.envolveuGraveAmeaca && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          <Shield className="h-2.5 w-2.5" />
                          Grave Ameaca
                        </span>
                      )}
                      {/* Remissao badge */}
                      {remConfig ? (
                        <span className={cn("inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium", remConfig.className)}>
                          <CheckCircle className="h-2.5 w-2.5" />
                          {remConfig.label}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                          Sem remissao
                        </span>
                      )}
                    </div>

                    {ato.observacoes && (
                      <p className="text-[10px] text-zinc-400 mt-1 italic">{ato.observacoes}</p>
                    )}
                  </div>

                  {/* Registrar Remissao button */}
                  {!ato.remissao && (
                    <button
                      onClick={() => setRemissaoDialog(ato.id)}
                      className="text-[9px] px-2 py-0.5 rounded-full border font-medium transition-colors border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-emerald-400 hover:text-emerald-700 shrink-0"
                    >
                      Remissao
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
