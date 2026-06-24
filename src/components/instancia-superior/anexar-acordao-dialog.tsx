// ─── Anexar Acórdão Dialog ────────────────────────────────────────────────
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Gavel } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { RESULTADO_CONFIG } from "./ds";
import { Lbl } from "./primitives";

export function AnexarAcordaoDialog({ open, onOpenChange, recursoId, relatorNome }: {
  open: boolean; onOpenChange: (v: boolean) => void; recursoId: number; relatorNome?: string;
}) {
  const [numero, setNumero] = useState("");
  const [data, setData] = useState("");
  const [resultado, setResultado] = useState("PROVIDO");
  const [votacao, setVotacao] = useState("");
  const [ementa, setEmenta] = useState("");

  const utils = trpc.useUtils();
  const create = trpc.instanciaSuperior.createAcordao.useMutation({
    onSuccess: () => {
      toast.success("Acórdão juntado");
      utils.instanciaSuperior.getRecurso.invalidate({ id: recursoId });
      utils.instanciaSuperior.listRecursos.invalidate();
      utils.instanciaSuperior.stats.invalidate();
      onOpenChange(false);
      setNumero(""); setData(""); setVotacao(""); setEmenta("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Gavel className="w-4 h-4" /> Juntar acórdão</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Lbl>Número</Lbl><Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Nº acórdão" className="font-mono text-[13px] h-9" /></div>
            <div><Lbl>Data julgamento</Lbl><Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="text-[13px] h-9" /></div>
          </div>
          <div>
            <Lbl>Resultado</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {["PROVIDO", "PARCIALMENTE_PROVIDO", "NAO_PROVIDO", "NAO_CONHECIDO", "CONCEDIDO", "DENEGADO"].map(k => (
                <button key={k} onClick={() => setResultado(k)} className={cn(
                  "text-[11px] px-2 py-1 rounded-md border transition-colors",
                  resultado === k ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-700 text-neutral-500"
                )}>{RESULTADO_CONFIG[k]?.label ?? k}</button>
              ))}
            </div>
          </div>
          <div><Lbl>Votação</Lbl><Input value={votacao} onChange={(e) => setVotacao(e.target.value)} placeholder="unanimidade / maioria 2x1" className="text-[13px] h-9" /></div>
          <div>
            <Lbl>Ementa</Lbl>
            <textarea value={ementa} onChange={(e) => setEmenta(e.target.value)} placeholder="Cole a ementa do acórdão..."
              className="w-full text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2.5 min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => create.mutate({ recursoId, numeroAcordao: numero || undefined, dataJulgamento: data || undefined, resultado, votacao: votacao || undefined, ementa: ementa || undefined, relator: relatorNome })}
            disabled={create.isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
            {create.isPending ? "Salvando..." : "Juntar acórdão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
