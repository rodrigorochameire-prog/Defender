"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

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
  Trash2,
  Gavel,
  Home,
  Folder,
  Shield,
  Target,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { DEMANDA_STATUS, STATUS_GROUPS } from "@/config/demanda-status";

// Componente de célula editável inline — clique para editar
function EditableCell({
  value,
  onChange,
  className = "",
  placeholder = "",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onChange(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            if (draft !== value) onChange(draft);
          }
          if (e.key === "Escape") {
            setEditing(false);
            setDraft(value);
          }
        }}
        className={`w-full bg-white dark:bg-zinc-900 border border-emerald-400 rounded px-1 py-0.5 text-xs outline-none ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-1 py-0.5 -mx-1 block truncate ${
        value ? className : "text-zinc-400 italic"
      }`}
      title="Clique para editar"
    >
      {value || placeholder}
    </span>
  );
}

// Mapa rápido de status key → config para lookup na tabela
const DEMANDA_STATUS_MAP: Record<string, { label: string; color: string }> = {};
for (const [key, config] of Object.entries(DEMANDA_STATUS)) {
  const groupColor = STATUS_GROUPS[config.group]?.color || "#A1A1AA";
  DEMANDA_STATUS_MAP[key] = { label: config.label, color: groupColor };
  // Também mapear pelo label normalizado para match com parseStatus
  DEMANDA_STATUS_MAP[config.label.toLowerCase().replace(/\s+/g, "_")] = { label: config.label, color: groupColor };
}

// Opções flat para o dropdown de status
const STATUS_DROPDOWN_OPTIONS = Object.entries(DEMANDA_STATUS).map(([key, config]) => ({
  value: config.label,
  label: config.label,
  group: STATUS_GROUPS[config.group]?.label || "Outro",
  color: STATUS_GROUPS[config.group]?.color || "#A1A1AA",
}));

