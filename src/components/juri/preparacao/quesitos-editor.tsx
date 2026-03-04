"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ListChecks,
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  TreePine,
  Vote,
  Pencil,
  Check,
  X,
  Loader2,
  Bot,
  ArrowDown,
  ArrowRight,
} from "lucide-react";
import {
  SwissCard,
  SwissCardContent,
  SwissCardHeader,
  SwissCardTitle,
  SwissCardDescription,
  SwissCardFooter,
} from "@/components/ui/swiss-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

// ============================================
// TYPES
// ============================================

interface QuesitosEditorProps {
  sessaoId: string;
  casoId: number | null;
}

type QuesitoTipo =
  | "materialidade"
  | "autoria"
  | "absolvicao"
  | "qualificadora"
  | "causa_aumento"
  | "causa_diminuicao"
  | "privilegio"
  | "agravante"
  | "atenuante";

type QuesitoOrigem = "obrigatorio" | "acusacao" | "defesa";

interface Quesito {
  id: number;
  numero: number;
  texto: string;
  tipo: QuesitoTipo;
  origem: QuesitoOrigem;
  argumentacaoSim?: string | null;
  argumentacaoNao?: string | null;
  dependeDe?: number | null;
  condicaoPai?: "sim" | "nao" | null;
  geradoPorIA?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const TIPO_CONFIG: Record<QuesitoTipo, { label: string; className: string }> = {
  materialidade: {
    label: "Materialidade",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900",
  },
  autoria: {
    label: "Autoria",
    className:
      "border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900",
  },
  absolvicao: {
    label: "Absolvicao",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  },
  qualificadora: {
    label: "Qualificadora",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  },
  causa_aumento: {
    label: "Causa de Aumento",
    className:
      "border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900",
  },
  causa_diminuicao: {
    label: "Causa de Diminuicao",
    className:
      "border-teal-200 bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900",
  },
  privilegio: {
    label: "Privilegio",
    className:
      "border-cyan-200 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900",
  },
  agravante: {
    label: "Agravante",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900",
  },
  atenuante: {
    label: "Atenuante",
    className:
      "border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900",
  },
};

const ORIGEM_CONFIG: Record<QuesitoOrigem, { label: string; className: string }> = {
  obrigatorio: {
    label: "Obrigatorio",
    className:
      "border-stone-300 bg-stone-100 text-stone-600 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  },
  acusacao: {
    label: "Acusacao",
    className:
      "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900",
  },
  defesa: {
    label: "Defesa",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900",
  },
};

const TIPO_OPTIONS: { value: QuesitoTipo; label: string }[] = [
  { value: "materialidade", label: "Materialidade" },
  { value: "autoria", label: "Autoria" },
  { value: "absolvicao", label: "Absolvicao" },
  { value: "qualificadora", label: "Qualificadora" },
  { value: "causa_aumento", label: "Causa de Aumento" },
  { value: "causa_diminuicao", label: "Causa de Diminuicao" },
  { value: "privilegio", label: "Privilegio" },
  { value: "agravante", label: "Agravante" },
  { value: "atenuante", label: "Atenuante" },
];

const ORIGEM_OPTIONS: { value: QuesitoOrigem; label: string }[] = [
  { value: "obrigatorio", label: "Obrigatorio" },
  { value: "acusacao", label: "Acusacao" },
  { value: "defesa", label: "Defesa" },
];

// ============================================
// HELPER: Determine projected outcome
// ============================================

function computeOutcome(
  quesitos: Quesito[],
  votes: Record<number, Record<number, "sim" | "nao">>
): { label: string; description: string; variant: "success" | "danger" | "warning" } {
  const getResult = (qId: number): "aprovado" | "rejeitado" => {
    const qVotes = votes[qId] || {};
    let simCount = 0;
    for (let j = 0; j < 7; j++) {
      if (qVotes[j] === "sim") simCount++;
    }
    return simCount >= 4 ? "aprovado" : "rejeitado";
  };

  const materialidade = quesitos.find((q) => q.tipo === "materialidade");
  const autoria = quesitos.find((q) => q.tipo === "autoria");
  const absolvicao = quesitos.find((q) => q.tipo === "absolvicao");

  if (materialidade && getResult(materialidade.id) === "rejeitado") {
    return {
      label: "Absolvicao",
      description: "Materialidade rejeitada pelo conselho. Reu absolvido.",
      variant: "success",
    };
  }

  if (autoria && getResult(autoria.id) === "rejeitado") {
    return {
      label: "Absolvicao",
      description: "Autoria rejeitada pelo conselho. Reu absolvido.",
      variant: "success",
    };
  }

  if (absolvicao && getResult(absolvicao.id) === "aprovado") {
    return {
      label: "Absolvicao",
      description: "Quesito de absolvicao aprovado pelo conselho. Reu absolvido.",
      variant: "success",
    };
  }

  // Check qualificadoras
  const qualificadoras = quesitos.filter((q) => q.tipo === "qualificadora");
  const qualificadorasAprovadas = qualificadoras.filter(
    (q) => getResult(q.id) === "aprovado"
  );

  if (qualificadorasAprovadas.length > 0) {
    return {
      label: "Condenacao Qualificada",
      description: `Condenacao com ${qualificadorasAprovadas.length} qualificadora(s) reconhecida(s).`,
      variant: "danger",
    };
  }

  if (materialidade && autoria) {
    return {
      label: "Condenacao Simples",
      description: "Materialidade e autoria reconhecidas. Reu condenado.",
      variant: "danger",
    };
  }

  return {
    label: "Indefinido",
    description: "Resultado depende da votacao dos quesitos restantes.",
    variant: "warning",
  };
}

// ============================================
// SUB-COMPONENT: Quesito Card (Editor Tab)
// ============================================

function QuesitoCard({
  quesito,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  quesito: Quesito;
  onUpdate: (id: number, data: Partial<Quesito>) => void;
  onDelete: (id: number) => void;
  isUpdating: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTexto, setEditTexto] = useState(quesito.texto);
  const [argSim, setArgSim] = useState(quesito.argumentacaoSim || "");
  const [argNao, setArgNao] = useState(quesito.argumentacaoNao || "");

  const tipoConfig = TIPO_CONFIG[quesito.tipo];
  const origemConfig = ORIGEM_CONFIG[quesito.origem];

  const handleSaveEdit = () => {
    onUpdate(quesito.id, { texto: editTexto });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTexto(quesito.texto);
    setIsEditing(false);
  };

  const handleSaveArgs = () => {
    onUpdate(quesito.id, {
      argumentacaoSim: argSim || null,
      argumentacaoNao: argNao || null,
    });
  };

  return (
    <div
      className={cn(
        "group rounded-xl border border-border/60 bg-card transition-all duration-200",
        "hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Drag handle + Number */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <GripVertical className="w-4 h-4 text-stone-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          <span className="text-2xl font-bold text-stone-300 dark:text-zinc-600 font-mono leading-none">
            {quesito.numero}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <Badge className={cn("text-[10px] px-1.5 py-0", tipoConfig.className)}>
              {tipoConfig.label}
            </Badge>
            <Badge className={cn("text-[10px] px-1.5 py-0", origemConfig.className)}>
              {origemConfig.label}
            </Badge>
            {quesito.geradoPorIA && (
              <Badge className="text-[10px] px-1.5 py-0 border-violet-200 bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900">
                <Bot className="w-3 h-3 mr-0.5" />
                IA
              </Badge>
            )}
          </div>

          {/* Text / Edit mode */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editTexto}
                onChange={(e) => setEditTexto(e.target.value)}
                className="min-h-[60px] text-sm"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  onClick={handleSaveEdit}
                  disabled={!editTexto.trim() || isUpdating}
                >
                  <Check className="w-3 h-3" />
                  Salvar
                </Button>
                <Button size="xs" variant="ghost" onClick={handleCancelEdit}>
                  <X className="w-3 h-3" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p
              className="text-sm text-stone-700 dark:text-zinc-300 leading-relaxed cursor-pointer"
              onClick={() => setIsEditing(true)}
              title="Clique para editar"
            >
              {quesito.texto}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isEditing && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={() => onDelete(quesito.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Expandable argumentation */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center gap-2 px-4 py-2 text-xs transition-colors",
              "border-t border-border/40",
              "text-stone-500 dark:text-zinc-500 hover:bg-stone-50 dark:hover:bg-zinc-800/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            )}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            Argumentacao (SIM / NAO)
            {(quesito.argumentacaoSim || quesito.argumentacaoNao) && (
              <Badge variant="default" className="text-[9px] px-1 py-0 ml-1">
                Preenchido
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Se SIM (favoravel)
              </label>
              <Textarea
                value={argSim}
                onChange={(e) => setArgSim(e.target.value)}
                placeholder="Argumentos se o quesito for respondido SIM..."
                className="min-h-[60px] text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                <X className="w-3 h-3" />
                Se NAO (desfavoravel)
              </label>
              <Textarea
                value={argNao}
                onChange={(e) => setArgNao(e.target.value)}
                placeholder="Argumentos se o quesito for respondido NAO..."
                className="min-h-[60px] text-xs"
              />
            </div>
            <Button
              size="xs"
              variant="soft"
              onClick={handleSaveArgs}
              disabled={isUpdating}
            >
              Salvar Argumentacao
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ============================================
// SUB-COMPONENT: Add Quesito Form
// ============================================

function AddQuesitForm({
  nextNumero,
  onCreate,
  isCreating,
}: {
  nextNumero: number;
  onCreate: (data: {
    numero: number;
    texto: string;
    tipo: QuesitoTipo;
    origem: QuesitoOrigem;
  }) => void;
  isCreating: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<QuesitoTipo>("materialidade");
  const [origem, setOrigem] = useState<QuesitoOrigem>("defesa");

  const handleSubmit = () => {
    if (!texto.trim()) return;
    onCreate({ numero: nextNumero, texto: texto.trim(), tipo, origem });
    setTexto("");
    setTipo("materialidade");
    setOrigem("defesa");
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="w-4 h-4" />
        Adicionar Quesito
      </Button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          Novo Quesito #{nextNumero}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => setIsOpen(false)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Texto do quesito..."
        className="min-h-[80px] text-sm"
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600 dark:text-zinc-400">
            Tipo
          </label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as QuesitoTipo)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPO_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-stone-600 dark:text-zinc-400">
            Origem
          </label>
          <Select value={origem} onValueChange={(v) => setOrigem(v as QuesitoOrigem)}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORIGEM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSubmit} disabled={!texto.trim() || isCreating}>
          {isCreating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Adicionar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setIsOpen(false);
            setTexto("");
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENT: Decision Tree Tab
// ============================================

function DecisionTreeView({ quesitos }: { quesitos: Quesito[] }) {
  const [activeAnswers, setActiveAnswers] = useState<Record<number, "sim" | "nao">>({});

  const toggleAnswer = useCallback((qId: number, answer: "sim" | "nao") => {
    setActiveAnswers((prev) => {
      if (prev[qId] === answer) {
        const next = { ...prev };
        delete next[qId];
        return next;
      }
      return { ...prev, [qId]: answer };
    });
  }, []);

  // Separate root quesitos (no parent) from children
  const rootQuesitos = useMemo(
    () => quesitos.filter((q) => !q.dependeDe),
    [quesitos]
  );

  const childrenMap = useMemo(() => {
    const map: Record<number, Quesito[]> = {};
    for (const q of quesitos) {
      if (q.dependeDe) {
        if (!map[q.dependeDe]) map[q.dependeDe] = [];
        map[q.dependeDe].push(q);
      }
    }
    return map;
  }, [quesitos]);

  const renderNode = (quesito: Quesito, depth: number) => {
    const answer = activeAnswers[quesito.id];
    const children = childrenMap[quesito.id] || [];
    const simChildren = children.filter((c) => c.condicaoPai === "sim");
    const naoChildren = children.filter((c) => c.condicaoPai === "nao");

    const isActive = answer !== undefined;
    const isOnActivePath =
      !quesito.dependeDe ||
      (quesito.dependeDe &&
        activeAnswers[quesito.dependeDe] !== undefined &&
        quesito.condicaoPai === activeAnswers[quesito.dependeDe]);

    return (
      <div key={quesito.id} className="relative">
        {/* Connector line from parent */}
        {depth > 0 && (
          <div className="absolute -top-3 left-5 w-px h-3 bg-stone-200 dark:bg-zinc-700" />
        )}

        <div
          className={cn(
            "rounded-lg border p-3 transition-all duration-200",
            isOnActivePath
              ? "border-stone-300 dark:border-zinc-600 bg-card shadow-sm"
              : "border-border/40 bg-card/50 opacity-50"
          )}
          style={{ marginLeft: depth * 32 }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg font-bold font-mono text-stone-300 dark:text-zinc-600 shrink-0">
                {quesito.numero}
              </span>
              {quesito.condicaoPai && (
                <Badge
                  className={cn(
                    "text-[9px] px-1 py-0 shrink-0",
                    quesito.condicaoPai === "sim"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
                      : "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
                  )}
                >
                  {quesito.condicaoPai === "sim" ? "SIM" : "NAO"}
                </Badge>
              )}
              <p className="text-sm text-stone-700 dark:text-zinc-300 truncate">
                {quesito.texto}
              </p>
            </div>

            {/* SIM / NAO toggles */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => toggleAnswer(quesito.id, "sim")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  answer === "sim"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-500 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400"
                )}
              >
                SIM
              </button>
              <button
                onClick={() => toggleAnswer(quesito.id, "nao")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  answer === "nao"
                    ? "bg-red-500 text-white shadow-sm"
                    : "bg-stone-100 dark:bg-zinc-800 text-stone-500 dark:text-zinc-500 hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-700 dark:hover:text-red-400"
                )}
              >
                NAO
              </button>
            </div>
          </div>
        </div>

        {/* Children branches */}
        {simChildren.length > 0 && answer === "sim" && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-1.5 ml-4 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <ArrowDown className="w-3 h-3" />
              Caminho SIM
            </div>
            {simChildren.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
        {naoChildren.length > 0 && answer === "nao" && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-1.5 ml-4 text-[10px] font-medium text-red-600 dark:text-red-400">
              <ArrowDown className="w-3 h-3" />
              Caminho NAO
            </div>
            {naoChildren.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
        {/* Show children that have no condition set as always visible */}
        {children
          .filter((c) => !c.condicaoPai)
          .map((child) => (
            <div key={child.id} className="mt-2">
              {renderNode(child, depth + 1)}
            </div>
          ))}
      </div>
    );
  };

  if (quesitos.length === 0) {
    return (
      <div className="text-center py-12">
        <TreePine className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-zinc-700" />
        <p className="text-sm text-stone-500 dark:text-zinc-500">
          Adicione quesitos no editor para visualizar a arvore de decisao.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[600px]">
      <div className="space-y-3 p-1">
        {rootQuesitos.map((q) => renderNode(q, 0))}
      </div>
    </ScrollArea>
  );
}

// ============================================
// SUB-COMPONENT: Voting Simulator Tab
// ============================================

function VotingSimulatorView({ quesitos }: { quesitos: Quesito[] }) {
  const [votes, setVotes] = useState<Record<number, Record<number, "sim" | "nao">>>({});

  const toggleVote = useCallback(
    (quesitId: number, jurorIndex: number) => {
      setVotes((prev) => {
        const qVotes = { ...(prev[quesitId] || {}) };
        if (qVotes[jurorIndex] === "sim") {
          qVotes[jurorIndex] = "nao";
        } else if (qVotes[jurorIndex] === "nao") {
          delete qVotes[jurorIndex];
        } else {
          qVotes[jurorIndex] = "sim";
        }
        return { ...prev, [quesitId]: qVotes };
      });
    },
    []
  );

  const getQuesitResult = useCallback(
    (qId: number): { sim: number; nao: number; result: "aprovado" | "rejeitado" | "pendente" } => {
      const qVotes = votes[qId] || {};
      let sim = 0;
      let nao = 0;
      for (let j = 0; j < 7; j++) {
        if (qVotes[j] === "sim") sim++;
        if (qVotes[j] === "nao") nao++;
      }
      const allVoted = sim + nao === 7;
      return {
        sim,
        nao,
        result: !allVoted ? "pendente" : sim >= 4 ? "aprovado" : "rejeitado",
      };
    },
    [votes]
  );

  const allComplete = useMemo(() => {
    return quesitos.every((q) => {
      const r = getQuesitResult(q.id);
      return r.result !== "pendente";
    });
  }, [quesitos, getQuesitResult]);

  const outcome = useMemo(() => {
    if (!allComplete || quesitos.length === 0) return null;
    return computeOutcome(quesitos, votes);
  }, [allComplete, quesitos, votes]);

  const resetAll = useCallback(() => setVotes({}), []);

  if (quesitos.length === 0) {
    return (
      <div className="text-center py-12">
        <Vote className="w-12 h-12 mx-auto mb-3 text-stone-300 dark:text-zinc-700" />
        <p className="text-sm text-stone-500 dark:text-zinc-500">
          Adicione quesitos no editor para simular a votacao.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Voting Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left py-2 px-3 text-xs font-semibold text-stone-500 dark:text-zinc-500 min-w-[200px]">
                Quesito
              </th>
              {Array.from({ length: 7 }, (_, i) => (
                <th
                  key={i}
                  className="text-center py-2 px-1 text-xs font-semibold text-stone-500 dark:text-zinc-500 w-12"
                >
                  J{i + 1}
                </th>
              ))}
              <th className="text-center py-2 px-3 text-xs font-semibold text-stone-500 dark:text-zinc-500 w-24">
                Resultado
              </th>
            </tr>
          </thead>
          <tbody>
            {quesitos.map((q) => {
              const result = getQuesitResult(q.id);
              return (
                <tr
                  key={q.id}
                  className="border-b border-border/20 hover:bg-stone-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-stone-300 dark:text-zinc-600 shrink-0">
                        {q.numero}
                      </span>
                      <span className="text-xs text-stone-600 dark:text-zinc-400 line-clamp-2 leading-snug">
                        {q.texto}
                      </span>
                    </div>
                  </td>
                  {Array.from({ length: 7 }, (_, j) => {
                    const vote = votes[q.id]?.[j];
                    return (
                      <td key={j} className="text-center py-2.5 px-1">
                        <button
                          onClick={() => toggleVote(q.id, j)}
                          className={cn(
                            "w-10 h-8 rounded-md text-[10px] font-bold transition-all duration-150",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            vote === "sim"
                              ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600"
                              : vote === "nao"
                                ? "bg-red-500 text-white shadow-sm hover:bg-red-600"
                                : "bg-stone-100 dark:bg-zinc-800 text-stone-400 dark:text-zinc-600 hover:bg-stone-200 dark:hover:bg-zinc-700"
                          )}
                        >
                          {vote === "sim"
                            ? "SIM"
                            : vote === "nao"
                              ? "NAO"
                              : "-"}
                        </button>
                      </td>
                    );
                  })}
                  <td className="text-center py-2.5 px-3">
                    {result.result === "pendente" ? (
                      <span className="text-[10px] font-mono text-stone-400 dark:text-zinc-600">
                        {result.sim}x{result.nao} / 7
                      </span>
                    ) : (
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          result.result === "aprovado"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900"
                            : "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900"
                        )}
                      >
                        {result.result === "aprovado" ? "APROVADO" : "REJEITADO"}
                        <span className="ml-1 opacity-70">
                          ({result.sim}x{result.nao})
                        </span>
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Outcome Summary */}
      {outcome && (
        <SwissCard
          className={cn(
            "border-2",
            outcome.variant === "success"
              ? "border-emerald-300 dark:border-emerald-800"
              : outcome.variant === "danger"
                ? "border-red-300 dark:border-red-800"
                : "border-amber-300 dark:border-amber-800"
          )}
        >
          <SwissCardContent className="py-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  outcome.variant === "success"
                    ? "bg-emerald-100 dark:bg-emerald-950/50"
                    : outcome.variant === "danger"
                      ? "bg-red-100 dark:bg-red-950/50"
                      : "bg-amber-100 dark:bg-amber-950/50"
                )}
              >
                <Vote
                  className={cn(
                    "w-5 h-5",
                    outcome.variant === "success"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : outcome.variant === "danger"
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400"
                  )}
                />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-stone-800 dark:text-zinc-200">
                  Resultado Projetado: {outcome.label}
                </h4>
                <p className="text-xs text-stone-500 dark:text-zinc-500 mt-0.5">
                  {outcome.description}
                </p>
              </div>
            </div>
          </SwissCardContent>
        </SwissCard>
      )}

      {/* Actions */}
      <div className="flex justify-end">
        <Button size="xs" variant="ghost" onClick={resetAll}>
          Limpar Votos
        </Button>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function QuesitosEditor({ sessaoId, casoId }: QuesitosEditorProps) {
  const [activeTab, setActiveTab] = useState("editor");

  // ---- tRPC queries / mutations ----
  const preparacaoRouter = (trpc as any).preparacao;

  const { data: quesitosData, isLoading, refetch } = preparacaoRouter
    ? preparacaoRouter.listQuesitos.useQuery(
        { casoId },
        {
          enabled: !!casoId,
          retry: false,
          staleTime: 2 * 60 * 1000,
        }
      )
    : { data: undefined, isLoading: false, refetch: () => {} };

  const createMutation = preparacaoRouter
    ? preparacaoRouter.createQuesito.useMutation({
        onSuccess: () => refetch(),
      })
    : null;

  const updateMutation = preparacaoRouter
    ? preparacaoRouter.updateQuesito.useMutation({
        onSuccess: () => refetch(),
      })
    : null;

  const deleteMutation = preparacaoRouter
    ? preparacaoRouter.deleteQuesito.useMutation({
        onSuccess: () => refetch(),
      })
    : null;

  const generateMutation = preparacaoRouter
    ? preparacaoRouter.generateQuesitos.useMutation({
        onSuccess: () => refetch(),
      })
    : null;

  // ---- Local state (offline fallback when router not ready) ----
  const [localQuesitos, setLocalQuesitos] = useState<Quesito[]>([]);
  const [localIdCounter, setLocalIdCounter] = useState(1000);

  const quesitos: Quesito[] = quesitosData ?? localQuesitos;

  const nextNumero = useMemo(
    () =>
      quesitos.length > 0
        ? Math.max(...quesitos.map((q) => q.numero)) + 1
        : 1,
    [quesitos]
  );

  // ---- Handlers ----
  const handleCreate = useCallback(
    (data: { numero: number; texto: string; tipo: QuesitoTipo; origem: QuesitoOrigem }) => {
      if (createMutation) {
        createMutation.mutate({ casoId, ...data });
      } else {
        // Local fallback
        const newQ: Quesito = {
          id: localIdCounter,
          ...data,
          argumentacaoSim: null,
          argumentacaoNao: null,
          dependeDe: null,
          condicaoPai: null,
          geradoPorIA: false,
        };
        setLocalQuesitos((prev) => [...prev, newQ]);
        setLocalIdCounter((c) => c + 1);
      }
    },
    [createMutation, casoId, localIdCounter]
  );

  const handleUpdate = useCallback(
    (id: number, data: Partial<Quesito>) => {
      if (updateMutation) {
        updateMutation.mutate({ id, ...data });
      } else {
        setLocalQuesitos((prev) =>
          prev.map((q) => (q.id === id ? { ...q, ...data } : q))
        );
      }
    },
    [updateMutation]
  );

  const handleDelete = useCallback(
    (id: number) => {
      if (deleteMutation) {
        deleteMutation.mutate({ id });
      } else {
        setLocalQuesitos((prev) => prev.filter((q) => q.id !== id));
      }
    },
    [deleteMutation]
  );

  const handleGenerate = useCallback(() => {
    if (generateMutation && casoId) {
      generateMutation.mutate({ casoId });
    }
  }, [generateMutation, casoId]);

  // ---- Empty state: no casoId ----
  if (!casoId) {
    return (
      <SwissCard className="min-h-[400px]">
        <SwissCardHeader>
          <SwissCardTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Editor de Quesitos
          </SwissCardTitle>
        </SwissCardHeader>
        <SwissCardContent>
          <div className="text-center py-16">
            <ListChecks className="w-14 h-14 mx-auto mb-4 text-stone-300 dark:text-zinc-700" />
            <p className="text-sm font-medium text-stone-500 dark:text-zinc-500">
              Vincule um caso para gerenciar quesitos
            </p>
            <p className="text-xs text-stone-400 dark:text-zinc-600 mt-1.5 max-w-sm mx-auto">
              Os quesitos sao vinculados ao caso/processo. Selecione um caso na sessao para
              comecar a elaborar os quesitos da defesa.
            </p>
          </div>
        </SwissCardContent>
      </SwissCard>
    );
  }

  // ---- Loading ----
  if (isLoading) {
    return (
      <SwissCard className="min-h-[400px]">
        <SwissCardHeader>
          <SwissCardTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Editor de Quesitos
          </SwissCardTitle>
        </SwissCardHeader>
        <SwissCardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-stone-100 dark:bg-zinc-800 animate-pulse"
              />
            ))}
          </div>
        </SwissCardContent>
      </SwissCard>
    );
  }

  // ---- Main Render ----
  return (
    <SwissCard className="min-h-[400px]">
      <SwissCardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <SwissCardTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Editor de Quesitos
          </SwissCardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-xs font-mono">
              {quesitos.length} quesito{quesitos.length !== 1 ? "s" : ""}
            </Badge>
            {casoId && (
              <Button
                size="xs"
                variant="soft"
                onClick={handleGenerate}
                disabled={generateMutation?.isPending}
              >
                {generateMutation?.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Gerar com IA
              </Button>
            )}
          </div>
        </div>
        <SwissCardDescription>
          Crie, organize e simule a votacao dos quesitos do juri
        </SwissCardDescription>
      </SwissCardHeader>

      <SwissCardContent className="px-0 py-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6 pt-4">
            <TabsList className="w-full justify-start h-10 bg-stone-50 dark:bg-zinc-900/50 border border-border/40 p-1 rounded-lg">
              <TabsTrigger
                value="editor"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm flex gap-1.5 text-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editor
              </TabsTrigger>
              <TabsTrigger
                value="arvore"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm flex gap-1.5 text-xs"
              >
                <TreePine className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Arvore de Decisao</span>
                <span className="sm:hidden">Arvore</span>
              </TabsTrigger>
              <TabsTrigger
                value="simulador"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm flex gap-1.5 text-xs"
              >
                <Vote className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Simulador de Votacao</span>
                <span className="sm:hidden">Simulador</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Editor Tab */}
          <TabsContent value="editor" className="mt-0">
            <div className="px-6 py-4 space-y-3">
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3 pr-2">
                  {quesitos.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-stone-200 dark:border-zinc-800 rounded-xl">
                      <ListChecks className="w-10 h-10 mx-auto mb-2 text-stone-300 dark:text-zinc-700" />
                      <p className="text-sm text-stone-500 dark:text-zinc-500">
                        Nenhum quesito cadastrado
                      </p>
                      <p className="text-xs text-stone-400 dark:text-zinc-600 mt-1">
                        Adicione manualmente ou use o gerador com IA
                      </p>
                    </div>
                  ) : (
                    quesitos.map((q) => (
                      <QuesitoCard
                        key={q.id}
                        quesito={q}
                        onUpdate={handleUpdate}
                        onDelete={handleDelete}
                        isUpdating={updateMutation?.isPending ?? false}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>

              <AddQuesitForm
                nextNumero={nextNumero}
                onCreate={handleCreate}
                isCreating={createMutation?.isPending ?? false}
              />
            </div>
          </TabsContent>

          {/* Decision Tree Tab */}
          <TabsContent value="arvore" className="mt-0">
            <div className="px-6 py-4">
              <DecisionTreeView quesitos={quesitos} />
            </div>
          </TabsContent>

          {/* Voting Simulator Tab */}
          <TabsContent value="simulador" className="mt-0">
            <div className="px-6 py-4">
              <VotingSimulatorView quesitos={quesitos} />
            </div>
          </TabsContent>
        </Tabs>
      </SwissCardContent>

      {quesitos.length > 0 && (
        <SwissCardFooter>
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-500">
            <span className="flex items-center gap-1">
              <ListChecks className="w-3.5 h-3.5" />
              {quesitos.length} quesito{quesitos.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-2 flex-wrap">
              {Object.entries(
                quesitos.reduce(
                  (acc, q) => {
                    acc[q.tipo] = (acc[q.tipo] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>
                )
              ).map(([tipo, count]) => (
                <Badge
                  key={tipo}
                  className={cn(
                    "text-[9px] px-1 py-0",
                    TIPO_CONFIG[tipo as QuesitoTipo]?.className
                  )}
                >
                  {TIPO_CONFIG[tipo as QuesitoTipo]?.label}: {count}
                </Badge>
              ))}
            </span>
          </div>
        </SwissCardFooter>
      )}
    </SwissCard>
  );
}
