"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  FileText, Upload, CheckCircle2, XCircle, AlertTriangle,
  Calendar, User, Loader2, X, ChevronDown,
} from "lucide-react";

// ==========================================
// TIPOS
// ==========================================

export interface SessaoParsed {
  data: Date;
  horario: string;
  processo: string;
  reus: string[]; // Nomes dos réus (sem CPF)
  assistidoNome: string; // Primeiro réu (principal)
  situacao: "designada" | "cancelada" | "redesignada";
  selected: boolean; // Para o checkbox de importação
}

// ==========================================
// PARSER
// ==========================================

function parsePauta(rawText: string): SessaoParsed[] {
  // 1. Limpar headers de página do PJe
  let text = rawText
    .replace(/^\d+\s*$/gm, "") // Remove números de página isolados
    .replace(/Processo Judicial Eletrônico/g, "")
    .replace(/Pauta de Audiência/g, "")
    .replace(/Emitido em:.*$/gm, "")
    .replace(/Todas as expressões:.*$/gm, "")
    .replace(/Data maior.*$/gm, "")
    .replace(/Data final menor.*$/gm, "")
    .replace(/Classificado por:.*$/gm, "")
    .replace(/Data\s+Processo\s+Órgão julgador\s+Partes\s+Classe\s+Tipo de\s*\n?\s*audiência\s+Sala\s+Situação/gi, "")
    .replace(/\r\n/g, "\n");

  // 2. Encontrar cada sessão pelo padrão de data
  // Padrão: DD/MM/YY HH:MM seguido de número de processo
  const datePattern = /(\d{2}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})\s+(\d{7}-\s*\n?\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/g;

  // Abordagem: dividir o texto em blocos por data
  const blocks: { match: RegExpMatchArray; startIndex: number }[] = [];
  let m;

  // Reset e refazer com matchAll
  const matches = [...text.matchAll(datePattern)];

  if (matches.length === 0) {
    // Tentar padrão alternativo com processo na mesma linha
    const altPattern = /(\d{2}\/\d{2}\/\d{2})\s+(\d{2}:\d{2})\s+(\d{7}-[\s\n]*\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/g;
    const altMatches = [...text.matchAll(altPattern)];
    if (altMatches.length === 0) return [];
    altMatches.forEach(am => blocks.push({ match: am, startIndex: am.index! }));
  } else {
    matches.forEach(am => blocks.push({ match: am, startIndex: am.index! }));
  }

  const sessoes: SessaoParsed[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const { match } = blocks[i];
    const startIdx = blocks[i].startIndex;
    const endIdx = i + 1 < blocks.length ? blocks[i + 1].startIndex : text.length;
    const block = text.substring(startIdx, endIdx);

    // Extrair data
    const [, dataStr, horario, processoRaw] = match;
    const processo = processoRaw.replace(/\s+/g, "").replace(/\n/g, "");

    // Parsear data DD/MM/YY
    const [dd, mm, yy] = dataStr.split("/").map(Number);
    const year = yy < 100 ? 2000 + yy : yy;
    const data = new Date(year, mm - 1, dd);

    // Extrair situação (última palavra relevante do bloco)
    let situacao: "designada" | "cancelada" | "redesignada" = "designada";
    if (/\bcancelada\b/i.test(block)) situacao = "cancelada";
    else if (/\bredesignada\b/i.test(block)) situacao = "redesignada";
    else if (/\bdesignada\b/i.test(block)) situacao = "designada";

    // Extrair réus do bloco de partes
    const reus = extrairReus(block);

    const assistidoNome = reus.length > 0 ? reus[0] : "Réu não identificado";

    sessoes.push({
      data,
      horario,
      processo,
      reus,
      assistidoNome: reus.length > 1 ? `${reus[0]} e outros (${reus.length})` : assistidoNome,
      situacao,
      selected: situacao === "designada", // Pré-seleciona apenas designadas
    });
  }

  return sessoes;
}

/**
 * Extrai nomes dos réus de um bloco de texto da pauta.
 * Busca após o "X" que separa MP dos réus.
 */
function extrairReus(block: string): string[] {
  // Encontrar a seção após o "X" separador
  const xSplit = block.split(/\nX\n|\nX\s|\sX\n/);
  if (xSplit.length < 2) return [];

  const partesReu = xSplit.slice(1).join(" ");

  // Extrair nomes - pattern: NOME COMPLETO - CPF: xxx (ROLE) ou NOME (ROLE)
  const nomePattern = /([A-ZÀ-ÚÇa-zà-úç\s]+?)(?:\s*-\s*CPF:\s*[\d.-]+)?\s*\((REU|RECORRIDO|APELANTE|QUERELANTE)\)/gi;
  const nomes: string[] = [];
  let nm;

  while ((nm = nomePattern.exec(partesReu)) !== null) {
    let nome = nm[1].trim();
    // Capitalizar
    nome = nome
      .split(/\s+/)
      .map(w => {
        if (w.length <= 2 && ["DE", "DA", "DO", "DOS", "DAS", "E"].includes(w.toUpperCase())) {
          return w.toLowerCase();
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(" ");

    // Evitar duplicatas (mesmo nome pode aparecer 2x com roles diferentes)
    if (!nomes.some(n => n.toLowerCase() === nome.toLowerCase())) {
      nomes.push(nome);
    }
  }

  return nomes;
}

// ==========================================
// COMPONENTE MODAL
// ==========================================

interface PautaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (sessoes: SessaoParsed[]) => Promise<void>;
}

export function PautaImportModal({ isOpen, onClose, onImport }: PautaImportModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<SessaoParsed[]>([]);
  const [step, setStep] = useState<"paste" | "review">("paste");
  const [importing, setImporting] = useState(false);

  const handleParse = () => {
    if (!rawText.trim()) {
      return;
    }
    const result = parsePauta(rawText);
    setParsed(result);
    setStep("review");
  };

  const handleImport = async () => {
    if (parsed.length === 0) return;

    setImporting(true);
    try {
      // Envia TODAS as sessões (designadas, canceladas, redesignadas)
      // O backend cria as designadas e atualiza o status das demais
      await onImport(parsed);
      // Reset
      setRawText("");
      setParsed([]);
      setStep("paste");
      onClose();
    } finally {
      setImporting(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setParsed(prev => prev.map((s, i) => i === idx ? { ...s, selected: !s.selected } : s));
  };

  const toggleSelectAll = (selected: boolean) => {
    setParsed(prev => prev.map(s => ({ ...s, selected: s.situacao === "designada" ? selected : s.selected })));
  };

  const stats = useMemo(() => {
    const designadas = parsed.filter(s => s.situacao === "designada");
    const canceladas = parsed.filter(s => s.situacao === "cancelada");
    const redesignadas = parsed.filter(s => s.situacao === "redesignada");
    const selecionadas = parsed.filter(s => s.selected);
    return { designadas, canceladas, redesignadas, selecionadas, total: parsed.length };
  }, [parsed]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Importar Pauta do PJe
              </h2>
              <p className="text-[11px] text-zinc-400">
                {step === "paste" ? "Cole o conteúdo da pauta" : `${stats.total} sessões encontradas`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === "paste" ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Copie a pauta de audiências do PJe (Ctrl+A, Ctrl+C na página da pauta) e cole abaixo.
                O parser identifica automaticamente datas, processos, réus e situação.
              </p>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Cole a pauta do PJe aqui..."
                className={cn(
                  "w-full h-64 p-3 rounded-xl text-xs font-mono resize-none",
                  "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700",
                  "text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
                )}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {stats.designadas.length} designada{stats.designadas.length !== 1 ? "s" : ""}
                </span>
                {stats.canceladas.length > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[11px] font-medium">
                    <XCircle className="w-3 h-3" />
                    {stats.canceladas.length} cancelada{stats.canceladas.length !== 1 ? "s" : ""}
                  </span>
                )}
                {stats.redesignadas.length > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    {stats.redesignadas.length} redesignada{stats.redesignadas.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Session list */}
              <div className="space-y-1.5">
                {parsed.map((sessao, idx) => {
                  const isCancelled = sessao.situacao === "cancelada";
                  const isRedesigned = sessao.situacao === "redesignada";
                  const isInactive = isCancelled || isRedesigned;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all",
                        isInactive
                          ? "bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200/50 dark:border-zinc-800/50 opacity-50"
                          : sessao.selected
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40"
                            : "bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80"
                      )}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={sessao.selected}
                        onChange={() => toggleSelect(idx)}
                        disabled={isInactive}
                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-emerald-500 focus:ring-emerald-500/30 disabled:opacity-30 shrink-0"
                      />

                      {/* Date */}
                      <div className="w-16 shrink-0 text-center">
                        <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {sessao.data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                        </span>
                        <p className="text-[9px] text-zinc-400 uppercase">
                          {sessao.data.toLocaleDateString("pt-BR", { weekday: "short" })}
                        </p>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs font-semibold truncate",
                          isInactive
                            ? "text-zinc-400 dark:text-zinc-500 line-through"
                            : "text-zinc-900 dark:text-zinc-100"
                        )}>
                          {sessao.reus.length > 0 ? sessao.reus.join(", ") : "Réu não identificado"}
                        </p>
                        <span className="text-[10px] font-mono text-zinc-400 tabular-nums">
                          {sessao.processo}
                        </span>
                      </div>

                      {/* Status */}
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0",
                        sessao.situacao === "designada" && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
                        sessao.situacao === "cancelada" && "bg-zinc-100 dark:bg-zinc-800 text-zinc-500",
                        sessao.situacao === "redesignada" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
                      )}>
                        {sessao.situacao}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30">
          {step === "review" && (
            <button
              onClick={() => setStep("paste")}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Voltar
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancelar
            </button>
            {step === "paste" ? (
              <button
                onClick={handleParse}
                disabled={!rawText.trim()}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all",
                  "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                Analisar Pauta
              </button>
            ) : (
              <button
                onClick={handleImport}
                disabled={importing || stats.total === 0}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all",
                  "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {importing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Processar {stats.total} sessão{stats.total !== 1 ? "ões" : ""}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
