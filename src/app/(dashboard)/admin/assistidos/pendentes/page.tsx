"use client";

import { useState } from "react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, ExternalLink, Users, Pencil, Link2, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/ds/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/** Mesma heurística da lista — esconde placeholders dos resultados de busca. */
function isPlaceholderNome(nome: string): boolean {
  const n = (nome || "").toLowerCase().trim();
  return n === "" || n === "-" || n.includes("a identificar") || n.includes("nao identificado") || n.includes("não identificado");
}

export default function AssistidosPendentesPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.assistidos.listPendentesRevisao.useQuery();

  const update = trpc.assistidos.update.useMutation({
    onSuccess: () => {
      utils.assistidos.listPendentesRevisao.invalidate();
      utils.assistidos.list.invalidate();
      toast.success("Assistido renomeado");
    },
    onError: (err) => toast.error(err.message ?? "Erro ao renomear"),
  });

  const vincular = trpc.assistidos.vincularPlaceholder.useMutation({
    onSuccess: (res) => {
      utils.assistidos.listPendentesRevisao.invalidate();
      utils.assistidos.list.invalidate();
      toast.success(`Vinculado a ${res.targetNome}`, {
        description: `${res.processos} processo(s) e ${res.demandas} demanda(s) reatribuídos.`,
      });
    },
    onError: (err) => toast.error(err.message ?? "Erro ao vincular"),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <CollapsiblePageHeader
        icon={AlertTriangle}
        title="Assistidos pendentes de revisão"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Placeholders criados quando o scraper do PJe não conseguiu identificar o réu. Renomeie com o nome correto ou vincule a um assistido já cadastrado.
        </p>
      </CollapsiblePageHeader>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Check}
          title="Nada pendente"
          description="Todos os assistidos importados foram identificados."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((ph) => (
            <PlaceholderCard
              key={ph.id}
              placeholder={ph}
              onRename={(novoNome) => update.mutateAsync({ id: ph.id, nome: novoNome })}
              onVincular={(targetId) => vincular.mutateAsync({ placeholderId: ph.id, targetId })}
              isSaving={update.isPending}
              isLinking={vincular.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PlaceholderCardProps {
  placeholder: {
    id: number;
    numeroAutos: string;
    destinatarioOriginal: string | null;
    demandasAtivas: number;
  };
  onRename: (novoNome: string) => Promise<unknown>;
  onVincular: (targetId: number) => Promise<unknown>;
  isSaving: boolean;
  isLinking: boolean;
}

function PlaceholderCard({ placeholder, onRename, onVincular, isSaving, isLinking }: PlaceholderCardProps) {
  const [mode, setMode] = useState<"rename" | "link">("rename");
  const [novoNome, setNovoNome] = useState("");
  const { numeroAutos, destinatarioOriginal, demandasAtivas, id } = placeholder;

  const handleSubmit = async () => {
    const trimmed = novoNome.trim();
    if (trimmed.length < 3) {
      toast.error("Nome precisa ter ao menos 3 caracteres");
      return;
    }
    await onRename(trimmed);
    setNovoNome("");
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
            <code className="truncate font-mono text-xs">{numeroAutos}</code>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            {destinatarioOriginal && (
              <span>
                Destinatário PJe: <strong>{destinatarioOriginal}</strong>
              </span>
            )}
            <Badge variant="secondary">
              <Users className="mr-1 h-3 w-3" />
              {demandasAtivas} demanda{demandasAtivas === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(numeroAutos).then(
              () => toast.success("CNJ copiado", {
                description: "Cole (Cmd+V) no campo de busca do PJe.",
                duration: 4000,
              }),
              () => toast.info("Abrindo PJe", {
                description: `Buscar pelo CNJ: ${numeroAutos}`,
                duration: 5000,
              }),
            );
            window.open(
              "https://pje.tjba.jus.br/pje/ConsultaProcesso/listView.seam",
              "_blank",
              "noopener,noreferrer",
            );
          }}
          className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 cursor-pointer"
        >
          Abrir no PJe <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      {/* Modo: renomear | vincular */}
      <div className="mt-3 inline-flex items-center gap-0.5 p-[3px] rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {[
          { id: "rename" as const, label: "Renomear", icon: Pencil },
          { id: "link" as const, label: "Vincular a existente", icon: Link2 },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setMode(opt.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer",
              mode === opt.id ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
            )}
          >
            <opt.icon className="h-3 w-3" />
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "rename" ? (
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            placeholder="Nome real do assistido"
            className="h-9 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSubmit();
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={isSaving || novoNome.trim().length < 3}
            size="sm"
            className="h-9"
          >
            <Check className="mr-1 h-4 w-4" />
            Renomear
          </Button>
        </div>
      ) : (
        <VincularPicker
          placeholderId={id}
          onPick={onVincular}
          isLinking={isLinking}
        />
      )}

      <div className="mt-1 text-[11px] text-zinc-400">id {id}</div>
    </Card>
  );
}

function VincularPicker({
  placeholderId,
  onPick,
  isLinking,
}: {
  placeholderId: number;
  onPick: (targetId: number) => Promise<unknown>;
  isLinking: boolean;
}) {
  const [search, setSearch] = useState("");
  const enabled = search.trim().length >= 2;
  const { data, isFetching } = trpc.assistidos.list.useQuery(
    { search: search.trim() },
    { enabled, staleTime: 15_000 },
  );

  const results = (data ?? [])
    .filter((a) => a.id !== placeholderId && !isPlaceholderNome(a.nome))
    .slice(0, 6);

  return (
    <div className="mt-3 space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar assistido por nome, CPF ou processo…"
          className="h-9 pl-8 text-sm"
          autoFocus
        />
      </div>

      {enabled && (
        <div className="rounded-lg border border-zinc-200/70 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
          {isFetching && results.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-3 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-zinc-500">Nenhum assistido encontrado.</div>
          ) : (
            results.map((a) => (
              <button
                key={a.id}
                disabled={isLinking}
                onClick={async () => {
                  await onPick(a.id);
                  setSearch("");
                }}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 transition-colors cursor-pointer disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{a.nome}</p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {(a.cpf || "sem CPF")}{(a as { processoPrincipal?: string }).processoPrincipal ? ` · ${(a as { processoPrincipal?: string }).processoPrincipal}` : ""}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 shrink-0">
                  {isLinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  Vincular
                </span>
              </button>
            ))
          )}
        </div>
      )}
      <p className="text-[11px] text-zinc-400">
        Reatribui processos e demandas ao assistido escolhido e arquiva este registro.
      </p>
    </div>
  );
}
