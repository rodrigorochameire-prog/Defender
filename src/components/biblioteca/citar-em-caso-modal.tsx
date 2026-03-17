"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Briefcase, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: "tese" | "artigo" | "lei";
  referenciaId: string;
  citacaoFormatada?: string;
}

export function CitarEmCasoModal({ open, onOpenChange, tipo, referenciaId, citacaoFormatada }: Props) {
  const [search, setSearch] = useState("");
  const [casoId, setCasoId] = useState<number | null>(null);
  const [observacao, setObservacao] = useState("");

  const { data: casosData } = trpc.casos.list.useQuery(
    { search: search || undefined, limit: 20 },
    { enabled: open }
  );

  const citar = trpc.biblioteca.citarEmCaso.useMutation({
    onSuccess: () => {
      toast.success("Referência vinculada ao caso");
      onOpenChange(false);
      setCasoId(null);
      setObservacao("");
      setSearch("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleClose = (v: boolean) => {
    if (!v) {
      setCasoId(null);
      setObservacao("");
      setSearch("");
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            Citar em Caso
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Buscar processo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {casosData && casosData.length > 0 && (
            <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {casosData.map((caso) => (
                <button
                  key={caso.id}
                  onClick={() => setCasoId(caso.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0",
                    casoId === caso.id
                      ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  )}
                >
                  <span className="font-medium">{caso.titulo}</span>
                  {caso.codigo && (
                    <span className="ml-2 text-xs text-zinc-400">({caso.codigo})</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {casosData && casosData.length === 0 && search && (
            <p className="text-sm text-zinc-500 text-center py-2">
              Nenhum caso encontrado para &quot;{search}&quot;
            </p>
          )}

          <Textarea
            placeholder="Observação (opcional)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            <Button
              disabled={!casoId || citar.isPending}
              onClick={() => casoId && citar.mutate({
                tipo, referenciaId, casoId, observacao, citacaoFormatada
              })}
            >
              {citar.isPending ? "Vinculando..." : "Vincular"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
