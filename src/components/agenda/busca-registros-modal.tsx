import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { exportarHistorico, HistoricoAudiencia } from "@/lib/data/historico-audiencias";
import {
  Search,
  X,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Download,
  Eye,
  Gavel,
  Users,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BuscaRegistrosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewRegistro?: (registro: HistoricoAudiencia) => void;
}

export function BuscaRegistrosModal({
  isOpen,
  onClose,
  onViewRegistro,
}: BuscaRegistrosModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRealizada, setFilterRealizada] = useState<"todas" | "realizadas" | "redesignadas">("todas");
  const [filterResultado, setFilterResultado] = useState<string>("");
  const [selectedRegistro, setSelectedRegistro] = useState<HistoricoAudiencia | null>(null);

  // Obter todos os registros
  const todosRegistros = exportarHistorico();

  // Filtrar registros
  const registrosFiltrados = useMemo(() => {
    let filtered = todosRegistros;

    // Filtro por texto de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (reg) =>
          reg.processoId?.toLowerCase().includes(searchLower) ||
          reg.assistidoId?.toLowerCase().includes(searchLower) ||
          reg.resultado?.toLowerCase().includes(searchLower) ||
          reg.anotacoesGerais?.toLowerCase().includes(searchLower) ||
          reg.manifestacaoDefesa?.toLowerCase().includes(searchLower) ||
          reg.decisaoJuiz?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro por status
    if (filterRealizada === "realizadas") {
      filtered = filtered.filter((reg) => reg.realizada);
    } else if (filterRealizada === "redesignadas") {
      filtered = filtered.filter((reg) => !reg.realizada);
    }

    // Filtro por resultado
    if (filterResultado) {
      filtered = filtered.filter((reg) => reg.resultado === filterResultado);
    }

    // Ordenar por data mais recente
    return filtered.sort(
      (a, b) => new Date(b.dataRegistro).getTime() - new Date(a.dataRegistro).getTime()
    );
  }, [todosRegistros, searchTerm, filterRealizada, filterResultado]);

  // Obter resultados únicos para o filtro
  const resultadosUnicos = useMemo(() => {
    const resultados = new Set<string>();
    todosRegistros.forEach((reg) => {
      if (reg.resultado) resultados.add(reg.resultado);
    });
    return Array.from(resultados);
  }, [todosRegistros]);

  const handleExportarCSV = () => {
    const headers = [
      "Data",
      "Processo",
      "Assistido",
      "Realizada",
      "Resultado",
      "Depoentes",
      "Registrado Por",
    ];

    const rows = registrosFiltrados.map((reg) => [
      format(new Date(reg.dataRealizacao), "dd/MM/yyyy", { locale: ptBR }),
      reg.processoId || "-",
      reg.assistidoId || "-",
      reg.realizada ? "Sim" : "Não",
      reg.resultado || "-",
      reg.depoentes.length.toString(),
      reg.registradoPor,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `registros-audiencias-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">Busca Global de Registros</DialogTitle>
        <DialogDescription className="sr-only">
          Sistema de busca e visualização de registros de audiências
        </DialogDescription>

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Busca Global de Registros</h2>
              <p className="text-xs text-white/80">
                {registrosFiltrados.length} registro(s) encontrado(s)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Barra de Busca e Filtros */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar por processo, assistido, resultado, manifestações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Filtros:
              </span>
            </div>

            {/* Status */}
            <div className="flex gap-2">
              <Button
                variant={filterRealizada === "todas" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRealizada("todas")}
              >
                Todas
              </Button>
              <Button
                variant={filterRealizada === "realizadas" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRealizada("realizadas")}
                className="gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Realizadas
              </Button>
              <Button
                variant={filterRealizada === "redesignadas" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterRealizada("redesignadas")}
                className="gap-1"
              >
                <XCircle className="w-3 h-3" />
                Redesignadas
              </Button>
            </div>

            {/* Resultado */}
            {resultadosUnicos.length > 0 && (
              <select
                value={filterResultado}
                onChange={(e) => setFilterResultado(e.target.value)}
                className="px-3 py-1.5 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900"
              >
                <option value="">Todos os resultados</option>
                {resultadosUnicos.map((resultado) => (
                  <option key={resultado} value={resultado}>
                    {resultado}
                  </option>
                ))}
              </select>
            )}

            {/* Exportar */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportarCSV}
              className="ml-auto gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-hidden flex">
          {/* Lista de Registros */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-3">
              {registrosFiltrados.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-zinc-400" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                    Nenhum registro encontrado
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Tente ajustar os filtros ou termos de busca
                  </p>
                </Card>
              ) : (
                registrosFiltrados.map((registro) => (
                  <Card
                    key={registro.historicoId}
                    className={`p-4 border-2 transition-all cursor-pointer hover:shadow-lg ${
                      selectedRegistro?.historicoId === registro.historicoId
                        ? "border-blue-500 bg-blue-50/30 dark:bg-blue-950/20"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                    onClick={() => setSelectedRegistro(registro)}
                  >
                    <div className="flex items-start gap-4">
                      {/* Ícone e Status */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          registro.realizada
                            ? "bg-emerald-100 dark:bg-emerald-950/30"
                            : "bg-orange-100 dark:bg-orange-950/30"
                        }`}
                      >
                        <Gavel
                          className={`w-6 h-6 ${
                            registro.realizada
                              ? "text-emerald-600 dark:text-emerald-500"
                              : "text-orange-600 dark:text-orange-500"
                          }`}
                        />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                className={
                                  registro.realizada
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                }
                              >
                                {registro.realizada ? "Realizada" : "Redesignada"}
                              </Badge>
                              {registro.resultado && (
                                <Badge variant="outline">{registro.resultado}</Badge>
                              )}
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-50">
                              {registro.processoId || "Processo não informado"}
                            </h3>
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-500 whitespace-nowrap">
                            {format(new Date(registro.dataRealizacao), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>

                        {/* Informações */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {registro.assistidoId && (
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                              <User className="w-3.5 h-3.5" />
                              <span className="truncate">{registro.assistidoId}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                            <Users className="w-3.5 h-3.5" />
                            <span>{registro.depoentes.length} depoente(s)</span>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs">
                              Registrado em{" "}
                              {format(new Date(registro.dataRegistro), "dd/MM/yy HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Preview */}
                        {registro.anotacoesGerais && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">
                            {registro.anotacoesGerais}
                          </p>
                        )}
                      </div>

                      {/* Ações */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onViewRegistro) {
                            onViewRegistro(registro);
                            onClose();
                          }
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Preview do Registro Selecionado */}
          {selectedRegistro && (
            <div className="w-96 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <ScrollArea className="h-full p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">
                        Detalhes do Registro
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRegistro(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {format(new Date(selectedRegistro.dataRealizacao), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  {/* Informações Básicas */}
                  <Card className="p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        PROCESSO
                      </p>
                      <p className="text-sm font-mono text-zinc-900 dark:text-zinc-50">
                        {selectedRegistro.processoId || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        ASSISTIDO
                      </p>
                      <p className="text-sm text-zinc-900 dark:text-zinc-50">
                        {selectedRegistro.assistidoId || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                        RESULTADO
                      </p>
                      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {selectedRegistro.resultado || "Não informado"}
                      </Badge>
                    </div>
                  </Card>

                  {/* Depoentes */}
                  {selectedRegistro.depoentes.length > 0 && (
                    <Card className="p-4">
                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
                        DEPOENTES ({selectedRegistro.depoentes.length})
                      </p>
                      <div className="space-y-2">
                        {selectedRegistro.depoentes.map((depoente) => (
                          <div
                            key={depoente.id}
                            className="flex items-center justify-between text-sm p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded"
                          >
                            <span className="font-medium text-zinc-900 dark:text-zinc-50">
                              {depoente.nome}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {depoente.tipo}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Manifestação da Defesa */}
                  {selectedRegistro.manifestacaoDefesa && (
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          MANIFESTAÇÃO DA DEFESA
                        </p>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {selectedRegistro.manifestacaoDefesa}
                      </p>
                    </Card>
                  )}

                  {/* Decisão do Juiz */}
                  {selectedRegistro.decisaoJuiz && (
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Gavel className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          DECISÃO DO JUIZ
                        </p>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {selectedRegistro.decisaoJuiz}
                      </p>
                    </Card>
                  )}

                  {/* Anotações Gerais */}
                  {selectedRegistro.anotacoesGerais && (
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          ANOTAÇÕES GERAIS
                        </p>
                      </div>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        {selectedRegistro.anotacoesGerais}
                      </p>
                    </Card>
                  )}

                  {/* Ação */}
                  <Button
                    className="w-full"
                    onClick={() => {
                      if (onViewRegistro) {
                        onViewRegistro(selectedRegistro);
                        onClose();
                      }
                    }}
                  >
                    Abrir Registro Completo
                  </Button>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
