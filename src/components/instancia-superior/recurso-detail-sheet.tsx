// ─── Recurso Detail Sheet (+ Timeline, Acórdão, Análise IA) ───────────────
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  X, Pencil, Plus, Users, FileText, Gavel, Sparkles, Loader2, ChevronRight,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc/client";
import { STATUS_ORDER, STATUS_CONFIG, RESULTADO_CONFIG, TIPO_LABELS, TIPO_SHORT } from "./ds";
import { InfoField, TagRow } from "./primitives";
import { AnexarAcordaoDialog } from "./anexar-acordao-dialog";
import { EditRecursoDialog } from "./edit-recurso-dialog";

export function RecursoDetailSheet({ recursoId, onClose }: { recursoId: number | null; onClose: () => void }) {
  const { data: r, isLoading } = trpc.instanciaSuperior.getRecurso.useQuery({ id: recursoId! }, { enabled: recursoId != null });
  const [anexarOpen, setAnexarOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Sheet open={recursoId != null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl p-0 overflow-y-auto">
        {isLoading || !r ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-2/3 rounded" /><Skeleton className="h-24 rounded" /><Skeleton className="h-40 rounded" />
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="bg-[#414144] dark:bg-neutral-900 px-6 py-5 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex flex-col items-center justify-center">
                    <span className="text-[11px] font-bold tracking-wider leading-none">{TIPO_SHORT[r.tipo] ?? r.tipo}</span>
                    <span className="text-[7px] text-white/60 mt-0.5">{r.tribunal}</span>
                  </div>
                  <div>
                    <h2 className="text-[16px] font-semibold leading-tight">{TIPO_LABELS[r.tipo] ?? r.tipo}</h2>
                    <p className="text-[11px] text-white/60 font-mono mt-0.5">{r.numeroRecurso ?? "sem número"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setEditOpen(true)} title="Editar recurso" className="h-7 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 flex items-center gap-1 text-[11px] font-medium cursor-pointer transition-colors">
                    <Pencil className="w-3 h-3" /> Editar
                  </button>
                  <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {r.assistido?.nome && (
                <div className="mt-3 flex items-center gap-2 text-[12px] text-white/80">
                  <Users className="w-3.5 h-3.5 text-white/50" />{r.assistido.nome}
                  {r.processoOrigem?.numeroAutos && <span className="text-white/40 font-mono text-[11px]">· {r.processoOrigem.numeroAutos}</span>}
                </div>
              )}
            </div>

            <div className="p-6 space-y-6">
              <Timeline recurso={r} />
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Câmara" value={r.camara} />
                <InfoField label="Relator" value={r.relator?.nome} />
                <InfoField label="Defensor origem" value={r.defensorOrigem?.nome} />
                <InfoField label="Defensor destino" value={r.defensorDestino?.nome} />
              </div>

              {((r.tesesInvocadas?.length ?? 0) > 0 || (r.tiposPenais?.length ?? 0) > 0) && (
                <div className="space-y-3">
                  {(r.tiposPenais?.length ?? 0) > 0 && <TagRow label="Tipos penais" tags={r.tiposPenais ?? []} />}
                  {(r.tesesInvocadas?.length ?? 0) > 0 && <TagRow label="Teses invocadas" tags={r.tesesInvocadas ?? []} />}
                </div>
              )}

              {r.resumo && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 block mb-1.5">Resumo</span>
                  <p className="text-[13px] text-foreground/80 leading-relaxed">{r.resumo}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400">
                    Acórdãos {r.acordaos?.length > 0 && `(${r.acordaos.length})`}
                  </span>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => setAnexarOpen(true)}>
                    <Plus className="w-3 h-3" /> Juntar acórdão
                  </Button>
                </div>
                {!r.acordaos?.length ? (
                  <p className="text-[12px] text-muted-foreground/60 py-3 text-center">Nenhum acórdão juntado.</p>
                ) : (
                  <div className="space-y-2">{r.acordaos.map((a: any) => <AcordaoCard key={a.id} acordao={a} />)}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
      {r && <AnexarAcordaoDialog open={anexarOpen} onOpenChange={setAnexarOpen} recursoId={r.id} relatorNome={r.relator?.nome} />}
      {r && <EditRecursoDialog open={editOpen} onOpenChange={setEditOpen} recurso={r} />}
    </Sheet>
  );
}

function Timeline({ recurso: r }: { recurso: any }) {
  const currentIdx = STATUS_ORDER.indexOf(r.status);
  const dateFor: Record<string, string | null> = {
    INTERPOSTO: r.dataInterposicao, DISTRIBUIDO: r.dataDistribuicao, CONCLUSO: null,
    PAUTADO: r.dataPauta, JULGADO: r.dataJulgamento, TRANSITADO: r.dataTransito,
  };
  return (
    <div className="flex items-start justify-between">
      {STATUS_ORDER.map((s, i) => {
        const done = i <= currentIdx;
        const d = dateFor[s];
        return (
          <div key={s} className="flex flex-col items-center flex-1 relative">
            {i < STATUS_ORDER.length - 1 && (
              <div className={cn("absolute top-[7px] left-1/2 w-full h-0.5", i < currentIdx ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-700")} />
            )}
            <div className={cn("w-3.5 h-3.5 rounded-full z-10 border-2", done ? "bg-emerald-500 border-emerald-500" : "bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600")} />
            <span className={cn("text-[8px] mt-1.5 text-center leading-tight", done ? "text-foreground/70 font-medium" : "text-muted-foreground/50")}>{STATUS_CONFIG[s].label}</span>
            {d && <span className="text-[8px] text-muted-foreground/60 tabular-nums mt-0.5">{format(new Date(d), "dd/MM/yy")}</span>}
          </div>
        );
      })}
    </div>
  );
}

function AcordaoCard({ acordao: a }: { acordao: any }) {
  const cfg = RESULTADO_CONFIG[a.resultado] ?? null;
  const utils = trpc.useUtils();
  const [taskId, setTaskId] = useState<number | null>(null);

  const analisar = trpc.instanciaSuperior.analisarAcordaoIA.useMutation({
    onSuccess: (res) => { setTaskId(res.taskId); toast.message("Análise enfileirada no daemon…"); },
    onError: (e) => toast.error(e.message),
  });

  const poll = trpc.instanciaSuperior.pollAnaliseAcordao.useQuery(
    { acordaoId: a.id, taskId: taskId ?? 0 },
    { enabled: taskId != null, refetchInterval: 3000 }
  );

  useEffect(() => {
    const s = poll.data?.status;
    if (s === "CONCLUIDO" || s === "ERRO") {
      setTaskId(null);
      utils.instanciaSuperior.getRecurso.invalidate();
      if (s === "ERRO") toast.error("Falha na análise do acórdão");
      else toast.success("Análise concluída");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll.data?.status]);

  const analise = (poll.data?.analiseIa as any) ?? (a.analiseIa as any) ?? null;
  const analisando = analisar.isPending || taskId != null || a.analiseStatus === "ANALISANDO";

  return (
    <div className="rounded-lg border border-neutral-200/60 dark:border-neutral-800/40 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[12px] font-medium">{a.numeroAcordao || "Acórdão"}</span>
          {a.dataJulgamento && <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{format(new Date(a.dataJulgamento), "dd/MM/yy")}</span>}
        </div>
        {cfg && <span className={cn("text-[11px] font-semibold", cfg.color)}>{cfg.label}</span>}
      </div>
      {a.votacao && <p className="text-[11px] text-muted-foreground mt-1">{a.votacao}</p>}
      {a.ementa && <p className="text-[11px] text-foreground/70 mt-2 leading-relaxed line-clamp-4">{a.ementa}</p>}
      {a.votos?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {a.votos.map((v: any, i: number) => (
            <span key={i} className={cn("text-[9px] px-1.5 py-0.5 rounded",
              v.voto === "DIVERGENTE" ? "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400" : "bg-neutral-100 dark:bg-white/[0.06] text-muted-foreground")}>
              {v.nome.split(" ")[0]}: {v.voto === "ACOMPANHA_RELATOR" ? "✓" : v.voto === "DIVERGENTE" ? "✗" : "—"}
            </span>
          ))}
        </div>
      )}

      {/* Análise IA (daemon / Claude Code) */}
      <div className="mt-3 pt-3 border-t border-neutral-200/50 dark:border-white/[0.04]">
        {analise ? (
          <AnaliseAcordaoView analise={analise} />
        ) : analisando ? (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
            Analisando no daemon… (Claude Code)
          </div>
        ) : (
          <button
            onClick={() => analisar.mutate({ acordaoId: a.id })}
            disabled={!a.ementa}
            title={!a.ementa ? "Cole a ementa do acórdão para analisar" : "Analisar com IA via daemon"}
            className="flex items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Analisar acórdão com IA
          </button>
        )}
      </div>
    </div>
  );
}

function AnaliseAcordaoView({ analise }: { analise: any }) {
  const blocks: { label: string; items?: string[]; text?: string; tone: string }[] = [
    { label: "Teses acolhidas", items: analise.tesesAcolhidas, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Teses rejeitadas", items: analise.tesesRejeitadas, tone: "text-red-600 dark:text-red-400" },
    { label: "Fundamentos-chave", items: analise.fundamentosChave, tone: "text-foreground/75" },
    { label: "Precedentes citados", items: analise.precedentesCitados, tone: "text-blue-600 dark:text-blue-400" },
    { label: "Observações", items: analise.observacoesRelevantes, tone: "text-amber-600 dark:text-amber-400" },
  ];
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-violet-500" />
        <span className="text-[9px] uppercase tracking-widest font-semibold text-violet-500">Análise IA</span>
      </div>
      {blocks.filter(b => (b.items?.length ?? 0) > 0).map(b => (
        <div key={b.label}>
          <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground/70 block mb-0.5">{b.label}</span>
          <ul className="space-y-0.5">
            {b.items!.map((it, i) => (
              <li key={i} className={cn("text-[11px] leading-snug flex gap-1.5", b.tone)}>
                <span className="text-muted-foreground/40 shrink-0">›</span>{it}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {analise.impactoParaDefesa && (
        <div className="rounded-md bg-violet-50/60 dark:bg-violet-500/[0.06] px-2.5 py-2">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-violet-500 block mb-0.5">Impacto para a defesa</span>
          <p className="text-[11px] text-foreground/80 leading-snug">{analise.impactoParaDefesa}</p>
        </div>
      )}
      {analise.recomendacaoProxPasso && (
        <div className="flex items-start gap-1.5 text-[11px] text-foreground/75">
          <ChevronRight className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-px" />
          <span><span className="font-medium">Próximo passo:</span> {analise.recomendacaoProxPasso}</span>
        </div>
      )}
    </div>
  );
}
