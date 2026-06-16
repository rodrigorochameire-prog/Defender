"use client";

// Gerar demanda a partir de um atendimento — popover de criação rápida, alinhado
// aos campos reais de uma demanda (demandas.createFromForm): atribuição corrigível,
// ato (sugestões pela atribuição escolhida), prazo, réu preso, urgência e um
// registro inicial — que pode ser escrito na hora e/ou importado do atendimento
// (assunto/pedido/relato). A peça nasce depois, da demanda, pelo fluxo atual.

import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ListPlus, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAtosPorAtribuicao } from "@/config/atos-por-atribuicao";
import {
  AREA_TO_ATRIBUICAO_ENUM,
  ATRIBUICAO_DEMANDA_OPTIONS,
} from "./config";

interface GerarDemandaPopoverProps {
  assistido: { id: number; nome: string };
  processo: { numeroAutos: string | null } | null;
  area: string | null;
  /**
   * Conteúdo do atendimento para importar no registro inicial da demanda
   * (assunto/pedido/relato). O usuário pode editar antes de criar.
   */
  contextoAtendimento?: {
    assunto?: string | null;
    pedido?: string | null;
    conteudo?: string | null;
  } | null;
  /** Id do registro de atendimento de origem — habilita o vínculo bidirecional. */
  atendimentoId?: number;
  /** Botão acionador (asChild). */
  children: React.ReactNode;
}

/** Compõe um rascunho de registro inicial a partir do que foi colhido no atendimento. */
function montarRegistroDoAtendimento(
  ctx: GerarDemandaPopoverProps["contextoAtendimento"]
): string {
  if (!ctx) return "";
  return [
    ctx.assunto && `Assunto: ${ctx.assunto}`,
    ctx.pedido && `Pedido: ${ctx.pedido}`,
    ctx.conteudo && ctx.conteudo,
  ]
    .filter(Boolean)
    .join("\n");
}

