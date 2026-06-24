// ─── Novo Recurso (intake) ────────────────────────────────────────────────
// Fase 1: extração 1:1 do CreateRecursoDialog. O redesenho em intake "dossiê"
// (4 blocos, validação CNJ, vínculo assistido/processo) ocorre na Fase 6.
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Landmark } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { TRIBUNAIS, TIPO_LABELS, TIPO_SHORT, CAMARAS } from "./ds";
import { Lbl } from "./primitives";

export function NewAppealDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tipo, setTipo] = useState("APELACAO");
  const [tribunal, setTribunal] = useState<"TJBA" | "STJ" | "STF">("TJBA");
  const [numero, setNumero] = useState("");
  const [camara, setCamara] = useState("");
  const [resumo, setResumo] = useState("");

  const utils = trpc.useUtils();
  const create = trpc.instanciaSuperior.createRecurso.useMutation({
    onSuccess: () => {
      toast.success("Recurso registrado");
      utils.instanciaSuperior.listRecursos.invalidate();
      utils.instanciaSuperior.stats.invalidate();
      onOpenChange(false);
      setNumero(""); setResumo("");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2 font-serif"><Landmark className="w-4 h-4" /> Novo Recurso</DialogTitle></DialogHeader>
        <div className="space-y-5 py-2">
          <div>
            <Lbl>Tribunal</Lbl>
            <div className="flex gap-1.5">
              {TRIBUNAIS.map(t => (
                <button key={t.key} onClick={() => setTribunal(t.key as any)} title={t.full} className={cn(
                  "text-[13px] px-3 py-2 rounded-lg border transition-all flex-1",
                  tribunal === t.key ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                )}>{t.label}</button>
              ))}
            </div>
          </div>
          <div>
            <Lbl>Tipo de recurso</Lbl>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(TIPO_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setTipo(k)} className={cn(
                  "text-[13px] px-3 py-2.5 rounded-lg border transition-all text-left",
                  tipo === k ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium shadow-sm shadow-emerald-500/10" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                )}>
                  <span className="text-[9px] font-mono font-bold text-neutral-400 mr-1.5">{TIPO_SHORT[k]}</span>{v}
                </button>
              ))}
            </div>
          </div>
          <div><Lbl>Número do recurso</Lbl><Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="0000000-00.0000.0.00.0000" className="font-mono text-[13px] h-10" /></div>
          {tribunal === "TJBA" && (
            <div>
              <Lbl>Câmara criminal</Lbl>
              <div className="flex gap-1.5">
                {CAMARAS.map(c => (
                  <button key={c} onClick={() => setCamara(camara === c ? "" : c)} className={cn(
                    "text-[13px] px-3 py-2.5 rounded-lg border transition-all flex-1",
                    camara === c ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium" : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  )}>{c.replace(" Criminal", "")}</button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Lbl>Resumo</Lbl>
            <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Breve descrição do recurso ou pedido..."
              className="w-full text-[13px] rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent px-3 py-2.5 min-h-[88px] resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-lg">Cancelar</Button>
          <Button onClick={() => create.mutate({ tipo, tribunal, numeroRecurso: numero || undefined, camara: camara || undefined, resumo: resumo || undefined })}
            disabled={create.isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg">
            {create.isPending ? "Salvando..." : "Registrar recurso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
