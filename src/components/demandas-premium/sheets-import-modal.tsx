"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  User,
  FileText,
  Clock,
  Lock,
  AlertCircle,
  Trash2,
  Gavel,
  Home,
  Folder,
  Shield,
  Target,
  RefreshCw,
} from "lucide-react";

interface SheetsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (demandas: any[]) => void;
}

interface ParsedDemanda {
  id: string;
  status: string;
  estadoPrisional: string;
  data: string;
  prazo: string;
  assistido: string;
  processos: { tipo: string; numero: string }[];
  ato: string;
  providencias: string;
  atribuicao: string;
  valido: boolean;
  erros: string[];
}

// Mapeamento de status da planilha para status do sistema
const STATUS_MAP: Record<string, string> = {
  "analisar": "analisar",
  "elaborar": "elaborar",
  "elaborando": "elaborando",
  "atender": "atender",
  "buscar": "buscar",
  "revisar": "revisar",
  "protocolar": "protocolar",
  "protocolado": "protocolado",
  "monitorar": "monitorar",
  "fila": "fila",
  "relatório": "monitorar",
  "emilly": "fila", // Delegação para pessoa específica -> fila
  "urgente": "urgente",
  "resolvido": "resolvido",
};

// Opções de atribuição - usando IDs do sistema para compatibilidade
const ATRIBUICAO_OPTIONS = [
  { value: "JURI_CAMACARI", label: "Vara do Júri - Camaçari", icon: Gavel },
  { value: "GRUPO_JURI", label: "Grupo Especial do Júri", icon: Target },
  { value: "VVD_CAMACARI", label: "Violência Doméstica - Camaçari", icon: Home },
  { value: "EXECUCAO_PENAL", label: "Execução Penal", icon: Lock },
  { value: "SUBSTITUICAO", label: "Criminal Geral", icon: Folder },
  { value: "SUBSTITUICAO_CIVEL", label: "Substituição Cível", icon: RefreshCw },
  { value: "CURADORIA", label: "Curadoria Especial", icon: Shield },
];

