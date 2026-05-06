"use client";

import { useState } from "react";
import { CollapsiblePageHeader } from "@/components/layouts/collapsible-page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, ExternalLink, Users } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

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

  return (
    <div className="flex flex-col gap-6 p-6">
      <CollapsiblePageHeader
        icon={AlertTriangle}
        title="Assistidos pendentes de revisão"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Placeholders criados quando o scraper do PJe não conseguiu identificar o réu. Revisar no PJe e renomear.
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
              onRename={(novoNome) =>
                update.mutateAsync({ id: ph.id, nome: novoNome })
              }
              isSaving={update.isPending}
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
  isSaving: boolean;
}

function PlaceholderCard({ placeholder, onRename, isSaving }: PlaceholderCardProps) {
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
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
            <code className="truncate font-mono text-xs">{numeroAutos}</code>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
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
          className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-zinc-600 hover:text-emerald-600 cursor-pointer"
        >
          Abrir no PJe <ExternalLink className="h-3 w-3" />
        </button>
      </div>
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
      <div className="mt-1 text-[11px] text-zinc-400">id {id}</div>
    </Card>
  );
}
