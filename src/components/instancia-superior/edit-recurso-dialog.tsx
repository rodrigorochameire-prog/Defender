// ─── Editar Recurso Dialog ────────────────────────────────────────────────
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { STATUS_ORDER, STATUS_CONFIG, RESULTADO_CONFIG, TRIBUNAIS } from "./ds";
import { Lbl } from "./primitives";

export function EditRecursoDialog({ open, onOpenChange, recurso: r }: {
  open: boolean; onOpenChange: (v: boolean) => void; recurso: any;
}) {
  const [status, setStatus] = useState<string>(r.status);
  const [resultado, setResultado] = useState<string>(r.resultado);
  const [tribunal, setTribunal] = useState<string>(r.tribunal ?? "TJBA");
  const [relator, setRelator] = useState<string>(r.relator?.nome ?? "");
  const [camara, setCamara] = useState<string>(r.camara ?? "");
  const [dataDistribuicao, setDataDist] = useState<string>(r.dataDistribuicao ?? "");
  const [dataPauta, setDataPauta] = useState<string>(r.dataPauta ?? "");
  const [dataJulgamento, setDataJulg] = useState<string>(r.dataJulgamento ?? "");
  const [dataTransito, setDataTrans] = useState<string>(r.dataTransito ?? "");
  const [tiposPenais, setTiposPenais] = useState<string>((r.tiposPenais ?? []).join(", "));
  const [teses, setTeses] = useState<string>((r.tesesInvocadas ?? []).join(", "));
  const [resumo, setResumo] = useState<string>(r.resumo ?? "");
  const [observacoes, setObs] = useState<string>(r.observacoes ?? "");

  const utils = trpc.useUtils();
  const update = trpc.instanciaSuperior.updateRecurso.useMutation({
    onSuccess: () => {
      toast.success("Recurso atualizado");
      utils.instanciaSuperior.getRecurso.invalidate({ id: r.id });
      utils.instanciaSuperior.listRecursos.invalidate();
      utils.instanciaSuperior.stats.invalidate();
      utils.instanciaSuperior.mapaPorAssunto.invalidate();
      utils.instanciaSuperior.agendaPauta.invalidate();
      utils.instanciaSuperior.relatoriasRanking.invalidate();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const splitTags = (s: string) => s.split(",").map(t => t.trim()).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Pencil className="w-4 h-4" /> Editar recurso</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Lbl>Fase / status</Lbl>
            <div className="flex flex-wrap gap-1">
              {STATUS_ORDER.map(s => (
                <button key={s} onClick={() => setStatus(s)} className={cn(
                  "text-[11px] px-2 py-1 rounded-md border transition-colors flex items-center gap-1",
                  status === s ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-700 text-neutral-500"
                )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_CONFIG[s].dot)} />{STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Tribunal</Lbl>
            <div className="flex gap-1.5">
              {TRIBUNAIS.map(t => (
                <button key={t.key} onClick={() => setTribunal(t.key)} className={cn(
                  "text-[12px] px-3 py-1.5 rounded-lg border transition-all flex-1",
                  tribunal === t.key ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                )}>{t.label}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Relator</Lbl><Input value={relator} onChange={(e) => setRelator(e.target.value)} placeholder="Nome do desembargador" className="text-[13px] h-9" /></div>
            <div><Lbl>Câmara</Lbl><Input value={camara} onChange={(e) => setCamara(e.target.value)} placeholder="1ª Câmara Criminal" className="text-[13px] h-9" /></div>
            <div><Lbl>Distribuição</Lbl><Input type="date" value={dataDistribuicao} onChange={(e) => setDataDist(e.target.value)} className="text-[13px] h-9" /></div>
            <div><Lbl>Pauta</Lbl><Input type="date" value={dataPauta} onChange={(e) => setDataPauta(e.target.value)} className="text-[13px] h-9" /></div>
            <div><Lbl>Julgamento</Lbl><Input type="date" value={dataJulgamento} onChange={(e) => setDataJulg(e.target.value)} className="text-[13px] h-9" /></div>
            <div><Lbl>Trânsito</Lbl><Input type="date" value={dataTransito} onChange={(e) => setDataTrans(e.target.value)} className="text-[13px] h-9" /></div>
          </div>

          <div>
            <Lbl>Resultado</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(RESULTADO_CONFIG).map(k => (
                <button key={k} onClick={() => setResultado(k)} className={cn(
                  "text-[11px] px-2 py-1 rounded-md border transition-colors",
                  resultado === k ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-700 text-neutral-500"
                )}>{RESULTADO_CONFIG[k].label}</button>
              ))}
            </div>
          </div>

          <div><Lbl>Tipos penais (vírgula)</Lbl><Input value={tiposPenais} onChange={(e) => setTiposPenais(e.target.value)} placeholder="Roubo majorado, Tráfico…" className="text-[13px] h-9" /></div>
          <div><Lbl>Teses invocadas (vírgula)</Lbl><Input value={teses} onChange={(e) => setTeses(e.target.value)} placeholder="Insuficiência probatória, Nulidade…" className="text-[13px] h-9" /></div>
          <div>
            <Lbl>Resumo</Lbl>
            <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} className="w-full text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2.5 min-h-[70px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed" />
          </div>
          <div>
            <Lbl>Observações</Lbl>
            <textarea value={observacoes} onChange={(e) => setObs(e.target.value)} className="w-full text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2.5 min-h-[60px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => update.mutate({
              id: r.id,
              tribunal: tribunal as "TJBA" | "STJ" | "STF",
              status, resultado,
              relatorNome: relator || null,
              camara: camara || null,
              dataDistribuicao: dataDistribuicao || null,
              dataPauta: dataPauta || null,
              dataJulgamento: dataJulgamento || null,
              dataTransito: dataTransito || null,
              tiposPenais: splitTags(tiposPenais),
              tesesInvocadas: splitTags(teses),
              resumo: resumo || null,
              observacoes: observacoes || null,
            })}
            disabled={update.isPending}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {update.isPending ? "Salvando…" : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
