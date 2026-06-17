"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { X, Trash2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { PessoaChip } from "./pessoa-chip";

interface Props {
  pessoaId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Tab = "visao" | "processos" | "midias" | "proveniencia";

export function PessoaSheet({ pessoaId, open, onOpenChange }: Props) {
  const [tab, setTab] = useState<Tab>("visao");
  const { data, isLoading } = trpc.pessoas.getById.useQuery(
    { id: pessoaId ?? 0 },
    { enabled: !!pessoaId && open, retry: false },
  );

  if (!pessoaId) return null;

  const pessoa = data?.pessoa;
  const participacoes = data?.participacoes ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[600px] md:w-[780px] lg:w-[920px] xl:w-[1040px] p-0 flex flex-col gap-0">
        <div className="bg-neutral-100/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200/40 px-4 py-3 flex items-center justify-between">
          <SheetHeader className="p-0">
            <SheetTitle className="text-sm font-semibold">Pessoa</SheetTitle>
          </SheetHeader>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-7 h-7 rounded-lg hover:bg-neutral-200/60 flex items-center justify-center cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <p className="p-4 text-xs text-neutral-500">Carregando…</p>}
          {!isLoading && !pessoa && (
            <p className="p-4 text-xs text-neutral-500">Pessoa não encontrada</p>
          )}
          {!isLoading && pessoa && (
            <>
              <div className="px-4 pt-4 pb-2">
                <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                  {pessoa.nome}
                </h2>
                {pessoa.categoriaPrimaria && (
                  <p className="text-xs text-neutral-500 mt-0.5">{pessoa.categoriaPrimaria}</p>
                )}
              </div>

              <div role="tablist" className="flex border-b border-neutral-200 dark:border-neutral-800 px-2">
                {(["visao", "processos", "midias", "proveniencia"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-3 py-2 text-[11px] font-medium border-b-2 cursor-pointer",
                      tab === t ? "border-foreground text-foreground" : "border-transparent text-neutral-500",
                    )}
                  >
                    {t === "visao"
                      ? "Visão geral"
                      : t === "processos"
                        ? "Processos"
                        : t === "midias"
                          ? "Mídias"
                          : "Proveniência"}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {tab === "visao" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase mb-1">CPF</div>
                      <div>{pessoa.cpf ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase mb-1">Total de participações</div>
                      <div>{participacoes.length}</div>
                    </div>
                  </div>
                )}

                {tab === "processos" && (
                  <div className="space-y-2">
                    {participacoes.length === 0 && (
                      <p className="text-xs text-neutral-400 italic">Nenhuma participação registrada.</p>
                    )}
                    {participacoes.map((p: any) => (
                      <div key={p.id} className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <PessoaChip nome={pessoa.nome} papel={p.papel} clickable={false} size="xs" />
                          <span className="text-neutral-500">processo #{p.processoId}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "midias" && <RecortesGaleria pessoaId={pessoa.id} />}

                {tab === "proveniencia" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase mb-1">Fonte de criação</div>
                      <div>{pessoa.fonteCriacao}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase mb-1">Confidence</div>
                      <div>{pessoa.confidence}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-neutral-400 uppercase mb-1">Criada em</div>
                      <div>{new Date(pessoa.createdAt as any).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const PAPEL_LABEL: Record<string, string> = {
  REU: "Réu", CORREU: "Corréu", VITIMA: "Vítima", TESTEMUNHA: "Testemunha",
  INFORMANTE: "Informante", PERITO: "Perito", OUTRO: "Outro",
};

/** Galeria de recortes do PDF vinculados à pessoa (capturador do leitor). */
function RecortesGaleria({ pessoaId }: { pessoaId: number }) {
  const [zoom, setZoom] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { data: recortes, isLoading } = trpc.pessoas.getRecortesByPessoa.useQuery(
    { pessoaId },
    { enabled: !!pessoaId },
  );
  const del = trpc.pessoas.deleteRecorte.useMutation({
    onMutate: async ({ id }) => {
      await utils.pessoas.getRecortesByPessoa.cancel({ pessoaId });
      const prev = utils.pessoas.getRecortesByPessoa.getData({ pessoaId });
      utils.pessoas.getRecortesByPessoa.setData({ pessoaId }, (old: any) =>
        (old ?? []).filter((r: any) => r.id !== id),
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) utils.pessoas.getRecortesByPessoa.setData({ pessoaId }, ctx.prev);
      toast.error("Erro ao apagar recorte");
    },
    onSettled: () => utils.pessoas.getRecortesByPessoa.invalidate({ pessoaId }),
  });

  if (isLoading) return <p className="text-xs text-neutral-400">Carregando…</p>;
  if (!recortes || recortes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <ImageOff className="w-7 h-7 text-neutral-300 dark:text-neutral-600" />
        <p className="text-xs text-neutral-400 italic">Nenhum recorte vinculado.</p>
        <p className="text-[10px] text-neutral-400 max-w-[240px]">
          Use o capturador no leitor de autos (recorte do PDF) para vincular fotos,
          assinaturas e trechos a esta pessoa.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {recortes.map((r: any) => (
          <div
            key={r.id}
            className="group/recorte relative rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          >
            <button
              type="button"
              onClick={() => setZoom(r.imagem)}
              className="block w-full cursor-zoom-in"
              title="Ampliar"
            >
              <img src={r.imagem} alt={r.rotulo ?? "Recorte"} className="w-full h-28 object-cover" />
            </button>
            <div className="px-2 py-1.5">
              {r.papel && (
                <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500">
                  {PAPEL_LABEL[String(r.papel).toUpperCase()] ?? r.papel}
                </span>
              )}
              {r.rotulo && (
                <p className="text-[10px] text-neutral-600 dark:text-neutral-300 truncate" title={r.rotulo}>
                  {r.rotulo}
                </p>
              )}
              {r.pagina && <p className="text-[9px] text-neutral-400">pág. {r.pagina}</p>}
            </div>
            <button
              type="button"
              onClick={() => del.mutate({ id: r.id })}
              aria-label="Apagar recorte"
              className="absolute top-1 right-1 opacity-0 group-hover/recorte:opacity-100 transition-opacity w-6 h-6 rounded-md bg-white/90 dark:bg-neutral-900/90 flex items-center justify-center text-neutral-400 hover:text-red-500 cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-[80] bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setZoom(null)}
        >
          <img src={zoom} alt="Recorte" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}
    </>
  );
}
