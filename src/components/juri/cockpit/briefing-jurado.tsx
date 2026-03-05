"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Users,
  History,
  Target,
  Eye,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BriefingJuradoProps {
  juradoId: number;
  juradoNome: string;
  isDarkMode: boolean;
}

export function BriefingJuradoButton({ juradoId, juradoNome, isDarkMode }: BriefingJuradoProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="h-6 w-6 p-0 text-violet-500 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30"
        title="Briefing deste jurado"
      >
        <Brain className="w-3.5 h-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn("max-w-md", isDarkMode ? "bg-zinc-900 text-zinc-100 border-zinc-800" : "")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Brain className="w-4 h-4 text-violet-500" />
              Briefing — {juradoNome}
            </DialogTitle>
          </DialogHeader>
          <BriefingContent juradoId={juradoId} isDarkMode={isDarkMode} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function BriefingContent({ juradoId, isDarkMode }: { juradoId: number; isDarkMode: boolean }) {
  const { data, isLoading, error } = trpc.avaliacaoJuri.briefingJurado.useQuery({ juradoId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
        <AlertTriangle className="w-6 h-6 text-amber-500" />
        <span className="text-sm">Erro ao carregar briefing</span>
      </div>
    );
  }

  const { jurado, stats, participacoes } = data;
  const temHistorico = stats.totalSessoes > 0;

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {/* Perfil */}
      <div className={cn("rounded-lg p-3 space-y-2", isDarkMode ? "bg-zinc-800" : "bg-zinc-50")}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{jurado.nome}</div>
            <div className="text-xs text-muted-foreground">
              {[jurado.profissao, jurado.bairro, jurado.genero].filter(Boolean).join(" • ")}
            </div>
          </div>
          {jurado.perfilTendencia && (
            <Badge className={cn(
              "text-[10px]",
              jurado.perfilTendencia === "absolutorio" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
              jurado.perfilTendencia === "condenatorio" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" :
              "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            )}>
              {jurado.perfilTendencia}
            </Badge>
          )}
        </div>
        {jurado.perfilPsicologico && (
          <p className="text-xs text-muted-foreground italic">{jurado.perfilPsicologico}</p>
        )}
        {jurado.observacoes && (
          <p className="text-xs">{jurado.observacoes}</p>
        )}
      </div>

      {/* Estatísticas de voto */}
      {temHistorico ? (
        <div className={cn("rounded-lg p-3", isDarkMode ? "bg-zinc-800" : "bg-zinc-50")}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Histórico de Votos</span>
            <Badge variant="outline" className="text-[10px] ml-auto">{stats.totalSessoes} sessões</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-2">
              <ThumbsUp className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-emerald-600">{stats.votosAbsolvicao}</div>
              <div className="text-[10px] text-emerald-500">Absolvição</div>
            </div>
            <div className="rounded-md bg-rose-50 dark:bg-rose-950/30 p-2">
              <ThumbsDown className="w-4 h-4 text-rose-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-rose-600">{stats.votosCondenacao}</div>
              <div className="text-[10px] text-rose-500">Condenação</div>
            </div>
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-2">
              <Minus className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <div className="text-lg font-bold text-amber-600">{stats.votosDesclassificacao}</div>
              <div className="text-[10px] text-amber-500">Desclass.</div>
            </div>
          </div>
          {/* Barra de tendência */}
          <div className="mt-2 h-3 rounded-full overflow-hidden flex">
            {stats.votosAbsolvicao > 0 && (
              <div className="bg-emerald-500 h-full" style={{ width: `${stats.taxaAbsolvicao}%` }} />
            )}
            {stats.votosDesclassificacao > 0 && (
              <div className="bg-amber-500 h-full" style={{ width: `${((stats.votosDesclassificacao / stats.totalSessoes) * 100)}%` }} />
            )}
            {stats.votosCondenacao > 0 && (
              <div className="bg-rose-500 h-full" style={{ width: `${((stats.votosCondenacao / stats.totalSessoes) * 100)}%` }} />
            )}
          </div>
          <div className="text-center mt-1">
            <span className="text-xs font-medium">
              Taxa de absolvição: <strong className="text-emerald-600">{stats.taxaAbsolvicao}%</strong>
            </span>
          </div>
        </div>
      ) : (
        <div className={cn("rounded-lg p-3 text-center", isDarkMode ? "bg-zinc-800" : "bg-zinc-50")}>
          <Users className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Primeiro júri deste jurado — sem histórico</p>
        </div>
      )}

      {/* Participações anteriores */}
      {participacoes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-xs font-semibold uppercase tracking-wider">Participações Anteriores</span>
          </div>
          <div className="space-y-2">
            {participacoes.slice(0, 5).map((p, i) => (
              <div key={i} className={cn("rounded-md p-2 text-xs space-y-1", isDarkMode ? "bg-zinc-800/50" : "bg-zinc-50")}>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{p.data || "—"}</span>
                  <div className="flex items-center gap-1.5">
                    {p.tendenciaRegistrada && (
                      <Badge className={cn(
                        "text-[9px]",
                        p.tendenciaRegistrada === "ABSOLVER" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" :
                        p.tendenciaRegistrada === "CONDENAR" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                      )}>
                        {p.tendenciaRegistrada}
                      </Badge>
                    )}
                    {p.resultado && (
                      <Badge variant="outline" className="text-[9px]">
                        {p.resultado === "absolvicao" ? "Abs." : p.resultado === "condenacao" ? "Cond." : "Desc."}
                      </Badge>
                    )}
                  </div>
                </div>
                {p.linguagemCorporal && <p className="text-muted-foreground">{p.linguagemCorporal}</p>}
                {p.anotacoesGerais && <p>{p.anotacoesGerais}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
