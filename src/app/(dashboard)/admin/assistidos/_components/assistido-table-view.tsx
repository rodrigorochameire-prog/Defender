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
  MessageCircle,
  AlertCircle,
  Calendar,
  Phone,
  Bookmark,
  BookmarkCheck,
  Copy,
  CheckCircle2,
  FolderOpen,
  HardDrive,
  Link2Off,
  Zap,
  ChevronDown,
  MapPin,
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

  return (
    <div className="space-y-2" style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
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
              const normalizedAttr = atribuicoesUnicas[0].toUpperCase().replace(/_/g, " ");
              return ATRIBUICAO_OPTIONS.find(
                (o) =>
                  o.value.toUpperCase() === normalizedAttr ||
                  o.label.toUpperCase().includes(normalizedAttr) ||
                  normalizedAttr.includes(o.value.toUpperCase()),
              );
            })()
          : null;
        const primaryColor = primaryAttrOption
          ? SOLID_COLOR_MAP[primaryAttrOption.value] || "#a1a1aa"
          : "#a1a1aa";

        const telefone = assistido.telefone || assistido.telefoneContato;
        const whatsappUrl = telefone
          ? `https://wa.me/55${telefone.replace(/\D/g, "")}`
          : null;

        return (
          <Fragment key={assistido.id}>
            <div
              className={cn(
                "group relative rounded-xl border transition-all duration-150 cursor-pointer",
                "animate-in fade-in duration-200 fill-mode-both",
                "hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-600",
                isPinned
                  ? "border-amber-300/60 dark:border-amber-700/40 bg-amber-50/20 dark:bg-amber-950/5"
                  : "border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-neutral-900",
                expandedId === assistido.id && "shadow-md border-neutral-300 dark:border-neutral-600",
              )}
              style={{ animationDelay: `${Math.min(index * 20, 400)}ms` }}
              onClick={() => setExpandedId(expandedId === assistido.id ? null : assistido.id)}
              onDoubleClick={() => onPreview?.(assistido)}
            >
              {/* Color accent bar */}
              <div
                className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                style={{ backgroundColor: primaryColor }}
              />

              {/* Main row content */}
              <div className="flex items-center gap-4 px-5 pl-6 py-3">
                {/* === LEFT: Avatar + Name + Badges === */}
                <div className="flex items-center gap-3 w-[300px] shrink-0 min-w-0">
                  <AssistidoAvatar
                    nome={assistido.nome}
                    photoUrl={assistido.photoUrl}
                    size="sm"
                    atribuicao={primaryAttrOption?.value}
                    statusPrisional={assistido.statusPrisional}
                    showStatusDot
                    onClick={() => onPhotoClick(assistido)}
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/assistidos/${assistido.id}`}
                      className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate block hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors max-w-[220px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {assistido.nome}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1">
                      {/* Status badge — neutral for Solto */}
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium",
                        isPreso && "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400",
                        isMonitorado && "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400",
                        !isPreso && !isMonitorado && "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400",
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isPreso && "bg-rose-500",
                          isMonitorado && "bg-amber-500",
                          !isPreso && !isMonitorado && "bg-neutral-400 dark:bg-neutral-500",
                        )} />
                        {statusCfg?.label || "Solto"}
                      </span>
                      {/* Tempo preso inline */}
                      {isPreso && tempoPreso && (
                        <span className="text-[10px] font-mono tabular-nums text-rose-400">
                          {tempoPreso}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* === CENTER: Crime + Processo + Phone === */}
                <div className="flex-1 min-w-0 flex items-center gap-6">
                  <div className="min-w-0 space-y-0.5">
                    {assistido.crimePrincipal ? (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]">
                        {assistido.crimePrincipal}
                      </p>
                    ) : null}
                    {assistido.numeroProcesso ? (
                      <div
                        className="flex items-center gap-1 cursor-pointer group/copy"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyProcesso(assistido.id, assistido.numeroProcesso!);
                        }}
                      >
                        <span className="font-mono tabular-nums text-[10px] text-neutral-400 dark:text-neutral-500 truncate max-w-[180px]">
                          {assistido.numeroProcesso}
                        </span>
                        {copiedId === assistido.id ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        ) : (
                          <Copy className="w-3 h-3 text-neutral-300 dark:text-neutral-600 group-hover/copy:text-neutral-400 transition-colors shrink-0" />
                        )}
                      </div>
                    ) : null}
                  </div>
                  {telefone && (
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={`tel:${telefone.replace(/\D/g, "")}`}
                        className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-emerald-600 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        {telefone}
                      </a>
                      {whatsappUrl && (
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-emerald-500 transition-colors">
                          <MessageCircle className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* === RIGHT: Audiência + Drive + Actions === */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Audiência/Prazo */}
                  {assistido.proximaAudiencia ? (
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap",
                      audienciaHoje && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                      audienciaAmanha && "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
                      !audienciaHoje && !audienciaAmanha && diasAteAudiencia !== null && diasAteAudiencia <= 7 && "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
                      !audienciaHoje && !audienciaAmanha && diasAteAudiencia !== null && diasAteAudiencia > 7 && "text-neutral-400 dark:text-neutral-500",
                    )}>
                      {(audienciaHoje || audienciaAmanha || (diasAteAudiencia !== null && diasAteAudiencia <= 5))
                        ? <Zap className="w-3 h-3 shrink-0 fill-current" />
                        : <Calendar className="w-3 h-3 shrink-0" />
                      }
                      {audienciaHoje ? "HOJE" : audienciaAmanha ? "Amanhã" : `${diasAteAudiencia}d`}
                      <span className="opacity-60">{format(parseISO(assistido.proximaAudiencia), "dd/MM")}</span>
                    </div>
                  ) : prazoInfo ? (
                    <div className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium whitespace-nowrap",
                      prazoVencido && "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
                      !prazoVencido && prazoInfo.urgent && "bg-amber-50 dark:bg-amber-900/20 text-amber-600",
                      !prazoVencido && !prazoInfo.urgent && "text-neutral-400",
                    )}>
                      {prazoVencido ? <AlertCircle className="w-3 h-3 shrink-0" /> : prazoInfo.urgent ? <Zap className="w-3 h-3 shrink-0 fill-current" /> : null}
                      {prazoInfo.text}
                    </div>
                  ) : null}

                  {/* Drive */}
                  <div onClick={(e) => e.stopPropagation()}>
                    {assistido.driveFolderId ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={`https://drive.google.com/drive/folders/${assistido.driveFolderId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors"
                          >
                            <HardDrive className="w-3.5 h-3.5" />
                            {(assistido.driveFilesCount ?? 0) > 0 && (
                              <span className="text-[10px] font-medium tabular-nums">{assistido.driveFilesCount}</span>
                            )}
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px]">
                          Abrir Drive{(assistido.driveFilesCount ?? 0) > 0 ? ` (${assistido.driveFilesCount} arq.)` : ""}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Link2Off className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
                    )}
                  </div>

                  {/* Pin */}
                  <button
                    className={cn(
                      "h-7 w-7 inline-flex items-center justify-center rounded-md transition-all shrink-0",
                      isPinned
                        ? "text-amber-500"
                        : "text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 hover:text-amber-500",
                    )}
                    onClick={(e) => { e.stopPropagation(); onTogglePin(assistido.id); }}
                  >
                    {isPinned ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                  </button>

                  {/* Preview + Expand */}
                  <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                    {onPreview && (
                      <button
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        onClick={() => onPreview(assistido)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <ChevronDown className={cn(
                      "w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 transition-transform duration-200",
                      expandedId === assistido.id && "rotate-180 text-neutral-500",
                    )} />
                  </div>
                </div>
              </div>

              {/* === Expanded panel === */}
              {expandedId === assistido.id && (
                <div className="border-t border-neutral-100 dark:border-neutral-800 animate-in slide-in-from-top-1 duration-200">
                  <div className="px-6 py-4 bg-neutral-50/30 dark:bg-neutral-800/20 rounded-b-xl">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      {/* Col 1: Dados Pessoais */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium mb-2">Dados Pessoais</p>
                        {assistido.cpf && (
                          <p className="text-xs"><span className="text-neutral-400">CPF: </span><span className="font-mono tabular-nums text-neutral-600 dark:text-neutral-300">{assistido.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4")}</span></p>
                        )}
                        {assistido.dataNascimento && (
                          <p className="text-xs"><span className="text-neutral-400">Nasc.: </span><span className="text-neutral-600 dark:text-neutral-300">{format(parseISO(assistido.dataNascimento), "dd/MM/yyyy")}</span></p>
                        )}
                        {assistido.nomeMae && (
                          <p className="text-xs"><span className="text-neutral-400">Mãe: </span><span className="text-neutral-600 dark:text-neutral-300">{assistido.nomeMae}</span></p>
                        )}
                        {assistido.naturalidade && (
                          <p className="text-xs"><span className="text-neutral-400">Natural.: </span><span className="text-neutral-600 dark:text-neutral-300">{assistido.naturalidade}</span></p>
                        )}
                        {assistido.endereco && (
                          <p className="text-xs"><span className="text-neutral-400">End.: </span><span className="text-neutral-600 dark:text-neutral-300">{assistido.endereco}</span></p>
                        )}
                        {isPreso && assistido.unidadePrisional && (
                          <p className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-500" /><span className="text-rose-600 dark:text-rose-400">{assistido.unidadePrisional}</span></p>
                        )}
                      </div>

                      {/* Col 2: Contato / WhatsApp */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium mb-2">Contato</p>
                        {telefone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <a href={`tel:${telefone.replace(/\D/g, "")}`} className="text-xs text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                              {telefone}
                            </a>
                          </div>
                        )}
                        {assistido.telefoneContato && assistido.telefoneContato !== assistido.telefone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <span className="text-xs text-neutral-500">{assistido.telefoneContato}</span>
                            {assistido.nomeContato && <span className="text-[10px] text-neutral-400">({assistido.nomeContato})</span>}
                          </div>
                        )}
                        {whatsappUrl && (
                          <div className="flex items-center gap-2 pt-1">
                            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 transition-colors" onClick={(e) => e.stopPropagation()}>
                              <MessageCircle className="w-3.5 h-3.5" />
                              WhatsApp externo
                            </a>
                          </div>
                        )}
                        {telefone && (
                          <div className="pt-0.5">
                            <Link
                              href={`/admin/whatsapp?phone=${telefone.replace(/\D/g, "")}`}
                              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Conversa no OMBUDS
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Col 3: Processo */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium mb-2">Processo</p>
                        {assistido.crimePrincipal && (
                          <p className="text-xs"><span className="text-neutral-400">Crime: </span><span className="text-neutral-600 dark:text-neutral-300">{assistido.crimePrincipal}</span></p>
                        )}
                        {assistido.numeroProcesso && (
                          <p className="text-xs"><span className="text-neutral-400">Nº: </span><span className="font-mono tabular-nums text-neutral-500">{assistido.numeroProcesso}</span></p>
                        )}
                        {assistido.observacoes && (
                          <p className="text-xs text-neutral-400 truncate max-w-[200px]" title={assistido.observacoes}>{assistido.observacoes}</p>
                        )}
                      </div>

                      {/* Col 4: Ações */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium mb-2">Ações</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link href={`/admin/assistidos/${assistido.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px] rounded-lg border-neutral-200 dark:border-neutral-700">
                              <Eye className="h-3 w-3 mr-1" />Perfil
                            </Button>
                          </Link>
                          <Link href={`/admin/demandas/nova?assistido=${assistido.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px] rounded-lg border-neutral-200 dark:border-neutral-700">
                              <Plus className="h-3 w-3 mr-1" />Demanda
                            </Button>
                          </Link>
                          {assistido.driveFolderId && (
                            <a href={`https://drive.google.com/drive/folders/${assistido.driveFolderId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                              <Button variant="outline" size="sm" className="h-7 px-2.5 text-[10px] rounded-lg border-neutral-200 dark:border-neutral-700">
                                <FolderOpen className="h-3 w-3 mr-1" />Drive
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
