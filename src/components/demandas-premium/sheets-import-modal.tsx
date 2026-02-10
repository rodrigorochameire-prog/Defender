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
  onUpdate?: (demandas: any[]) => void; // Para atualizar demandas existentes
  demandasExistentes?: any[]; // Lista de demandas já cadastradas
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
  ordemOriginal?: number; // Posição original na planilha (para ordenação por "recentes")
}

// Mapeamento de status da planilha para status do sistema
// Números são apenas para ordenação na planilha e são ignorados (ex: "2 - Analisar" → "Analisar")
const STATUS_MAP: Record<string, string> = {
  // 1 - Urgente
  "urgente": "Urgente",

  // 2 - Análise/Elaboração
  "analisar": "Analisar",
  "relatório": "Relatório",
  "atender": "Atender",
  "elaborar": "Elaborar",
  "buscar": "Buscar",
  "revisar": "Revisar",
  "elaborando": "Elaborando",

  // 3 - Protocolar
  "protocolar": "Protocolar",

  // 4 - Delegação para pessoas/estágios
  "amanda": "Amanda",
  "estágio - taissa": "Estágio - Taissa",
  "estagio - taissa": "Estágio - Taissa",
  "taissa": "Estágio - Taissa",
  "emilly": "Emilly",
  "monitorar": "Monitorar",

  // 5 - Fila
  "fila": "Fila",

  // 6 - Documentos/Testemunhas
  "documentos": "Documentos",
  "testemunhas": "Testemunhas",

  // 7 - Finalizados
  "protocolado": "Protocolado",
  "sigad": "Sigad",
  "ciência": "Ciência",
  "ciencia": "Ciência",
  "peticionamento irregular": "Peticionamento irregular",
  "peticionamento ir": "Peticionamento irregular",
  "resolvido": "Resolvido",
  "constituiu advogado": "Constituiu advogado",
  "constituiu advoga": "Constituiu advogado",
  "sem atuação": "Sem atuação",
  "sem atuacao": "Sem atuação",
  "arquivado": "Arquivado",
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

interface DuplicataInfo {
  nova: ParsedDemanda;
  existente: any;
  diferencas: string[];
}

// Função para normalizar nome para comparação
function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Função para verificar se duas demandas são duplicatas
// Critério: mesmo processo + mesma data de expedição
// Isso permite múltiplas demandas do mesmo processo para diferentes intimações
function saoMesmaDemanda(nova: ParsedDemanda, existente: any): boolean {
  // Comparar por número de processo
  const processoNovo = nova.processos[0]?.numero;
  const processoExistente = existente.processos?.[0]?.numero;

  // Se processos são diferentes, verificar fallback por nome + data
  if (!processoNovo || !processoExistente || processoNovo !== processoExistente) {
    // Fallback: comparar por nome + data (para casos sem processo)
    const nomeNovo = normalizarNome(nova.assistido);
    const nomeExistente = normalizarNome(existente.assistido || '');

    if (nomeNovo === nomeExistente && nova.data && nova.data === existente.data) {
      return true;
    }
    return false;
  }

  // Mesmo processo - verificar data de expedição (data de entrada)
  const dataNovaISO = nova.data; // Já deve estar em formato ISO
  const dataExistente = existente.dataEntrada || existente.data;

  // Se ambas têm data, comparar - é duplicata se mesma data
  if (dataNovaISO && dataExistente) {
    return dataNovaISO === dataExistente;
  }

  // Se nenhuma tem data, verificar se demanda existente é recente (últimos 30 dias)
  if (!dataNovaISO && !dataExistente) {
    const createdAt = existente.createdAt ? new Date(existente.createdAt) : null;
    if (createdAt) {
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
      return createdAt >= trintaDiasAtras;
    }
  }

  return false;
}

// Função para identificar diferenças entre demandas
function identificarDiferencas(nova: ParsedDemanda, existente: any): string[] {
  const diferencas: string[] = [];

  // Comparar substatus (status granular da planilha) - case-insensitive
  const novoStatus = nova.status?.toLowerCase?.() || '';
  const existenteSubstatus = existente.substatus?.toLowerCase?.() || '';
  if (novoStatus && novoStatus !== existenteSubstatus) {
    diferencas.push(`Status: ${existente.substatus || 'vazio'} → ${nova.status}`);
  }

  // Comparar ato - case-insensitive
  const novoAto = nova.ato?.toLowerCase?.() || '';
  const existenteAto = existente.ato?.toLowerCase?.() || '';
  if (novoAto && novoAto !== existenteAto && nova.ato !== "Demanda importada") {
    diferencas.push(`Ato: ${existente.ato || 'vazio'} → ${nova.ato}`);
  }

  // Comparar prazo
  if (nova.prazo && nova.prazo !== existente.prazo) {
    diferencas.push(`Prazo: ${existente.prazo || 'vazio'} → ${nova.prazo}`);
  }

  // Comparar providências
  const novasProv = nova.providencias?.trim?.() || '';
  const existenteProv = existente.providencias?.trim?.() || '';
  if (novasProv && novasProv !== existenteProv) {
    diferencas.push(`Providências atualizadas`);
  }

  // Comparar estado prisional
  const novoEstado = nova.estadoPrisional?.toLowerCase?.() || 'solto';
  const existenteEstado = existente.reuPreso ? 'preso' : 'solto';
  if (novoEstado !== existenteEstado) {
    diferencas.push(`Estado: ${existenteEstado} → ${novoEstado}`);
  }

  return diferencas;
}

export function SheetsImportModal({ isOpen, onClose, onImport, onUpdate, demandasExistentes = [] }: SheetsImportModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsedDemandas, setParsedDemandas] = useState<ParsedDemanda[]>([]);
  const [selectedAtribuicao, setSelectedAtribuicao] = useState<string>("");

  // Separação de novas vs duplicatas
  const [demandasNovas, setDemandasNovas] = useState<ParsedDemanda[]>([]);
  const [duplicatas, setDuplicatas] = useState<DuplicataInfo[]>([]);

  // Função para extrair status do texto (ex: "2 - Analisar" -> "Analisar")
  const parseStatus = (statusText: string): string => {
    if (!statusText) return "Fila";

    // Remove números e traços do início (ex: "2 - Analisar" -> "Analisar")
    const cleaned = statusText.replace(/^\d+\s*-\s*/i, "").trim();
    const cleanedLower = cleaned.toLowerCase();

    // Busca no mapa de status
    for (const [key, value] of Object.entries(STATUS_MAP)) {
      if (cleanedLower.includes(key)) {
        return value;
      }
    }

    // Se não encontrou no mapa, retorna o status original (capitalizado)
    // Isso permite status personalizados como nomes de pessoas
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
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
    let linhasIgnoradas = 0;
    let contadorOrdem = 0; // Contador para preservar ordem original da planilha

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Dividir por tabulação (padrão do Google Sheets ao copiar)
      const columns = line.split("\t");

      // Detectar formato da planilha:
      // Formato 1 (8 colunas - sem Tipo):
      //   Status | Prisão | Data | Assistido | Autos | Ato | Prazo | Providências
      //   [0]      [1]      [2]     [3]        [4]     [5]   [6]      [7]
      //
      // Formato 2 (9 colunas - com Tipo):
      //   Status | Prisão | Data | Assistido | Tipo | Autos | Ato | Prazo | Providências
      //   [0]      [1]      [2]     [3]        [4]    [5]     [6]   [7]      [8]

      const temColunaTipo = columns.length >= 9;

      const statusRaw = columns[0]?.trim() || "";
      const estadoPrisionalRaw = columns[1]?.trim() || "";
      const dataRaw = columns[2]?.trim() || "";
      const assistido = columns[3]?.trim() || "";

      let tipoProcessoRaw: string;
      let processoRaw: string;
      let ato: string;
      let prazoRaw: string;
      let providencias: string;

      if (temColunaTipo) {
        // Formato com 9 colunas (inclui Tipo)
        tipoProcessoRaw = columns[4]?.trim() || "";
        processoRaw = columns[5]?.trim() || "";
        ato = columns[6]?.trim() || "";
        prazoRaw = columns[7]?.trim() || "";
        providencias = columns[8]?.trim() || "";
      } else {
        // Formato com 8 colunas (sem Tipo)
        tipoProcessoRaw = "";
        processoRaw = columns[4]?.trim() || "";
        ato = columns[5]?.trim() || "";
        prazoRaw = columns[6]?.trim() || "";
        providencias = columns[7]?.trim() || "";
      }

      // FILTRO: Ignorar linhas sem dados essenciais
      // Uma linha válida precisa ter pelo menos o nome do assistido
      // Também ignorar linhas que parecem ser cabeçalhos
      const pareceCabecalho = assistido.toLowerCase().includes("assistido") ||
                              assistido.toLowerCase().includes("nome") ||
                              statusRaw.toLowerCase() === "status";

      if (!assistido || pareceCabecalho) {
        linhasIgnoradas++;
        continue; // Pular linhas vazias ou cabeçalhos
      }

      // Também ignorar se a linha só tem valores vazios ou espaços
      const temDadosReais = columns.some(col => col && col.trim().length > 0 &&
                                          !col.trim().match(/^[\s\-\_\.]+$/));
      if (!temDadosReais) {
        linhasIgnoradas++;
        continue;
      }

      const erros: string[] = [];

      // Validação adicional: avisar se não tem processo (mas não bloquear)
      // Não é erro, apenas aviso - processo será criado automaticamente

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
        ordemOriginal: contadorOrdem++, // Preservar ordem original da planilha
      });
    }

    // Informar sobre linhas ignoradas
    if (linhasIgnoradas > 0) {
      toast.info(`${linhasIgnoradas} linha(s) em branco ou cabeçalho foram ignoradas`);
    }

    setParsedDemandas(demandas);

    // Separar demandas novas de duplicatas
    const novas: ParsedDemanda[] = [];
    const dups: DuplicataInfo[] = [];

    console.log("[SheetsImport] Verificando duplicatas. Existentes:", demandasExistentes.length);

    for (const demanda of demandas.filter(d => d.valido)) {
      const existente = demandasExistentes.find(e => saoMesmaDemanda(demanda, e));

      if (existente) {
        // Sempre incluir como duplicata para atualizar (sincronizar dados da planilha)
        const diferencas = identificarDiferencas(demanda, existente);
        // Se não detectou diferenças específicas, adicionar uma genérica para forçar atualização
        const diferencasFinais = diferencas.length > 0 ? diferencas : [`Sincronizar com planilha`];
        dups.push({ nova: demanda, existente, diferencas: diferencasFinais });
        console.log(`[SheetsImport] Duplicata encontrada: ${demanda.assistido}`, { diferencas: diferencasFinais });
      } else {
        novas.push(demanda);
        console.log(`[SheetsImport] Nova demanda: ${demanda.assistido}`);
      }
    }

    setDemandasNovas(novas);
    setDuplicatas(dups);

    const validas = demandas.filter(d => d.valido).length;
    const invalidas = demandas.length - validas;

    if (validas > 0) {
      let msg = `${validas} demandas identificadas`;
      if (novas.length > 0) msg += `, ${novas.length} novas`;
      if (dups.length > 0) msg += `, ${dups.length} para atualizar`;
      if (invalidas > 0) msg += ` (${invalidas} com erros)`;
      toast.success(msg);
    } else {
      toast.error("Nenhuma demanda válida encontrada");
    }
  };

  const handleRemove = (id: string) => {
    setParsedDemandas(prev => prev.filter(d => d.id !== id));
  };

  const handleImport = () => {
    if (demandasNovas.length === 0 && duplicatas.length === 0) {
      toast.error("Nenhuma demanda para importar ou atualizar");
      return;
    }

    // 1. Importar demandas novas
    if (demandasNovas.length > 0) {
      const demandasParaImportar = demandasNovas.map(d => {
        // Calcular dataInclusao com precisão de milissegundos para ordenação
        // Usa 999 - ordemOriginal para que a primeira da lista (ordem 0) tenha valor maior (999)
        // e apareça primeiro na ordenação descendente por "recentes"
        let dataInclusao: string | undefined;
        if (d.ordemOriginal !== undefined) {
          const hoje = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          dataInclusao = `${hoje}T00:00:00.${String(999 - d.ordemOriginal).padStart(3, '0')}`;
        }

        return {
          id: d.id,
          status: d.status,
          estadoPrisional: d.estadoPrisional,
          data: d.data,
          dataInclusao, // Para ordenação precisa preservando ordem original da planilha
          prazo: d.prazo,
          assistido: d.assistido,
          processos: d.processos,
          ato: d.ato,
          providencias: d.providencias,
          atribuicao: d.atribuicao,
          arquivado: false,
        };
      });

      onImport(demandasParaImportar);
    }

    // 2. Atualizar demandas existentes (duplicatas com diferenças)
    if (duplicatas.length > 0 && onUpdate) {
      const demandasParaAtualizar = duplicatas.map(dup => ({
        id: dup.existente.id, // Manter o ID original
        status: dup.nova.status,
        estadoPrisional: dup.nova.estadoPrisional,
        data: dup.nova.data,
        prazo: dup.nova.prazo,
        assistido: dup.nova.assistido,
        processos: dup.nova.processos,
        ato: dup.nova.ato,
        providencias: dup.nova.providencias,
        atribuicao: dup.nova.atribuicao,
        arquivado: false,
      }));

      onUpdate(demandasParaAtualizar);
    }

    // Mensagem de sucesso
    let msg = "";
    if (demandasNovas.length > 0) {
      msg += `${demandasNovas.length} demandas importadas`;
    }
    if (duplicatas.length > 0) {
      if (msg) msg += ", ";
      msg += `${duplicatas.length} demandas atualizadas`;
    }
    toast.success(msg + "!");

    // Limpar e fechar
    setRawText("");
    setParsedDemandas([]);
    setDemandasNovas([]);
    setDuplicatas([]);
    onClose();
  };

  const handleClose = () => {
    setRawText("");
    setParsedDemandas([]);
    setDemandasNovas([]);
    setDuplicatas([]);
    setSelectedAtribuicao("");
    onClose();
  };

  const stats = useMemo(() => {
    const validas = parsedDemandas.filter(d => d.valido).length;
    const invalidas = parsedDemandas.length - validas;
    return {
      total: parsedDemandas.length,
      validas,
      invalidas,
      novas: demandasNovas.length,
      atualizacoes: duplicatas.length,
    };
  }, [parsedDemandas, demandasNovas, duplicatas]);

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
              <div className="flex flex-wrap items-center gap-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium">{stats.validas} válidas</span>
                </div>
                {stats.novas > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium text-blue-600">{stats.novas} novas</span>
                  </div>
                )}
                {stats.atualizacoes > 0 && (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-600">{stats.atualizacoes} para atualizar</span>
                  </div>
                )}
                {stats.invalidas > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-600">{stats.invalidas} com erros</span>
                  </div>
                )}
              </div>

              {/* Info sobre duplicatas com alterações */}
              {stats.atualizacoes > 0 && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <p className="text-xs font-medium text-purple-800 dark:text-purple-200 mb-2">
                    🔄 {stats.atualizacoes} demandas serão atualizadas:
                  </p>
                  <div className="space-y-1 max-h-[100px] overflow-auto">
                    {duplicatas.map((dup, i) => (
                      <div key={i} className="text-[10px] text-purple-700 dark:text-purple-300">
                        <span className="font-semibold">{dup.nova.assistido}</span>: {dup.diferencas.join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
          {stats.atualizacoes > 0 && !onUpdate && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Atualizações detectadas mas função de atualização não disponível
            </p>
          )}
          <Button
            onClick={handleImport}
            disabled={stats.novas === 0 && stats.atualizacoes === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {stats.novas > 0 && stats.atualizacoes > 0
              ? `Importar ${stats.novas} + Atualizar ${stats.atualizacoes}`
              : stats.novas > 0
                ? `Importar ${stats.novas} demandas`
                : `Atualizar ${stats.atualizacoes} demandas`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
