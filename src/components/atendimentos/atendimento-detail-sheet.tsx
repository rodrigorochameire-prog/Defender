"use client";

// Sheet de detalhe do atendimento — dados SOLAR completos, dossiê de
// preparação, processos (vinculado + citados, com link para a consulta
// pública do PJe), anotações da recepção, histórico, anexos com espelho na
// pasta do assistido no Drive e ações de fluxo (preparar, realizar,
// cancelar, editar, excluir).

import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AnexoDropzone } from "@/components/registros/anexos/anexo-dropzone";
import { AnexoList } from "@/components/registros/anexos/anexo-list";
import { useAnexoUpload } from "@/components/registros/anexos/use-anexo-upload";
import {
  Calendar,
  CalendarCheck,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  Loader2,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  ScrollText,
  Sparkles,
  Trash2,
  Upload,
  User,
  XCircle,
} from "lucide-react";
import {
  AREA_CONFIG,
  STATUS_CONFIG,
  SUBTIPO_CONFIG,
  driveFolderUrl,
  pjeConsultaUrl,
  type AtendimentoListItem,
} from "./config";
import { DossieAtendimentoBlock } from "./dossie-atendimento-block";

interface AtendimentoDetailSheetProps {
  atendimento: AtendimentoListItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: (item: AtendimentoListItem) => void;
}

