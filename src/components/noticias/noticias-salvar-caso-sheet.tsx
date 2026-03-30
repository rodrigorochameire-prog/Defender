"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { NoticiaJuridica } from "@/lib/db/schema";
import { useDebounce } from "@/hooks/use-debounce";

interface NoticiaSalvarCasoSheetProps {
  noticia: NoticiaJuridica;
  onClose: () => void;
}

export function NoticiaSalvarCasoSheet({ noticia, onClose }: NoticiaSalvarCasoSheetProps) {
  const [busca, setBusca] = useState("");
  const debouncedBusca = useDebounce(busca, 300);
  const [vinculados, setVinculados] = useState<number[]>([]);
  const utils = trpc.useUtils();

  const { data: processos = [] } = trpc.processos.list.useQuery(
    { search: debouncedBusca, limit: 20, offset: 0 },
    { enabled: true }
  );

  const vincular = trpc.noticias.vincularProcesso.useMutation({
    onSuccess: (_, vars) => {
      setVinculados(prev => [...prev, vars.processoId]);
      toast.success("Notícia vinculada ao processo");
      utils.noticias.listProcessosByNoticia.invalidate({ noticiaId: noticia.id });
    },
    onError: () => toast.error("Erro ao vincular"),
  });

  return (
    <Sheet open onOpenChange={open => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Vincular ao Processo</SheetTitle>
          <SheetDescription className="line-clamp-2">{noticia.titulo}</SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="relative my-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por réu, número ou crime..."
            className="pl-9"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            autoFocus
          />
        </div>

        {/* Lista de processos */}
        <div className="space-y-2 overflow-y-auto max-h-[60vh]">
          {processos.length === 0 && debouncedBusca && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum processo encontrado
            </p>
          )}
          {processos.map((processo) => {
            const jaVinculado = vinculados.includes(processo.id);
            const nomeDisplay =
              processo.assistido?.nome ?? `Processo ${processo.id}`;
            const numeroDisplay = processo.numeroAutos ?? `ID ${processo.id}`;
            const crimeDisplay = processo.assunto ?? "";

            return (
              <div
                key={processo.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-emerald-500/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {nomeDisplay}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {numeroDisplay}
                    {crimeDisplay ? ` · ${crimeDisplay}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={jaVinculado ? "secondary" : "outline"}
                  disabled={jaVinculado || vincular.isPending}
                  onClick={() =>
                    vincular.mutate({
                      noticiaId: noticia.id,
                      processoId: processo.id,
                    })
                  }
                  className="shrink-0"
                >
                  {jaVinculado ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                      Vinculado
                    </>
                  ) : vincular.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Vincular"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
