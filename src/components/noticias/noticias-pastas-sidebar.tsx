"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
          "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors select-none",
          ativo
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        )}
        onClick={() => onSelectPasta(ativo ? null : pasta.id)}
      >
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: pasta.cor ?? "#6366f1" }}
        />
        <span className={cn(
          "flex-1 truncate text-xs transition-colors",
          ativo ? "font-medium" : "font-normal"
        )}>
          {pasta.nome}
        </span>
        {pasta.tipo === "livre" && (
          <button
            onClick={e => { e.stopPropagation(); deletarPasta.mutate({ id: pasta.id }); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-red-400"
            aria-label="Remover pasta"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-36 shrink-0 flex flex-col pt-3 pb-4 min-h-0 border-r border-border">

      {/* Lista de pastas */}
      <div className="flex-1 px-2 space-y-0.5 overflow-y-auto">

        {/* Pastas fixas */}
        {pastasFixas.length === 0 ? (
          <button
            onClick={() => seedPastas.mutate()}
            disabled={seedPastas.isPending}
            className="text-[11px] text-muted-foreground hover:text-emerald-600 transition-colors px-2 py-1 cursor-pointer w-full text-left"
          >
            {seedPastas.isPending ? "Criando..." : "Inicializar pastas"}
          </button>
        ) : (
          pastasFixas.map(p => <PastaItem key={p.id} pasta={p} />)
        )}

        {/* Separador sutil entre fixas e livres */}
        {pastasFixas.length > 0 && pastasLivres.length > 0 && (
          <div className="h-px bg-border mx-1 my-2" />
        )}

        {/* Pastas livres */}
        {pastasLivres.map(p => <PastaItem key={p.id} pasta={p} />)}
      </div>

      {/* Adicionar pasta */}
      <div className="px-2 pt-2 mt-auto">
        {criando ? (
          <Input
            autoFocus
            value={nomePasta}
            onChange={e => setNomePasta(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && nomePasta.trim()) criarPasta.mutate({ nome: nomePasta.trim() });
              if (e.key === "Escape") { setCriando(false); setNomePasta(""); }
            }}
            onBlur={() => { if (!nomePasta.trim()) setCriando(false); }}
            placeholder="Nome da pasta"
            className="h-6 text-[11px] px-2"
          />
        ) : (
          <button
            onClick={() => setCriando(true)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer w-full px-2 py-1 rounded-md hover:bg-muted/50"
          >
            <Plus className="w-3 h-3 shrink-0" />
            Nova pasta
          </button>
        )}
      </div>
    </div>
  );
}