export function AtendimentoDetailSheet({
  atendimento,
  open,
  onClose,
  onEdit,
}: AtendimentoDetailSheetProps) {
  const utils = trpc.useUtils();
  const [relato, setRelato] = useState("");
  const [mostrandoRelato, setMostrandoRelato] = useState(false);

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
      toast.success("Dossiê de contexto gerado");
      invalidate();
    },
    onError: (e) => toast.error(`Erro ao preparar: ${e.message}`),
  });

  const prepararCompleto = trpc.registros.prepararAtendimentoCompleto.useMutation({
    onSuccess: (r) => {
      toast[r.existing ? "info" : "success"](r.message);
    },
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
  const citados = (a.processosCitados ?? []).filter(
    (p) => p.cnj !== a.processo?.numeroAutos
  );

  const marcarRealizado = () => {
    atualizar.mutate(
      {
        id: a.id,
        status: "realizado",
        ...(relato.trim() ? { conteudo: relato.trim() } : {}),
      },
      { onSuccess: () => toast.success("Atendimento marcado como realizado") }
    );
  };

  const cancelar = () => {
    atualizar.mutate(
      { id: a.id, status: "cancelado" },
      { onSuccess: () => toast.success("Atendimento cancelado") }
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-start gap-2 text-left">
            <User className="w-4 h-4 mt-1 shrink-0 text-neutral-400" />
            <span>{a.assistido?.nome ?? "Assistido"}</span>
          </SheetTitle>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${status.badge}`}>
              {status.label}
            </span>
            {subtipo && (
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${subtipo.badge}`}>
                {subtipo.label}
              </span>
            )}
            {area && (
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${area.badge}`}>
                {area.label}
              </span>
            )}
            {a.assistido?.driveFolderId && (
              <a
                href={driveFolderUrl(a.assistido.driveFolderId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3 h-3" /> Drive
              </a>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-5 py-4">
          {/* Dados gerais */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <InfoLinha icone={Calendar} rotulo="Data e horário">
              {format(dt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </InfoLinha>
            {a.local && (
              <InfoLinha icone={MapPin} rotulo="Local">{a.local}</InfoLinha>
            )}
            {a.numeroSolar && (
              <InfoLinha icone={FileText} rotulo="Nº SOLAR">
                <span className="font-mono">{a.numeroSolar}</span>
              </InfoLinha>
            )}
            {a.pedido && (
              <InfoLinha icone={ScrollText} rotulo="Pedido">{a.pedido}</InfoLinha>
            )}
            {a.assistido?.cpf && (
              <InfoLinha icone={User} rotulo="CPF">
                <span className="font-mono">{a.assistido.cpf}</span>
              </InfoLinha>
            )}
            {a.assistido?.telefone && (
              <InfoLinha icone={Phone} rotulo="Telefone">
                <span className="font-mono">{a.assistido.telefone}</span>
              </InfoLinha>
            )}
          </div>

          {a.assunto && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Assunto
              </h4>
              <p className="text-sm text-foreground/85">{a.assunto}</p>
            </div>
          )}

          {/* Dossiê de preparação */}
          <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Preparação do atendimento
              </h4>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => preparar.mutate({ id: a.id })}
                  disabled={preparar.isPending}
                  className="h-7 gap-1.5 text-[11px]"
                >
                  {preparar.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {a.dossieAtendimento ? "Atualizar contexto" : "Preparar atendimento"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => prepararCompleto.mutate({ id: a.id })}
                  disabled={prepararCompleto.isPending}
                  className="h-7 gap-1.5 text-[11px] text-violet-600 dark:text-violet-400 border-violet-300/60 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20"
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
            {a.dossieAtendimento ? (
              <DossieAtendimentoBlock dossie={a.dossieAtendimento} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Gere o contexto do assistido (processos, audiências, demandas, medidas
                vigentes e histórico) antes do atendimento. Para o dossiê completo com
                leitura dos autos, rode <span className="font-mono">/preparar-atendimentos</span> no
                Claude Code.
              </p>
            )}
          </div>

          {/* Processos */}
          {(a.processo || citados.length > 0) && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Processos
              </h4>
              {a.processo?.numeroAutos && (
                <ProcessoLinha
                  cnj={a.processo.numeroAutos}
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
                  descricao={
                    p.processoId
                      ? "Citado nas anotações · cadastrado no OMBUDS"
                      : "Citado nas anotações · não cadastrado no OMBUDS"
                  }
                />
              ))}
            </div>
          )}

          {/* Anotações da recepção */}
          {a.anotacoesRecepcao && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Anotações da recepção
              </h4>
              <p className="text-sm text-foreground/85 whitespace-pre-wrap rounded-lg bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-900/30 px-3 py-2">
                {a.anotacoesRecepcao}
              </p>
            </div>
          )}

          {/* Histórico SOLAR */}
          {a.historicoSolar && a.historicoSolar.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <History className="w-3 h-3" /> Histórico SOLAR
              </h4>
              <div className="space-y-2 border-l-2 border-neutral-200 dark:border-neutral-800 pl-3">
                {a.historicoSolar.map((h, i) => (
                  <div key={i} className="text-sm">
                    <p className="text-[11px] text-muted-foreground">
                      {h.data}
                      {h.numero && (
                        <span className="ml-1.5 font-mono">· {h.numero}</span>
                      )}
                    </p>
                    <p className="text-foreground/85 whitespace-pre-wrap">{h.texto}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relato do atendimento (conteúdo) */}
          {a.conteudo && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Relato do atendimento
              </h4>
              <p className="text-sm text-foreground/85 whitespace-pre-wrap">{a.conteudo}</p>
            </div>
          )}

          {/* Anexos — documentos do assistido (espelhados na pasta do Drive) */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <Paperclip className="w-3 h-3" /> Documentos do atendimento
            </h4>
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
                      <CalendarCheck className="w-3 h-3 text-emerald-500" />
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
          </div>

          <Separator />

          {/* Ações */}
          {a.status === "agendado" && (
            <div className="space-y-2">
              {mostrandoRelato ? (
                <div className="space-y-2">
                  <Textarea
                    value={relato}
                    onChange={(e) => setRelato(e.target.value)}
                    placeholder="Relato do atendimento (opcional)"
                    rows={4}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMostrandoRelato(false)}
                    >
                      Voltar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => setMostrandoRelato(true)}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    Marcar realizado
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelar}
                    disabled={atualizar.isPending}
                    className="gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancelar atendimento
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(a)} className="gap-1.5">
              <Pencil className="w-3.5 h-3.5" />
              Editar / Reagendar
            </Button>
            <Button size="sm" variant="outline" asChild className="gap-1.5">
              <Link href={`/admin/agenda?date=${format(dt, "yyyy-MM-dd")}`}>
                <Calendar className="w-3.5 h-3.5" />
                Ver na agenda
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
              className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InfoLinha({
  icone: Icone,
  rotulo,
  children,
}: {
  icone: React.ElementType;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Icone className="w-3 h-3" /> {rotulo}
      </p>
      <p className="text-sm text-foreground/90">{children}</p>
    </div>
  );
}

function ProcessoLinha({
  cnj,
  descricao,
  vinculado,
}: {
  cnj: string;
  descricao: string;
  vinculado?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${
        vinculado
          ? "border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-900/10"
          : "border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40"
      }`}
    >
      <div className="min-w-0">
        <p className="font-mono text-xs text-foreground/90 truncate">{cnj}</p>
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
