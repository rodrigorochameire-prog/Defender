"use client";

// Comarca de origem do usuário logado — exibir badge quando assistido for de outra comarca.
// Atualizar quando o sistema expandir para múltiplas comarcas ativas (ver comarca-scope.ts).
const HOME_COMARCA = "Camaçari";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Eye,
  Scale,
  FileText,
  MapPin,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Clock,
  Calendar,
  Bookmark,
  BookmarkCheck,
  User,
  CircleDot,
  Copy,
  CheckCircle2,
  HardDrive,
  Link2Off,
  ExternalLink,
  Phone,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { AssistidoAvatar } from "@/components/shared/assistido-avatar";
import {
  ATRIBUICAO_OPTIONS,
  SOLID_COLOR_MAP,
} from "@/lib/config/atribuicoes";
import type { AssistidoUI } from "./assistido-types";
import { statusConfig } from "./assistido-config";
import { getPrazoInfo, calcularIdade, calcularTempoPreso } from "./assistido-utils";

export interface AssistidoCardProps {
  assistido: AssistidoUI;
  onPhotoClick: () => void;
  isPinned: boolean;
  onTogglePin: () => void;
  hasDuplicates?: boolean;
  duplicateCount?: number;
  onPreview?: () => void;
}

export function AssistidoCard({ assistido, onPhotoClick, isPinned, onTogglePin, hasDuplicates, duplicateCount, onPreview }: AssistidoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const isMonitorado = ["MONITORADO", "DOMICILIAR"].includes(assistido.statusPrisional);
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const prazoVencido = prazoInfo && prazoInfo.text === "Vencido";
  const prazoUrgente = prazoInfo && prazoInfo.urgent;
  const tempoPreso = calcularTempoPreso(assistido.dataPrisao ?? null);
  const idade = calcularIdade(assistido.dataNascimento);

  const diasAteAudiencia = assistido.proximaAudiencia
    ? differenceInDays(parseISO(assistido.proximaAudiencia), new Date())
    : null;
  const audienciaHoje = diasAteAudiencia === 0;
  const audienciaAmanha = diasAteAudiencia === 1;

  const telefoneDisplay = assistido.telefone || assistido.telefoneContato;
  const whatsappUrl = telefoneDisplay
    ? `https://wa.me/55${telefoneDisplay.replace(/\D/g, '')}`
    : null;

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

  const handleCopyProcesso = () => {
    if (!assistido.numeroProcesso) return;
    navigator.clipboard.writeText(assistido.numeroProcesso);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={cn(
      "group relative flex flex-col justify-between overflow-hidden transition-all duration-200",
      "bg-white dark:bg-zinc-900",
      "border border-zinc-200/80 dark:border-zinc-800/80",
      "rounded-2xl shadow-sm",
      "hover:shadow-md hover:-translate-y-0.5",
      isPinned && "ring-2 ring-amber-400/50 dark:ring-amber-500/30",
    )}>
      {/* Top accent bar */}
      <div
        className="absolute inset-x-0 top-0 h-0.5"
        style={{ background: `linear-gradient(to right, transparent, ${isPreso ? '#f43f5e' : primaryColor}, transparent)` }}
      />

      <div className="p-3.5 space-y-2.5 relative z-10">
        {/* Header: Avatar + Info */}
        <div className="flex gap-3 items-start">
          <AssistidoAvatar
            nome={assistido.nome}
            photoUrl={assistido.photoUrl}
            size="lg"
            atribuicao={primaryAttrValue}
            statusPrisional={assistido.statusPrisional}
            showStatusDot
            onClick={onPhotoClick}
          />

          <div className="flex-1 min-w-0">
            <Link href={`/admin/assistidos/${assistido.id}`}>
              <h3 className="font-serif font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors line-clamp-1">
                {assistido.nome}
              </h3>
            </Link>
            {assistido.vulgo && (
              <p className="text-[10px] text-zinc-400 italic truncate">&ldquo;{assistido.vulgo}&rdquo;</p>
            )}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                isPreso && "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400",
                isMonitorado && "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
                !isPreso && !isMonitorado && "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
              )}>
                {statusConfig[assistido.statusPrisional]?.label || "Solto"}
              </span>
              {isPreso && tempoPreso && (
                <span className="text-[10px] text-rose-400 font-mono tabular-nums">{tempoPreso}</span>
              )}
              {idade && <span className="text-[10px] text-zinc-400">{idade}a</span>}
              {assistido.comarcaNome && assistido.comarcaNome !== HOME_COMARCA && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                  <MapPin className="w-2.5 h-2.5" />
                  {assistido.comarcaNome}
                </span>
              )}
              {prazoVencido && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse">
                  <AlertCircle className="w-2.5 h-2.5" />
                  VENCIDO
                </span>
              )}
              {!prazoVencido && prazoUrgente && prazoInfo && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                  <Clock className="w-2.5 h-2.5" />
                  {prazoInfo.text}
                </span>
              )}
            </div>
          </div>

          {/* Pin + Drive */}
          <div className="flex items-center gap-0.5 shrink-0">
            {assistido.driveFolderId ? (
              <a
                href={`https://drive.google.com/drive/folders/${assistido.driveFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-6 rounded-md flex items-center gap-1 px-1.5 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 border border-emerald-200/50 dark:border-emerald-800/30 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <HardDrive className="w-3 h-3" />
                {(assistido.driveFilesCount ?? 0) > 0 && (
                  <span className="text-[10px] font-medium tabular-nums">{assistido.driveFilesCount}</span>
                )}
              </a>
            ) : (
              <div className="h-6 w-6 rounded-md flex items-center justify-center text-zinc-300 dark:text-zinc-600">
                <Link2Off className="w-3 h-3" />
              </div>
            )}
            <button
              onClick={onTogglePin}
              className={cn(
                "h-6 w-6 rounded-md flex items-center justify-center transition-colors",
                isPinned
                  ? "text-amber-500 bg-amber-100/50 dark:bg-amber-900/30"
                  : "text-zinc-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20",
              )}
            >
              {isPinned ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Atribuição chips */}
        {atribuicoesUnicas.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
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
            {hasDuplicates && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                {duplicateCount} duplicata{(duplicateCount || 0) > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Unidade prisional */}
        {isPreso && assistido.unidadePrisional && (
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30">
            <MapPin className="w-3 h-3 text-rose-500" />
            <span className="text-[10px] text-rose-700 dark:text-rose-400 truncate">{assistido.unidadePrisional}</span>
          </div>
        )}

        {/* Stats inline */}
        <div className="flex items-center gap-3 text-xs">
          <Link
            href={`/admin/processos?assistido=${assistido.id}`}
            className="flex items-center gap-1 text-zinc-500 hover:text-emerald-600 transition-colors"
          >
            <Scale className="w-3 h-3" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{assistido.processosAtivos || 0}</span>
            <span className="text-[10px]">proc.</span>
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">&middot;</span>
          <Link
            href={`/admin/demandas?assistido=${assistido.id}`}
            className={cn(
              "flex items-center gap-1 text-xs transition-colors",
              assistido.demandasAbertas > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-zinc-500 hover:text-emerald-600",
            )}
          >
            <FileText className="w-3 h-3" />
            <span className="font-semibold">{assistido.demandasAbertas || 0}</span>
            <span className="text-[10px]">dem.</span>
          </Link>
          {telefoneDisplay && (
            <>
              <span className="text-zinc-300 dark:text-zinc-600">&middot;</span>
              <span className="flex items-center gap-1 text-zinc-400 text-[10px]">
                <Phone className="w-3 h-3" />
                {telefoneDisplay}
              </span>
            </>
          )}
        </div>

        {/* Audiência */}
        {assistido.proximaAudiencia && (
          <div className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-lg border",
            audienciaHoje
              ? "bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/40"
              : audienciaAmanha
                ? "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/40"
                : "bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/40",
          )}>
            <div className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
              audienciaHoje && "bg-amber-500 text-white",
              audienciaAmanha && "bg-blue-500 text-white",
              !audienciaHoje && !audienciaAmanha && "bg-zinc-200 dark:bg-zinc-700 text-zinc-500",
            )}>
              <Calendar className="w-3 h-3" />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className={cn(
                "text-[10px] font-bold uppercase",
                audienciaHoje && "text-amber-700 dark:text-amber-400",
                audienciaAmanha && "text-blue-700 dark:text-blue-400",
                !audienciaHoje && !audienciaAmanha && "text-zinc-600 dark:text-zinc-300",
              )}>
                {audienciaHoje ? "HOJE" : audienciaAmanha ? "AMANHA" : format(parseISO(assistido.proximaAudiencia), "dd/MM")}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">{format(parseISO(assistido.proximaAudiencia), "HH:mm")}</span>
              <span className="text-[10px] text-zinc-400 truncate">{assistido.tipoProximaAudiencia || "Audiência"}</span>
            </div>
            {(audienciaHoje || audienciaAmanha) && (
              <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", audienciaHoje ? "bg-amber-500 animate-pulse" : "bg-blue-500")} />
            )}
          </div>
        )}

        {/* Crime */}
        {assistido.crimePrincipal && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 line-clamp-1 italic">
            {assistido.crimePrincipal}
          </p>
        )}

        {/* Processo */}
        {assistido.numeroProcesso && (
          <div className="flex items-center gap-1.5 cursor-pointer group/copy" onClick={handleCopyProcesso}>
            <Scale className="w-3 h-3 text-zinc-400" />
            <span className="font-mono tabular-nums text-[10px] text-zinc-400 truncate flex-1">{assistido.numeroProcesso}</span>
            {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-zinc-300 group-hover/copy:text-zinc-400 transition-colors" />}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3.5 py-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-1">
          {onPreview && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPreview(); }}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px]">Preview</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <button className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all">
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            </a>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
          </button>
        </div>

        <Link href={`/admin/assistidos/${assistido.id}`}>
          <Button size="sm" className="h-7 text-[10px] px-3 gap-1 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600 text-white rounded-lg">
            Ver Perfil <ChevronRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>

      {/* Expandable details */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <div className="px-3.5 pb-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
            {/* Timeline */}
            <div className="relative pl-4 space-y-2.5 border-l-2 border-zinc-200 dark:border-zinc-700">
              {assistido.proximaAudiencia && (
                <div className="relative">
                  <div className={cn("absolute -left-[9px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center", audienciaHoje ? "bg-amber-500" : audienciaAmanha ? "bg-blue-500" : "bg-violet-500")}>
                    <Calendar className="w-2 h-2 text-white" />
                  </div>
                  <div className="ml-3">
                    <p className={cn("text-xs font-semibold", audienciaHoje ? "text-amber-600" : audienciaAmanha ? "text-blue-600" : "text-violet-600")}>
                      {format(parseISO(assistido.proximaAudiencia), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                    <p className="text-[10px] text-zinc-500">{assistido.tipoProximaAudiencia || "Audiência"}</p>
                  </div>
                </div>
              )}
              {assistido.ultimoEvento && (
                <div className="relative">
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-zinc-400 flex items-center justify-center">
                    <CircleDot className="w-2 h-2 text-white" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {assistido.ultimoEvento.data ? format(parseISO(assistido.ultimoEvento.data), "dd/MM/yyyy") : ""}
                    </p>
                    <p className="text-[10px] text-zinc-500">{assistido.ultimoEvento.titulo}</p>
                  </div>
                </div>
              )}
              <div className="relative">
                <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center">
                  <User className="w-2 h-2 text-white" />
                </div>
                <p className="ml-3 text-[10px] text-zinc-400">{format(new Date(assistido.createdAt), "dd/MM/yyyy")} &middot; Cadastro</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Link href={`/admin/processos?assistido=${assistido.id}`}>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1"><Scale className="w-3 h-3" />Processos</Button>
                </Link>
                <Link href={`/admin/audiencias?assistido=${assistido.id}`}>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1"><Calendar className="w-3 h-3" />Audiências</Button>
                </Link>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