// Dropdown inline para status com cor
function StatusDropdown({
  value,
  onChange,
  color,
}: {
  value: string;
  onChange: (value: string) => void;
  color: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold hover:opacity-80 transition-opacity cursor-pointer max-w-[90px]"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="truncate">{value}</span>
        <ChevronDown className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl z-50 min-w-[160px] max-h-48 overflow-y-auto py-1">
          {STATUS_DROPDOWN_OPTIONS.map((opt, i) => {
            const isFirst = i === 0 || STATUS_DROPDOWN_OPTIONS[i - 1]?.group !== opt.group;
            return (
              <div key={opt.value}>
                {isFirst && i > 0 && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}
                {isFirst && (
                  <div className="px-3 py-0.5 text-[9px] text-zinc-400 font-semibold uppercase tracking-wider">
                    {opt.group}
                  </div>
                )}
                <button
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-1 text-left text-[11px] transition-colors ${
                    opt.value === value
                      ? "bg-zinc-50 dark:bg-zinc-800/50 font-semibold"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                  style={{ color: opt.color }}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }} />
                    {opt.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SheetsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (demandas: any[]) => Promise<any> | void;
  onUpdate?: (demandas: any[]) => Promise<any> | void; // Para atualizar demandas existentes
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

// Normaliza qualquer formato de data para YYYY-MM-DD (ISO) para comparação consistente
// Suporta: DD/MM/YY, DD/MM/YYYY, DD.MM.YY, YYYY-MM-DD
function normalizarData(dataStr: string | null | undefined): string | null {
  if (!dataStr || !dataStr.trim()) return null;
  const cleaned = dataStr.trim().replace(/\./g, '/');

  // Formato DD/MM/YY ou DD/MM/YYYY
  const brMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (brMatch) {
    const [, dia, mes, ano] = brMatch;
    const anoFull = ano.length === 2 ? `20${ano}` : ano;
    return `${anoFull}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  // Formato ISO YYYY-MM-DD (pode ter T depois)
  const isoMatch = cleaned.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];

  return null;
}

// Função para verificar se duas demandas são duplicatas
// Critérios (em ordem):
// 1. Mesmo processo + mesma data de expedição
// 2. Mesmo processo + mesmo ato (fallback quando sem datas)
// 3. Mesmo nome + mesma data (fallback quando sem processo)
function saoMesmaDemanda(nova: ParsedDemanda, existente: any): boolean {
  // Comparar por número de processo
  const processoNovo = nova.processos[0]?.numero;
  const processoExistente = existente.processos?.[0]?.numero;

  // Se processos são diferentes, verificar fallback por nome + data
  if (!processoNovo || !processoExistente || processoNovo !== processoExistente) {
    // Fallback: comparar por nome + data (para casos sem processo)
    const nomeNovo = normalizarNome(nova.assistido);
    const nomeExistente = normalizarNome(existente.assistido || '');

    if (nomeNovo === nomeExistente) {
      // Mesmo nome + mesma data normalizada
      const dataNova = normalizarData(nova.data);
      const dataExist = normalizarData(existente.dataEntrada || existente.data);
      if (dataNova && dataExist && dataNova === dataExist) return true;

      // Mesmo nome + mesmo ato (quando ambos sem data)
      if (!dataNova && !dataExist) {
        const atoNovo = nova.ato?.toLowerCase().trim();
        const atoExist = (existente.ato || '').toLowerCase().trim();
        if (atoNovo && atoExist && atoNovo === atoExist) return true;
      }
    }
    return false;
  }

  // Mesmo processo - comparar datas normalizadas para ISO
  const dataNova = normalizarData(nova.data);
  const dataExistente = normalizarData(existente.dataEntrada || existente.data);

  // Se ambas têm data, comparar em formato normalizado
  if (dataNova && dataExistente) {
    return dataNova === dataExistente;
  }

  // Se uma tem data e outra não: verificar por processo + ato como fallback
  const atoNovo = nova.ato?.toLowerCase().trim();
  const atoExistente = (existente.ato || '').toLowerCase().trim();
  if (atoNovo && atoExistente && atoNovo !== 'demanda importada' && atoNovo === atoExistente) {
    return true;
  }

  // Se nenhuma tem data, verificar se demanda existente é recente (últimos 30 dias)
  if (!dataNova && !dataExistente) {
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
    let lastKnownStatus = ""; // Carry-forward de status para linhas de grupo

    // Auto-detect if first column is the __id__ column
    let colOffset = 0;
    const sampleLines = lines.slice(0, Math.min(10, lines.length));
    for (const sampleLine of sampleLines) {
      const sampleCols = sampleLine.split("\t");
      const firstCol = sampleCols[0]?.trim() || "";
      // Detect by header: if first col is "__id__" or "id"
      if (firstCol.toLowerCase() === "__id__" || firstCol.toLowerCase() === "id") {
        colOffset = 1;
        break;
      }
      // If first column is purely numeric (ID) and NOT a status pattern (digit + dash)
      if (/^\d+$/.test(firstCol) && sampleCols[1]?.trim()) {
        if (!/^\d+\s*-\s*/.test(firstCol)) {
          colOffset = 1;
          break;
        }
      }
    }
    if (colOffset === 1) {
      console.log("[sheets-import] Detected __id__ column at index 0, applying colOffset=1");
    }

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

      // Detectar linhas de cabeçalho de grupo (ex: "7 - Protocolado" sozinho)
      // Se a linha tem só 1-2 colunas e parece ser um status, salvar como carry-forward
      const nonEmptyCols = columns.filter(c => c.trim().length > 0);
      if (nonEmptyCols.length <= (2 + colOffset) && columns[0 + colOffset]?.trim()) {
        const possibleStatus = columns[0 + colOffset].trim();
        // Parece status se começa com número + traço ou bate com algum status conhecido
        if (/^\d+\s*-\s*.+/.test(possibleStatus) || Object.keys(STATUS_MAP).some(k => possibleStatus.toLowerCase().includes(k))) {
          lastKnownStatus = possibleStatus;
          linhasIgnoradas++;
          continue; // É uma linha de grupo/cabeçalho de status
        }
      }

      const temColunaTipo = columns.length >= (9 + colOffset);

      let statusRaw = columns[0 + colOffset]?.trim() || "";
      const estadoPrisionalRaw = columns[1 + colOffset]?.trim() || "";
      const dataRaw = columns[2 + colOffset]?.trim() || "";
      const assistido = columns[3 + colOffset]?.trim() || "";

      // Se o status está vazio mas temos um carry-forward de grupo, usar ele
      if (!statusRaw && lastKnownStatus) {
        statusRaw = lastKnownStatus;
      }
      // Se a linha tem status, atualizar o carry-forward
      if (statusRaw) {
        lastKnownStatus = statusRaw;
      }

      let tipoProcessoRaw: string;
      let processoRaw: string;
      let ato: string;
      let prazoRaw: string;
      let providencias: string;

      if (temColunaTipo) {
        // Formato com 9 colunas (inclui Tipo)
        tipoProcessoRaw = columns[4 + colOffset]?.trim() || "";
        processoRaw = columns[5 + colOffset]?.trim() || "";
        ato = columns[6 + colOffset]?.trim() || "";
        prazoRaw = columns[7 + colOffset]?.trim() || "";
        providencias = columns[8 + colOffset]?.trim() || "";
      } else {
        // Formato com 8 colunas (sem Tipo)
        tipoProcessoRaw = "";
        processoRaw = columns[4 + colOffset]?.trim() || "";
        ato = columns[5 + colOffset]?.trim() || "";
        prazoRaw = columns[6 + colOffset]?.trim() || "";
        providencias = columns[7 + colOffset]?.trim() || "";
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
        ato: ato || "",
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

    for (const demanda of demandas.filter(d => d.valido)) {
      const existente = demandasExistentes.find(e => saoMesmaDemanda(demanda, e));

      if (existente) {
        // Sempre incluir como duplicata para atualizar (sincronizar dados da planilha)
        const diferencas = identificarDiferencas(demanda, existente);
        // Se não detectou diferenças específicas, adicionar uma genérica para forçar atualização
        const diferencasFinais = diferencas.length > 0 ? diferencas : [`Sincronizar com planilha`];
        dups.push({ nova: demanda, existente, diferencas: diferencasFinais });
      } else {
        novas.push(demanda);
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
    setDemandasNovas(prev => prev.filter(d => d.id !== id));
    setDuplicatas(prev => prev.filter(d => d.nova.id !== id));
  };

  // Edição inline de campos na prévia
  const handleUpdateField = useCallback((id: string, field: keyof ParsedDemanda, value: string) => {
    const updateDemanda = (d: ParsedDemanda) => {
      if (d.id !== id) return d;
      if (field === 'processos') {
        // Para processos, re-parsear o número
        return { ...d, processos: [{ tipo: '', numero: value }] };
      }
      return { ...d, [field]: value };
    };

    setParsedDemandas(prev => prev.map(updateDemanda));
    setDemandasNovas(prev => prev.map(updateDemanda));
    setDuplicatas(prev => prev.map(dup => ({
      ...dup,
      nova: updateDemanda(dup.nova),
    })));
  }, []);

  const [expandedProv, setExpandedProv] = useState<Set<string>>(new Set());

  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (demandasNovas.length === 0 && duplicatas.length === 0) {
      toast.error("Nenhuma demanda para importar ou atualizar");
      return;
    }

    setIsImporting(true);
    try {
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

        await onImport(demandasParaImportar);
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

        await onUpdate(demandasParaAtualizar);
      }

      // Limpar e fechar apenas após confirmação do servidor
      setRawText("");
      setParsedDemandas([]);
      setDemandasNovas([]);
      setDuplicatas([]);
      onClose();
    } catch {
      // Erro já tratado pelo onError da mutation (toast de erro exibido pelo pai)
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setRawText("");
    setParsedDemandas([]);
    setDemandasNovas([]);
    setDuplicatas([]);
    setSelectedAtribuicao("");
    setExpandedProv(new Set());
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

          {/* Prévia das demandas — tabela editável */}
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
                    {stats.atualizacoes} demandas existentes serão atualizadas com dados da planilha
                  </p>
                  <div className="space-y-1 max-h-[80px] overflow-auto">
                    {duplicatas.map((dup, i) => (
                      <div key={i} className="text-[10px] text-purple-700 dark:text-purple-300">
                        <span className="font-semibold">{dup.nova.assistido}</span>: {dup.diferencas.join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tabela editável */}
              <p className="text-[10px] text-zinc-400">Clique em qualquer campo para editar antes de importar</p>
              <div className="max-h-[300px] overflow-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium w-[40px]"></th>
                      <th className="px-2 py-1.5 text-left font-medium w-[100px]">Status</th>
                      <th className="px-2 py-1.5 text-left font-medium">Assistido</th>
                      <th className="px-2 py-1.5 text-left font-medium">Processo</th>
                      <th className="px-2 py-1.5 text-left font-medium">Ato</th>
                      <th className="px-2 py-1.5 text-left font-medium w-[80px]">Data</th>
                      <th className="px-2 py-1.5 text-left font-medium w-[80px]">Prazo</th>
                      <th className="px-2 py-1.5 text-center w-8">
                        <FileText className="h-3 w-3 inline text-zinc-400" />
                      </th>
                      <th className="px-2 py-1.5 text-left font-medium w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {parsedDemandas.map((demanda) => {
                      const isDup = duplicatas.some(d => d.nova.id === demanda.id);
                      const isNew = demandasNovas.some(d => d.id === demanda.id);
                      const statusConfig = DEMANDA_STATUS_MAP[demanda.status.toLowerCase().replace(/\s+/g, "_")];
                      const statusColor = statusConfig?.color || "#A1A1AA";

                      return (
                        <React.Fragment key={demanda.id}>
                        <tr
                          className={
                            !demanda.valido
                              ? "bg-amber-50/50 dark:bg-amber-900/10"
                              : isDup
                                ? "bg-purple-50/50 dark:bg-purple-900/10"
                                : ""
                          }
                        >
                          {/* Tipo (Nova/Atualizar) + Preso */}
                          <td className="px-2 py-1.5">
                            <div className="flex items-center gap-1">
                              {isDup ? (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-purple-300 text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                  Atu
                                </Badge>
                              ) : isNew ? (
                                <Badge variant="outline" className="text-[9px] py-0 px-1 border-blue-300 text-blue-700 dark:text-blue-300 whitespace-nowrap">
                                  N
                                </Badge>
                              ) : null}
                              {demanda.estadoPrisional === "preso" && (
                                <Lock className="w-3 h-3 text-red-500 shrink-0" />
                              )}
                            </div>
                          </td>

                          {/* Status — editável com dropdown inline */}
                          <td className="px-2 py-1.5">
                            <StatusDropdown
                              value={demanda.status}
                              onChange={(v) => handleUpdateField(demanda.id, 'status', v)}
                              color={statusColor}
                            />
                          </td>

                          {/* Assistido — editável */}
                          <td className="px-2 py-1.5">
                            <EditableCell
                              value={demanda.assistido}
                              onChange={(v) => handleUpdateField(demanda.id, 'assistido', v)}
                              className="font-medium"
                            />
                          </td>

                          {/* Processo — editável */}
                          <td className="px-2 py-1.5">
                            <EditableCell
                              value={demanda.processos[0]?.numero || ""}
                              onChange={(v) => handleUpdateField(demanda.id, 'processos', v)}
                              className="font-mono text-[10px]"
                              placeholder="Sem processo"
                            />
                          </td>

                          {/* Ato — editável */}
                          <td className="px-2 py-1.5">
                            <EditableCell
                              value={demanda.ato}
                              onChange={(v) => handleUpdateField(demanda.id, 'ato', v)}
                            />
                          </td>

                          {/* Data — editável */}
                          <td className="px-2 py-1.5">
                            <EditableCell
                              value={demanda.data}
                              onChange={(v) => handleUpdateField(demanda.id, 'data', v)}
                              placeholder="-"
                            />
                          </td>

                          {/* Prazo — editável */}
                          <td className="px-2 py-1.5">
                            <EditableCell
                              value={demanda.prazo}
                              onChange={(v) => handleUpdateField(demanda.id, 'prazo', v)}
                              placeholder="-"
                            />
                          </td>

                          {/* Providências — ícone expansível */}
                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => setExpandedProv((prev) => {
                                const next = new Set(prev);
                                next.has(demanda.id) ? next.delete(demanda.id) : next.add(demanda.id);
                                return next;
                              })}
                              aria-expanded={expandedProv.has(demanda.id)}
                              title={demanda.providencias?.trim() ? "Ver/editar providências" : "Adicionar providências"}
                              className={`rounded p-0.5 transition-colors ${
                                demanda.providencias?.trim()
                                  ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                                  : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400"
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                          </td>

                          {/* Ações */}
                          <td className="px-2 py-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-zinc-400 hover:text-red-500"
                              onClick={() => handleRemove(demanda.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                        {expandedProv.has(demanda.id) && (
                          <tr>
                            <td colSpan={9} className="px-3 pb-2 pt-0 bg-zinc-50/70 dark:bg-zinc-800/30">
                              <div className="flex items-start gap-2">
                                <FileText className="h-3 w-3 text-zinc-400 mt-1.5 flex-shrink-0" />
                                <textarea
                                  autoFocus
                                  rows={2}
                                  defaultValue={demanda.providencias ?? ""}
                                  onBlur={(e) => {
                                    if (e.target.value !== (demanda.providencias ?? "")) {
                                      handleUpdateField(demanda.id, "providencias", e.target.value);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      setExpandedProv((prev) => {
                                        const next = new Set(prev);
                                        next.delete(demanda.id);
                                        return next;
                                      });
                                    }
                                  }}
                                  placeholder="Providências para esta demanda..."
                                  className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 outline-none resize-none w-full"
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
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
            disabled={isImporting || (stats.novas === 0 && stats.atualizacoes === 0)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {stats.novas > 0 && stats.atualizacoes > 0
                  ? `Importar ${stats.novas} + Atualizar ${stats.atualizacoes}`
                  : stats.novas > 0
                    ? `Importar ${stats.novas} demandas`
                    : `Atualizar ${stats.atualizacoes} demandas`}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
