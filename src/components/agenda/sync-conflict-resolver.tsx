import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  User,
  FileText,
} from "lucide-react";

interface ConflictData {
  campo: string;
  valorOmbuds: string;
  valorGoogle: string;
  ultimaAlteracaoOmbuds: string;
  ultimaAlteracaoGoogle: string;
}

interface EventoConflito {
  id: string;
  titulo: string;
  tipo: string;
  conflitos: ConflictData[];
}

interface SyncConflictResolverProps {
  isOpen: boolean;
  onClose: () => void;
  conflitos: EventoConflito[];
  onResolve: (resolucoes: { [eventoId: string]: { [campo: string]: "ombuds" | "google" } }) => void;
}

export function SyncConflictResolver({
  isOpen,
  onClose,
  conflitos,
  onResolve,
}: SyncConflictResolverProps) {
  const [resolucoes, setResolucoes] = useState<{
    [eventoId: string]: { [campo: string]: "ombuds" | "google" };
  }>({});

  const handleSelectResolution = (eventoId: string, campo: string, fonte: "ombuds" | "google") => {
    setResolucoes((prev) => ({
      ...prev,
      [eventoId]: {
        ...prev[eventoId],
        [campo]: fonte,
      },
    }));
  };

  const handleSelectAllForEvent = (eventoId: string, fonte: "ombuds" | "google") => {
    const evento = conflitos.find((c) => c.id === eventoId);
    if (!evento) return;

    const novasResolucoes: { [campo: string]: "ombuds" | "google" } = {};
    evento.conflitos.forEach((conflito) => {
      novasResolucoes[conflito.campo] = fonte;
    });

    setResolucoes((prev) => ({
      ...prev,
      [eventoId]: novasResolucoes,
    }));
  };

  const handleResolveAll = () => {
    // Verificar se todos os conflitos foram resolvidos
    const todosResolvidos = conflitos.every((evento) =>
      evento.conflitos.every(
        (conflito) => resolucoes[evento.id]?.[conflito.campo]
      )
    );

    if (!todosResolvidos) {
      toast.error("Resolva todos os conflitos antes de continuar");
      return;
    }

    onResolve(resolucoes);
    toast.success("Conflitos resolvidos com sucesso!");
    onClose();
  };

  const getCampoIcon = (campo: string) => {
    switch (campo) {
      case "data":
        return Calendar;
      case "horarioInicio":
      case "horarioFim":
        return Clock;
      case "local":
        return MapPin;
      case "assistido":
        return User;
      case "titulo":
      case "descricao":
        return FileText;
      default:
        return FileText;
    }
  };

  const getCampoLabel = (campo: string) => {
    const labels: { [key: string]: string } = {
      data: "Data",
      horarioInicio: "Hora Início",
      horarioFim: "Hora Fim",
      local: "Local",
      assistido: "Assistido",
      titulo: "Título",
      descricao: "Descrição",
      processo: "Processo",
      status: "Status",
    };
    return labels[campo] || campo;
  };

  const formatValor = (campo: string, valor: string) => {
    if (campo === "data") {
      return new Date(valor).toLocaleDateString("pt-BR");
    }
    return valor;
  };

  const totalConflitos = conflitos.reduce((sum, evento) => sum + evento.conflitos.length, 0);
  const resolvidos = Object.values(resolucoes).reduce(
    (sum, res) => sum + Object.keys(res).length,
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            Resolver Conflitos de Sincronização
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            Foram detectadas diferenças entre o Ombuds e o Google Calendar. Escolha qual versão
            manter para cada campo.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Progresso da Resolução
            </span>
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
              {resolvidos}/{totalConflitos}
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(resolvidos / totalConflitos) * 100}%` }}
            />
          </div>
        </div>

        {/* Lista de Conflitos */}
        <div className="space-y-4">
          {conflitos.map((evento) => (
            <Card key={evento.id} className="p-4 border-2 border-orange-200 dark:border-orange-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">
                    {evento.titulo}
                  </h3>
                  <Badge variant="secondary" className="mt-1">
                    {evento.conflitos.length} conflito(s)
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllForEvent(evento.id, "ombuds")}
                  >
                    Manter Ombuds
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllForEvent(evento.id, "google")}
                  >
                    Manter Google
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {evento.conflitos.map((conflito, index) => {
                  const Icon = getCampoIcon(conflito.campo);
                  const resolucaoAtual = resolucoes[evento.id]?.[conflito.campo];

                  return (
                    <div
                      key={index}
                      className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
                    >
                      <div className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 flex items-center gap-2">
                        <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">
                          {getCampoLabel(conflito.campo)}
                        </span>
                        {resolucaoAtual && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-px bg-zinc-200 dark:bg-zinc-700">
                        {/* Versão Ombuds */}
                        <button
                          onClick={() =>
                            handleSelectResolution(evento.id, conflito.campo, "ombuds")
                          }
                          className={`p-3 text-left transition-all ${
                            resolucaoAtual === "ombuds"
                              ? "bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-600 dark:border-blue-500"
                              : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            >
                              Ombuds
                            </Badge>
                            {resolucaoAtual === "ombuds" && (
                              <CheckCircle2 className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                            {formatValor(conflito.campo, conflito.valorOmbuds)}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Alterado em{" "}
                            {new Date(conflito.ultimaAlteracaoOmbuds).toLocaleString("pt-BR")}
                          </p>
                        </button>

                        {/* Versão Google */}
                        <button
                          onClick={() =>
                            handleSelectResolution(evento.id, conflito.campo, "google")
                          }
                          className={`p-3 text-left transition-all ${
                            resolucaoAtual === "google"
                              ? "bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-600 dark:border-emerald-500"
                              : "bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge
                              variant="secondary"
                              className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                            >
                              Google Calendar
                            </Badge>
                            {resolucaoAtual === "google" && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            )}
                          </div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                            {formatValor(conflito.campo, conflito.valorGoogle)}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Alterado em{" "}
                            {new Date(conflito.ultimaAlteracaoGoogle).toLocaleString("pt-BR")}
                          </p>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleResolveAll}
            disabled={resolvidos < totalConflitos}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Resolver Todos ({resolvidos}/{totalConflitos})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
