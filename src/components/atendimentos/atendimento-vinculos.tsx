"use client";

// Seção "Vínculos" do sheet de atendimento — ofícios e diligências (investigação)
// gerados A PARTIR deste atendimento (proveniência registros.id → registro_id).
// Lista o que já existe e oferece criação rápida mantendo o vínculo:
//   • Ofício → deep-link para /admin/oficios/novo com assistido/processo/registroId
//   • Diligência → popover de criação direta (diligencias.create com registroId)

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DILIGENCIA_TIPOS = [
  { value: "LOCALIZACAO_PESSOA", label: "Localização de pessoa" },
  { value: "LOCALIZACAO_DOCUMENTO", label: "Localização de documento" },
  { value: "REQUISICAO_DOCUMENTO", label: "Requisição de documento" },
  { value: "PESQUISA_OSINT", label: "Pesquisa OSINT" },
  { value: "DILIGENCIA_CAMPO", label: "Diligência de campo" },
  { value: "INTIMACAO", label: "Intimação" },
  { value: "OITIVA", label: "Oitiva" },
  { value: "PERICIA", label: "Perícia" },
  { value: "EXAME", label: "Exame" },
  { value: "OUTRO", label: "Outro" },
] as const;

const STATUS_DILIGENCIA: Record<string, string> = {
  A_PESQUISAR: "A pesquisar",
  EM_ANDAMENTO: "Em andamento",
  LOCALIZADO: "Localizado",
  OBTIDO: "Obtido",
  INFRUTIFERO: "Infrutífero",
  ARQUIVADO: "Arquivado",
};

export function AtendimentoVinculos({
  registroId,
  assistidoId,
  processoId,
}: {
  registroId: number;
  assistidoId: number;
  processoId: number | null;
}) {
  const oficios = trpc.oficios.listByRegistro.useQuery({ registroId });
  const diligencias = trpc.diligencias.listByRegistro.useQuery({ registroId });

  const novoOficioHref = `/admin/oficios/novo?registroId=${registroId}&assistidoId=${assistidoId}${
    processoId ? `&processoId=${processoId}` : ""
  }`;

  return (
    <div className="space-y-3">
      {/* ── Ofícios ───────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Ofícios
          </p>
          <Link
            href={novoOficioHref}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Gerar ofício
          </Link>
        </div>
        {oficios.isLoading ? (
          <p className="text-[11px] text-muted-foreground py-1.5">Carregando…</p>
        ) : (oficios.data ?? []).length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-1.5">
            Nenhum ofício gerado a partir deste atendimento.
          </p>
        ) : (
          <div className="space-y-1">
            {oficios.data!.map((o) => (
              <div
                key={o.id}
                className="flex items-center gap-2 rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[12px] text-foreground/90 truncate flex-1">{o.titulo}</span>
                {o.metadata?.status && (
                  <span className="text-[10px] text-muted-foreground capitalize shrink-0">{o.metadata.status}</span>
                )}
                {o.googleDocUrl && (
                  <a
                    href={o.googleDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 shrink-0"
                    title="Abrir no Google Docs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Investigação (diligências) ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" /> Investigação
          </p>
          <NovaDiligenciaPopover
            registroId={registroId}
            assistidoId={assistidoId}
            processoId={processoId}
            onCreated={() => diligencias.refetch()}
          />
        </div>
        {diligencias.isLoading ? (
          <p className="text-[11px] text-muted-foreground py-1.5">Carregando…</p>
        ) : (diligencias.data ?? []).length === 0 ? (
          <p className="text-[11px] text-muted-foreground py-1.5">
            Nenhuma diligência originada deste atendimento.
          </p>
        ) : (
          <div className="space-y-1">
            {diligencias.data!.map((d) => (
              <Link
                key={d.id}
                href={`/admin/diligencias?abrir=${d.id}`}
                className="flex items-center gap-2 rounded-lg border border-neutral-200/70 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2.5 py-1.5 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="text-[12px] text-foreground/90 truncate flex-1">{d.titulo}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {STATUS_DILIGENCIA[d.status] ?? d.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NovaDiligenciaPopover({
  registroId,
  assistidoId,
  processoId,
  onCreated,
}: {
  registroId: number;
  assistidoId: number;
  processoId: number | null;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<string>("LOCALIZACAO_PESSOA");

  const criar = trpc.diligencias.create.useMutation({
    onSuccess: () => {
      toast.success("Diligência criada");
      setTitulo("");
      setTipo("LOCALIZACAO_PESSOA");
      setOpen(false);
      onCreated();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
          <Plus className="w-3 h-3" /> Nova diligência
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-72 p-3 rounded-xl space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Nova diligência
        </p>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Tipo</label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DILIGENCIA_TIPOS.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Título</label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Localizar endereço atual da vítima"
            className="h-8 text-xs"
            autoFocus
          />
        </div>
        <Button
          size="sm"
          onClick={() =>
            criar.mutate({
              titulo: titulo.trim(),
              tipo: tipo as (typeof DILIGENCIA_TIPOS)[number]["value"],
              assistidoId,
              registroId,
              ...(processoId ? { processoId } : {}),
            })
          }
          disabled={!titulo.trim() || criar.isPending}
          className={cn("w-full h-8 gap-1.5 text-[12px] bg-emerald-600 hover:bg-emerald-700")}
        >
          {criar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Criar diligência
        </Button>
      </PopoverContent>
    </Popover>
  );
}
