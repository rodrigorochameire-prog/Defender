"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc/client";
import { onlyDigits } from "@/lib/format/cnj";
import { formatProcesso } from "@/lib/format/apresentacao";
import { RegistrosTimeline } from "@/components/registros/registros-timeline";
import { SkillLauncher } from "@/components/shared/skill-launcher";
import { SkillTaskHistory } from "@/components/shared/skill-task-history";
import type { Atribuicao } from "@/lib/skills/catalog";
import { ProcessoSheetBody, type ProcessoSheetData } from "./processo-sheet-body";

interface Props {
  processoId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Acionado por "Vincular a caso" — o host decide o fluxo (caso já existe um). */
  onVincularCaso?: (processoId: number) => void;
}

const PJE_BASE = "https://pje.tjba.jus.br/pje/ConsultaPublica/listView.seam";

/**
 * ProcessoSheet — sheet de detalhe do processo, abre SEM tirar o usuário do
 * contexto (lista de Casos, Demandas, etc.). Reaproveita o sheet-mestre via
 * ProcessoSheetBody e a fonte de dados `trpc.processos.getById` (+ próxima
 * audiência). A página standalone `/admin/processos/[id]` segue como deep link.
 */
export function ProcessoSheet({ processoId, open, onOpenChange, onVincularCaso }: Props) {
  const enabled = open && processoId != null;

  const { data: processo, isLoading } = trpc.processos.getById.useQuery(
    { id: processoId ?? 0 },
    { enabled, retry: false },
  );

  const { data: proxima } = trpc.audiencias.proximaAgendada.useQuery(
    { processoId: processoId ?? 0 },
    { enabled },
  );

  const data: ProcessoSheetData | null = useMemo(() => {
    if (!processo) return null;
    const principal =
      processo.assistidos?.find((a) => a.isPrincipal) ?? processo.assistidos?.[0] ?? null;
    // Demanda com prazo mais próximo (já vem ordenada asc por prazo).
    const proximoPrazoStr = processo.demandas?.find((d) => d.prazo)?.prazo ?? null;
    return {
      id: processo.id,
      numeroAutos: processo.numeroAutos ?? null,
      area: processo.area ?? null,
      atribuicao: processo.atribuicao ?? null,
      fase: processo.fase ?? null,
      situacao: processo.situacao ?? null,
      assunto: processo.assunto ?? null,
      vara: processo.vara ?? null,
      assistidoNome: principal?.nome ?? null,
      proximaAudiencia: proxima
        ? { dataAudiencia: proxima.dataAudiencia, tipo: proxima.tipo }
        : null,
      proximoPrazoStr,
      registrosCount: 0, // a timeline carrega/conta internamente
      documentosCount: processo.driveFiles?.length ?? 0,
      partesCount: processo.assistidos?.length ?? 0,
      vinculadosCount: processo.processosVinculados?.length ?? 0,
    };
  }, [processo, proxima]);

  const handleAbrirPje = () => {
    if (typeof window === "undefined") return;
    const numero = data?.numeroAutos ? onlyDigits(data.numeroAutos) : "";
    const url = numero ? `${PJE_BASE}?numProcesso=${numero}` : PJE_BASE;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleVincularCaso = () => {
    if (processoId != null) onVincularCaso?.(processoId);
  };

  // Slots reais por aba — Registros via timeline; Documentos/Partes/Vinculados
  // inline a partir do payload. Sem dado → o body cai no EmptyState canônico.
  const slots = processo
    ? {
        registros:
          processoId != null ? (
            <RegistrosTimeline processoId={processoId} />
          ) : undefined,
        documentos:
          processo.driveFiles && processo.driveFiles.length > 0 ? (
            <ul className="space-y-1.5">
              {processo.driveFiles.map((f) => (
                <li key={f.id}>
                  <a
                    href={f.webViewLink ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground/80 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span className="truncate">{f.name}</span>
                    <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-neutral-300" />
                  </a>
                </li>
              ))}
            </ul>
          ) : undefined,
        partes:
          processo.assistidos && processo.assistidos.length > 0 ? (
            <ul className="space-y-1.5">
              {processo.assistidos.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs"
                >
                  <span className="truncate font-medium text-foreground/80">{a.nome}</span>
                  <span className="ml-2 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {a.papel ?? (a.isPrincipal ? "Principal" : "Parte")}
                  </span>
                </li>
              ))}
            </ul>
          ) : undefined,
        vinculados:
          processo.processosVinculados && processo.processosVinculados.length > 0 ? (
            <ul className="space-y-1.5">
              {processo.processosVinculados.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/processos/${p.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 font-mono text-[11px] tabular-nums text-foreground/80 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                  >
                    {p.numeroAutos ? formatProcesso(p.numeroAutos) : `#${p.id}`}
                    {p.tipoProcesso && (
                      <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {p.tipoProcesso}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : undefined,
      }
    : undefined;

  // Launcher de skills de IA — montado aqui (tem ids reais); o body apenas o
  // renderiza. Assistido principal alimenta o assistidoId exigido pelo daemon.
  const principalId =
    processo?.assistidos?.find((a) => a.isPrincipal)?.id ??
    processo?.assistidos?.[0]?.id ??
    undefined;
  const iaLauncher =
    processo && data ? (
      <div className="space-y-3">
        <SkillLauncher
          entity="processo"
          atribuicao={(processo.atribuicao ?? "") as Atribuicao}
          assistidoId={principalId}
          processoId={processo.id}
        />
        <SkillTaskHistory processoId={processo.id} />
      </div>
    ) : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full p-0 sm:max-w-[440px]"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Detalhe do processo</SheetTitle>
        {isLoading && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando processo…
          </div>
        )}
        {!isLoading && data && (
          <ProcessoSheetBody
            data={data}
            onVincularCaso={handleVincularCaso}
            onAbrirPje={handleAbrirPje}
            slots={slots}
            iaLauncher={iaLauncher}
          />
        )}
        {!isLoading && !data && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Processo não encontrado.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
