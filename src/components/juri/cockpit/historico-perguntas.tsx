"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  MessageSquare, Plus, Check, X, Shield, Target,
  Gavel, Users, Filter, AlertTriangle, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PerguntaRegistro {
  id: string;
  texto: string;
  quemPerguntou: "mp" | "defesa" | "juiz" | "jurado";
  testemunha: string;
  fase: string;
  horario: string;
  deferida: boolean | null;
  resposta?: string;
  vinculadaContradicao?: boolean;
}

interface HistoricoPerguntasProps {
  isDarkMode: boolean;
  faseSelecionada: { id: string; label: string };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "defender_cockpit_perguntas";

type QuemPerguntou = PerguntaRegistro["quemPerguntou"];

const QUEM_OPTIONS: { id: QuemPerguntou; label: string; icon: typeof Shield; color: string; bg: string; border: string; dot: string }[] = [
  { id: "mp", label: "MP", icon: Target, color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-900", dot: "bg-rose-500" },
  { id: "defesa", label: "Defesa", icon: Shield, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-900", dot: "bg-emerald-500" },
  { id: "juiz", label: "Juiz", icon: Gavel, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900", dot: "bg-amber-500" },
  { id: "jurado", label: "Jurado", icon: Users, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-900", dot: "bg-blue-500" },
];

const QUEM_MAP = Object.fromEntries(QUEM_OPTIONS.map((q) => [q.id, q])) as Record<QuemPerguntou, (typeof QUEM_OPTIONS)[number]>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readPerguntas(): PerguntaRegistro[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PerguntaRegistro[]) : [];
  } catch { return []; }
}

function writePerguntas(data: PerguntaRegistro[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HistoricoPerguntas({ isDarkMode, faseSelecionada }: HistoricoPerguntasProps) {
  const [perguntas, setPerguntas] = useState<PerguntaRegistro[]>([]);
  const [quem, setQuem] = useState<QuemPerguntou>("mp");
  const [testemunha, setTestemunha] = useState("");
  const [texto, setTexto] = useState("");
  const [filtroQuem, setFiltroQuem] = useState<"all" | QuemPerguntou>("all");
  const [filtroTestemunha, setFiltroTestemunha] = useState<string>("all");
  const [filtroIndeferidas, setFiltroIndeferidas] = useState(false);
  const [expandedResposta, setExpandedResposta] = useState<string | null>(null);
  const [showTestemunhaList, setShowTestemunhaList] = useState(false);

  // Load from localStorage
  useEffect(() => { setPerguntas(readPerguntas()); }, []);
  const persist = useCallback((next: PerguntaRegistro[]) => { setPerguntas(next); writePerguntas(next); }, []);

  // Unique witnesses for autocomplete and filter
  const testemunhas = useMemo(() => [...new Set(perguntas.map((p) => p.testemunha))].sort(), [perguntas]);

  const filteredTestemunhas = useMemo(() => {
    if (!testemunha.trim()) return testemunhas;
    const t = testemunha.toLowerCase();
    return testemunhas.filter((n) => n.toLowerCase().includes(t));
  }, [testemunha, testemunhas]);

  // Add question
  const handleAdd = useCallback(() => {
    if (!texto.trim() || !testemunha.trim()) return;
    const nova: PerguntaRegistro = {
      id: `p-${Date.now()}`,
      texto: texto.trim(),
      quemPerguntou: quem,
      testemunha: testemunha.trim(),
      fase: faseSelecionada.label,
      horario: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      deferida: null,
    };
    persist([nova, ...perguntas]);
    setTexto("");
  }, [texto, testemunha, quem, faseSelecionada, perguntas, persist]);

  // Actions
  const setDeferida = useCallback((id: string, val: boolean | null) => {
    persist(perguntas.map((p) => (p.id === id ? { ...p, deferida: val } : p)));
  }, [perguntas, persist]);

  const toggleContradicao = useCallback((id: string) => {
    persist(perguntas.map((p) => (p.id === id ? { ...p, vinculadaContradicao: !p.vinculadaContradicao } : p)));
  }, [perguntas, persist]);

  const setResposta = useCallback((id: string, resposta: string) => {
    persist(perguntas.map((p) => (p.id === id ? { ...p, resposta } : p)));
  }, [perguntas, persist]);

  // Filtered list
  const filtered = useMemo(() => {
    let result = perguntas;
    if (filtroQuem !== "all") result = result.filter((p) => p.quemPerguntou === filtroQuem);
    if (filtroTestemunha !== "all") result = result.filter((p) => p.testemunha === filtroTestemunha);
    if (filtroIndeferidas) result = result.filter((p) => p.deferida === false);
    return result;
  }, [perguntas, filtroQuem, filtroTestemunha, filtroIndeferidas]);

  // Stats
  const stats = useMemo(() => {
    const total = perguntas.length;
    const byQuem = { mp: 0, defesa: 0, juiz: 0, jurado: 0 };
    let indeferidas = 0;
    let contradicoes = 0;
    for (const p of perguntas) {
      byQuem[p.quemPerguntou]++;
      if (p.deferida === false) indeferidas++;
      if (p.vinculadaContradicao) contradicoes++;
    }
    return { total, byQuem, indeferidas, contradicoes };
  }, [perguntas]);

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-800/80 dark:bg-neutral-900")}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Historico de Perguntas</span>
        <span className="ml-auto text-[10px] text-neutral-400 dark:text-neutral-500">{faseSelecionada.label}</span>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-200/80 bg-neutral-50/50 px-3 py-2 dark:border-neutral-800/80 dark:bg-neutral-800/30">
        <span className="text-[11px] font-medium text-neutral-900 dark:text-neutral-100">{stats.total}</span>
        <span className="text-[10px] text-neutral-400 dark:text-neutral-500">perguntas</span>
        <span className="text-neutral-200 dark:text-neutral-700">|</span>
        {QUEM_OPTIONS.map((q) => (
          <span key={q.id} className="flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", q.dot)} />
            <span className={cn("text-[10px]", q.color)}>{stats.byQuem[q.id]}</span>
          </span>
        ))}
        <span className="text-neutral-200 dark:text-neutral-700">|</span>
        <span className="flex items-center gap-1">
          <X className="h-3 w-3 text-rose-500" />
          <span className="text-[10px] text-rose-600 dark:text-rose-400">{stats.indeferidas}</span>
        </span>
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          <span className="text-[10px] text-amber-600 dark:text-amber-400">{stats.contradicoes}</span>
        </span>
      </div>

      {/* Add form */}
      <div className="flex flex-col gap-2 rounded-lg border border-neutral-200/80 bg-neutral-50/30 p-3 dark:border-neutral-800/80 dark:bg-neutral-800/20">
        <div className="flex gap-1">
          {QUEM_OPTIONS.map((q) => {
            const Icon = q.icon;
            return (
              <button
                key={q.id}
                onClick={() => setQuem(q.id)}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 cursor-pointer",
                  quem === q.id ? cn(q.bg, q.color, "ring-1", q.border) : "text-neutral-400 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:bg-neutral-800"
                )}
              >
                <Icon className="h-3 w-3" />
                {q.label}
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Input
            value={testemunha}
            onChange={(e) => { setTestemunha(e.target.value); setShowTestemunhaList(true); }}
            onFocus={() => setShowTestemunhaList(true)}
            onBlur={() => setTimeout(() => setShowTestemunhaList(false), 150)}
            placeholder="Nome da testemunha..."
            className="h-8 text-xs"
          />
          {showTestemunhaList && filteredTestemunhas.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
              {filteredTestemunhas.map((name) => (
                <button
                  key={name}
                  onMouseDown={() => { setTestemunha(name); setShowTestemunhaList(false); }}
                  className="w-full cursor-pointer px-3 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pergunta formulada..." className="h-8 text-xs" onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <Button onClick={handleAdd} disabled={!texto.trim() || !testemunha.trim()} size="sm" className="h-7 gap-1 self-end bg-emerald-600 text-xs text-white hover:bg-emerald-700 disabled:opacity-40">
          <Plus className="h-3 w-3" />
          Registrar
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3 w-3 text-neutral-400 dark:text-neutral-500" />
        <div className="flex gap-1">
          {[{ id: "all" as const, label: "Todos" }, ...QUEM_OPTIONS.map((q) => ({ id: q.id, label: q.label }))].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setFiltroQuem(opt.id)}
              className={cn(
                "rounded-md px-2 py-1 text-[10px] font-medium transition-all cursor-pointer",
                filtroQuem === opt.id ? "bg-emerald-600 text-white" : "text-neutral-400 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:bg-neutral-800"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={filtroTestemunha}
          onChange={(e) => setFiltroTestemunha(e.target.value)}
          className="h-6 rounded-md border border-neutral-200 bg-white px-1.5 text-[10px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
        >
          <option value="all">Todas testemunhas</option>
          {testemunhas.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={() => setFiltroIndeferidas(!filtroIndeferidas)}
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all cursor-pointer",
            filtroIndeferidas ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" : "text-neutral-400 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:bg-neutral-800"
          )}
        >
          <X className="h-2.5 w-2.5" />
          Indeferidas
        </button>
      </div>

      {/* Questions list */}
      <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500">Nenhuma pergunta registrada</p>
        )}
        {filtered.map((p) => {
          const s = QUEM_MAP[p.quemPerguntou];
          const isExpanded = expandedResposta === p.id;
          return (
            <div
              key={p.id}
              className={cn(
                "flex flex-col gap-1.5 rounded-lg border p-3 transition-all duration-200",
                p.vinculadaContradicao
                  ? "border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10"
                  : "border-neutral-200/80 bg-white dark:border-neutral-800/80 dark:bg-neutral-900"
              )}
            >
              <div className="flex items-center gap-2">
                <Badge className={cn(s.bg, s.color, s.border, "text-[10px] px-1.5 py-0")}>{s.label}</Badge>
                <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">{p.testemunha}</span>
                <span className="ml-auto text-[10px] text-neutral-400 dark:text-neutral-500">{p.horario} - {p.fase}</span>
              </div>
              <p className="text-xs leading-snug text-neutral-900 dark:text-neutral-100">{p.texto}</p>
              <div className="flex items-center gap-1.5">
                {/* Ruling buttons */}
                <button
                  onClick={() => setDeferida(p.id, p.deferida === true ? null : true)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all cursor-pointer",
                    p.deferida === true ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "text-neutral-400 hover:text-emerald-600 dark:text-neutral-500"
                  )}
                >
                  <Check className="h-3 w-3" />
                  Deferida
                </button>
                <button
                  onClick={() => setDeferida(p.id, p.deferida === false ? null : false)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all cursor-pointer",
                    p.deferida === false ? "bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400" : "text-neutral-400 hover:text-rose-600 dark:text-neutral-500"
                  )}
                >
                  <X className="h-3 w-3" />
                  Indeferida
                </button>
                <button
                  onClick={() => toggleContradicao(p.id)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all cursor-pointer",
                    p.vinculadaContradicao ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" : "text-neutral-400 hover:text-amber-600 dark:text-neutral-500"
                  )}
                >
                  <AlertTriangle className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setExpandedResposta(isExpanded ? null : p.id)}
                  className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-neutral-400 transition-all hover:text-neutral-600 cursor-pointer dark:text-neutral-500 dark:hover:text-neutral-300"
                >
                  <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                  Resposta
                </button>
              </div>
              {isExpanded && (
                <Textarea
                  value={p.resposta ?? ""}
                  onChange={(e) => setResposta(p.id, e.target.value)}
                  placeholder="Resumo da resposta..."
                  className="mt-1 min-h-[48px] text-[11px] leading-relaxed"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
