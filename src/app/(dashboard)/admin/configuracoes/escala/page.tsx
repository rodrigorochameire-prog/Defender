"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Gavel,
  Home,
  Check,
  RefreshCw,
  Save,
  ArrowLeftRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ============================================
// CONFIGURAÇÕES
// ============================================

type Atribuicao = "JURI_EP" | "VVD";

const ATRIBUICOES: Record<Atribuicao, { nome: string; icon: any; cor: string }> = {
  JURI_EP: { nome: "Júri + EP", icon: Gavel, cor: "text-emerald-600 dark:text-emerald-400" },
  VVD: { nome: "VD", icon: Home, cor: "text-amber-600 dark:text-amber-400" },
};

const MESES_NOMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function EscalaPage() {
  const anoAtual = new Date().getFullYear();
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);
  const [escalaLocal, setEscalaLocal] = useState<Record<string, { rodrigo: Atribuicao; juliane: Atribuicao }>>({});
  const [salvando, setSalvando] = useState(false);
  const [salvoComSucesso, setSalvoComSucesso] = useState(false);

  const utils = trpc.useUtils();
  const { data: escalasDb = [] } = trpc.profissionais.getEscalaAtual.useQuery();
  const setEscalaMutation = trpc.profissionais.setEscala.useMutation({
    onSuccess: () => {
      utils.profissionais.getEscalaAtual.invalidate();
    },
  });

  const getMesKey = (ano: number, mes: number) => `${ano}-${String(mes).padStart(2, "0")}`;
  const temAlteracoes = Object.keys(escalaLocal).length > 0;

  const mesAtualKey = getMesKey(new Date().getFullYear(), new Date().getMonth() + 1);

  const getEscalaMes = (ano: number, mes: number): { rodrigo: Atribuicao; juliane: Atribuicao } => {
    const key = getMesKey(ano, mes);
    if (escalaLocal[key]) return escalaLocal[key];
    
    const escalaRodrigo = escalasDb.find((e: any) => e.profissionalId === 1 && e.mes === mes && e.ano === ano);
    const escalaJuliane = escalasDb.find((e: any) => e.profissionalId === 2 && e.mes === mes && e.ano === ano);
    
    return {
      rodrigo: (escalaRodrigo?.atribuicao as Atribuicao) || (mes % 2 === 1 ? "JURI_EP" : "VVD"),
      juliane: (escalaJuliane?.atribuicao as Atribuicao) || (mes % 2 === 1 ? "VVD" : "JURI_EP"),
    };
  };

  const alternarEscala = (ano: number, mes: number) => {
    const key = getMesKey(ano, mes);
    const escalaAtual = getEscalaMes(ano, mes);
    setEscalaLocal({
      ...escalaLocal,
      [key]: { rodrigo: escalaAtual.juliane, juliane: escalaAtual.rodrigo },
    });
    setSalvoComSucesso(false);
  };

  const salvarEscalas = async () => {
    setSalvando(true);
    try {
      for (const [mesKey, escala] of Object.entries(escalaLocal)) {
        const [ano, mes] = mesKey.split("-").map(Number);
        await setEscalaMutation.mutateAsync({ profissionalId: 1, atribuicao: escala.rodrigo, mes, ano });
        await setEscalaMutation.mutateAsync({ profissionalId: 2, atribuicao: escala.juliane, mes, ano });
      }
      setEscalaLocal({});
      setSalvoComSucesso(true);
      setTimeout(() => setSalvoComSucesso(false), 3000);
    } finally {
      setSalvando(false);
    }
  };

  // Anos disponíveis: 2026 em diante
  const anosDisponiveis = [2026, 2027, 2028];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Escala de Atribuições
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Defina a atribuição mensal de cada defensor
          </p>
        </div>

        <div className="flex items-center gap-3">
          {salvoComSucesso && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <Check className="w-4 h-4" />
              Salvo
            </span>
          )}

          {temAlteracoes && (
            <Button 
              onClick={salvarEscalas} 
              disabled={salvando}
              size="sm"
              className="bg-neutral-900 hover:bg-neutral-800 dark:bg-foreground dark:hover:bg-foreground/90 dark:text-background gap-2"
            >
              {salvando ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
          )}
        </div>
      </div>

      {/* SELETOR DE ANO */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {anosDisponiveis.map((ano) => (
          <button
            key={ano}
            onClick={() => setAnoSelecionado(ano)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              anoSelecionado === ano
                ? "bg-neutral-900 text-white dark:bg-foreground dark:text-background shadow-md"
                : "bg-neutral-100 text-neutral-600 dark:bg-muted dark:text-muted-foreground hover:bg-neutral-200 dark:hover:bg-muted"
            )}
          >
            {ano}
          </button>
        ))}
      </div>

      {/* LEGENDA - Versão Discreta */}
      <div className="flex items-center justify-center gap-8 mb-6 pb-6 border-b border-neutral-200 dark:border-border">
        <div className="flex items-center gap-2">
          <Gavel className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Júri + EP</span>
        </div>
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">VD</span>
        </div>
      </div>

      {/* GRADE DE MESES DO ANO SELECIONADO */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
          const key = getMesKey(anoSelecionado, mes);
          const escala = getEscalaMes(anoSelecionado, mes);
          const isAtual = mesAtualKey === key;
          const foiAlterado = !!escalaLocal[key];
          
          const rodrigoAttr = ATRIBUICOES[escala.rodrigo];
          const julianeAttr = ATRIBUICOES[escala.juliane];
          const RodrigoIcon = rodrigoAttr.icon;
          const JulianeIcon = julianeAttr.icon;
          
          return (
            <div
              key={key} 
              className={cn(
                "group rounded-xl border bg-white dark:bg-card p-3 transition-all",
                isAtual 
                  ? "border-neutral-900 dark:border-foreground ring-2 ring-neutral-900/10 dark:ring-border/10"
                  : "border-neutral-200 dark:border-border hover:border-neutral-300 dark:hover:border-muted",
                foiAlterado && "border-amber-400 dark:border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
              )}
            >
              {/* Nome do mês */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-foreground">
                  {MESES_NOMES[mes - 1]}
                </span>
                {isAtual && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>

              {/* Atribuições - Versão Discreta */}
              <div className="space-y-1.5 text-[11px]">
                {/* Rodrigo */}
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center font-bold text-white bg-neutral-800 dark:bg-foreground dark:text-background rounded-md text-[10px]">
                    R
                  </span>
                  <RodrigoIcon className={cn("w-3.5 h-3.5", rodrigoAttr.cor)} />
                  <span className={cn("font-semibold", rodrigoAttr.cor)}>
                    {rodrigoAttr.nome}
                  </span>
                </div>

                {/* Juliane */}
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center font-bold text-neutral-900 bg-white border border-border rounded-md text-[10px]">
                    J
                  </span>
                  <JulianeIcon className={cn("w-3.5 h-3.5", julianeAttr.cor)} />
                  <span className={cn("font-semibold", julianeAttr.cor)}>
                    {julianeAttr.nome}
                  </span>
                </div>
              </div>

              {/* Botão alternar */}
              <button
                onClick={() => alternarEscala(anoSelecionado, mes)}
                className="w-full mt-3 flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-neutral-100 dark:hover:bg-muted transition-colors"
              >
                <ArrowLeftRight className="w-3 h-3" />
                Alternar
              </button>
            </div>
          );
        })}
      </div>

      {/* RODAPÉ INFORMATIVO */}
      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>
          <span className="font-semibold text-white bg-neutral-800 dark:bg-foreground dark:text-background px-1 py-0.5 rounded mr-1">R</span> = Dr. Rodrigo
          <span className="mx-3">•</span>
          <span className="font-semibold text-foreground bg-white dark:bg-background border border-border px-1 py-0.5 rounded mr-1">J</span> = Dra. Juliane
        </p>
      </div>
    </div>
  );
}
