"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Users,
  Calendar,
  AlertCircle,
  Check,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// CONFIGURAÇÕES
// ============================================

const PROFISSIONAIS = [
  { id: 1, nome: "Dr. Rodrigo", grupo: "juri_ep_vvd", cor: "emerald" },
  { id: 2, nome: "Dra. Juliane", grupo: "juri_ep_vvd", cor: "blue" },
  { id: 3, nome: "Dra. Cristiane", grupo: "varas_criminais", cor: "purple" },
  { id: 4, nome: "Dr. Danilo", grupo: "varas_criminais", cor: "orange" },
];

const PRAZOS_RAPIDOS = [
  { label: "1 semana", value: addWeeks(new Date(), 1) },
  { label: "2 semanas", value: addWeeks(new Date(), 2) },
  { label: "1 mês", value: addMonths(new Date(), 1) },
  { label: "Permanente", value: null },
];

// ============================================
// TIPOS
// ============================================

type CompartilharDemandaModalProps = {
  entidadeTipo: "demanda" | "audiencia" | "processo" | "caso";
  entidadeId: number;
  entidadeTitulo: string;
  profissionalAtualId: number;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

// ============================================
// COMPONENTE
// ============================================

export function CompartilharDemandaModal({
  entidadeTipo,
  entidadeId,
  entidadeTitulo,
  profissionalAtualId,
  trigger,
  onSuccess,
}: CompartilharDemandaModalProps) {
  const [open, setOpen] = useState(false);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [motivo, setMotivo] = useState("");
  const [prazoSelecionado, setPrazoSelecionado] = useState<Date | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const compartilharMutation = trpc.profissionais.compartilhar.useMutation();

  // Profissionais disponíveis (exceto o atual)
  const profissionaisDisponiveis = PROFISSIONAIS.filter(
    (p) => p.id !== profissionalAtualId
  );

  // Toggle seleção
  const toggleSelecionado = (id: number) => {
    setSelecionados((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Salvar compartilhamentos
  const salvar = async () => {
    if (selecionados.length === 0) return;

    setSalvando(true);
    try {
      for (const compartilhadoComId of selecionados) {
        await compartilharMutation.mutateAsync({
          entidadeTipo,
          entidadeId,
          compartilhadoPorId: profissionalAtualId,
          compartilhadoComId,
          motivo: motivo || undefined,
          dataFim: prazoSelecionado?.toISOString(),
        });
      }
      setSucesso(true);
      setTimeout(() => {
        setOpen(false);
        setSucesso(false);
        setSelecionados([]);
        setMotivo("");
        setPrazoSelecionado(null);
        onSuccess?.();
      }, 1500);
    } finally {
      setSalvando(false);
    }
  };

  // Resetar ao fechar
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelecionados([]);
      setMotivo("");
      setPrazoSelecionado(null);
      setSucesso(false);
    }
  };

  const tipoLabel = {
    demanda: "demanda",
    audiencia: "audiência",
    processo: "processo",
    caso: "caso",
  }[entidadeTipo];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            Compartilhar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-600" />
            Compartilhar {tipoLabel}
          </DialogTitle>
          <DialogDescription>
            Compartilhe esta {tipoLabel} com outros defensores para colaboração.
          </DialogDescription>
        </DialogHeader>

        {sucesso ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Compartilhado com sucesso!
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Os colegas selecionados foram notificados.
            </p>
          </div>
        ) : (
          <>
            {/* ENTIDADE */}
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 mb-4">
              <p className="text-xs text-zinc-500 mb-1">Compartilhando:</p>
              <p className="font-bold text-zinc-900 dark:text-zinc-50 truncate">
                {entidadeTitulo}
              </p>
            </div>

            {/* SELECIONAR COLEGAS */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                Compartilhar com:
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {profissionaisDisponiveis.map((prof) => {
                  const isSelected = selecionados.includes(prof.id);
                  return (
                    <button
                      key={prof.id}
                      onClick={() => toggleSelecionado(prof.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? `border-${prof.cor}-500 bg-${prof.cor}-50 dark:bg-${prof.cor}-950/30`
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      }`}
                    >
                      <Checkbox checked={isSelected} className="pointer-events-none" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {prof.nome}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {prof.grupo === "juri_ep_vvd" ? "Júri/EP/VVD" : "Vara Criminal"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRAZO */}
            <div className="space-y-3 mt-4">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-400" />
                Prazo do compartilhamento:
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRAZOS_RAPIDOS.map((prazo, idx) => {
                  const isSelected =
                    prazo.value === null
                      ? prazoSelecionado === null
                      : prazoSelecionado?.getTime() === prazo.value.getTime();
                  return (
                    <button
                      key={idx}
                      onClick={() => setPrazoSelecionado(prazo.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                      }`}
                    >
                      {prazo.label}
                    </button>
                  );
                })}
              </div>
              {prazoSelecionado && (
                <p className="text-xs text-zinc-500">
                  Expira em: {format(prazoSelecionado, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>

            {/* MOTIVO */}
            <div className="space-y-2 mt-4">
              <Label htmlFor="motivo">Motivo (opcional):</Label>
              <Textarea
                id="motivo"
                placeholder="Ex: Férias, substituição, colaboração..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* ALERTA */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 mt-4">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Os colegas selecionados receberão uma notificação e poderão visualizar esta {tipoLabel} 
                {prazoSelecionado === null ? " permanentemente" : " até a data de expiração"}.
              </p>
            </div>
          </>
        )}

        {!sucesso && (
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={salvar}
              disabled={selecionados.length === 0 || salvando}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Compartilhando...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartilhar
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
