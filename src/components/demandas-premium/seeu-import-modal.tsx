"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Upload,
  Download,
  User,
  Scale,
  ArrowRight,
  Sparkles,
  Info,
  RefreshCw,
  Gavel,
  Clock,
  Calendar,
  Hash,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  parseSEEUIntimacoes,
  intimacaoSEEUToDemanda,
  resolveImportStatus,
  type IntimacaoSEEU,
  type ResultadoParserSEEU,
} from "@/lib/pje-parser";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

// ─── Editable cell (click-to-edit, single line) ───────────────────────────────
function EditableCell({
  value,
  onChange,
  placeholder = "",
  className = "",
  mono = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  mono?: boolean;
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
          if (e.key === "Enter") { setEditing(false); if (draft !== value) onChange(draft); }
          if (e.key === "Escape") { setEditing(false); setDraft(value); }
        }}
        className={cn(
          "w-full bg-white dark:bg-zinc-900 border border-emerald-400 rounded px-1.5 py-0.5 text-xs outline-none",
          mono && "font-mono",
          className
        )}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Clique para editar"
      className={cn(
        "cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-1.5 py-0.5 -mx-1.5 flex items-center gap-1 group",
        !value && "text-zinc-400 italic",
        className
      )}
    >
      <span className="flex-1 truncate">{value || placeholder}</span>
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 flex-shrink-0 transition-opacity" />
    </span>
  );
}

// ─── Editable date cell ────────────────────────────────────────────────────────
// Displays as DD/MM/YYYY text; opens a native date input on click
function EditableDateCell({
  value,
  onChange,
  placeholder = "Sem prazo",
}: {
  value: string; // DD/MM/YYYY or empty
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);

  // Convert DD/MM/YYYY → YYYY-MM-DD for the input
  const toInputValue = (ddmmyyyy: string) => {
    const p = ddmmyyyy.split("/");
    if (p.length === 3) return `${p[2]}-${p[1]}-${p[0]}`;
    return "";
  };

  // Convert YYYY-MM-DD → DD/MM/YYYY for display/storage
  const fromInputValue = (yyyymmdd: string) => {
    const p = yyyymmdd.split("-");
    if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return "";
  };

  if (editing) {
    return (
      <input
        type="date"
        autoFocus
        defaultValue={toInputValue(value)}
        onBlur={(e) => {
          setEditing(false);
          const formatted = fromInputValue(e.target.value);
          if (formatted && formatted !== value) onChange(formatted);
        }}
        onChange={(e) => {
          // commit immediately on change so blur always has latest
        }}
        className="w-[130px] bg-white dark:bg-zinc-900 border border-emerald-400 rounded px-1.5 py-0.5 text-xs outline-none"
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Clique para editar prazo"
      className={cn(
        "cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-1.5 py-0.5 -mx-1.5 flex items-center gap-1 group text-xs",
        !value && "text-zinc-400 italic"
      )}
    >
      <Calendar className="w-3 h-3 flex-shrink-0" />
      <span>{value || placeholder}</span>
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 flex-shrink-0 transition-opacity" />
    </span>
  );
}

// ─── Expandable textarea cell ──────────────────────────────────────────────────
function EditableTextarea({
  value,
  onChange,
  placeholder = "Adicionar observação...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onChange(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setEditing(false); setDraft(value); }
        }}
        className="w-full bg-white dark:bg-zinc-900 border border-emerald-400 rounded px-1.5 py-1 text-xs outline-none resize-none"
        placeholder={placeholder}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Clique para adicionar observação"
      className={cn(
        "cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded px-1.5 py-0.5 -mx-1.5 flex items-center gap-1 group text-xs",
        !value && "text-zinc-400 italic"
      )}
    >
      <span className="flex-1 truncate">{value || placeholder}</span>
      <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-40 flex-shrink-0 transition-opacity" />
    </span>
  );
}

// Extended type to allow observacao field stored inline
type IntimacaoSEEUEditable = IntimacaoSEEU & { observacao?: string };

