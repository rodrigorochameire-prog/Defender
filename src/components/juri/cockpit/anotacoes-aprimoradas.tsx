"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Shield,
  AlertCircle,
  Target,
  AlertTriangle,
  Quote,
  Users,
  Mic,
  PenLine,
  Star,
  Trash2,
  Plus,
  Filter,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Anotacao {
  id: string;
  categoria: string;
  texto: string;
  horario: string;
  fase: string;
  importante: boolean;
}

interface AnotacoesAprimoradasProps {
  anotacoes: Anotacao[];
  setAnotacoes: React.Dispatch<React.SetStateAction<Anotacao[]>>;
  faseSelecionada: { id: string; label: string };
  isDarkMode: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const iconMap = {
  Shield,
  AlertCircle,
  Target,
  AlertTriangle,
  Quote,
  Users,
  Mic,
  PenLine,
} as const;

const categoriasAnotacoes = [
  { id: "mp_argumento", label: "Argumento do MP", icon: "Shield" as const, color: "rose" },
  { id: "mp_refutar", label: "Ponto a Refutar", icon: "AlertCircle" as const, color: "orange" },
  { id: "defesa_usar", label: "Usar na Defesa", icon: "Target" as const, color: "emerald" },
  { id: "contradicao", label: "Contradição", icon: "AlertTriangle" as const, color: "amber" },
  { id: "frase_impacto", label: "Frase de Impacto", icon: "Quote" as const, color: "purple" },
  { id: "jurado_reacao", label: "Reação Jurado", icon: "Users" as const, color: "blue" },
  { id: "testemunha", label: "Testemunha", icon: "Mic" as const, color: "indigo" },
  { id: "geral", label: "Geral", icon: "PenLine" as const, color: "zinc" },
];

const templatesPorCategoria: Record<string, string[]> = {
  mp_argumento: [
    "MP argumentou que...",
    "Citou jurisprudência...",
    "Tese do MP:",
  ],
  mp_refutar: [
    "Refutar: MP disse que...",
    "Ponto fraco do argumento:",
    "Contra-argumento possível:",
  ],
  defesa_usar: [
    "Favorável: ",
    "Jurado reagiu bem a...",
    "Reforçar na tréplica:",
  ],
  contradicao: [
    "Contradiz depoimento de...",
    "Conflita com prova...",
    "MP disse antes que...",
  ],
  frase_impacto: [
    "Frase para encerramento:",
    "Imagem forte: ",
    "Pergunta retórica:",
  ],
  jurado_reacao: [
    "Jurado(a) #_ reagiu quando...",
    "Expressão facial ao ouvir...",
    "Jurado atento ao tema:",
  ],
  testemunha: [
    "Testemunha declarou...",
    "Contradiz versão de...",
    "Confirmou que...",
  ],
  geral: [
    "Observação: ",
    "Lembrar de mencionar...",
    "Nota para réplica:",
  ],
};

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function getCategoryColorClasses(color: string, selected: boolean) {
  if (!selected) {
    return "bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300";
  }

  const map: Record<string, string> = {
    rose: "bg-rose-500 text-white dark:bg-rose-600",
    orange: "bg-orange-500 text-white dark:bg-orange-600",
    emerald: "bg-emerald-600 text-white dark:bg-emerald-500",
    amber: "bg-amber-500 text-white dark:bg-amber-600",
    purple: "bg-purple-500 text-white dark:bg-purple-600",
    blue: "bg-blue-500 text-white dark:bg-blue-600",
    indigo: "bg-indigo-500 text-white dark:bg-indigo-600",
    zinc: "bg-neutral-600 text-white dark:bg-neutral-500",
  };

  return map[color] ?? "bg-neutral-600 text-white";
}

function getCategoryBadgeClasses(color: string) {
  const map: Record<string, string> = {
    rose: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
    orange: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    amber: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    purple: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
    blue: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800",
    zinc: "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700",
  };
  return map[color] ?? map.zinc;
}

function getCategoryLeftBorder(color: string) {
  const map: Record<string, string> = {
    rose: "border-l-rose-400",
    orange: "border-l-orange-400",
    emerald: "border-l-emerald-400",
    amber: "border-l-amber-400",
    purple: "border-l-purple-400",
    blue: "border-l-blue-400",
    indigo: "border-l-indigo-400",
    zinc: "border-l-neutral-400",
  };
  return map[color] ?? "border-l-neutral-400";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnotacoesAprimoradas({
  anotacoes,
  setAnotacoes,
  faseSelecionada,
  isDarkMode,
}: AnotacoesAprimoradasProps) {
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("geral");
  const [texto, setTexto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [importanteNova, setImportanteNova] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroFase, setFiltroFase] = useState("todas");
  const [hoveredAnotacaoId, setHoveredAnotacaoId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---- Derived data ----

  const fasesUnicas = useMemo(() => {
    const fases = new Set(anotacoes.map((a) => a.fase));
    return Array.from(fases);
  }, [anotacoes]);

  const categoriaAtual = categoriasAnotacoes.find(
    (c) => c.id === categoriaSelecionada
  )!;

  const templates = templatesPorCategoria[categoriaSelecionada] ?? [];

  // ---- Argument counter ----

  const contadores = useMemo(() => {
    let mpArgs = 0;
    let refutar = 0;
    let contradicoes = 0;
    for (const a of anotacoes) {
      if (a.categoria === "mp_argumento") mpArgs++;
      if (a.categoria === "mp_refutar") refutar++;
      if (a.categoria === "contradicao") contradicoes++;
    }
    return { mpArgs, refutar, contradicoes };
  }, [anotacoes]);

  // ---- Filtered & sorted list ----

  const anotacoesFiltradas = useMemo(() => {
    let filtered = [...anotacoes];

    if (filtroCategoria !== "todas") {
      filtered = filtered.filter((a) => a.categoria === filtroCategoria);
    }

    if (filtroFase !== "todas") {
      filtered = filtered.filter((a) => a.fase === filtroFase);
    }

    // Important first, then by time descending
    filtered.sort((a, b) => {
      if (a.importante && !b.importante) return -1;
      if (!a.importante && b.importante) return 1;
      return b.horario.localeCompare(a.horario);
    });

    return filtered;
  }, [anotacoes, filtroCategoria, filtroFase]);

  // ---- Actions ----

  const salvarAnotacao = useCallback(() => {
    const trimmed = texto.trim();
    if (!trimmed) return;

    let textoFinal = trimmed;

    // If it's a contradiction with a reference, prefix it
    if (categoriaSelecionada === "contradicao" && referencia.trim()) {
      textoFinal = `[REF: ${referencia.trim()}] ${trimmed}`;
    }

    const nova: Anotacao = {
      id: `anot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      categoria: categoriaSelecionada,
      texto: textoFinal,
      horario: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      fase: faseSelecionada.id,
      importante: importanteNova,
    };

    setAnotacoes((prev) => [...prev, nova]);
    setTexto("");
    setReferencia("");
    setImportanteNova(false);
    textareaRef.current?.focus();
  }, [texto, categoriaSelecionada, referencia, importanteNova, faseSelecionada, setAnotacoes]);

  const toggleImportante = useCallback(
    (id: string) => {
      setAnotacoes((prev) =>
        prev.map((a) => (a.id === id ? { ...a, importante: !a.importante } : a))
      );
    },
    [setAnotacoes]
  );

  const deletarAnotacao = useCallback(
    (id: string) => {
      setAnotacoes((prev) => prev.filter((a) => a.id !== id));
    },
    [setAnotacoes]
  );

  const aplicarTemplate = useCallback((template: string) => {
    setTexto(template);
    textareaRef.current?.focus();
  }, []);

  // ---- Keyboard shortcuts ----

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Ctrl+Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        salvarAnotacao();
        return;
      }

      // Ctrl+I to toggle important on last annotation
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        // Only intercept if not inside the textarea (allow italic in other contexts)
        if (document.activeElement === textareaRef.current) return;
        e.preventDefault();
        setAnotacoes((prev) => {
          if (prev.length === 0) return prev;
          const copy = [...prev];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, importante: !last.importante };
          return copy;
        });
        return;
      }

      // Number keys 1-8 to pick category (only when not focused in text area)
      if (
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        document.activeElement !== textareaRef.current &&
        !(document.activeElement instanceof HTMLInputElement) &&
        !(document.activeElement instanceof HTMLTextAreaElement)
      ) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 8) {
          e.preventDefault();
          setCategoriaSelecionada(categoriasAnotacoes[num - 1].id);
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [salvarAnotacao, setAnotacoes]);

  // ---- Helpers ----

  function getCategoriaInfo(id: string) {
    return categoriasAnotacoes.find((c) => c.id === id);
  }

  function parseRefFromText(text: string): { ref: string | null; body: string } {
    const match = text.match(/^\[REF:\s*(.+?)\]\s*([\s\S]*)$/);
    if (match) return { ref: match[1], body: match[2] };
    return { ref: null, body: text };
  }

  // ---- Render ----

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* ============================================================= */}
        {/* Category Buttons (2 rows of 4)                                */}
        {/* ============================================================= */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-800/80 dark:bg-neutral-900">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Categoria
            </span>
            <span className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
              <Keyboard className="h-3 w-3" />
              Tecle 1-8 para selecionar
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {categoriasAnotacoes.map((cat, idx) => {
              const Icon = iconMap[cat.icon];
              const isSelected = categoriaSelecionada === cat.id;
              return (
                <Tooltip key={cat.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setCategoriaSelecionada(cat.id)}
                      className={cn(
                        "flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-200",
                        getCategoryColorClasses(cat.color, isSelected)
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="hidden truncate sm:inline">{cat.label}</span>
                      <span className="inline text-[10px] font-bold opacity-50 sm:hidden">
                        {idx + 1}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <span className="font-mono text-[10px] text-neutral-400">[{idx + 1}]</span>{" "}
                    {cat.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* ============================================================= */}
        {/* Template Chips                                                 */}
        {/* ============================================================= */}
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl}
                onClick={() => aplicarTemplate(tpl)}
                className={cn(
                  "rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs text-neutral-600",
                  "cursor-pointer transition-all duration-200",
                  "hover:border-emerald-300 hover:text-emerald-700",
                  "dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-400",
                  "dark:hover:border-emerald-600 dark:hover:text-emerald-400"
                )}
              >
                {tpl}
              </button>
            ))}
          </div>
        )}

        {/* ============================================================= */}
        {/* Input Area                                                     */}
        {/* ============================================================= */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-800/80 dark:bg-neutral-900">
          {/* Contradiction reference field */}
          {categoriaSelecionada === "contradicao" && (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-medium text-amber-600 dark:text-amber-400">
                Referência (o que contradiz)
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder='Ex: "Depoimento de João às 14:30"'
                className={cn(
                  "w-full rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm",
                  "placeholder:text-amber-300 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/30",
                  "dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100 dark:placeholder:text-amber-700",
                  "transition-all duration-200"
                )}
              />
            </div>
          )}

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`Anotar ${categoriaAtual.label.toLowerCase()}...`}
            rows={3}
            className={cn(
              "resize-none border-neutral-200 bg-neutral-50/50 text-sm",
              "focus:border-emerald-300 focus:ring-emerald-300/20",
              "dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-100",
              "dark:focus:border-emerald-600 dark:focus:ring-emerald-600/20",
              "transition-all duration-200"
            )}
          />

          {/* Actions row */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Star toggle for new annotation */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setImportanteNova(!importanteNova)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200",
                      importanteNova
                        ? "bg-amber-100 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:hover:bg-neutral-700"
                    )}
                  >
                    <Star
                      className="h-4 w-4"
                      fill={importanteNova ? "currentColor" : "none"}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {importanteNova ? "Remover destaque" : "Marcar como importante"}
                </TooltipContent>
              </Tooltip>

              {/* Current phase indicator */}
              <Badge variant="outline" className="text-[10px]">
                Fase: {faseSelecionada.label}
              </Badge>
            </div>

            {/* Save button */}
            <Button
              onClick={salvarAnotacao}
              disabled={!texto.trim()}
              size="sm"
              className={cn(
                "gap-1.5 transition-all duration-200",
                "bg-emerald-600 text-white hover:bg-emerald-700",
                "dark:bg-emerald-600 dark:hover:bg-emerald-500",
                "disabled:opacity-40"
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Salvar
              <span className="ml-1 hidden text-[10px] opacity-60 sm:inline">
                Ctrl+Enter
              </span>
            </Button>
          </div>
        </div>

        {/* ============================================================= */}
        {/* Argument Counter Bar                                           */}
        {/* ============================================================= */}
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200/80 bg-white px-4 py-2.5",
            "dark:border-neutral-800/80 dark:bg-neutral-900"
          )}
        >
          <span className="mr-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Placar:
          </span>
          <Badge
            className={cn(
              "border text-[11px]",
              getCategoryBadgeClasses("rose")
            )}
          >
            <Shield className="mr-1 h-3 w-3" />
            MP: {contadores.mpArgs}
          </Badge>
          <Badge
            className={cn(
              "border text-[11px]",
              getCategoryBadgeClasses("orange")
            )}
          >
            <AlertCircle className="mr-1 h-3 w-3" />
            Refutar: {contadores.refutar}
          </Badge>
          <Badge
            className={cn(
              "border text-[11px]",
              getCategoryBadgeClasses("amber")
            )}
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            Contradições: {contadores.contradicoes}
          </Badge>
          <span className="ml-auto text-[10px] text-neutral-400 dark:text-neutral-500">
            Total: {anotacoes.length}
          </span>
        </div>

        {/* ============================================================= */}
        {/* Filters                                                        */}
        {/* ============================================================= */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-neutral-400" />

          {/* Category filter */}
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger
              className={cn(
                "h-8 w-[180px] text-xs",
                "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
              )}
            >
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {categoriasAnotacoes.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Phase filter */}
          <Select value={filtroFase} onValueChange={setFiltroFase}>
            <SelectTrigger
              className={cn(
                "h-8 w-[160px] text-xs",
                "border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
              )}
            >
              <SelectValue placeholder="Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas fases</SelectItem>
              {fasesUnicas.map((fase) => (
                <SelectItem key={fase} value={fase}>
                  {fase}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {anotacoesFiltradas.length !== anotacoes.length && (
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              Mostrando {anotacoesFiltradas.length} de {anotacoes.length}
            </span>
          )}
        </div>

        {/* ============================================================= */}
        {/* Annotations List                                               */}
        {/* ============================================================= */}
        <div className="space-y-2">
          {anotacoesFiltradas.length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-200 py-10 text-center dark:border-neutral-800">
              <PenLine className="mx-auto mb-2 h-6 w-6 text-neutral-300 dark:text-neutral-600" />
              <p className="text-sm text-neutral-400 dark:text-neutral-500">
                Nenhuma anotação ainda.
              </p>
              <p className="text-xs text-neutral-300 dark:text-neutral-600">
                Selecione uma categoria e comece a anotar.
              </p>
            </div>
          )}

          {anotacoesFiltradas.map((anotacao) => {
            const catInfo = getCategoriaInfo(anotacao.categoria);
            if (!catInfo) return null;

            const Icon = iconMap[catInfo.icon];
            const { ref, body } = parseRefFromText(anotacao.texto);
            const isHovered = hoveredAnotacaoId === anotacao.id;

            return (
              <div
                key={anotacao.id}
                onMouseEnter={() => setHoveredAnotacaoId(anotacao.id)}
                onMouseLeave={() => setHoveredAnotacaoId(null)}
                className={cn(
                  "group relative rounded-xl border border-neutral-200/80 bg-white px-4 py-3",
                  "dark:border-neutral-800/80 dark:bg-neutral-900",
                  "transition-all duration-200",
                  "border-l-2",
                  anotacao.importante
                    ? "border-l-amber-400"
                    : getCategoryLeftBorder(catInfo.color)
                )}
              >
                {/* Top row: category + time + star + delete */}
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge
                    className={cn(
                      "border text-[10px]",
                      getCategoryBadgeClasses(catInfo.color)
                    )}
                  >
                    <Icon className="mr-1 h-2.5 w-2.5" />
                    {catInfo.label}
                  </Badge>

                  <span className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500">
                    {anotacao.horario}
                  </span>

                  {anotacao.fase && (
                    <span className="text-[10px] text-neutral-300 dark:text-neutral-600">
                      {anotacao.fase}
                    </span>
                  )}

                  <div className="ml-auto flex items-center gap-1">
                    {/* Star toggle */}
                    <button
                      onClick={() => toggleImportante(anotacao.id)}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200",
                        anotacao.importante
                          ? "text-amber-500 dark:text-amber-400"
                          : "text-neutral-300 hover:text-amber-400 dark:text-neutral-600 dark:hover:text-amber-500"
                      )}
                    >
                      <Star
                        className="h-3.5 w-3.5"
                        fill={anotacao.importante ? "currentColor" : "none"}
                      />
                    </button>

                    {/* Delete on hover */}
                    <button
                      onClick={() => deletarAnotacao(anotacao.id)}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md transition-all duration-200",
                        "text-neutral-300 hover:bg-red-50 hover:text-red-500",
                        "dark:text-neutral-600 dark:hover:bg-red-950/30 dark:hover:text-red-400",
                        isHovered ? "opacity-100" : "opacity-0"
                      )}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Reference line (for contradictions) */}
                {ref && (
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="font-medium">Ref:</span>
                    <span className="italic">{ref}</span>
                  </div>
                )}

                {/* Body */}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {body}
                </p>
              </div>
            );
          })}
        </div>

        {/* ============================================================= */}
        {/* Keyboard shortcuts legend (collapsed)                          */}
        {/* ============================================================= */}
        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Atalhos:
          </span>
          {[
            { keys: "Ctrl+Enter", desc: "Salvar" },
            { keys: "1-8", desc: "Categoria" },
            { keys: "Ctrl+I", desc: "Destaque (última)" },
          ].map((s) => (
            <span
              key={s.keys}
              className="inline-flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500"
            >
              <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5 font-mono text-[9px] dark:border-neutral-700 dark:bg-neutral-800">
                {s.keys}
              </kbd>
              {s.desc}
            </span>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