export function SheetsImportModal({ isOpen, onClose, onImport }: SheetsImportModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsedDemandas, setParsedDemandas] = useState<ParsedDemanda[]>([]);
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<string>("");

  // Função para extrair status do texto (ex: "2 - Analisar" -> "analisar")
  const parseStatus = (statusText: string): string => {
    if (!statusText) return "fila";
    
    // Remove números e traços do início
    const cleaned = statusText.replace(/^\d+\s*-\s*/i, "").trim().toLowerCase();
    
    // Busca no mapa de status
    for (const [key, value] of Object.entries(STATUS_MAP)) {
      if (cleaned.includes(key)) {
        return value;
      }
    }
    
    return "fila";
  };

  // Função para normalizar estado prisional
  const parseEstadoPrisional = (estado: string): string => {
    if (!estado) return "solto";
    const estadoLower = estado.toLowerCase().trim();
    
    if (estadoLower.includes("preso") || estadoLower.includes("cadeia") || estadoLower.includes("prisão")) {
      return "preso";
    }
    if (estadoLower.includes("monitor")) {
      return "monitorado";
    }
    if (estadoLower.includes("solto")) {
      return "solto";
    }
    
    return "solto";
  };

  // Função para normalizar data (DD.MM.YY ou DD/MM/YY -> DD/MM/YY)
  const parseData = (dataText: string): string => {
    if (!dataText) return "";
    
    // Limpa espaços e substitui . por /
    const cleaned = dataText.trim().replace(/\./g, "/");
    
    // Valida formato DD/MM/YY
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
      const [, dia, mes, ano] = match;
      const anoFinal = ano.length === 2 ? ano : ano.slice(-2);
      return `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anoFinal}`;
    }
    
    return cleaned;
  };

  // Função para extrair número de processo com tipo opcional
  const parseProcesso = (processoText: string, tipoColuna?: string): { tipo: string; numero: string }[] => {
    if (!processoText) return [];

    // Pode ter múltiplos processos separados por quebra de linha
    const processos = processoText.split(/\n/).map(p => p.trim()).filter(p => p);

    return processos.map(numero => {
      // Se veio tipo da coluna separada, usar ele
      if (tipoColuna && tipoColuna.trim()) {
        return { tipo: tipoColuna.trim().toUpperCase(), numero: numero.trim() };
      }

      // Detectar tipo pelo padrão no próprio texto (ex: "IP 8009873-02.2024...")
      let tipo = "";
      const tipoMatch = numero.match(/^(AP|IP|APF|MPU|EP|ANPP|PPP|Cautelar|HC|TC|RC|OE)\s+/i);
      if (tipoMatch) {
        tipo = tipoMatch[1].toUpperCase();
        numero = numero.replace(tipoMatch[0], "").trim();
      }

      return { tipo, numero: numero.trim() };
    });
  };

  // Parser principal
  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error("Cole o conteúdo da planilha");
      return;
    }

    const lines = rawText.split("\n").filter(line => line.trim());
    const demandas: ParsedDemanda[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Dividir por tabulação (padrão do Google Sheets ao copiar)
      const columns = line.split("\t");
      
      // Padrão esperado (com coluna Tipo):
      // [0] Status (ex: "2 - Analisar")
      // [1] Estado Prisional (opcional, ex: "Preso")
      // [2] Data (ex: "23.01.26")
      // [3] Assistido
      // [4] Tipo (ex: "AP", "IP", "MPU") - NOVO
      // [5] Autos/Processo
      // [6] Ato
      // [7] Prazo (opcional)
      // [8] Providências

      const erros: string[] = [];

      const statusRaw = columns[0]?.trim() || "";
      const estadoPrisionalRaw = columns[1]?.trim() || "";
      const dataRaw = columns[2]?.trim() || "";
      const assistido = columns[3]?.trim() || "";
      const tipoProcessoRaw = columns[4]?.trim() || "";
      const processoRaw = columns[5]?.trim() || "";
      const ato = columns[6]?.trim() || "";
      const prazoRaw = columns[7]?.trim() || "";
      const providencias = columns[8]?.trim() || "";

      // Validações
      if (!assistido) {
        erros.push("Nome do assistido é obrigatório");
      }

      const status = parseStatus(statusRaw);
      const estadoPrisional = parseEstadoPrisional(estadoPrisionalRaw);
      const data = parseData(dataRaw);
      const prazo = parseData(prazoRaw);
      const processos = parseProcesso(processoRaw, tipoProcessoRaw);

      demandas.push({
        id: `sheets-${Date.now()}-${i}`,
        status,
        estadoPrisional,
        data: data || new Date().toLocaleDateString("pt-BR"),
        prazo,
        assistido,
        processos,
        ato: ato || "Demanda importada",
        providencias,
        atribuicao: selectedAtribuicao,
        valido: erros.length === 0,
        erros,
      });
    }

    setParsedDemandas(demandas);
    
    const validas = demandas.filter(d => d.valido).length;
    const invalidas = demandas.length - validas;
    
    if (validas > 0) {
      toast.success(`${validas} demandas identificadas${invalidas > 0 ? ` (${invalidas} com erros)` : ""}`);
    } else {
      toast.error("Nenhuma demanda válida encontrada");
    }
  };

  const handleRemove = (id: string) => {
    setParsedDemandas(prev => prev.filter(d => d.id !== id));
  };

  const handleImport = () => {
    const validas = parsedDemandas.filter(d => d.valido);
    
    if (validas.length === 0) {
      toast.error("Nenhuma demanda válida para importar");
      return;
    }

    // Converter para formato esperado
    const demandasParaImportar = validas.map(d => ({
      id: d.id,
      status: d.status,
      estadoPrisional: d.estadoPrisional,
      data: d.data,
      prazo: d.prazo,
      assistido: d.assistido,
      processos: d.processos,
      ato: d.ato,
      providencias: d.providencias,
      atribuicao: d.atribuicao,
      arquivado: false,
    }));

    onImport(demandasParaImportar);
    toast.success(`${demandasParaImportar.length} demandas importadas com sucesso!`);
    
    // Limpar e fechar
    setRawText("");
    setParsedDemandas([]);
    onClose();
  };

  const handleClose = () => {
    setRawText("");
    setParsedDemandas([]);
    setSelectedAtribuicao("");
    onClose();
  };

  const stats = useMemo(() => {
    const validas = parsedDemandas.filter(d => d.valido).length;
    const invalidas = parsedDemandas.length - validas;
    return { total: parsedDemandas.length, validas, invalidas };
  }, [parsedDemandas]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            Importar do Google Sheets
          </DialogTitle>
          <DialogDescription>
            Cole o conteúdo copiado da planilha do Google Sheets. O formato esperado é:
            <span className="block mt-1 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 p-2 rounded">
              Status | Prisão | Data | Assistido | Tipo | Autos | Ato | Prazo | Providências
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Seletor de atribuição (obrigatório) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Atribuição <span className="text-red-500">*</span>
            </Label>
            <Select value={selectedAtribuicao} onValueChange={setSelectedAtribuicao}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a atribuição das demandas..." />
              </SelectTrigger>
              <SelectContent>
                {ATRIBUICAO_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-zinc-500">
              Todas as demandas importadas serão atribuídas a esta vara
            </p>
          </div>

          {/* Área de texto para colar */}
          <div>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole aqui o conteúdo copiado da planilha do Google Sheets..."
              className="min-h-[120px] font-mono text-xs"
              disabled={!selectedAtribuicao}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-zinc-500">
                {rawText.split("\n").filter(l => l.trim()).length} linhas detectadas
              </p>
              <Button
                onClick={handleParse}
                size="sm"
                disabled={!rawText.trim() || !selectedAtribuicao}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Processar
              </Button>
            </div>
          </div>

          {/* Prévia das demandas */}
          {parsedDemandas.length > 0 && (
            <div className="space-y-3">
              {/* Stats */}
              <div className="flex items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">{stats.validas} válidas</span>
                </div>
                {stats.invalidas > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-600">{stats.invalidas} com erros</span>
                  </div>
                )}
              </div>

              {/* Lista de demandas */}
              <div className="max-h-[300px] overflow-auto space-y-2">
                {parsedDemandas.map((demanda) => (
                  <Card
                    key={demanda.id}
                    className={`p-3 ${!demanda.valido ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Linha 1: Nome e Status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <User className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{demanda.assistido || "Sem nome"}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {demanda.status}
                          </Badge>
                          {demanda.estadoPrisional === "preso" && (
                            <Lock className="w-3 h-3 text-red-500" />
                          )}
                        </div>

                        {/* Linha 2: Tipo, Processo e Ato */}
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <FileText className="w-3 h-3 flex-shrink-0" />
                          {demanda.processos[0]?.tipo && (
                            <span className="font-semibold text-emerald-600">{demanda.processos[0].tipo}</span>
                          )}
                          <span className="font-mono">{demanda.processos[0]?.numero || "Sem processo"}</span>
                          <span>•</span>
                          <span className="truncate">{demanda.ato}</span>
                        </div>

                        {/* Linha 3: Data e Atribuição */}
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          {demanda.data && (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>{demanda.data}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{demanda.atribuicao}</span>
                        </div>

                        {/* Erros */}
                        {demanda.erros.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertCircle className="w-3 h-3" />
                            {demanda.erros.join(", ")}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-red-500"
                        onClick={() => handleRemove(demanda.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={stats.validas === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Importar {stats.validas} demandas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
