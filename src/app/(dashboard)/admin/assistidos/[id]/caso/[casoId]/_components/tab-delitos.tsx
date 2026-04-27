"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props { casoId: number; }

export function TabDelitos({ casoId }: Props) {
  const { data: procs = [] } = trpc.processos.listByCaso.useQuery({ casoId });
  const procRef = (procs as any[]).find((p) => p.isReferencia) ?? (procs as any[])[0];

  if (!procRef) {
    return <p className="p-4 italic text-neutral-400">Nenhum processo no caso.</p>;
  }

  return <TipificacoesProcesso processoId={procRef.id} />;
}

function TipificacoesProcesso({ processoId }: { processoId: number }) {
  const [adding, setAdding] = useState(false);
  const utils = trpc.useUtils();
  const { data: tips = [], isLoading } = trpc.tipificacoes.listTipificacoes.useQuery({ processoId });
  const deleteMut = trpc.tipificacoes.deleteTipificacao.useMutation({
    onSuccess: () => {
      toast.success("Removida");
      utils.tipificacoes.listTipificacoes.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) return <p className="p-4 italic text-neutral-400">Carregando…</p>;
  const list = tips as any[];

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Tipificações ({list.length})</h3>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-2 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400"
          >
            <Plus className="w-3 h-3" /> Vincular delito
          </button>
        )}
      </div>

      {adding && (
        <VincularDelitoForm
          processoId={processoId}
          onDone={() => { setAdding(false); utils.tipificacoes.listTipificacoes.invalidate(); }}
          onCancel={() => setAdding(false)}
        />
      )}

      {list.length === 0 && !adding && (
        <p className="text-xs italic text-neutral-400">Nenhum delito tipificado neste processo.</p>
      )}

      <div className="space-y-1.5">
        {list.map((t) => (
          <div key={t.id} className="rounded border px-3 py-2 text-sm flex items-start justify-between gap-2">
            <div>
              <div className="font-medium">{t.delitoDescricao ?? `Delito #${t.delitoId}`}</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                <span className="font-mono">
                  {t.delitoCodigoLei}
                  {t.delitoArtigo && ` art. ${t.delitoArtigo}`}
                </span>
                <span className="ml-2">· {t.modalidade}</span>
                {t.delitoHediondo && <span className="ml-2 text-rose-600 font-medium">hediondo</span>}
              </div>
              {Array.isArray(t.qualificadoras) && t.qualificadoras.length > 0 && (
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Qualificadoras: {t.qualificadoras.join(", ")}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => { if (confirm("Remover esta tipificação?")) deleteMut.mutate({ id: t.id }); }}
              className="text-neutral-400 hover:text-rose-500 cursor-pointer"
              aria-label="Remover"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VincularDelitoForm({ processoId, onDone, onCancel }: {
  processoId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const [delitoId, setDelitoId] = useState<number | null>(null);
  const [modalidade, setModalidade] = useState<"consumada" | "tentada">("consumada");

  const { data: catalog = [] } = trpc.tipificacoes.listCatalogo.useQuery(
    { search: search || undefined, limit: 20 },
    { enabled: search.trim().length >= 2 || delitoId !== null }
  );

  const createMut = trpc.tipificacoes.createTipificacao.useMutation({
    onSuccess: () => { toast.success("Vinculado"); onDone(); },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (!delitoId) return;
    createMut.mutate({ processoId, delitoId, modalidade });
  };

  return (
    <div className="p-3 rounded border bg-neutral-50 dark:bg-neutral-900/50 space-y-2">
      <input
        autoFocus
        placeholder="Buscar delito (artigo, descrição, lei)..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setDelitoId(null); }}
        className="w-full px-2 py-1.5 border rounded text-sm"
      />
      {search.trim().length >= 2 && !delitoId && (
        <div className="max-h-48 overflow-y-auto border rounded">
          {(catalog as any[]).map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => { setDelitoId(d.id); setSearch(d.descricaoCurta); }}
              className="w-full text-left px-2 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <span className="font-mono text-neutral-500">{d.codigoLei} {d.artigo}{d.paragrafo ? " " + d.paragrafo : ""}</span>
              {" — "}{d.descricaoCurta}
            </button>
          ))}
          {(catalog as any[]).length === 0 && (
            <p className="px-2 py-1.5 italic text-neutral-400 text-xs">Nenhum match.</p>
          )}
        </div>
      )}
      {delitoId && (
        <div className="flex items-center gap-2 text-xs">
          <label>
            Modalidade:
            <select
              value={modalidade}
              onChange={(e) => setModalidade(e.target.value as any)}
              className="ml-1 px-1.5 py-0.5 border rounded"
            >
              <option value="consumada">Consumada</option>
              <option value="tentada">Tentada</option>
            </select>
          </label>
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!delitoId || createMut.isPending}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-emerald-400 disabled:opacity-50"
        >
          {createMut.isPending ? "Vinculando…" : "Vincular"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded border text-xs cursor-pointer hover:border-neutral-400"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
