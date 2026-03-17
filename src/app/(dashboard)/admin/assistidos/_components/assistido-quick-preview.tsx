"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Phone,
  MessageCircle,
  Scale,
  FileText,
  Calendar,
  Clock,
  Timer,
  Lock,
  AlertCircle,
  CircleDot,
  User,
  Copy,
  Info,
  HardDrive,
  Link2Off,
  ExternalLink,
  Plus,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import { toast } from "sonner";
import {
  ATRIBUICAO_OPTIONS,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";
import type { AssistidoUI } from "./assistido-types";
import { statusConfig, faseConfig } from "./assistido-config";
import { getPrazoInfo, calcularIdade, calcularTempoPreso } from "./assistido-utils";

export interface AssistidoQuickPreviewProps {
  assistido: AssistidoUI | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

export function AssistidoQuickPreview({
  assistido,
  onClose,
  onNext,
  onPrev,
  currentIndex,
  totalCount,
}: AssistidoQuickPreviewProps) {
  // Keyboard navigation — must be before any early return (React Hooks rules)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!assistido) return;
      if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); onPrev?.(); }
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); onNext?.(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [assistido, onPrev, onNext]);

  if (!assistido) return null;

  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const isMonitorado = ["MONITORADO", "DOMICILIAR"].includes(assistido.statusPrisional);
  const idade = calcularIdade(assistido.dataNascimento);
  const tempoPreso = calcularTempoPreso(assistido.dataPrisao ?? null);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const prazoVencido = prazoInfo && prazoInfo.text === "Vencido";
  const telefoneDisplay = assistido.telefone || assistido.telefoneContato;
  const whatsappUrl = telefoneDisplay
    ? `https://wa.me/55${telefoneDisplay.replace(/\D/g, '')}`
    : null;

  const diasAteAudiencia = assistido.proximaAudiencia
    ? differenceInDays(parseISO(assistido.proximaAudiencia), new Date())
    : null;
  const audienciaHoje = diasAteAudiencia === 0;

  const atribuicoesUnicas = assistido.atribuicoes || assistido.areas || [];
  const primaryAttrValue = atribuicoesUnicas.length > 0
    ? (() => {
        const normalizedAttr = atribuicoesUnicas[0].toUpperCase().replace(/_/g, ' ');
        const option = ATRIBUICAO_OPTIONS.find(o =>
          o.value.toUpperCase() === normalizedAttr ||
          o.label.toUpperCase().includes(normalizedAttr) ||
          normalizedAttr.includes(o.value.toUpperCase())
        );
        return option?.value || null;
      })()
    : null;
  const primaryColor = primaryAttrValue ? SOLID_COLOR_MAP[primaryAttrValue] || '#6b7280' : '#6b7280';

  const maskedCpf = assistido.cpf
    ? assistido.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')
    : null;

  const audienciaAmanha = diasAteAudiencia === 1;

  return (
    <Sheet open={!!assistido} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[calc(100vw-2rem)] sm:w-[460px] md:w-[500px] p-0 flex flex-col gap-0 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl"
        style={{ borderLeft: `3px solid ${primaryColor}` }}
      >
        {/* Sticky Header — Compact navigation bar */}
        <SheetHeader className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 tracking-wider uppercase">
                {currentIndex !== undefined && totalCount ? `${currentIndex + 1} / ${totalCount}` : 'Assistido'}
              </SheetTitle>
              <span className="text-[10px] text-zinc-300 dark:text-zinc-600">|</span>
              <span className="text-[10px] text-zinc-300 dark:text-zinc-600">&uarr;&darr; navegar</span>
            </div>
            <div className="flex items-center gap-0.5">
              {onPrev && (
                <button
                  onClick={onPrev}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                  title="Anterior (↑)"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}
              {onNext && (
                <button
                  onClick={onNext}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                  title="Proximo (↓)"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto">
          {/* 1. Hero Section — Gradient background */}
          <div className="relative px-5 py-5 border-b border-zinc-100 dark:border-zinc-800 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, transparent 60%)` }}
            />
            <div className="relative flex items-start gap-4">
              <AssistidoAvatar
                nome={assistido.nome}
                photoUrl={assistido.photoUrl}
                size="xl"
                atribuicao={primaryAttrValue}
                statusPrisional={assistido.statusPrisional}
                showStatusDot
              />
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-50 leading-tight">
                  {assistido.nome}
                </h2>
                {assistido.vulgo && (
                  <p className="text-xs text-zinc-400 italic mt-0.5">&ldquo;{assistido.vulgo}&rdquo;</p>
                )}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                    isPreso && "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400",
                    isMonitorado && "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
                    !isPreso && !isMonitorado && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isPreso && "bg-rose-500",
                      isMonitorado && "bg-amber-500",
                      !isPreso && !isMonitorado && "bg-emerald-500",
                    )} />
                    {statusConfig[assistido.statusPrisional]?.label || "Solto"}
                  </span>
                  {atribuicoesUnicas.slice(0, 3).map((attr, idx) => {
                    const normalizedAttr = attr.toUpperCase().replace(/_/g, ' ');
                    const option = ATRIBUICAO_OPTIONS.find(o =>
                      o.value.toUpperCase() === normalizedAttr ||
                      o.label.toUpperCase().includes(normalizedAttr) ||
                      normalizedAttr.includes(o.value.toUpperCase())
                    );
                    const color = option ? SOLID_COLOR_MAP[option.value] || '#6b7280' : '#6b7280';
                    return (
                      <span key={idx} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                        {option?.shortLabel || attr.substring(0, 4)}
                      </span>
                    );
                  })}
                  {idade && <span className="text-[10px] text-zinc-400">{idade}a</span>}
                  {isPreso && tempoPreso && <span className="text-[10px] text-rose-400 font-mono tabular-nums">{tempoPreso}</span>}
                </div>
                {/* Contato rapido inline */}
                {telefoneDisplay && (
                  <div className="flex items-center gap-2 mt-2">
                    <Phone className="w-3 h-3 text-zinc-400" />
                    <span className="text-xs text-zinc-500">{telefoneDisplay}</span>
                    {whatsappUrl && (
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-medium transition-colors">
                        <MessageCircle className="w-3 h-3" />
                        Zap
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Alertas urgentes (empilhados, compactos) */}
          {(isPreso || audienciaHoje || prazoVencido) && (
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 space-y-2">
              {isPreso && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/30">
                  <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Preso</span>
                    {assistido.unidadePrisional && <span className="text-[10px] text-rose-500 ml-2">{assistido.unidadePrisional}</span>}
                  </div>
                  {tempoPreso && <span className="text-[10px] text-rose-500 font-mono tabular-nums shrink-0">{tempoPreso}</span>}
                </div>
              )}
              {audienciaHoje && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/30">
                  <Calendar className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Audiencia HOJE</span>
                  {assistido.proximaAudiencia && <span className="text-xs text-amber-500 font-mono ml-auto">{format(parseISO(assistido.proximaAudiencia), "HH:mm")}</span>}
                </div>
              )}
              {prazoVencido && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/30">
                  <AlertCircle className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Prazo VENCIDO</span>
                  {assistido.atoProximoPrazo && <span className="text-[10px] text-rose-500 ml-auto truncate max-w-[120px]">{assistido.atoProximoPrazo}</span>}
                </div>
              )}
            </div>
          )}

          {/* 3. Stats + Quick Actions Row */}
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Scale, label: "Processos", value: assistido.processosAtivos || 0, href: `/admin/processos?assistido=${assistido.id}` },
                { icon: FileText, label: "Demandas", value: assistido.demandasAbertas || 0, href: `/admin/demandas?assistido=${assistido.id}` },
                { icon: HardDrive, label: "Arquivos", value: assistido.driveFilesCount || 0, href: assistido.driveFolderId ? `https://drive.google.com/drive/folders/${assistido.driveFolderId}` : `/admin/drive?assistido=${assistido.id}` },
                { icon: Calendar, label: "Agenda", value: assistido.proximaAudiencia ? 1 : 0, href: `/admin/audiencias?assistido=${assistido.id}` },
              ].map((stat) => {
                const Icon = stat.icon;
                const isExternal = stat.href.startsWith('http');
                const Wrapper = isExternal ? 'a' : Link;
                const wrapperProps = isExternal ? { href: stat.href, target: "_blank", rel: "noopener noreferrer" } : { href: stat.href };
                return (
                  <Wrapper key={stat.label} {...wrapperProps as any} className="flex flex-col items-center gap-0.5 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 hover:border-emerald-200/50 dark:hover:border-emerald-800/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-all cursor-pointer group">
                    <Icon className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                    <span className="text-base font-bold text-zinc-800 dark:text-zinc-100 tabular-nums">{stat.value}</span>
                    <span className="text-[10px] text-zinc-400">{stat.label}</span>
                  </Wrapper>
                );
              })}
            </div>
          </div>

          {/* 4. Timeline — Mini timeline with all events */}
          {(assistido.proximaAudiencia || assistido.proximoPrazo || assistido.ultimoEvento) && (
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3 font-medium flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Timeline
              </p>
              <div className="relative pl-4 space-y-3 border-l-2 border-zinc-200 dark:border-zinc-700">
                {/* Proxima audiencia */}
                {assistido.proximaAudiencia && (
                  <div className="relative">
                    <div className={cn(
                      "absolute -left-[9px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center",
                      audienciaHoje ? "bg-amber-500" : audienciaAmanha ? "bg-blue-500" : "bg-violet-500"
                    )}>
                      <Calendar className="w-2 h-2 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className={cn(
                        "text-xs font-semibold",
                        audienciaHoje && "text-amber-600 dark:text-amber-400",
                        audienciaAmanha && "text-blue-600 dark:text-blue-400",
                        !audienciaHoje && !audienciaAmanha && "text-violet-600 dark:text-violet-400"
                      )}>
                        {audienciaHoje ? "HOJE" : audienciaAmanha ? "Amanha" : format(parseISO(assistido.proximaAudiencia), "dd/MM/yyyy")}
                        <span className="font-mono ml-1.5">{format(parseISO(assistido.proximaAudiencia), "HH:mm")}</span>
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {assistido.tipoProximaAudiencia || "Audiencia"} {diasAteAudiencia !== null && diasAteAudiencia > 0 ? `em ${diasAteAudiencia}d` : ''}
                      </p>
                    </div>
                  </div>
                )}
                {/* Proximo prazo */}
                {assistido.proximoPrazo && (
                  <div className="relative">
                    <div className={cn(
                      "absolute -left-[9px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center",
                      prazoVencido ? "bg-rose-500" : "bg-sky-500"
                    )}>
                      <Timer className="w-2 h-2 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className={cn(
                        "text-xs font-semibold",
                        prazoVencido ? "text-rose-600 dark:text-rose-400" : "text-sky-600 dark:text-sky-400"
                      )}>
                        {prazoInfo?.text || format(parseISO(assistido.proximoPrazo), "dd/MM/yyyy")}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {assistido.atoProximoPrazo || "Prazo"}
                      </p>
                    </div>
                  </div>
                )}
                {/* Ultimo evento */}
                {assistido.ultimoEvento && (
                  <div className="relative">
                    <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-zinc-400 flex items-center justify-center">
                      <CircleDot className="w-2 h-2 text-white" />
                    </div>
                    <div className="ml-3">
                      <p className="text-xs text-zinc-500">
                        {assistido.ultimoEvento.data ? format(parseISO(assistido.ultimoEvento.data), "dd/MM/yyyy") : ""}
                      </p>
                      <p className="text-[10px] text-zinc-400">{assistido.ultimoEvento.titulo}</p>
                    </div>
                  </div>
                )}
                {/* Cadastro */}
                <div className="relative">
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center">
                    <User className="w-2 h-2 text-white" />
                  </div>
                  <div className="ml-3">
                    <p className="text-[10px] text-zinc-400">
                      Cadastro: {format(new Date(assistido.createdAt), "dd/MM/yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. Crime / Processo */}
          {(assistido.crimePrincipal || assistido.numeroProcesso) && (
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3 font-medium flex items-center gap-1.5">
                <Scale className="w-3 h-3" />
                Crime / Processo
              </p>
              {assistido.crimePrincipal && (
                <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">{assistido.crimePrincipal}</p>
              )}
              {assistido.numeroProcesso && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <span className="font-mono tabular-nums text-xs text-zinc-600 dark:text-zinc-400 flex-1">{assistido.numeroProcesso}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(assistido.numeroProcesso!); toast.success("Copiado!"); }}
                    className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Copy className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              )}
              {assistido.faseProcessual && (
                <p className="text-[10px] text-zinc-400 mt-2">
                  Fase: <span className="text-zinc-600 dark:text-zinc-300 font-medium">{faseConfig[assistido.faseProcessual]?.label || assistido.faseProcessual}</span>
                </p>
              )}
            </div>
          )}

          {/* 6. Dados Pessoais — Compact grid */}
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3 font-medium flex items-center gap-1.5">
              <User className="w-3 h-3" />
              Dados Pessoais
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {[
                { label: "CPF", value: maskedCpf, mono: true },
                { label: "RG", value: assistido.rg },
                { label: "Nascimento", value: assistido.dataNascimento ? format(parseISO(assistido.dataNascimento), "dd/MM/yyyy") : null },
                { label: "Naturalidade", value: assistido.naturalidade },
                { label: "Nome da Mae", value: assistido.nomeMae },
              ].filter(item => item.value).map((item) => (
                <div key={item.label}>
                  <p className="text-[10px] text-zinc-400">{item.label}</p>
                  <p className={cn("text-xs font-medium text-zinc-700 dark:text-zinc-300", item.mono && "font-mono tabular-nums")}>{item.value}</p>
                </div>
              ))}
              {assistido.endereco && (
                <div className="col-span-2">
                  <p className="text-[10px] text-zinc-400">Endereco</p>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300">{assistido.endereco}</p>
                </div>
              )}
            </div>
          </div>

          {/* 7. Observacoes */}
          {assistido.observacoes && (
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2 font-medium flex items-center gap-1.5">
                <Info className="w-3 h-3" />
                Observacoes
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-zinc-100 dark:border-zinc-800">
                {assistido.observacoes}
              </p>
            </div>
          )}

          {/* 8. Drive */}
          <div className="px-5 py-4">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3 font-medium flex items-center gap-1.5">
              <HardDrive className="w-3 h-3" />
              Google Drive
            </p>
            {assistido.driveFolderId ? (
              <a
                href={`https://drive.google.com/drive/folders/${assistido.driveFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
              >
                <HardDrive className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Abrir pasta no Drive</p>
                  {(assistido.driveFilesCount ?? 0) > 0 && (
                    <p className="text-[10px] text-emerald-500">{assistido.driveFilesCount} arquivo{(assistido.driveFilesCount ?? 0) > 1 ? 's' : ''}</p>
                  )}
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </a>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <Link2Off className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Sem pasta vinculada</p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer — Premium action bar */}
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Link href={`/admin/assistidos/${assistido.id}`} className="flex-1">
              <Button className="w-full h-9 bg-zinc-900 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow-md">
                Abrir Perfil
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href={`/admin/processos?assistido=${assistido.id}`}>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-700 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all" title="Processos">
                <Scale className="w-4 h-4" />
              </Button>
            </Link>
            <Link href={`/admin/demandas/nova?assistido=${assistido.id}`}>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-700 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all" title="Nova Demanda">
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-emerald-200 dark:border-emerald-800/50 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all" title="WhatsApp">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </a>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