interface SEEUImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (demandas: any[]) => void;
  onUpdate?: (demandas: any[]) => void;
  demandasExistentes?: any[];
}

// Interface para duplicatas com diferenças
interface DuplicataInfoSEEU {
  nova: IntimacaoSEEU;
  existente: any;
  diferencas: string[];
}

// Função para verificar se duas demandas são a mesma
// Critério: mesmo processo + mesma data de expedição (dataEnvio do SEEU = dataEntrada na demanda)
// Isso permite múltiplas demandas do mesmo processo para diferentes intimações
function saoMesmaDemandaSEEU(intimacao: IntimacaoSEEU, existente: any): boolean {
  const processoNovo = intimacao.numeroProcesso;
  const processoExistente = existente.processos?.[0]?.numero || existente.processoNumero;

  // Primeiro, verificar se é o mesmo processo
  if (!processoNovo || !processoExistente || processoNovo !== processoExistente) {
    return false;
  }

  // Depois, verificar se é a mesma data de expedição
  const dataNovaISO = convertDateToISO(intimacao.dataEnvio);
  const dataExistente = existente.dataEntrada || existente.data;

  // Se ambas têm data, comparar
  if (dataNovaISO && dataExistente) {
    return dataNovaISO === dataExistente;
  }

  // Se nenhuma tem data, verificar se é recente (últimos 30 dias)
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

// Função para converter data DD/MM/YYYY para YYYY-MM-DD
function convertDateToISO(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const partes = dateStr.split('/');
  if (partes.length === 3) {
    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }
  return null;
}

// Função para identificar diferenças entre demanda nova e existente
function identificarDiferencasSEEU(intimacao: IntimacaoSEEU, existente: any): string[] {
  const diferencas: string[] = [];

  // Comparar prazo (ultimoDia do SEEU)
  if (intimacao.ultimoDia) {
    const prazoNovo = convertDateToISO(intimacao.ultimoDia);
    if (prazoNovo && prazoNovo !== existente.prazo) {
      diferencas.push(`Prazo: ${existente.prazo || 'vazio'} → ${intimacao.ultimoDia}`);
    }
  }

  // Comparar status - se não está como analisar, vai mudar
  const statusAtual = existente.substatus?.toLowerCase() || existente.status?.toLowerCase() || '';
  if (statusAtual !== 'analisar' && statusAtual !== '2_atender') {
    diferencas.push(`Status → Analisar`);
  }

  // Comparar providências (assunto do SEEU)
  const providenciasNovas = intimacao.assuntoPrincipal
    ? `${intimacao.classeProcessual || 'Execução Penal'} - ${intimacao.assuntoPrincipal}`
    : null;
  if (providenciasNovas && providenciasNovas !== existente.providencias) {
    diferencas.push(`Providências atualizadas`);
  }

  // Se não detectou diferenças específicas, adicionar mensagem genérica para sincronizar
  if (diferencas.length === 0) {
    diferencas.push('Sincronizar com SEEU');
  }

  return diferencas;
}

export function SEEUImportModal({
  isOpen,
  onClose,
  onImport,
  onUpdate,
  demandasExistentes = [],
}: SEEUImportModalProps) {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<ResultadoParserSEEU | null>(null);
  const [etapa, setEtapa] = useState<"colar" | "revisar">("colar");
  const [isImporting, setIsImporting] = useState(false);

  // Progress state for import feedback
  const [importProgress, setImportProgress] = useState<{
    total: number;
    currentIndex: number;
    currentName: string;
  } | null>(null);
  const importNamesRef = useRef<string[]>([]);

  // Cycle through item names while importing (batch mode)
  useEffect(() => {
    if (!isImporting || importNamesRef.current.length === 0) return;
    let idx = 0;
    const names = importNamesRef.current;
    const total = names.length;
    setImportProgress({ total, currentIndex: 0, currentName: names[0] });
    const interval = setInterval(() => {
      idx = (idx + 1) % names.length;
      setImportProgress({ total, currentIndex: idx, currentName: names[idx] });
    }, 300);
    return () => clearInterval(interval);
  }, [isImporting]);

  // Tipo de manifestação selecionada
  const [tipoManifestacao, setTipoManifestacao] = useState<"manifestacao" | "ciencia">("manifestacao");

  // Estados para separar novas vs duplicatas
  const [intimacoesNovas, setIntimacoesNovas] = useState<IntimacaoSEEUEditable[]>([]);
  const [duplicatas, setDuplicatas] = useState<DuplicataInfoSEEU[]>([]);

  // Editable review state: track which items are selected and per-item tipo
  const [selectedNovas, setSelectedNovas] = useState<Set<number>>(new Set());
  const [selectedDups, setSelectedDups] = useState<Set<number>>(new Set());

  // Expanded observation rows
  const [expandedObsNovas, setExpandedObsNovas] = useState<Set<number>>(new Set());
  const [expandedObsDups, setExpandedObsDups] = useState<Set<number>>(new Set());

  const handleParsear = () => {
    if (!texto.trim()) {
      toast.error("Cole o texto das intimações do SEEU");
      return;
    }

    try {
      const resultadoParser = parseSEEUIntimacoes(texto, tipoManifestacao);

      if (resultadoParser.intimacoes.length === 0) {
        toast.error("Nenhuma intimação encontrada. Verifique se o texto foi copiado corretamente do SEEU.");
        return;
      }

      // Separar novas de duplicatas
      const novas: IntimacaoSEEU[] = [];
      const dups: DuplicataInfoSEEU[] = [];

      for (const intimacao of resultadoParser.intimacoes) {
        const existente = demandasExistentes.find(e => saoMesmaDemandaSEEU(intimacao, e));

        if (existente) {
          const diferencas = identificarDiferencasSEEU(intimacao, existente);
          dups.push({ nova: intimacao, existente, diferencas });
        } else {
          novas.push(intimacao);
        }
      }

      setIntimacoesNovas(novas);
      setDuplicatas(dups);
      setSelectedNovas(new Set(novas.map((_, i) => i)));
      setSelectedDups(new Set(dups.map((_, i) => i)));

      setResultado({
        ...resultadoParser,
        intimacoes: resultadoParser.intimacoes, // Manter todas para estatísticas
        totalEncontradas: resultadoParser.intimacoes.length,
      });
      setEtapa("revisar");

      // Mensagem informativa
      const msgs = [];
      if (novas.length > 0) msgs.push(`${novas.length} nova(s)`);
      if (dups.length > 0) msgs.push(`${dups.length} para atualizar`);
      toast.success(`Identificadas: ${msgs.join(', ')}`);
    } catch (error) {
      console.error("Erro ao processar:", error);
      toast.error("Erro ao processar o texto. Verifique o formato.");
    }
  };

  const handleImportar = () => {
    const novasSelecionadas = intimacoesNovas.filter((_, i) => selectedNovas.has(i));
    const dupsSelecionadas = duplicatas.filter((_, i) => selectedDups.has(i));

    if (novasSelecionadas.length === 0 && dupsSelecionadas.length === 0) {
      toast.error("Nenhuma intimação selecionada para importar ou atualizar");
      return;
    }

    // Build list of names for the cycling progress display
    const allNames = [
      ...novasSelecionadas.map((i) => i.assistido),
      ...dupsSelecionadas.map((d) => d.nova.assistido),
    ];
    importNamesRef.current = allNames;
    setIsImporting(true);

    try {
      // 1. Importar novas demandas (only selected)
      if (novasSelecionadas.length > 0) {
        const demandas = (novasSelecionadas as IntimacaoSEEUEditable[]).map((intimacao) => {
          const demanda = intimacaoSEEUToDemanda(intimacao);
          // Merge edited fields over the auto-converted values
          if (intimacao.ultimoDia) {
            demanda.prazo = convertDateToISO(intimacao.ultimoDia);
          }
          if (intimacao.numeroProcesso) {
            demanda.processos = [{ ...demanda.processos[0], numero: intimacao.numeroProcesso }];
          }
          if (intimacao.observacao) {
            demanda.observacao = intimacao.observacao;
          }
          return demanda;
        });
        onImport(demandas);
      }

      // 2. Atualizar demandas existentes (only selected duplicatas)
      if (dupsSelecionadas.length > 0 && onUpdate) {
        const demandasParaAtualizar = dupsSelecionadas.map(dup => {
          const nova = dup.nova as IntimacaoSEEUEditable;
          return {
            id: dup.existente.id,
            status: resolveImportStatus(nova.tipoManifestacao === 'ciencia' ? 'ciencia' : undefined),
            ato: nova.tipoManifestacao === 'ciencia' ? 'Ciência' : 'Manifestação',
            prazo: convertDateToISO(nova.ultimoDia),
            processos: [{ tipo: dup.existente.processos?.[0]?.tipo || 'PPL', numero: nova.numeroProcesso }],
            providencias: nova.assuntoPrincipal
              ? `${nova.classeProcessual || 'Execução Penal'} - ${nova.assuntoPrincipal}`
              : dup.existente.providencias,
            ...(nova.observacao ? { observacao: nova.observacao } : {}),
          };
        });
        onUpdate(demandasParaAtualizar);
      }

      // Mensagem de sucesso
      const msgs = [];
      if (novasSelecionadas.length > 0) msgs.push(`${novasSelecionadas.length} importada(s)`);
      if (dupsSelecionadas.length > 0) msgs.push(`${dupsSelecionadas.length} atualizada(s)`);
      toast.success(msgs.join(', '));

      resetModal();
      onClose();
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao importar demandas");
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      importNamesRef.current = [];
    }
  };

  const resetModal = () => {
    setTexto("");
    setResultado(null);
    setEtapa("colar");
    setIsImporting(false);
    setImportProgress(null);
    importNamesRef.current = [];
    setTipoManifestacao("manifestacao");
    setIntimacoesNovas([]);
    setDuplicatas([]);
    setSelectedNovas(new Set());
    setSelectedDups(new Set());
    setExpandedObsNovas(new Set());
    setExpandedObsDups(new Set());
  };

  // Update a field on a specific nova intimação by index
  const handleUpdateNova = useCallback(
    (index: number, field: keyof IntimacaoSEEUEditable, value: string) => {
      setIntimacoesNovas((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    []
  );

  // Update a field on a specific duplicata's nova by index
  const handleUpdateDup = useCallback(
    (index: number, field: keyof IntimacaoSEEUEditable, value: string) => {
      setDuplicatas((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          nova: { ...next[index].nova, [field]: value } as IntimacaoSEEUEditable,
        };
        return next;
      });
    },
    []
  );

  const handleVoltar = () => {
    if (etapa === "revisar") {
      setEtapa("colar");
    }
  };

  const handleFechar = () => {
    onClose();
    setTimeout(resetModal, 300);
  };

  // Estatísticas do resultado
  const stats = useMemo(() => {
    if (!resultado) return null;

    const porAssunto: Record<string, number> = {};
    const porClasse: Record<string, number> = {};

    resultado.intimacoes.forEach((i) => {
      if (i.assuntoPrincipal) {
        porAssunto[i.assuntoPrincipal] = (porAssunto[i.assuntoPrincipal] || 0) + 1;
      }
      if (i.classeProcessual) {
        porClasse[i.classeProcessual] = (porClasse[i.classeProcessual] || 0) + 1;
      }
    });

    return { porAssunto, porClasse };
  }, [resultado]);

  // Badge para tipo de assunto
  const getAssuntoBadge = (assunto: string | undefined) => {
    if (!assunto) return null;

    if (assunto.includes("Acordo de Não Persecução")) {
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">ANPP</Badge>;
    }
    if (assunto.includes("Pena Privativa")) {
      return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">PPL</Badge>;
    }
    if (assunto.includes("Pena Restritiva")) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">PRD</Badge>;
    }
    return <Badge variant="outline">{assunto}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleFechar}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto w-[96vw] md:w-full bg-white dark:bg-zinc-900">
        <DialogHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-200 dark:border-amber-800">
              <Gavel className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Importar do SEEU
              </DialogTitle>
              <DialogDescription className="text-sm text-zinc-500 dark:text-zinc-400">
                Sistema Eletrônico de Execução Unificada - Execução Penal
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Etapa 1: Colar texto */}
        {etapa === "colar" && (
          <div className="space-y-5 py-4">
            {/* Seletor de tipo de manifestação */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Tipo de Intimação
                <span className="text-red-500 text-xs">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTipoManifestacao("manifestacao")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    tipoManifestacao === "manifestacao"
                      ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-amber-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className={cn(
                      "w-5 h-5",
                      tipoManifestacao === "manifestacao" ? "text-amber-600" : "text-zinc-400"
                    )} />
                    <span className="font-semibold text-sm">Manifestação</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Intimações que exigem manifestação nos autos. Prazo para resposta.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoManifestacao("ciencia")}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all text-left",
                    tipoManifestacao === "ciencia"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-blue-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className={cn(
                      "w-5 h-5",
                      tipoManifestacao === "ciencia" ? "text-blue-600" : "text-zinc-400"
                    )} />
                    <span className="font-semibold text-sm">Mera Ciência</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Intimações apenas para ciência. Não exigem resposta.
                  </p>
                </button>
              </div>
            </div>

            {/* Área de texto */}
            <div className="space-y-2.5">
              <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-500" />
                Cole o texto da Mesa do Defensor
              </Label>
              <div className="relative">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder={`Cole aqui o conteúdo da "Mesa do Defensor" do SEEU...

Exemplo:
1406  2000193-09.2024.8.05.0039  Execução da Pena
(Acordo de Não Persecução Penal)
Autoridade: Ministério Público do Estado da Bahia
Executado: NEMIAS DOS SANTOS JESUS
27/01/2026
06/02/2026  6 dias corridos  Livre  [ Analisar ]`}
                  className="w-full h-[250px] p-4 text-sm font-mono bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl resize-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                {texto && (
                  <button
                    onClick={() => setTexto("")}
                    className="absolute top-2 right-2 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                  >
                    <AlertCircle className="w-4 h-4 text-zinc-400" />
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Copie toda a tabela da Mesa do Defensor incluindo cabecalhos
              </p>
            </div>

            {/* Instruções */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Gavel className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-amber-900 dark:text-amber-100 mb-1">
                    Como usar
                  </p>
                  <ol className="text-xs text-amber-700 dark:text-amber-300 space-y-1 list-decimal list-inside">
                    <li>Acesse o SEEU e va para Mesa do Defensor</li>
                    <li>Selecione a aba (Manifestacao ou Ciencia)</li>
                    <li>Selecione e copie toda a tabela (Ctrl+A, Ctrl+C)</li>
                    <li>Cole aqui e clique em Processar</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <Button variant="outline" onClick={handleFechar}>
                Cancelar
              </Button>
              <Button
                onClick={handleParsear}
                disabled={!texto.trim()}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Processar
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Etapa 2: Revisar */}
        {etapa === "revisar" && resultado && (
          <div className="space-y-5 py-4">
            {/* Resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-amber-200 dark:border-amber-800">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Hash className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-2xl font-bold">{resultado.totalEncontradas}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {stats && Object.entries(stats.porAssunto).slice(0, 3).map(([assunto, count]) => (
                <Card key={assunto}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Scale className="w-5 h-5 text-zinc-500" />
                      <div>
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={assunto}>
                          {assunto.includes("Acordo") ? "ANPP" :
                           assunto.includes("Privativa") ? "PPL" :
                           assunto.includes("Restritiva") ? "PRD" : assunto}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Banner de info - Novas */}
            {intimacoesNovas.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    {intimacoesNovas.length} nova(s) demanda(s) serão importadas
                  </p>
                </div>
              </div>
            )}

            {/* Banner de info - Duplicatas para atualizar */}
            {duplicatas.length > 0 && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    {duplicatas.length} demanda(s) serão atualizadas:
                  </p>
                </div>
                <div className="space-y-1 max-h-[100px] overflow-auto">
                  {duplicatas.map((dup, i) => (
                    <div key={i} className="text-[10px] text-purple-700 dark:text-purple-300">
                      <span className="font-semibold">{dup.nova.assistido}</span>: {dup.diferencas.join(", ")}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sem ações - tudo igual */}
            {intimacoesNovas.length === 0 && duplicatas.length === 0 && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-zinc-500" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Todas as intimações já estão cadastradas e atualizadas.
                  </p>
                </div>
              </div>
            )}

            {/* Lista de intimações novas */}
            {intimacoesNovas.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      Novas Intimações ({intimacoesNovas.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedNovas(new Set(intimacoesNovas.map((_, i) => i)))}
                      className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                    >
                      Todas
                    </button>
                    <span className="text-zinc-300 text-[10px]">|</span>
                    <button
                      onClick={() => setSelectedNovas(new Set())}
                      className="text-[10px] text-zinc-500 hover:text-zinc-700 font-medium cursor-pointer"
                    >
                      Nenhuma
                    </button>
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {selectedNovas.size}/{intimacoesNovas.length}
                    </Badge>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                  <Pencil className="w-2.5 h-2.5" />
                  Clique em qualquer campo para editar antes de importar
                </p>
                <ScrollArea className="h-[260px]">
                  <div className="space-y-2 pr-4">
                    {intimacoesNovas.map((intimacao, index) => {
                      const isSelected = selectedNovas.has(index);
                      return (
                        <Card
                          key={index}
                          className={cn(
                            "transition-all",
                            isSelected
                              ? "border-emerald-200 dark:border-emerald-900/50"
                              : "border-zinc-200 dark:border-zinc-800 opacity-50"
                          )}
                        >
                          <CardContent className="py-3">
                            <div className="flex items-start gap-3">
                              {/* Checkbox — clicking only this toggles selection */}
                              <button
                                type="button"
                                onClick={() => {
                                  const next = new Set(selectedNovas);
                                  if (isSelected) next.delete(index); else next.add(index);
                                  setSelectedNovas(next);
                                }}
                                className={cn(
                                  "mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer",
                                  isSelected
                                    ? "bg-emerald-600 border-emerald-600"
                                    : "border-zinc-300 dark:border-zinc-600"
                                )}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </button>

                              <div className="flex-1 min-w-0 space-y-1.5">
                                {/* Row 1: name + seq */}
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                  <span className="font-semibold text-sm">{intimacao.assistido}</span>
                                  {intimacao.seq && (
                                    <Badge variant="outline" className="text-[10px]">
                                      #{intimacao.seq}
                                    </Badge>
                                  )}
                                  {getAssuntoBadge(intimacao.assuntoPrincipal)}
                                </div>

                                {/* Row 2: processo (editable) + tipo (toggle) */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                                    <Hash className="w-3 h-3 flex-shrink-0" />
                                    <div className="min-w-[160px] max-w-[220px]" onClick={(e) => e.stopPropagation()}>
                                      <EditableCell
                                        value={intimacao.numeroProcesso || ""}
                                        onChange={(v) => handleUpdateNova(index, 'numeroProcesso', v)}
                                        placeholder="Número do processo"
                                        mono
                                        className="text-[11px]"
                                      />
                                    </div>
                                  </div>
                                  {/* Per-item tipo toggle */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newTipo = intimacao.tipoManifestacao === 'ciencia' ? 'manifestacao' : 'ciencia';
                                      handleUpdateNova(index, 'tipoManifestacao', newTipo);
                                      handleUpdateNova(index, 'tipoDocumento', newTipo === 'ciencia' ? 'Ciência' : 'Manifestação');
                                    }}
                                    className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer flex-shrink-0",
                                      intimacao.tipoManifestacao === 'ciencia'
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-200"
                                    )}
                                    title="Clique para alternar tipo"
                                  >
                                    {intimacao.tipoManifestacao === 'ciencia' ? 'Ciência' : 'Manifestação'}
                                  </button>
                                </div>

                                {/* Row 3: prazo (editable date) */}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[10px] text-zinc-400 font-medium">Prazo:</span>
                                  <EditableDateCell
                                    value={intimacao.ultimoDia || ""}
                                    onChange={(v) => handleUpdateNova(index, 'ultimoDia', v)}
                                    placeholder="Sem prazo"
                                  />
                                </div>

                                {/* Row 4: observação (toggle icon + expandable textarea) */}
                                <div onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setExpandedObsNovas((prev) => {
                                      const next = new Set(prev);
                                      next.has(index) ? next.delete(index) : next.add(index);
                                      return next;
                                    })}
                                    aria-expanded={expandedObsNovas.has(index)}
                                    title={(intimacao as IntimacaoSEEUEditable).observacao?.trim() ? "Ver/editar observação" : "Adicionar observação"}
                                    className={`rounded p-0.5 transition-colors ${
                                      (intimacao as IntimacaoSEEUEditable).observacao?.trim()
                                        ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                                        : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400"
                                    }`}
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                  </button>
                                  {expandedObsNovas.has(index) && (
                                    <div className="flex items-start gap-2 mt-1.5">
                                      <FileText className="h-3 w-3 text-zinc-400 mt-1.5 flex-shrink-0" />
                                      <textarea
                                        autoFocus
                                        rows={2}
                                        defaultValue={(intimacao as IntimacaoSEEUEditable).observacao ?? ""}
                                        onBlur={(e) => {
                                          if (e.target.value !== ((intimacao as IntimacaoSEEUEditable).observacao ?? "")) {
                                            handleUpdateNova(index, "observacao", e.target.value);
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Escape") {
                                            setExpandedObsNovas((prev) => {
                                              const next = new Set(prev);
                                              next.delete(index);
                                              return next;
                                            });
                                          }
                                        }}
                                        placeholder="Observações / providências para esta demanda..."
                                        className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 outline-none resize-none w-full"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Lista de duplicatas para atualizar */}
            {duplicatas.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/10 to-violet-500/10 flex items-center justify-center border border-purple-200 dark:border-purple-800">
                      <RefreshCw className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      Para Atualizar ({duplicatas.length})
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedDups(new Set(duplicatas.map((_, i) => i)))}
                      className="text-[10px] text-purple-600 hover:text-purple-700 font-medium cursor-pointer"
                    >
                      Todas
                    </button>
                    <span className="text-zinc-300 text-[10px]">|</span>
                    <button
                      onClick={() => setSelectedDups(new Set())}
                      className="text-[10px] text-zinc-500 hover:text-zinc-700 font-medium cursor-pointer"
                    >
                      Nenhuma
                    </button>
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {selectedDups.size}/{duplicatas.length}
                    </Badge>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                  <Pencil className="w-2.5 h-2.5" />
                  Clique em qualquer campo para editar antes de atualizar
                </p>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2 pr-4">
                    {duplicatas.map((dup, index) => {
                      const isSelected = selectedDups.has(index);
                      const nova = dup.nova as IntimacaoSEEUEditable;
                      return (
                        <Card
                          key={index}
                          className={cn(
                            "transition-all",
                            isSelected
                              ? "border-purple-200 dark:border-purple-900/50"
                              : "border-zinc-200 dark:border-zinc-800 opacity-50"
                          )}
                        >
                          <CardContent className="py-3">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  const next = new Set(selectedDups);
                                  if (isSelected) next.delete(index); else next.add(index);
                                  setSelectedDups(next);
                                }}
                                className={cn(
                                  "mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer",
                                  isSelected
                                    ? "bg-purple-600 border-purple-600"
                                    : "border-zinc-300 dark:border-zinc-600"
                                )}
                              >
                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </button>

                              <div className="flex-1 min-w-0 space-y-1.5">
                                {/* Row 1: name */}
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-purple-600 flex-shrink-0" />
                                  <span className="font-semibold text-sm">{nova.assistido}</span>
                                </div>

                                {/* Row 2: processo (editable) + tipo (toggle) */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0" onClick={(e) => e.stopPropagation()}>
                                    <Hash className="w-3 h-3 flex-shrink-0" />
                                    <div className="min-w-[160px] max-w-[220px]">
                                      <EditableCell
                                        value={nova.numeroProcesso || ""}
                                        onChange={(v) => handleUpdateDup(index, 'numeroProcesso', v)}
                                        placeholder="Número do processo"
                                        mono
                                        className="text-[11px]"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newTipo = nova.tipoManifestacao === 'ciencia' ? 'manifestacao' : 'ciencia';
                                      handleUpdateDup(index, 'tipoManifestacao', newTipo);
                                      handleUpdateDup(index, 'tipoDocumento', newTipo === 'ciencia' ? 'Ciência' : 'Manifestação');
                                    }}
                                    className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer flex-shrink-0",
                                      nova.tipoManifestacao === 'ciencia'
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200"
                                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200"
                                    )}
                                    title="Clique para alternar tipo"
                                  >
                                    {nova.tipoManifestacao === 'ciencia' ? 'Ciência' : 'Manifestação'}
                                  </button>
                                </div>

                                {/* Row 3: prazo (editable date) */}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[10px] text-zinc-400 font-medium">Prazo:</span>
                                  <EditableDateCell
                                    value={nova.ultimoDia || ""}
                                    onChange={(v) => handleUpdateDup(index, 'ultimoDia', v)}
                                    placeholder="Sem prazo"
                                  />
                                </div>

                                {/* Row 4: observação (toggle icon + expandable textarea) */}
                                <div onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => setExpandedObsDups((prev) => {
                                      const next = new Set(prev);
                                      next.has(index) ? next.delete(index) : next.add(index);
                                      return next;
                                    })}
                                    aria-expanded={expandedObsDups.has(index)}
                                    title={nova.observacao?.trim() ? "Ver/editar observação" : "Adicionar observação"}
                                    className={`rounded p-0.5 transition-colors ${
                                      nova.observacao?.trim()
                                        ? "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
                                        : "text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400"
                                    }`}
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                  </button>
                                  {expandedObsDups.has(index) && (
                                    <div className="flex items-start gap-2 mt-1.5">
                                      <FileText className="h-3 w-3 text-zinc-400 mt-1.5 flex-shrink-0" />
                                      <textarea
                                        autoFocus
                                        rows={2}
                                        defaultValue={nova.observacao ?? ""}
                                        onBlur={(e) => {
                                          if (e.target.value !== (nova.observacao ?? "")) {
                                            handleUpdateDup(index, "observacao", e.target.value);
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Escape") {
                                            setExpandedObsDups((prev) => {
                                              const next = new Set(prev);
                                              next.delete(index);
                                              return next;
                                            });
                                          }
                                        }}
                                        placeholder="Observações / providências para esta demanda..."
                                        className="flex-1 text-xs bg-white dark:bg-zinc-900 border border-emerald-300 dark:border-emerald-700 rounded px-2 py-1 outline-none resize-none w-full"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Differences summary */}
                                <p className="text-[10px] text-purple-600 dark:text-purple-400">
                                  {dup.diferencas.join(" • ")}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Botões */}
            <div className="flex flex-col gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              {/* Progress bar — shown only while importing */}
              {isImporting && importProgress && (
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span className="truncate max-w-[70%]">
                      Importando {importProgress.currentName}...
                    </span>
                    <span className="flex-shrink-0">
                      {importProgress.currentIndex + 1}/{importProgress.total}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${((importProgress.currentIndex + 1) / importProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleVoltar} disabled={isImporting}>
                  Voltar
                </Button>
                <Button
                  onClick={handleImportar}
                  disabled={isImporting || (selectedNovas.size === 0 && selectedDups.size === 0)}
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                >
                  {isImporting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processando...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      {selectedNovas.size > 0 && selectedDups.size > 0
                        ? `Importar ${selectedNovas.size} + Atualizar ${selectedDups.size}`
                        : selectedNovas.size > 0
                          ? `Importar ${selectedNovas.size} Demandas`
                          : `Atualizar ${selectedDups.size} Demandas`
                      }
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
