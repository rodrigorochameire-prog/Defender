"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Shield, Gavel, Scale, Heart, Building, Folder } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ICONE_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, Gavel, Scale, Heart, Building, Folder,
};

interface Props {
  pastaAtiva: number | null;
  onSelectPasta: (id: number | null) => void;
}

export function NoticiasPastasSidebar({ pastaAtiva, onSelectPasta }: Props) {
  const [criando, setCriando] = useState(false);
  const [nomePasta, setNomePasta] = useState("");
  const utils = trpc.useUtils();

  const { data: pastas = [] } = trpc.noticias.listPastas.useQuery();

  const criarPasta = trpc.noticias.criarPasta.useMutation({
    onSuccess: () => {
      toast.success("Pasta criada");
      setCriando(false);
      setNomePasta("");
      void utils.noticias.listPastas.invalidate();
    },
  });

  const deletarPasta = trpc.noticias.deletarPasta.useMutation({
    onSuccess: () => {
      void utils.noticias.listPastas.invalidate();
      onSelectPasta(null);
    },
  });

  const seedPastas = trpc.noticias.seedPastasFixas.useMutation({
    onSuccess: () => void utils.noticias.listPastas.invalidate(),
  });

  const pastasFixas = pastas.filter(p => p.tipo === "fixa");
  const pastasLivres = pastas.filter(p => p.tipo === "livre");

  function PastaItem({ pasta }: { pasta: typeof pastas[0] }) {
    const ativo = pastaAtiva === pasta.id;
    return (
      <div
        className={cn(
          "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm select-none",
          ativo
            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
        )}
        onClick={() => onSelectPasta(ativo ? null : pasta.id)}
      >
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pasta.cor ?? "#6366f1" }} />
        <span className="flex-1 truncate text-sm">{pasta.nome}</span>
        {pasta.tipo === "livre" && (
          <button
            onClick={(e) => { e.stopPropagation(); deletarPasta.mutate({ id: pasta.id }); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-52 shrink-0 space-y-5 pt-1">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-3 mb-1.5">Pastas Fixas</p>
        {pastasFixas.length > 0
          ? pastasFixas.map(p => <PastaItem key={p.id} pasta={p} />)
          : (
            <button
              onClick={() => seedPastas.mutate()}
              disabled={seedPastas.isPending}
              className="text-xs text-emerald-600 px-3 hover:underline cursor-pointer"
            >
              {seedPastas.isPending ? "Criando..." : "Inicializar pastas"}
            </button>
          )
        }
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-3 mb-1.5">Minhas Pastas</p>
        {pastasLivres.map(p => <PastaItem key={p.id} pasta={p} />)}
        {criando ? (
          <div className="px-3 mt-1">
            <Input
              autoFocus
              value={nomePasta}
              onChange={e => setNomePasta(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && nomePasta.trim()) criarPasta.mutate({ nome: nomePasta.trim() });
                if (e.key === "Escape") setCriando(false);
              }}
              placeholder="Nome da pasta"
              className="h-7 text-xs"
            />
          </div>
        ) : (
          <button
            onClick={() => setCriando(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nova pasta
          </button>
        )}
      </div>
    </div>
  );
}

// Re-export ICONE_MAP in case it's needed elsewhere
export { ICONE_MAP };
