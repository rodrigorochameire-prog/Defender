"use client";

import React, { useState, Fragment } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Eye,
  Plus,
  Scale,
  FileText,
  MessageCircle,
  AlertCircle,
  Calendar,
  Phone,
  Bookmark,
  BookmarkCheck,
  Circle,
  Copy,
  CheckCircle2,
  ArrowUpDown,
  FolderOpen,
  HardDrive,
  Link2Off,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import {
  ATRIBUICAO_OPTIONS,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";
import type { AssistidoUI } from "./assistido-types";
import { statusConfig } from "./assistido-config";
import { getPrazoInfo, calcularTempoPreso } from "./assistido-utils";

export interface AssistidoTableViewProps {
  assistidos: AssistidoUI[];
  pinnedIds: Set<number>;
  onPhotoClick: (a: AssistidoUI) => void;
  onTogglePin: (id: number) => void;
  sortBy: string;
  onSortChange: (col: string) => void;
  onPreview?: (a: AssistidoUI) => void;
}

export function AssistidoTableView({
  assistidos,
  pinnedIds,
  onPhotoClick,
  onTogglePin,
  sortBy,
  onSortChange,
  onPreview,
}: AssistidoTableViewProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleCopyProcesso = (id: number, processo: string) => {
    navigator.clipboard.writeText(processo);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sortableHeaders: { id: string; label: string; className?: string }[] = [
    { id: "nome", label: "Nome" },
    { id: "prioridade", label: "Status" },
    { id: "", label: "Atribuicao" },
    { id: "", label: "Crime" },
    { id: "", label: "Processo" },
    { id: "prazo", label: "Audiencia / Prazo" },
    { id: "", label: "Drive" },
    { id: "", label: "Acoes" },
  ];

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-50/95 dark:bg-zinc-800/95 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
          <tr>
            {sortableHeaders.map((col) => (
              <th
                key={col.label}
                className={cn(
                  "px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500",
                  col.id && "cursor-pointer select-none hover:bg-zinc-100 dark:hover:bg-zinc-800",
                  col.className,
                )}
                onClick={() => col.id && onSortChange(col.id)}
              >
                <div className="flex items-center gap-1.5">
                  {col.label}
                  {col.id && sortBy === col.id && (
                    <ArrowUpDown className="w-3 h-3 text-emerald-500" />
                  )}
                  {col.id && sortBy !== col.id && (
                    <ArrowUpDown className="w-3 h-3 text-zinc-300 dark:text-zinc-600" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {assistidos.map((assistido, index) => {
            const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
            const isMonitorado = ["MONITORADO", "DOMICILIAR"].includes(assistido.statusPrisional);
            const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
            const prazoVencido = prazoInfo && prazoInfo.text === "Vencido";
            const tempoPreso = calcularTempoPreso(assistido.dataPrisao ?? null);
            const statusCfg = statusConfig[assistido.statusPrisional];
            const isPinned = pinnedIds.has(assistido.id);

            const diasAteAudiencia = assistido.proximaAudiencia
              ? differenceInDays(parseISO(assistido.proximaAudiencia), new Date())
              : null;
            const audienciaHoje = diasAteAudiencia === 0;
            const audienciaAmanha = diasAteAudiencia === 1;

            const atribuicoesUnicas = assistido.atribuicoes || assistido.areas || [];
            const primaryAttrOption = atribuicoesUnicas.length > 0
              ? (() => {
                  const normalizedAttr = atribuicoesUnicas[0].toUpperCase().replace(/_/g, ' ');
                  return ATRIBUICAO_OPTIONS.find(o =>
                    o.value.toUpperCase() === normalizedAttr ||
                    o.label.toUpperCase().includes(normalizedAttr) ||
                    normalizedAttr.includes(o.value.toUpperCase())
                  );
                })()
              : null;
            const primaryColor = primaryAttrOption ? SOLID_COLOR_MAP[primaryAttrOption.value] || '#6b7280' : '#6b7280';

            const telefone = assistido.telefone || assistido.telefoneContato;
            const whatsappUrl = telefone ? `https://wa.me/55${telefone.replace(/\D/g, '')}` : null;

            return (
              <Fragment key={assistido.id}>
              <tr
                className={cn(
                  "transition-colors cursor-pointer animate-in fade-in duration-200 fill-mode-both",
                  "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10",
                  index % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-zinc-50/50 dark:bg-zinc-900/50",
                  isPinned && "ring-1 ring-inset ring-amber-400/40 dark:ring-amber-500/20",
                  isPreso && "border-l-[3px] border-l-rose-500 bg-rose-50/30 dark:bg-rose-950/10",
                  !isPreso && prazoVencido && "border-l-[3px] border-l-rose-400 bg-rose-50/20 dark:bg-rose-950/5",
                  !isPreso && !prazoVencido && audienciaHoje && "border-l-[3px] border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10",
                  !isPreso && !prazoVencido && !audienciaHoje && isMonitorado && "border-l-[3px] border-l-amber-400",
                  expandedId === assistido.id && "bg-zinc-50/50 dark:bg-zinc-800/20",
                )}
                style={{ animationDelay: `${Math.min(index * 20, 400)}ms` }}
                onClick={() => setExpandedId(expandedId === assistido.id ? null : assistido.id)}
                onDoubleClick={() => onPreview?.(assistido)}
              >
                {/* Nome */}
                <td className="py-2.5 px-4 first:pl-6">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AssistidoAvatar
                      nome={assistido.nome}
                      photoUrl={assistido.photoUrl}
                      size="sm"
                      atribuicao={primaryAttrOption?.value}
                      statusPrisional={assistido.statusPrisional}
                      showStatusDot
                      onClick={() => onPhotoClick(assistido)}
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/assistidos/${assistido.id}`}
                        className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate block hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors max-w-[220px]"
                      >
                        {assistido.nome}
                      </Link>
                      {assistido.vulgo && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 italic truncate block max-w-[140px]">
                          &ldquo;{assistido.vulgo}&rdquo;
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Status */}
                <td className="py-2.5 px-4">
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap",
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
                    {statusCfg?.label || assistido.statusPrisional}
                  </div>
                  {isPreso && tempoPreso && (
                    <span className="block text-[10px] font-mono tabular-nums text-rose-400 dark:text-rose-500 mt-0.5 pl-0.5">
                      {tempoPreso}
                    </span>
                  )}
                </td>

                {/* Atribuicao */}
                <td className="py-2.5 px-4">
                  {primaryAttrOption ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: primaryColor }} />
                      {primaryAttrOption.shortLabel}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-300 dark:text-zinc-600">-</span>
                  )}
                </td>

                {/* Crime */}
                <td className="py-2.5 px-4">
                  {assistido.crimePrincipal ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate block max-w-[160px] cursor-help">
                          {assistido.crimePrincipal}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-[300px]">
                        {assistido.crimePrincipal}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-300 dark:text-zinc-600"><Circle className="w-2.5 h-2.5" /> Sem tipo</span>
                  )}
                </td>

                {/* Processo */}
                <td className="py-2.5 px-4">
                  {assistido.numeroProcesso ? (
                    <div
                      className="flex items-center gap-1 cursor-pointer group/copy"
                      onClick={() => handleCopyProcesso(assistido.id, assistido.numeroProcesso!)}
                    >
                      <span className="font-mono tabular-nums text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]">
                        {assistido.numeroProcesso}
                      </span>
                      {copiedId === assistido.id ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 text-zinc-300 dark:text-zinc-600 group-hover/copy:text-zinc-400 transition-colors flex-shrink-0" />
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-300 dark:text-zinc-600"><Circle className="w-2.5 h-2.5" /> &mdash;</span>
                  )}
                </td>

                {/* Audiencia / Prazo */}
                <td className="py-2.5 px-4">
                  {assistido.proximaAudiencia ? (
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium whitespace-nowrap",
                      audienciaHoje && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 animate-pulse",
                      audienciaAmanha && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
                      !audienciaHoje && !audienciaAmanha && diasAteAudiencia !== null && diasAteAudiencia <= 7 && "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
                      !audienciaHoje && !audienciaAmanha && diasAteAudiencia !== null && diasAteAudiencia > 7 && "text-zinc-400 dark:text-zinc-500",
                    )}>
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      {audienciaHoje ? "HOJE" : audienciaAmanha ? "Amanha" : `${diasAteAudiencia}d`}
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-0.5">
                        {format(parseISO(assistido.proximaAudiencia), "dd/MM")}
                      </span>
                    </div>
                  ) : prazoInfo ? (
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium whitespace-nowrap",
                      prazoVencido && "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse",
                      !prazoVencido && prazoInfo.urgent && "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
                      !prazoVencido && !prazoInfo.urgent && "text-zinc-400 dark:text-zinc-500",
                    )}>
                      {prazoVencido && <AlertCircle className="w-3 h-3 flex-shrink-0" />}
                      {prazoInfo.text}
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-300 dark:text-zinc-600"><Circle className="w-2.5 h-2.5" /> &mdash;</span>
                  )}
                </td>

                {/* Drive */}
                <td className="py-2.5 px-4">
                  {assistido.driveFolderId ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`https://drive.google.com/drive/folders/${assistido.driveFolderId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                          {(assistido.driveFilesCount ?? 0) > 0 && (
                            <span className="text-[10px] font-medium tabular-nums">{assistido.driveFilesCount}</span>
                          )}
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">
                        Abrir Drive{(assistido.driveFilesCount ?? 0) > 0 ? ` (${assistido.driveFilesCount} arq.)` : ''}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-zinc-300 dark:text-zinc-600">
                      <Link2Off className="w-3.5 h-3.5" />
                      <span className="text-[10px]">&mdash;</span>
                    </span>
                  )}
                </td>

                {/* Acoes */}
                <td className="py-2.5 px-4 last:pr-6">
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {whatsappUrl && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-1">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px]">WhatsApp</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/admin/drive?assistido=${assistido.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-1">
                            <FolderOpen className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">Drive</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/admin/demandas/nova?assistido=${assistido.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-1">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px]">Nova Demanda</TooltipContent>
                    </Tooltip>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-1",
                        isPinned
                          ? "text-amber-500 bg-amber-50 dark:bg-amber-950/30"
                          : "text-zinc-300 dark:text-zinc-600 hover:text-amber-500",
                      )}
                      onClick={() => onTogglePin(assistido.id)}
                    >
                      {isPinned ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                    </Button>
                    <Link href={`/admin/assistidos/${assistido.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 font-medium focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-1"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>

              {/* Row Expansion Panel */}
              {expandedId === assistido.id && (
                <tr>
                  <td colSpan={8} className="p-0">
                    <div className="px-6 py-4 bg-zinc-50/50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Col 1: Dados Pessoais */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-2">Dados Pessoais</p>
                          {assistido.cpf && (
                            <div>
                              <span className="text-[10px] text-zinc-400">CPF: </span>
                              <span className="text-xs font-mono tabular-nums text-zinc-600 dark:text-zinc-300">
                                {assistido.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')}
                              </span>
                            </div>
                          )}
                          {assistido.rg && (
                            <div>
                              <span className="text-[10px] text-zinc-400">RG: </span>
                              <span className="text-xs text-zinc-600 dark:text-zinc-300">{assistido.rg}</span>
                            </div>
                          )}
                          {assistido.dataNascimento && (
                            <div>
                              <span className="text-[10px] text-zinc-400">Nascimento: </span>
                              <span className="text-xs text-zinc-600 dark:text-zinc-300">{format(parseISO(assistido.dataNascimento), "dd/MM/yyyy")}</span>
                            </div>
                          )}
                          {assistido.naturalidade && (
                            <div>
                              <span className="text-[10px] text-zinc-400">Naturalidade: </span>
                              <span className="text-xs text-zinc-600 dark:text-zinc-300">{assistido.naturalidade}</span>
                            </div>
                          )}
                        </div>

                        {/* Col 2: Contato + Crime */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-2">Contato / Crime</p>
                          {telefone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-zinc-400" />
                              <span className="text-xs text-zinc-600 dark:text-zinc-300">{telefone}</span>
                              {whatsappUrl && (
                                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600" onClick={(e) => e.stopPropagation()}>
                                  <MessageCircle className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          )}
                          {assistido.crimePrincipal && (
                            <div>
                              <span className="text-[10px] text-zinc-400">Crime: </span>
                              <span className="text-xs text-zinc-600 dark:text-zinc-300">{assistido.crimePrincipal}</span>
                            </div>
                          )}
                          {assistido.numeroProcesso && (
                            <div>
                              <span className="text-[10px] text-zinc-400">Processo: </span>
                              <span className="font-mono tabular-nums text-[10px] text-zinc-500 dark:text-zinc-400">{assistido.numeroProcesso}</span>
                            </div>
                          )}
                        </div>

                        {/* Col 3: Mini Timeline */}
                        <div className="space-y-2">
                          <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-2">Timeline</p>
                          {assistido.proximaAudiencia && (
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                audienciaHoje ? "bg-amber-500 animate-pulse" : audienciaAmanha ? "bg-blue-500" : "bg-violet-500"
                              )} />
                              <span className="text-xs text-zinc-600 dark:text-zinc-300">
                                Audiencia: {audienciaHoje ? "HOJE" : audienciaAmanha ? "Amanha" : format(parseISO(assistido.proximaAudiencia), "dd/MM/yyyy")}
                              </span>
                            </div>
                          )}
                          {assistido.ultimoEvento && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-zinc-400" />
                              <span className="text-xs text-zinc-500">
                                {assistido.ultimoEvento.titulo} ({assistido.ultimoEvento.data ? format(parseISO(assistido.ultimoEvento.data), "dd/MM") : ""})
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                            <span className="text-xs text-zinc-400">
                              Cadastro: {format(new Date(assistido.createdAt), "dd/MM/yyyy")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