export function GerarDemandaPopover({
  assistido,
  processo,
  area,
  contextoAtendimento,
  atendimentoId,
  children,
}: GerarDemandaPopoverProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [vincular, setVincular] = useState(true);

  // Atribuição: default derivado da área do atendimento, mas corrigível.
  const areaKey = area ?? "CRIMINAL";
  const atribuicaoDefault = AREA_TO_ATRIBUICAO_ENUM[areaKey] ?? "SUBSTITUICAO";
  const [atribuicao, setAtribuicao] = useState(atribuicaoDefault);
  const [ato, setAto] = useState("");
  const [prazo, setPrazo] = useState("");
  const [reuPreso, setReuPreso] = useState(false);
  const [urgente, setUrgente] = useState(false);
  const [registro, setRegistro] = useState("");
  // Processo selecionado (id como string p/ o Select; "" = nenhum → cria provisório).
  const [processoId, setProcessoId] = useState("");

  // Processos já existentes do assistido — para escolher em vez de digitar CNJ.
  const processosQuery = trpc.processos.listByAssistido.useQuery(
    { assistidoId: assistido.id },
    { enabled: open },
  );
  const processosAssistido = processosQuery.data ?? [];

  // Default do processo ao abrir/carregar: o processo do atendimento, senão o mais recente.
  useEffect(() => {
    if (!open) return;
    if (processosAssistido.length === 0) { setProcessoId(""); return; }
    const doAtendimento = processo?.numeroAutos
      ? processosAssistido.find((p) => p.numeroAutos === processo.numeroAutos)
      : undefined;
    setProcessoId(String((doAtendimento ?? processosAssistido[0]).id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, processosQuery.dataUpdatedAt]);

  // Reseta o formulário toda vez que abre — e pré-preenche o registro com o
  // contexto do atendimento (o usuário edita à vontade).
  useEffect(() => {
    if (open) {
      setAtribuicao(atribuicaoDefault);
      setAto("");
      setPrazo("");
      setReuPreso(false);
      setUrgente(false);
      setVincular(true);
      setRegistro(montarRegistroDoAtendimento(contextoAtendimento));
    }
  }, [open, atribuicaoDefault, contextoAtendimento]);

  // Sugestões de ato seguem a ATRIBUIÇÃO escolhida (não mais a área fixa).
  const atosLabel = useMemo(
    () =>
      ATRIBUICAO_DEMANDA_OPTIONS.find((o) => o.value === atribuicao)?.atosLabel ??
      "Criminal Geral",
    [atribuicao]
  );
  const sugestoes = useMemo(
    () => getAtosPorAtribuicao(atosLabel).filter((a) => a.value !== "Todos").slice(0, 8),
    [atosLabel]
  );

  const criar = trpc.demandas.createFromForm.useMutation({
    onSuccess: (data) => {
      utils.demandas.list.invalidate();
      setOpen(false);
      // Deep-link para o Kanban já na atribuição da demanda (o Kanban mostra uma
      // atribuição por vez) e destacando a recém-criada — senão ela "some" no
      // filtro quando cai numa atribuição diferente da que está aberta.
      const atrib = atribuicao;
      const novaId = (data as { id?: number } | null)?.id;
      toast.success("Demanda criada", {
        action: {
          label: "Ver no Kanban",
          onClick: () => {
            const params = new URLSearchParams();
            params.set("atribuicao", atrib);
            if (novaId) params.set("focus", String(novaId));
            window.location.href = `/admin/demandas?${params.toString()}`;
          },
        },
      });
    },
    onError: (e) => toast.error(`Erro ao criar demanda: ${e.message}`),
  });

  const atribuicaoLabel =
    ATRIBUICAO_DEMANDA_OPTIONS.find((o) => o.value === atribuicao)?.label ?? "";
  const atribuicaoCorrigida = atribuicao !== atribuicaoDefault;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        onClick={(e) => e.stopPropagation()}
        className="w-[22rem] p-3.5 rounded-xl space-y-3"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Gerar demanda
          </p>
          <p className="text-[13px] font-medium text-foreground/90 truncate">
            {assistido.nome}
          </p>
        </div>

        {/* Processo — seletor dos processos do assistido (evita CNJ errado/duplicado) */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Processo</Label>
          <Select value={processoId} onValueChange={setProcessoId} disabled={processosQuery.isLoading}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={processosQuery.isLoading ? "Carregando processos…" : "Sem processo — cria provisório"} />
            </SelectTrigger>
            <SelectContent>
              {processosAssistido.map((p) => (
                <SelectItem key={p.id} value={String(p.id)} className="text-sm">
                  <span className="font-mono text-xs">{p.numeroAutos}</span>
                  {p.assunto ? <span className="text-muted-foreground"> · {p.assunto}</span> : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!processosQuery.isLoading && processosAssistido.length === 0 && (
            <p className="text-[10.5px] text-muted-foreground">
              Assistido sem processo cadastrado — a demanda nasce com um processo provisório.
            </p>
          )}
        </div>

        {/* Atribuição — corrigível (default pela área do atendimento) */}
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Atribuição</Label>
          <Select value={atribuicao} onValueChange={setAtribuicao}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATRIBUICAO_DEMANDA_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-sm">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {atribuicaoCorrigida && (
            <p className="text-[10.5px] text-amber-600 dark:text-amber-400">
              Atribuição ajustada — a demanda entra na coluna {atribuicaoLabel}.
            </p>
          )}
        </div>

        {/* Ato — input livre + sugestões pela atribuição */}
        <div className="space-y-1">
          <Label htmlFor="gd-ato" className="text-[11px] text-muted-foreground">
            Ato a praticar
          </Label>
          <Input
            id="gd-ato"
            value={ato}
            onChange={(e) => setAto(e.target.value)}
            placeholder="Ex.: Progressão de regime"
            autoFocus
            className="h-9 text-sm"
          />
          {sugestoes.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {sugestoes.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setAto(s.label)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[11px] transition-colors cursor-pointer",
                    ato === s.label
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Prazo + flags */}
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="gd-prazo" className="text-[11px] text-muted-foreground">
              Prazo (opcional)
            </Label>
            <Input
              id="gd-prazo"
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReuPreso((v) => !v)}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer",
              reuPreso
                ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-900/20 dark:text-rose-300"
                : "border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            <Lock className="w-3.5 h-3.5" /> Réu preso
          </button>
          <button
            type="button"
            onClick={() => setUrgente((v) => !v)}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer",
              urgente
                ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/20 dark:text-amber-300"
                : "border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            )}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Urgente
          </button>
        </div>

        {/* Registro inicial — importado do atendimento, editável */}
        <div className="space-y-1">
          <Label htmlFor="gd-registro" className="text-[11px] text-muted-foreground">
            Registro inicial
            {contextoAtendimento && (
              <span className="ml-1 text-neutral-400">· importado do atendimento</span>
            )}
          </Label>
          <Textarea
            id="gd-registro"
            value={registro}
            onChange={(e) => setRegistro(e.target.value)}
            placeholder="Anotação que nasce junto com a demanda (opcional)"
            rows={3}
            className="text-sm resize-none"
          />
        </div>

        {atendimentoId && (
          <label className="flex items-center gap-2 text-[11.5px] text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={vincular}
              onChange={(e) => setVincular(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-neutral-300 dark:border-neutral-600 text-emerald-600 focus:ring-emerald-500/40 cursor-pointer"
            />
            Vincular este atendimento à demanda (timeline aparece na demanda)
          </label>
        )}

        <div className="flex items-center gap-2 pt-0.5">
          <Button
            size="sm"
            disabled={!ato.trim() || criar.isPending}
            onClick={() =>
              criar.mutate({
                assistidoNome: assistido.nome,
                assistidoId: assistido.id,
                ...(processoId
                  ? { processoId: Number(processoId) }
                  : { numeroAutos: processo?.numeroAutos ?? undefined }),
                atribuicao,
                ato: ato.trim(),
                status: urgente ? "urgente" : "triagem",
                ...(prazo ? { prazo } : {}),
                reuPreso,
                ...(registro.trim() ? { providencias: registro.trim() } : {}),
                ...(atendimentoId && vincular ? { atendimentoId } : {}),
              })
            }
            className="flex-1 gap-1.5 h-8 text-[12px] bg-emerald-600 hover:bg-emerald-700"
          >
            {criar.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ListPlus className="w-3.5 h-3.5" />
            )}
            Criar demanda
          </Button>
          <Button size="sm" variant="ghost" asChild className="h-8 text-[12px] text-muted-foreground">
            <Link href="/admin/demandas" onClick={() => setOpen(false)}>
              Kanban
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
