"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  Calendar,
  Loader2,
  CheckCircle2,
  Palmtree,
  GraduationCap,
  HeartPulse,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

// ==========================================
// TIPOS DE AFASTAMENTO
// ==========================================
const TIPOS_AFASTAMENTO = [
  { id: "FERIAS" as const, label: "Ferias", icon: Palmtree, desc: "Periodo de ferias regulamentares" },
  { id: "LICENCA" as const, label: "Licenca", icon: HeartPulse, desc: "Licenca medica ou pessoal" },
  { id: "CAPACITACAO" as const, label: "Capacitacao", icon: GraduationCap, desc: "Curso, congresso ou treinamento" },
  { id: "OUTRO" as const, label: "Outro", icon: MoreHorizontal, desc: "Outro motivo de afastamento" },
] as const;

type TipoAfastamento = typeof TIPOS_AFASTAMENTO[number]["id"];

// Props do modal
interface CoberturaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSucesso?: () => void;
}

export function CoberturaModal({
  open,
  onOpenChange,
  onSucesso,
}: CoberturaModalProps) {
  // Form state
  const [substitutoId, setSubstitutoId] = useState<string>("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [tipo, setTipo] = useState<TipoAfastamento>("FERIAS");
  const [motivo, setMotivo] = useState("");

  // Query: colegas disponíveis
  const { data: colegas, isLoading: loadingColegas } = trpc.cobertura.colegasDisponiveis.useQuery(
    undefined,
    { enabled: open }
  );

  // Mutation
  const utils = trpc.useUtils();
  const criarAfastamento = trpc.cobertura.criarAfastamento.useMutation({
    onSuccess: () => {
      const colegaNome = colegas?.find(c => c.id === parseInt(substitutoId))?.name || "colega";
      toast.success("Cobertura registrada!", {
        description: `${colegaNome} vai cobrir seu afastamento.`,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      });

      resetForm();
      onOpenChange(false);
      utils.cobertura.meusAfastamentos.invalidate();
      utils.cobertura.coberturas.invalidate();
      onSucesso?.();
    },
    onError: (error) => {
      toast.error("Erro ao registrar cobertura", {
        description: error.message,
      });
    },
  });

  const resetForm = () => {
    setSubstitutoId("");
    setDataInicio("");
    setDataFim("");
    setTipo("FERIAS");
    setMotivo("");
  };

  const handleSubmit = () => {
    if (!substitutoId) {
      toast.error("Selecione quem vai cobrir");
      return;
    }
    if (!dataInicio) {
      toast.error("Informe a data de inicio");
      return;
    }
    if (!dataFim) {
      toast.error("Informe a data de fim");
      return;
    }

    criarAfastamento.mutate({
      substitutoId: parseInt(substitutoId),
      dataInicio,
      dataFim,
      tipo,
      motivo: motivo.trim() || undefined,
    });
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Admin",
      defensor: "Defensor(a)",
      servidor: "Servidor(a)",
      estagiario: "Estagiario(a)",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      defensor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      servidor: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
      estagiario: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
    };
    return colors[role] || "bg-zinc-100 text-zinc-700";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const selectedTipo = TIPOS_AFASTAMENTO.find(t => t.id === tipo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="text-lg">Cobrir Colega</span>
              <p className="text-xs font-normal text-zinc-500 mt-0.5">
                Registre um afastamento e defina quem assume suas demandas
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo de afastamento */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Tipo de afastamento
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {TIPOS_AFASTAMENTO.map((t) => {
                const TipoIcon = t.icon;
                const isSelected = tipo === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTipo(t.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
                      isSelected
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
                        : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 hover:border-zinc-300"
                    )}
                  >
                    <TipoIcon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Substituto */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Quem vai cobrir <span className="text-rose-500">*</span>
            </Label>
            {loadingColegas ? (
              <div className="h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              </div>
            ) : (
              <Select value={substitutoId} onValueChange={setSubstitutoId}>
                <SelectTrigger className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                  <SelectValue placeholder="Selecione um colega..." />
                </SelectTrigger>
                <SelectContent>
                  {colegas?.length === 0 ? (
                    <div className="p-4 text-center text-sm text-zinc-500">
                      Nenhum colega encontrado
                    </div>
                  ) : (
                    colegas?.map((colega) => (
                      <SelectItem key={colega.id} value={colega.id.toString()}>
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-600 dark:to-zinc-700 font-semibold">
                              {getInitials(colega.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{colega.name}</span>
                          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 ml-auto", getRoleColor(colega.role))}>
                            {getRoleLabel(colega.role)}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-zinc-400" />
                Inicio <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-zinc-400" />
                Fim <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                min={dataInicio || undefined}
              />
            </div>
          </div>

          {/* Motivo (opcional) */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Motivo / observacoes
            </Label>
            <Textarea
              placeholder="Descreva o motivo do afastamento (opcional)..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="min-h-[80px] resize-none rounded-xl bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => { resetForm(); onOpenChange(false); }}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={criarAfastamento.isPending || !substitutoId || !dataInicio || !dataFim}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all"
          >
            {criarAfastamento.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                Registrar Cobertura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
