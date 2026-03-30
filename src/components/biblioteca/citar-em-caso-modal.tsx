"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Briefcase, Search, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type Alvo = "caso" | "processo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: "tese" | "artigo" | "lei";
  referenciaId: string;
  citacaoFormatada?: string;
  alvoInicial?: Alvo;
}

export function CitarEmCasoModal({
  open,
  onOpenChange,
  tipo,
  referenciaId,
  citacaoFormatada,
  alvoInicial = "caso",
}: Props) {
  const [alvo, setAlvo] = useState<Alvo>(alvoInicial);
  const [search, setSearch] = useState("");
  const [casoId, setCasoId] = useState<number | null>(null);
  const [processoId, setProcessoId] = useState<number | null>(null);
  const [observacao, setObservacao] = useState("");

  const { data: casosData } = trpc.casos.list.useQuery(
    { search: search || undefined, limit: 20 },
    { enabled: open && alvo === "caso" }
  );

  const { data: processosData } = trpc.processos.list.useQuery(
    { search: search || undefined, limit: 20 },
    { enabled: open && alvo === "processo" }
  );

  const citarCaso = trpc.biblioteca.citarEmCaso.useMutation({
    onSuccess: () => {
      toast.success("Referência vinculada ao caso");
      reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const citarProcesso = trpc.biblioteca.citarEmProcesso.useMutation({
    onSuccess: () => {
      toast.success("Referência vinculada ao processo");
      reset();
    },
    onError: (e) => toast.error(e.message),
  });

  const reset = () => {
    setCasoId(null);
    setProcessoId(null);
    setObservacao("");
    setSearch("");
    onOpenChange(false);
  };

  const isPending = citarCaso.isPending || citarProcesso.isPending;
  const selecionado = alvo === "caso" ? casoId : processoId;

  const handleVincular = () => {
    if (alvo === "caso" && casoId) {
      citarCaso.mutate({ tipo, referenciaId, casoId, observacao, citacaoFormatada });
    } else if (alvo === "processo" && processoId) {
      citarProcesso.mutate({ tipo, referenciaId, processoId, observacao, citacaoFormatada });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); else onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            Citar na Biblioteca
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Toggle caso / processo */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
            {(["caso", "processo"] as Alvo[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => { setAlvo(a); setCasoId(null); setProcessoId(null); setSearch(""); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  alvo === a
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {a === "caso" ? <Briefcase className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                {a === "caso" ? "Caso" : "Processo"}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <Input
              placeholder={alvo === "caso" ? "Buscar caso..." : "Buscar processo..."}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCasoId(null); setProcessoId(null); }}
              className="pl-9"
            />
          </div>

          {/* Lista de resultados */}
          {alvo === "caso" && casosData && casosData.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {casosData.map((caso) => (
                <button
                  key={caso.id}
                  onClick={() => setCasoId(caso.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors border-b border-border last:border-0 cursor-pointer",
                    casoId === caso.id
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700"
                      : "hover:bg-muted text-foreground/80"
                  )}
                >
                  <span className="font-medium">{caso.titulo}</span>
                  {caso.codigo && <span className="ml-2 text-xs text-zinc-400">({caso.codigo})</span>}
                </button>
              ))}
            </div>
          )}

          {alvo === "processo" && processosData && processosData && processosData.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {processosData.map((proc: { id: number; numeroAutos?: string | null; vara?: string | null }) => (
                <button
                  key={proc.id}
                  onClick={() => setProcessoId(proc.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors border-b border-border last:border-0 cursor-pointer",
                    processoId === proc.id
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700"
                      : "hover:bg-muted text-foreground/80"
                  )}
                >
                  <span className="font-mono font-medium">{proc.numeroAutos}</span>
                  {proc.vara && <span className="ml-2 text-xs text-zinc-400">{proc.vara}</span>}
                </button>
              ))}
            </div>
          )}

          {search && (
            (alvo === "caso" && casosData?.length === 0) ||
            (alvo === "processo" && (!processosData || processosData.length === 0))
          ) && (
            <p className="text-sm text-zinc-500 text-center py-2">Nenhum resultado para &quot;{search}&quot;</p>
          )}

          <Textarea
            placeholder="Observação (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={reset}>Cancelar</Button>
            <Button disabled={!selecionado || isPending} onClick={handleVincular}>
              {isPending ? "Vinculando..." : "Vincular"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
