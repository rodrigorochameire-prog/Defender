"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Shield, Gavel, Scale, Heart, Building, Folder, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  const [collapsed, setCollapsed] = useState(false);
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

  // Modo colapsado — só pontos coloridos com tooltip
  if (collapsed) {
    return (
      <div className="w-10 shrink-0 flex flex-col items-center pt-2 gap-2">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
          title="Expandir pastas"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
        {pastas.map(p => (
          <button
            key={p.id}
            onClick={() => onSelectPasta(pastaAtiva === p.id ? null : p.id)}
            title={p.nome}
            className={cn(
              "w-6 h-6 rounded-full shrink-0 transition-all ring-offset-2",
              pastaAtiva === p.id
                ? "ring-2 ring-zinc-400 scale-110"
                : "hover:scale-110 opacity-70 hover:opacity-100"
            )}
            style={{ backgroundColor: p.cor ?? "#6366f1" }}
          />
        ))}
      </div>
    );
  }

  function PastaItem({ pasta }: { pasta: typeof pastas[0] }) {
    const ativo = pastaAtiva === pasta.id;
    return (
      <div
        className={cn(
          "group flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm select-none",
          ativo
            ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
        )}
        onClick={() => onSelectPasta(ativo ? null : pasta.id)}
      >
        <div
          className={cn("w-2.5 h-2.5 rounded-full shrink-0 transition-transform", ativo && "scale-110")}
          style={{ backgroundColor: pasta.cor ?? "#6366f1" }}
        />
        <span className="flex-1 truncate">{pasta.nome}</span>
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
    <div className="w-52 shrink-0 flex flex-col gap-5 pt-1 min-h-0">
      {/* Toggle collapse */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Pastas</span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-500 transition-colors"
          title="Recolher pastas"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Pastas Fixas */}
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-300 dark:text-zinc-600 px-3 mb-2">
          Fixas
        </p>
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

      {/* Separador */}
      {pastasFixas.length > 0 && (
        <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2" />
      )}

      {/* Minhas Pastas */}
      <div className="space-y-0.5 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-300 dark:text-zinc-600 px-3 mb-2">
          Minhas pastas
        </p>
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors w-full rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
          >
            <Plus className="w-3.5 h-3.5" /> Nova pasta
          </button>
        )}
      </div>
    </div>
  );
}

export { ICONE_MAP };
