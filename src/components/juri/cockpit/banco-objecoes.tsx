"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Gavel, Search, BookOpen, Scale, MessageSquare, FileText, X, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Objecao {
  id: string;
  titulo: string;
  fundamentacao: string;
  artigo: string;
  categoria: "pergunta" | "prova" | "procedimento" | "argumentacao";
  usadaEm?: string;
}

interface BancoObjecoesProps {
  isDarkMode: boolean;
  mode: "selecionar" | "visualizar";
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const STORAGE_KEY = "defender_cockpit_objecao_ativa";

const OBJECOES: Objecao[] = [
  { id: "obj-01", titulo: "Pergunta capciosa ou sugestiva", fundamentacao: "As perguntas devem ser formuladas pelas partes diretamente, sem induzir a resposta da testemunha. O juiz deve indeferir perguntas capciosas, sugestivas ou que nao tenham relacao com o fato.", artigo: "art. 212, CPP", categoria: "pergunta" },
  { id: "obj-02", titulo: "Pergunta sobre fato nao constante dos autos", fundamentacao: "As perguntas formuladas em plenario devem guardar pertinencia com os fatos que integram a causa. Perguntas sobre fatos estranhos ao processo devem ser indeferidas pelo juiz presidente.", artigo: "art. 475, CPP", categoria: "pergunta" },
  { id: "obj-03", titulo: "Pergunta que induz resposta", fundamentacao: "A testemunha deve depor de forma espontanea, sendo vedadas perguntas formuladas de modo a induzir ou direcionar a resposta desejada pela parte que inquire.", artigo: "art. 212, CPP", categoria: "pergunta" },
  { id: "obj-04", titulo: "Leitura de peca dos autos vedada em plenario", fundamentacao: "Durante os debates em plenario, nao sera permitida a leitura de documento ou a exibicao de objeto que nao tiver sido juntado aos autos com a antecedencia minima legal.", artigo: "art. 478, CPP", categoria: "prova" },
  { id: "obj-05", titulo: "Documento nao juntado com 3 dias de antecedencia", fundamentacao: "Nao sera permitido o uso em plenario de documento que nao tiver sido juntado aos autos com antecedencia minima de 3 dias uteis, dando-se ciencia a outra parte.", artigo: "art. 479, CPP", categoria: "prova" },
  { id: "obj-06", titulo: "Prova obtida por meio ilicito", fundamentacao: "Sao inadmissiveis as provas obtidas por meios ilicitos, devendo ser desentranhadas do processo. A ilicitude se transmite as provas que dela derivem (teoria dos frutos da arvore envenenada).", artigo: "art. 157, CPP", categoria: "prova" },
  { id: "obj-07", titulo: "Referencia a decisao de pronuncia como argumento de autoridade", fundamentacao: "Durante os debates, as partes nao poderao fazer referencias a decisao de pronuncia ou as decisoes posteriores que julgaram admissivel a acusacao, como argumento de autoridade que beneficie ou prejudique o acusado.", artigo: "art. 478, I, CPP", categoria: "procedimento" },
  { id: "obj-08", titulo: "Uso de algemas sem justificativa", fundamentacao: "So e licito o uso de algemas em casos de resistencia, fundado receio de fuga ou de perigo a integridade fisica propria ou alheia. A ausencia de justificativa gera nulidade e responsabilizacao.", artigo: "Sumula Vinculante 11, STF", categoria: "procedimento" },
  { id: "obj-09", titulo: "Referencia ao silencio do reu como argumento", fundamentacao: "Durante os debates, as partes nao poderao fazer referencias ao silencio do acusado ou a ausencia de interrogatorio por falta de requerimento, em seu prejuizo.", artigo: "art. 478, II, CPP", categoria: "procedimento" },
  { id: "obj-10", titulo: "Argumento extraprocessual - fato nao provado nos autos", fundamentacao: "O juiz formara sua conviccao pela livre apreciacao da prova produzida em contraditorio judicial, nao podendo fundamentar sua decisao exclusivamente nos elementos informativos colhidos na investigacao.", artigo: "art. 155, CPP", categoria: "argumentacao" },
  { id: "obj-11", titulo: "Apelo ao clamor publico", fundamentacao: "A argumentacao deve restringir-se aos fatos e provas dos autos. Apelos ao clamor popular ou opiniao publica violam os principios da presuncao de inocencia e do devido processo legal.", artigo: "art. 5, LVII, CF/88", categoria: "argumentacao" },
  { id: "obj-12", titulo: "Mencao a antecedentes do reu fora do contexto", fundamentacao: "Referencia a antecedentes do acusado fora do contexto probatorio pode configurar prejudicio ao reu perante os jurados, ferindo o principio da presuncao de inocencia.", artigo: "art. 478, CPP", categoria: "argumentacao" },
];

const CATEGORIAS = [
  { id: "todas" as const, label: "Todas", icon: Gavel },
  { id: "pergunta" as const, label: "Pergunta", icon: MessageSquare },
  { id: "prova" as const, label: "Prova", icon: FileText },
  { id: "procedimento" as const, label: "Procedimento", icon: Scale },
  { id: "argumentacao" as const, label: "Argumentacao", icon: BookOpen },
];

const CAT_STYLE: Record<Objecao["categoria"], { bg: string; text: string; border: string; dot: string }> = {
  pergunta: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-900", dot: "bg-blue-500" },
  prova: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-900", dot: "bg-amber-500" },
  procedimento: { bg: "bg-rose-50 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-400", border: "border-rose-200 dark:border-rose-900", dot: "bg-rose-500" },
  argumentacao: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-900", dot: "bg-purple-500" },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readActive(): Objecao | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Objecao) : null;
  } catch { return null; }
}

