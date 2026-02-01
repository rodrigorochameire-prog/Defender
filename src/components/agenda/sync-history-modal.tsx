import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Clock,
  ArrowRight,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

interface SyncHistoryEntry {
  id: string;
  timestamp: string;
  tipo: "import" | "export" | "bidirectional";
  status: "sucesso" | "parcial" | "erro";
  eventosAfetados: number;
  eventosImportados?: number;
  eventosExportados?: number;
  conflitosResolvidos?: number;
  erros?: string[];
  detalhes: {
    calendario?: string;
    atribuicao?: string;
    duracao: number; // em milissegundos
  };
}

interface SyncHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historico: SyncHistoryEntry[];
}

export function SyncHistoryModal({ isOpen, onClose, historico }: SyncHistoryModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);

  const historicoFiltrado = historico.filter((entry) => {
    const matchSearch =
      entry.detalhes.calendario?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.detalhes.atribuicao?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchTipo = !filtroTipo || entry.tipo === filtroTipo;
    const matchStatus = !filtroStatus || entry.status === filtroStatus;

    return matchSearch && matchTipo && matchStatus;
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "import":
        return Download;
      case "export":
        return Upload;
      case "bidirectional":
        return RefreshCw;
      default:
        return RefreshCw;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "import":
        return "Importação";
      case "export":
        return "Exportação";
      case "bidirectional":
        return "Sincronização Bidirecional";
      default:
        return tipo;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "sucesso":
        return {
          icon: CheckCircle2,
          color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
          label: "Sucesso",
        };
      case "parcial":
        return {
          icon: AlertTriangle,
          color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
          label: "Parcial",
        };
      case "erro":
        return {
          icon: XCircle,
          color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
          label: "Erro",
        };
      default:
        return {
          icon: CheckCircle2,
          color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
          label: status,
        };
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <History className="w-6 h-6 text-purple-600" />
            Histórico de Sincronizações
          </DialogTitle>
          <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
            Visualize todas as sincronizações realizadas entre Ombuds e Google Calendar.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por calendário ou atribuição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-zinc-900"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filtroTipo === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroTipo(null)}
            >
              Todos os Tipos
            </Button>
            <Button
              variant={filtroTipo === "import" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroTipo("import")}
            >
              <Download className="w-3 h-3 mr-1" />
              Importação
            </Button>
            <Button
              variant={filtroTipo === "export" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroTipo("export")}
            >
              <Upload className="w-3 h-3 mr-1" />
              Exportação
            </Button>
            <Button
              variant={filtroTipo === "bidirectional" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroTipo("bidirectional")}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Bidirecional
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={filtroStatus === null ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroStatus(null)}
            >
              Todos os Status
            </Button>
            <Button
              variant={filtroStatus === "sucesso" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroStatus("sucesso")}
            >
              Sucesso
            </Button>
            <Button
              variant={filtroStatus === "parcial" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroStatus("parcial")}
            >
              Parcial
            </Button>
            <Button
              variant={filtroStatus === "erro" ? "default" : "outline"}
              size="sm"
              onClick={() => setFiltroStatus("erro")}
            >
              Erro
            </Button>
          </div>
        </div>

        {/* Lista de Histórico */}
        <div className="space-y-3">
          {historicoFiltrado.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 mx-auto mb-4 flex items-center justify-center">
                <History className="w-8 h-8 text-zinc-400 dark:text-zinc-600" />
              </div>
              <p className="font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nenhum registro encontrado
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Ajuste os filtros ou realize uma sincronização
              </p>
            </div>
          ) : (
            historicoFiltrado.map((entry) => {
              const TipoIcon = getTipoIcon(entry.tipo);
              const statusConfig = getStatusConfig(entry.status);
              const StatusIcon = statusConfig.icon;

              return (
                <Card
                  key={entry.id}
                  className="p-4 border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                        <TipoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-zinc-50">
                          {getTipoLabel(entry.tipo)}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(entry.timestamp).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge variant="secondary" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDuration(entry.detalhes.duracao)}
                    </Badge>
                  </div>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded">
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-1">
                        Eventos Afetados
                      </p>
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        {entry.eventosAfetados}
                      </p>
                    </div>

                    {entry.eventosImportados !== undefined && (
                      <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 mb-1">
                          Importados
                        </p>
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                          {entry.eventosImportados}
                        </p>
                      </div>
                    )}

                    {entry.eventosExportados !== undefined && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-1">
                          Exportados
                        </p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                          {entry.eventosExportados}
                        </p>
                      </div>
                    )}

                    {entry.conflitosResolvidos !== undefined && entry.conflitosResolvidos > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-1">
                          Conflitos
                        </p>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
                          {entry.conflitosResolvidos}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Detalhes */}
                  {(entry.detalhes.calendario || entry.detalhes.atribuicao) && (
                    <div className="flex gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      {entry.detalhes.calendario && (
                        <Badge variant="secondary">
                          <Calendar className="w-3 h-3 mr-1" />
                          {entry.detalhes.calendario}
                        </Badge>
                      )}
                      {entry.detalhes.atribuicao && (
                        <Badge variant="secondary">{entry.detalhes.atribuicao}</Badge>
                      )}
                    </div>
                  )}

                  {/* Erros */}
                  {entry.erros && entry.erros.length > 0 && (
                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-200 dark:border-red-800">
                      <p className="text-xs font-semibold text-red-900 dark:text-red-100 mb-1">
                        Erros:
                      </p>
                      <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5">
                        {entry.erros.map((erro, index) => (
                          <li key={index}>• {erro}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Total: {historicoFiltrado.length} registros
          </p>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
