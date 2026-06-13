"use client";

// Sheet de gestão do atendimento — padrão visual do sheet da agenda:
// top bar escura, cartão de identidade com avatar por atribuição, seções
// colapsáveis persistentes, documentos & autos com visualizador encaixado à
// esquerda (AutosModalViewer), registros do assistido com composer rápido
// (RegistrosTimeline + RegistroEditor), anexos espelhados no Drive e footer
// de ações. Simples, funcional, sofisticado.

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CollapsibleSection } from "@/components/agenda/sheet/collapsible-section";
import { DocumentosBlock } from "@/components/agenda/sheet/documentos-block";
import { AutosModalViewer } from "@/components/agenda/sheet/autos-modal-viewer";
import { RegistrosTimeline } from "@/components/registros/registros-timeline";
import { RegistroEditor } from "@/components/registros/registro-editor";
import { AnexoDropzone } from "@/components/registros/anexos/anexo-dropzone";
import { AnexoList } from "@/components/registros/anexos/anexo-list";
import { useAnexoUpload } from "@/components/registros/anexos/use-anexo-upload";
import { SOLID_COLOR_MAP, normalizeAreaToFilter } from "@/lib/config/atribuicoes";
import {
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Check,
  Copy,
  ExternalLink,
  FolderOpen,
  ListPlus,
  Loader2,
  Pencil,
  Phone,
  Plus,
  ScrollText,
  Sparkles,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { GerarDemandaPopover } from "./gerar-demanda-popover";
import {
  AREA_CONFIG,
  STATUS_CONFIG,
  SUBTIPO_CONFIG,
  driveFolderUrl,
  pjeConsultaUrl,
  type AtendimentoListItem,
} from "./config";
import { DossieAtendimentoBlock } from "./dossie-atendimento-block";

/** Largura do sheet no desktop — o visualizador de autos encaixa à esquerda. */
const SHEET_W = "min(100vw, 760px)";

interface AtendimentoDetailSheetProps {
  atendimento: AtendimentoListItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: (item: AtendimentoListItem) => void;
  /** Abre o modal de novo atendimento pré-preenchido como retorno deste. */
  onAgendarRetorno: (item: AtendimentoListItem) => void;
}

export function AtendimentoDetailSheet({
  atendimento,
  open,
  onClose,
  onEdit,
  onAgendarRetorno,
}: AtendimentoDetailSheetProps) {
  const utils = trpc.useUtils();
  const [relato, setRelato] = useState("");
  const [mostrandoRelato, setMostrandoRelato] = useState(false);
  const [novoRegistro, setNovoRegistro] = useState(false);
  const [autosModalId, setAutosModalId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const invalidate = () => {
    utils.registros.listAtendimentos.invalidate();
    utils.registros.atendimentosKpis.invalidate();
    utils.registros.listAgendados.invalidate();
  };

  const atualizar = trpc.registros.update.useMutation({
    onSuccess: () => {
      invalidate();
      setMostrandoRelato(false);
      setRelato("");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const preparar = trpc.registros.prepararAtendimento.useMutation({
    onSuccess: () => {
      toast.success("Contexto do assistido gerado");
      invalidate();
    },
    onError: (e) => toast.error(`Erro ao preparar: ${e.message}`),
  });

  const prepararCompleto = trpc.registros.prepararAtendimentoCompleto.useMutation({
    onSuccess: (r) => toast[r.existing ? "info" : "success"](r.message),
    onError: (e) => toast.error(`Erro ao enfileirar dossiê: ${e.message}`),
  });

  const excluir = trpc.registros.delete.useMutation({
    onSuccess: () => {
      toast.success("Atendimento excluído");
      invalidate();
      onClose();
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  const { items: uploads, upload, reset: resetUploads } = useAnexoUpload(() => {
    if (atendimento) utils.registros.anexos.list.invalidate({ registroId: atendimento.id });
  });

  if (!atendimento) return null;

  const a = atendimento;
  const dt = new Date(a.dataRegistro);
  const status = STATUS_CONFIG[a.status ?? "agendado"] ?? STATUS_CONFIG.agendado;
  const subtipo = a.subtipo ? SUBTIPO_CONFIG[a.subtipo] : null;
  const area = a.area ? AREA_CONFIG[a.area] : null;
  const citados = (a.processosCitados ?? []).filter((p) => p.cnj !== a.processo?.numeroAutos);
  const dossie = a.dossieAtendimento;

  // Cor de atribuição — mesma fonte de identidade visual do sheet da agenda.
  const filterKey = normalizeAreaToFilter(
    a.processo?.atribuicao || a.processo?.area || a.area || ""
  );
  const atribColor = SOLID_COLOR_MAP[filterKey] || "#a1a1aa";
  const iniciais = (a.assistido?.nome ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const copy = (texto: string, chave: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopied(chave);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const marcarRealizado = () => {
    atualizar.mutate(
      { id: a.id, status: "realizado", ...(relato.trim() ? { conteudo: relato.trim() } : {}) },
      { onSuccess: () => toast.success("Atendimento marcado como realizado") }
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="p-0 flex flex-col gap-0 w-full max-w-none sm:max-w-none border-l-0 bg-neutral-50 dark:bg-neutral-950 shadow-2xl [&>button:first-of-type]:hidden"
        style={{ width: SHEET_W }}
      >
        <SheetTitle className="sr-only">Detalhes do atendimento</SheetTitle>

        {/* Visualizador de autos ENCAIXADO à esquerda do sheet (padrão da agenda) */}
        {autosModalId && (
          <div
            className="hidden sm:flex flex-col fixed inset-y-0 left-0 z-50 overflow-hidden bg-white dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in fade-in slide-in-from-left-6 duration-300 ease-out"
            style={{ right: SHEET_W }}
          >
            <AutosModalViewer
              driveFileId={autosModalId}
              processoId={a.processoId}
              onClose={() => setAutosModalId(null)}
            />
          </div>
        )}

        {/* Top bar escura */}
        <div className="bg-neutral-900 dark:bg-neutral-950 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
          <SheetHeader className="p-0 flex-row items-center gap-2.5">
            <span className="text-[13px] font-semibold tracking-tight">Atendimento</span>
            <span className="text-[11px] text-white/55 tabular-nums">
              {format(dt, "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
          </SheetHeader>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-neutral-800 flex items-center justify-center cursor-pointer shrink-0"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Cartão de identidade */}
          <div className="mx-3 mt-3 px-4 py-3.5 rounded-xl bg-white dark:bg-neutral-900 ring-1 ring-neutral-200/80 dark:ring-neutral-800 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${atribColor}14`,
                  boxShadow: `inset 0 0 0 1px ${atribColor}40`,
                }}
              >
                <span className="text-sm font-semibold" style={{ color: atribColor }}>
                  {iniciais}
                </span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 leading-tight truncate">
                  {a.assistido?.nome ?? "Assistido"}
                </h2>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {a.assistido?.cpf && (
                    <button
                      onClick={() => copy(a.assistido!.cpf!, "cpf")}
                      className="inline-flex items-center gap-1 px-1 -mx-1 rounded-md text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      title="Copiar CPF"
                    >
                      <span className="font-mono text-[11px] tabular-nums">{a.assistido.cpf}</span>
                      {copied === "cpf" ? (
                        <Check className="w-2.5 h-2.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 opacity-60" />
                      )}
                    </button>
                  )}
                  {a.assistido?.telefone && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
                      <Phone className="w-2.5 h-2.5" /> {a.assistido.telefone}
                    </span>
                  )}
                  {a.numeroSolar && (
                    <span className="text-[11px] text-neutral-400 font-mono" title="Nº SOLAR">
                      SOLAR {a.numeroSolar}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${status.badge}`}>
                    {status.label}
                  </span>
                  {subtipo && (
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${subtipo.badge}`}>
                      {subtipo.label}
                    </span>
                  )}
                  {area && (
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${area.badge}`}>
                      {area.label}
                    </span>
                  )}
                  {a.assistido?.driveFolderId && (
                    <a
                      href={driveFolderUrl(a.assistido.driveFolderId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-3 h-3" /> Drive
                    </a>
                  )}
                </div>
                {(a.pedido || a.local) && (
                  <p className="text-[10.5px] text-neutral-500 dark:text-neutral-400 mt-1.5">
                    {[a.pedido, a.local].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>

            {a.assunto && (
              <p className="mt-3 text-[13px] text-neutral-600 dark:text-neutral-300 border-l-2 pl-3 leading-relaxed" style={{ borderColor: `${atribColor}66` }}>
                {a.assunto}
              </p>
            )}

            {/* Ações de preparação */}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => preparar.mutate({ id: a.id })}
                disabled={preparar.isPending}
                className="h-7 gap-1.5 text-[11px] text-neutral-600 dark:text-neutral-300"
              >
                {preparar.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {dossie ? "Atualizar contexto" : "Preparar atendimento"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => prepararCompleto.mutate({ id: a.id })}
                disabled={prepararCompleto.isPending}
                className="h-7 gap-1.5 text-[11px] text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                title="Worker local lê os autos no PJe e grava o dossiê completo"
              >
                {prepararCompleto.isPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ScrollText className="w-3 h-3" />
                )}
                Dossiê dos autos
              </Button>
            </div>
          </div>

          <div className="px-3 py-3 space-y-2.5">
            {/* Próximos passos — fecha o ciclo (agenda + Kanban) */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAgendarRetorno(a)}
                className="flex-1 h-9 gap-1.5 text-[12px]"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Agendar retorno
              </Button>
              {a.assistido && (
                <GerarDemandaPopover
                  assistido={{ id: a.assistido.id, nome: a.assistido.nome }}
                  processo={a.processo ? { numeroAutos: a.processo.numeroAutos } : null}
                  area={a.area}
                >
                  <Button size="sm" variant="outline" className="flex-1 h-9 gap-1.5 text-[12px]">
                    <ListPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Gerar demanda
                  </Button>
                </GerarDemandaPopover>
              )}
            </div>

            {/* Preparação */}
            <CollapsibleSection
              id="atd-preparacao"
              label="Preparação"
              count={dossie?.alertas?.length}
              defaultOpen={!!dossie}
            >
              {dossie ? (
                <DossieAtendimentoBlock dossie={dossie} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Gere o contexto do assistido (processos, audiências, demandas, medidas
                  vigentes e histórico) com o botão acima — ou rode{" "}
                  <span className="font-mono">/preparar-atendimentos</span> para o dossiê
                  completo com leitura dos autos.
                </p>
              )}
            </CollapsibleSection>

            {/* Processos */}
            {(a.processo || citados.length > 0) && (
              <CollapsibleSection
                id="atd-processos"
                label="Processos"
                count={(a.processo ? 1 : 0) + citados.length}
                defaultOpen
              >
                <div className="space-y-1.5">
                  {a.processo?.numeroAutos && (
                    <ProcessoLinha
                      cnj={a.processo.numeroAutos}
                      onCopy={() => copy(a.processo!.numeroAutos!, a.processo!.numeroAutos!)}
                      copied={copied === a.processo.numeroAutos}
                      descricao={`Vinculado · ${
                        (a.processo.area && AREA_CONFIG[a.processo.area]?.label) ||
                        a.processo.area ||
                        ""
                      }`}
                      vinculado
                    />
                  )}
                  {citados.map((p) => (
                    <ProcessoLinha
                      key={p.cnj}
                      cnj={p.cnj}
                      onCopy={() => copy(p.cnj, p.cnj)}
                      copied={copied === p.cnj}
                      descricao={
                        p.processoId
                          ? "Citado nas anotações · cadastrado no OMBUDS"
                          : "Citado nas anotações · não cadastrado no OMBUDS"
                      }
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Documentos & autos (Drive do processo + do assistido, viewer encaixado) */}
            <CollapsibleSection id="atd-documentos" label="Documentos & autos">
              <DocumentosBlock
                processoId={a.processoId}
                assistidoId={a.assistidoId}
                onExpandLeft={(fileDriveId) => setAutosModalId(fileDriveId)}
              />
            </CollapsibleSection>

            {/* Registros — gestão do caso a partir do atendimento */}
            <CollapsibleSection id="atd-registros" label="Registros" defaultOpen>
              <div className="space-y-3">
                {novoRegistro ? (
                  <RegistroEditor
                    assistidoId={a.assistidoId}
                    processoId={a.processoId ?? undefined}
                    tipoDefault="anotacao"
                    tiposPrimarios={["anotacao", "providencia", "diligencia", "peticao"]}
                    onSaved={() => {
                      setNovoRegistro(false);
                      utils.registros.list.invalidate();
                    }}
                    onCancel={() => setNovoRegistro(false)}
                  />
                ) : (
                  <button
                    onClick={() => setNovoRegistro(true)}
                    className="w-full flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Registrar anotação, providência, diligência…
                  </button>
                )}
                <RegistrosTimeline
                  assistidoId={a.assistidoId}
                  emptyHint="Sem registros para este assistido ainda — o que for colhido no atendimento entra aqui."
                />
              </div>
            </CollapsibleSection>

            {/* Recepção & histórico SOLAR */}
            {(a.anotacoesRecepcao || (a.historicoSolar && a.historicoSolar.length > 0)) && (
              <CollapsibleSection
                id="atd-recepcao"
                label="Recepção & histórico SOLAR"
                count={a.historicoSolar?.length}
                defaultOpen={!!a.anotacoesRecepcao && a.status === "agendado"}
              >
                <div className="space-y-3">
                  {a.anotacoesRecepcao && (
                    <p className="text-sm text-foreground/85 whitespace-pre-wrap rounded-lg bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-900/30 px-3 py-2">
                      {a.anotacoesRecepcao}
                    </p>
                  )}
                  {a.historicoSolar && a.historicoSolar.length > 0 && (
                    <div className="space-y-2 border-l-2 border-neutral-200 dark:border-neutral-800 pl-3">
                      {a.historicoSolar.map((h, i) => (
                        <div key={i} className="text-sm">
                          <p className="text-[11px] text-muted-foreground">
                            {h.data}
                            {h.numero && <span className="ml-1.5 font-mono">· {h.numero}</span>}
                          </p>
                          <p className="text-foreground/85 whitespace-pre-wrap">{h.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Relato do atendimento */}
            {a.conteudo && (
              <CollapsibleSection id="atd-relato" label="Relato do atendimento" defaultOpen>
                <p className="text-sm text-foreground/85 whitespace-pre-wrap">{a.conteudo}</p>
              </CollapsibleSection>
            )}

            {/* Anexos do atendimento */}
            <CollapsibleSection id="atd-anexos" label="Anexos do atendimento">
              <AnexoDropzone
                onFiles={(files) => {
                  resetUploads();
                  upload(a.id, files);
                }}
                className="rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 p-3"
                dragHint="Solte para anexar"
              >
                <div className="space-y-2">
                  <AnexoList registroId={a.id} />
                  {uploads.map((u, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      {u.status === "erro" ? (
                        <XCircle className="w-3 h-3 text-rose-500" />
                      ) : u.status === "ok" ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      )}
                      {u.name}
                      {u.error && <span className="text-rose-500">— {u.error}</span>}
                    </p>
                  ))}
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer">
                    <Upload className="w-3 h-3" />
                    Anexar fotos ou documentos
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length) {
                          resetUploads();
                          upload(a.id, files);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <p className="text-[10px] text-muted-foreground">
                    Espelhado automaticamente na pasta do assistido no Drive (subpasta Registros).
                  </p>
                </div>
              </AnexoDropzone>
            </CollapsibleSection>
          </div>
        </div>

        {/* Composer de realização — aparece acima do footer */}
        {mostrandoRelato && (
          <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-3 space-y-2">
            <Textarea
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              placeholder="Relato do atendimento — o que o assistido trouxe, orientações dadas, providências"
              rows={4}
              autoFocus
              className="text-sm"
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setMostrandoRelato(false)}>
                Voltar
              </Button>
              <Button
                size="sm"
                onClick={marcarRealizado}
                disabled={atualizar.isPending}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                {atualizar.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CalendarCheck className="w-3.5 h-3.5" />
                )}
                Confirmar realização
              </Button>
            </div>
          </div>
        )}

        {/* Footer de ações */}
        <div className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2.5 flex items-center gap-1.5 flex-wrap">
          {a.status === "agendado" && !mostrandoRelato && (
            <>
              <Button
                size="sm"
                onClick={() => setMostrandoRelato(true)}
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-[12px]"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                Marcar realizado
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  atualizar.mutate(
                    { id: a.id, status: "cancelado" },
                    { onSuccess: () => toast.success("Atendimento cancelado") }
                  )
                }
                disabled={atualizar.isPending}
                className="h-8 gap-1.5 text-[12px] text-neutral-500"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancelar
              </Button>
            </>
          )}
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={() => onEdit(a)} className="h-8 gap-1.5 text-[12px] text-neutral-500">
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Button>
          <Button size="sm" variant="ghost" asChild className="h-8 gap-1.5 text-[12px] text-neutral-500">
            <Link href={`/admin/agenda?date=${format(dt, "yyyy-MM-dd")}`}>
              <Calendar className="w-3.5 h-3.5" />
              Agenda
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm("Excluir este atendimento? Esta ação não pode ser desfeita.")) {
                excluir.mutate({ id: a.id });
              }
            }}
            disabled={excluir.isPending}
            className="h-8 gap-1.5 text-[12px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProcessoLinha({
  cnj,
  descricao,
  vinculado,
  onCopy,
  copied,
}: {
  cnj: string;
  descricao: string;
  vinculado?: boolean;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border px-3 py-2",
        vinculado
          ? "border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/10"
          : "border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40"
      )}
    >
      <div className="min-w-0">
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 font-mono text-xs text-foreground/90 hover:text-foreground transition-colors cursor-pointer"
          title="Copiar número"
        >
          <span className="truncate">{cnj}</span>
          {copied ? (
            <Check className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
          ) : (
            <Copy className="w-2.5 h-2.5 opacity-50 shrink-0" />
          )}
        </button>
        <p className="text-[11px] text-muted-foreground">{descricao}</p>
      </div>
      <a
        href={pjeConsultaUrl(cnj)}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-1 text-[11px] text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
      >
        PJe <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