function writeActive(obj: Objecao | null) {
  if (obj) localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  else localStorage.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BancoObjecoes({ isDarkMode, mode }: BancoObjecoesProps) {
  const [categoriaAtiva, setCategoriaAtiva] = useState<"todas" | Objecao["categoria"]>("todas");
  const [busca, setBusca] = useState("");
  const [objecaoAtiva, setObjecaoAtiva] = useState<Objecao | null>(readActive);

  // Poll localStorage for changes (critical for "visualizar" mode)
  useEffect(() => {
    const interval = setInterval(() => {
      const current = readActive();
      setObjecaoAtiva((prev) => {
        if ((prev?.id ?? null) !== (current?.id ?? null) || prev?.usadaEm !== current?.usadaEm) return current;
        return prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const filtradas = useMemo(() => {
    let result = OBJECOES;
    if (categoriaAtiva !== "todas") result = result.filter((o) => o.categoria === categoriaAtiva);
    if (busca.trim()) {
      const t = busca.toLowerCase();
      result = result.filter((o) => o.titulo.toLowerCase().includes(t) || o.artigo.toLowerCase().includes(t) || o.fundamentacao.toLowerCase().includes(t));
    }
    return result;
  }, [categoriaAtiva, busca]);

  const handleSelecionar = useCallback((obj: Objecao) => {
    const updated = { ...obj, usadaEm: new Date().toISOString() };
    writeActive(updated);
    setObjecaoAtiva(updated);
  }, []);

  const handleLimpar = useCallback(() => { writeActive(null); setObjecaoAtiva(null); }, []);

  // --- Mode: visualizar (defender view) ---
  if (mode === "visualizar") {
    if (!objecaoAtiva) {
      return (
        <div className={cn("flex flex-col items-center justify-center gap-3 py-16 rounded-xl border border-neutral-200/80 bg-white dark:border-neutral-800/80 dark:bg-neutral-900")}>
          <Shield className="h-10 w-10 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm text-neutral-400 dark:text-neutral-500">Sem objecao ativa</p>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Aguardando selecao do estagiario</p>
        </div>
      );
    }

    const s = CAT_STYLE[objecaoAtiva.categoria];
    return (
      <div className={cn("rounded-xl border-2 border-emerald-500 bg-white p-6 dark:bg-neutral-900 animate-pulse-once")}>
        <div className="mb-4 flex items-center justify-between">
          <Badge className={cn(s.bg, s.text, s.border, "text-xs")}>{objecaoAtiva.categoria}</Badge>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Objecao Ativa</span>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">{objecaoAtiva.titulo}</h3>
        <p className="mb-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">{objecaoAtiva.fundamentacao}</p>
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{objecaoAtiva.artigo}</span>
        </div>
      </div>
    );
  }

  // --- Mode: selecionar (intern view) ---
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border border-neutral-200/80 bg-white p-4 dark:border-neutral-800/80 dark:bg-neutral-900")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Banco de Objecoes</span>
        </div>
        {objecaoAtiva && (
          <Button variant="ghost" size="sm" onClick={handleLimpar} className="h-7 gap-1 px-2 text-xs text-neutral-500 hover:text-rose-600 dark:text-neutral-400 dark:hover:text-rose-400">
            <X className="h-3 w-3" />
            Limpar ativa
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar objecao ou artigo..." className="h-8 pl-8 text-xs" />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {CATEGORIAS.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setCategoriaAtiva(cat.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 cursor-pointer",
                categoriaAtiva === cat.id ? "bg-emerald-600 text-white" : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              )}
            >
              <Icon className="h-3 w-3" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Objections list */}
      <div className="flex max-h-[400px] flex-col gap-2 overflow-y-auto">
        {filtradas.length === 0 && (
          <p className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">Nenhuma objecao encontrada</p>
        )}
        {filtradas.map((obj) => {
          const isAtiva = objecaoAtiva?.id === obj.id;
          const s = CAT_STYLE[obj.categoria];
          return (
            <button
              key={obj.id}
              onClick={() => handleSelecionar(obj)}
              className={cn(
                "group relative flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-all duration-200 cursor-pointer",
                isAtiva
                  ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/30 dark:border-emerald-500 dark:bg-emerald-950/20 dark:ring-emerald-500/20"
                  : "border-neutral-200/80 bg-white hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800/80 dark:bg-neutral-900 dark:hover:border-neutral-700"
              )}
            >
              {isAtiva && (
                <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.dot)} />
                <Badge className={cn(s.bg, s.text, s.border, "text-[10px] px-1.5 py-0")}>{obj.categoria}</Badge>
                <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{obj.artigo}</span>
              </div>
              <p className={cn("text-xs font-medium leading-snug", isAtiva ? "text-emerald-800 dark:text-emerald-300" : "text-neutral-900 dark:text-neutral-100")}>
                {obj.titulo}
              </p>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{obj.fundamentacao}</p>
            </button>
          );
        })}
      </div>

      {/* Active objection summary bar */}
      {objecaoAtiva && (
        <div className={cn("flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/20")}>
          <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="truncate text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Ativa: {objecaoAtiva.titulo}</span>
        </div>
      )}
    </div>
  );
}
