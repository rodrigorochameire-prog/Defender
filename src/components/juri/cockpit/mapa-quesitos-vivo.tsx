"use client";

import { useState, useEffect, useMemo } from "react";
import { Vote, Plus, CheckCircle2, XCircle, Circle, ChevronRight, Scale, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Quesito {
  id: string;
  numero: number;
  texto: string;
  tipo: "materialidade" | "autoria" | "absolvicao" | "causa_diminuicao" | "qualificadora" | "privilegio";
  resultado: "sim" | "nao" | null;
  obrigatorio: boolean;
}

interface MapaQuesitosVivoProps {
  isDarkMode: boolean;
  faseSelecionada: { id: string; label: string };
}

const STORAGE_KEY = "defender_cockpit_quesitos";

const TIPO_COLORS: Record<Quesito["tipo"], { bg: string; text: string }> = {
  materialidade: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300" },
  autoria: { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300" },
  absolvicao: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
  causa_diminuicao: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" },
  qualificadora: { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300" },
  privilegio: { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300" },
};

const TIPO_LABELS: Record<Quesito["tipo"], string> = {
  materialidade: "Materialidade", autoria: "Autoria", absolvicao: "Absolvicao",
  causa_diminuicao: "Diminuicao", qualificadora: "Qualificadora", privilegio: "Privilegio",
};

function defaultQuesitos(): Quesito[] {
  return [
    { id: "q1", numero: 1, texto: "O crime de homicidio se consumou conforme descrito na denuncia?", tipo: "materialidade", resultado: null, obrigatorio: true },
    { id: "q2", numero: 2, texto: "O reu concorreu para a pratica do crime descrito?", tipo: "autoria", resultado: null, obrigatorio: true },
    { id: "q3", numero: 3, texto: "O jurado absolve o acusado? (art. 483 paragrafo 2 CPP)", tipo: "absolvicao", resultado: null, obrigatorio: true },
    { id: "q4", numero: 4, texto: "Existe causa de diminuicao de pena alegada pela defesa? (art. 483 paragrafo 3, I CPP)", tipo: "causa_diminuicao", resultado: null, obrigatorio: false },
    { id: "q5", numero: 5, texto: "Existe qualificadora conforme descrita na pronuncia? (art. 483 paragrafo 3, II CPP)", tipo: "qualificadora", resultado: null, obrigatorio: false },
  ];
}

function loadFromStorage(): Quesito[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Quesito[]) : null;
  } catch { return null; }
}

function saveToStorage(quesitos: Quesito[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(quesitos)); } catch { /* noop */ }
}

type ResultadoTipo = "absolvicao_materialidade" | "absolvicao_autoria" | "absolvicao_clemencia"
  | "condenacao_simples" | "condenacao_qualificada" | "condenacao_diminuida"
  | "condenacao_qualificada_diminuida" | "pendente";

function computeResultado(quesitos: Quesito[]): ResultadoTipo {
  const q1 = quesitos.find((q) => q.tipo === "materialidade");
  const q2 = quesitos.find((q) => q.tipo === "autoria");
  const q3 = quesitos.find((q) => q.tipo === "absolvicao");
  if (!q1 || !q2 || !q3) return "pendente";
  if (q1.resultado === null || q2.resultado === null) return "pendente";
  if (q1.resultado === "nao") return "absolvicao_materialidade";
  if (q2.resultado === "nao") return "absolvicao_autoria";
  if (q3.resultado === null) return "pendente";
  if (q3.resultado === "sim") return "absolvicao_clemencia";
  // q3=nao => condenacao path
  const dims = quesitos.filter((q) => q.tipo === "causa_diminuicao");
  const quals = quesitos.filter((q) => q.tipo === "qualificadora");
  if (dims.some((q) => q.resultado === null) || quals.some((q) => q.resultado === null)) return "pendente";
  const hasDim = dims.some((q) => q.resultado === "sim");
  const hasQual = quals.some((q) => q.resultado === "sim");
  if (hasDim && hasQual) return "condenacao_qualificada_diminuida";
  if (hasQual) return "condenacao_qualificada";
  if (hasDim) return "condenacao_diminuida";
  return "condenacao_simples";
}

const RESULTADO_DISPLAY: Record<ResultadoTipo, { label: string; variant: "absolvicao" | "condenacao" | "pendente" }> = {
  absolvicao_materialidade: { label: "Absolvicao por falta de materialidade", variant: "absolvicao" },
  absolvicao_autoria: { label: "Absolvicao por negativa de autoria", variant: "absolvicao" },
  absolvicao_clemencia: { label: "Absolvicao por clemencia do Conselho", variant: "absolvicao" },
  condenacao_simples: { label: "Condenacao simples", variant: "condenacao" },
  condenacao_qualificada: { label: "Condenacao com qualificadora", variant: "condenacao" },
  condenacao_diminuida: { label: "Condenacao com causa de diminuicao", variant: "condenacao" },
  condenacao_qualificada_diminuida: { label: "Condenacao qualificada com diminuicao", variant: "condenacao" },
  pendente: { label: "Aguardando votacao...", variant: "pendente" },
};

function QuesitCard({ quesito, disabled, onVote, onRemove }: {
  quesito: Quesito; disabled: boolean;
  onVote: (id: string, r: "sim" | "nao" | null) => void;
  onRemove?: (id: string) => void;
}) {
  const border = disabled ? "border-zinc-200/40 dark:border-zinc-800/40"
    : quesito.resultado === "sim" ? "border-emerald-400 dark:border-emerald-600"
    : quesito.resultado === "nao" ? "border-rose-400 dark:border-rose-600"
    : "border-zinc-200/80 dark:border-zinc-800/80";
  const c = TIPO_COLORS[quesito.tipo];

  return (
    <div className={cn("flex items-start gap-3 rounded-xl border bg-white p-3 transition-all duration-200 dark:bg-zinc-900", border, disabled && "opacity-40 pointer-events-none")}>
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold", disabled ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200")}>
        {quesito.numero}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", c.bg, c.text)}>
            {TIPO_LABELS[quesito.tipo]}
          </span>
          {quesito.obrigatorio && (
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">obrigatorio</span>
          )}
        </div>
        <p className="text-sm leading-snug text-zinc-900 dark:text-zinc-100">{quesito.texto}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="ghost" size="sm"
          className={cn("h-8 gap-1 rounded-lg px-2.5 text-xs font-medium transition-colors",
            quesito.resultado === "sim" ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400")}
          onClick={() => onVote(quesito.id, quesito.resultado === "sim" ? null : "sim")}>
          <CheckCircle2 className="h-3.5 w-3.5" /> SIM
        </Button>
        <Button variant="ghost" size="sm"
          className={cn("h-8 gap-1 rounded-lg px-2.5 text-xs font-medium transition-colors",
            quesito.resultado === "nao" ? "bg-rose-600 text-white hover:bg-rose-700"
            : "text-zinc-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/30 dark:hover:text-rose-400")}
          onClick={() => onVote(quesito.id, quesito.resultado === "nao" ? null : "nao")}>
          <XCircle className="h-3.5 w-3.5" /> NAO
        </Button>
        {onRemove && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-rose-500"
            onClick={() => onRemove(quesito.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function MapaQuesitosVivo({ isDarkMode, faseSelecionada }: MapaQuesitosVivoProps) {
  const [quesitos, setQuesitos] = useState<Quesito[]>(defaultQuesitos);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTexto, setNewTexto] = useState("");
  const [newTipo, setNewTipo] = useState<Quesito["tipo"]>("qualificadora");

  useEffect(() => { const s = loadFromStorage(); if (s?.length) setQuesitos(s); }, []);
  useEffect(() => { saveToStorage(quesitos); }, [quesitos]);

  const disabledMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    const q1 = quesitos.find((q) => q.tipo === "materialidade");
    const q2 = quesitos.find((q) => q.tipo === "autoria");
    const q3 = quesitos.find((q) => q.tipo === "absolvicao");
    for (const q of quesitos) {
      if (q.tipo === "materialidade") map[q.id] = false;
      else if (q.tipo === "autoria") map[q.id] = q1?.resultado === "nao";
      else if (q.tipo === "absolvicao") map[q.id] = q1?.resultado === "nao" || q2?.resultado === "nao";
      else map[q.id] = q1?.resultado === "nao" || q2?.resultado === "nao" || q3?.resultado !== "nao";
    }
    return map;
  }, [quesitos]);

  const resultado = useMemo(() => computeResultado(quesitos), [quesitos]);
  const display = RESULTADO_DISPLAY[resultado];
  const votedCount = quesitos.filter((q) => q.resultado !== null && !disabledMap[q.id]).length;
  const activeCount = quesitos.filter((q) => !disabledMap[q.id]).length;
  const isVotacao = faseSelecionada.id === "votacao";

  function handleVote(id: string, resultado: "sim" | "nao" | null) {
    setQuesitos((prev) => {
      const updated = prev.map((q) => (q.id === id ? { ...q, resultado } : q));
      const changed = updated.find((q) => q.id === id);
      if (!changed) return updated;
      if (changed.tipo === "materialidade" && changed.resultado === "nao")
        return updated.map((q) => q.tipo !== "materialidade" ? { ...q, resultado: null } : q);
      if (changed.tipo === "autoria" && changed.resultado === "nao")
        return updated.map((q) => q.tipo !== "materialidade" && q.tipo !== "autoria" ? { ...q, resultado: null } : q);
      if (changed.tipo === "absolvicao" && changed.resultado === "sim")
        return updated.map((q) => ["causa_diminuicao", "qualificadora", "privilegio"].includes(q.tipo) ? { ...q, resultado: null } : q);
      return updated;
    });
  }

  function handleAdd() {
    if (!newTexto.trim()) return;
    const maxNum = Math.max(...quesitos.map((q) => q.numero), 0);
    setQuesitos((prev) => [...prev, { id: `q_custom_${Date.now()}`, numero: maxNum + 1, texto: newTexto.trim(), tipo: newTipo, resultado: null, obrigatorio: false }]);
    setNewTexto("");
    setShowAddForm(false);
  }

  function handleRemove(id: string) {
    setQuesitos((prev) => prev.filter((q) => q.id !== id).map((q, i) => ({ ...q, numero: i + 1 })));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Mapa de Quesitos — art. 483 CPP
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{votedCount} de {activeCount} votados</span>
          <Button variant="ghost" size="sm" className="h-7 text-[10px] text-zinc-400 hover:text-zinc-600" onClick={() => setQuesitos(defaultQuesitos())}>
            Resetar
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: activeCount > 0 ? `${(votedCount / activeCount) * 100}%` : "0%" }} />
      </div>

      {/* Quesitos */}
      <div className="space-y-2">
        {quesitos.map((q) => (
          <div key={q.id} className="flex items-start gap-1">
            {q.numero > 1 && <ChevronRight className="mt-3 h-3.5 w-3.5 shrink-0 text-zinc-300 dark:text-zinc-700" />}
            <div className="flex-1">
              <QuesitCard quesito={q} disabled={disabledMap[q.id] ?? false} onVote={handleVote}
                onRemove={!q.obrigatorio ? handleRemove : undefined} />
            </div>
          </div>
        ))}
      </div>

      {/* Add quesito */}
      {showAddForm ? (
        <div className="rounded-xl border border-zinc-200/80 bg-white p-3 dark:border-zinc-800/80 dark:bg-zinc-900">
          <div className="space-y-2">
            <Input placeholder="Texto do quesito..." value={newTexto} onChange={(e) => setNewTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()} className="text-sm" />
            <div className="flex items-center gap-2">
              <select value={newTipo} onChange={(e) => setNewTipo(e.target.value as Quesito["tipo"])}
                className={cn("h-8 rounded-lg border px-2 text-xs", "border-zinc-200 bg-white text-zinc-700", "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300")}>
                <option value="qualificadora">Qualificadora</option>
                <option value="causa_diminuicao">Causa de Diminuicao</option>
                <option value="privilegio">Privilegio</option>
              </select>
              <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={handleAdd}>Adicionar</Button>
              <Button variant="ghost" size="sm" className="h-8 text-zinc-400" onClick={() => setShowAddForm(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="h-8 w-full gap-1.5 text-xs text-zinc-400 hover:text-zinc-600" onClick={() => setShowAddForm(true)}>
          <Plus className="h-3.5 w-3.5" /> Adicionar quesito
        </Button>
      )}

      {/* Result banner */}
      <div className={cn("flex items-center gap-3 rounded-xl border p-3 transition-all duration-300",
        display.variant === "absolvicao" && "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
        display.variant === "condenacao" && "border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40",
        display.variant === "pendente" && "border-zinc-200/80 bg-zinc-50 dark:border-zinc-800/80 dark:bg-zinc-900",
        isVotacao && display.variant !== "pendente" && "animate-pulse")}>
        {display.variant === "absolvicao" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          : display.variant === "condenacao" ? <XCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
          : <Circle className="h-5 w-5 shrink-0 text-zinc-400 dark:text-zinc-500" />}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Resultado projetado</p>
          <p className={cn("text-sm font-semibold",
            display.variant === "absolvicao" && "text-emerald-700 dark:text-emerald-300",
            display.variant === "condenacao" && "text-rose-700 dark:text-rose-300",
            display.variant === "pendente" && "text-zinc-500 dark:text-zinc-400")}>
            {display.label}
          </p>
        </div>
        <Vote className="h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600" />
      </div>
    </div>
  );
}
