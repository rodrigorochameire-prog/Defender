"use client";

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
  Plus,
  Scale,
  FileText,
  MapPin,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Clock,
  Calendar,
  Brain,
  Bookmark,
  BookmarkCheck,
  User,
  CircleDot,
  Copy,
  CheckCircle2,
  XCircle,
  Zap,
  FolderOpen,
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
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Referencia para fechar o overlay ao clicar fora
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Logica Semantica: Determina se reu esta preso
  const isPreso = ["CADEIA_PUBLICA", "PENITENCIARIA", "COP", "HOSPITAL_CUSTODIA"].includes(assistido.statusPrisional);
  const isMonitorado = ["MONITORADO", "DOMICILIAR"].includes(assistido.statusPrisional);

  // Prazo urgente (<= 3 dias)
  const prazoInfo = getPrazoInfo(assistido.proximoPrazo);
  const prazoUrgente = prazoInfo && prazoInfo.urgent;
  const prazoVencido = prazoInfo && prazoInfo.text === "Vencido";

  // Audiencia hoje ou amanha
  const diasAteAudiencia = assistido.proximaAudiencia
    ? differenceInDays(parseISO(assistido.proximaAudiencia), new Date())
    : null;
  const audienciaHoje = diasAteAudiencia === 0;
  const audienciaAmanha = diasAteAudiencia === 1;
  const audienciaProxima = diasAteAudiencia !== null && diasAteAudiencia >= 0 && diasAteAudiencia <= 7;

  // Score de complexidade (visual)
  const score = assistido.scoreComplexidade || Math.floor(Math.random() * 100);
  const scoreLevel = score >= 70 ? "critico" : score >= 40 ? "atencao" : "normal";

  // Telefone para contato (WhatsApp)
  const telefoneDisplay = assistido.telefone || assistido.telefoneContato;
  const whatsappUrl = telefoneDisplay
    ? `https://wa.me/55${telefoneDisplay.replace(/\D/g, '')}`
    : null;

  // Tempo de prisao
  const tempoPreso = calcularTempoPreso(assistido.dataPrisao ?? null);

  // Idade
  const idade = calcularIdade(assistido.dataNascimento);

  // Copiar numero do processo
  const handleCopyProcesso = () => {
    if (!assistido.numeroProcesso) return;
    navigator.clipboard.writeText(assistido.numeroProcesso);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Cores das atribuicoes/areas
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

  // Determinar o status visual do card
  const getCardGlow = () => {
    if (isPreso) return "hover:shadow-rose-500/20";
    if (prazoVencido) return "hover:shadow-rose-500/10";
    if (audienciaHoje) return "hover:shadow-amber-500/15";
    if (prazoUrgente) return "hover:shadow-amber-500/10";
    return "hover:shadow-emerald-500/5";
  };

  // Indicador de urgencia
  const getUrgencyLevel = () => {
    if (isPreso && (prazoVencido || audienciaHoje)) return { level: "critico", color: "rose", pulse: true };
    if (isPreso) return { level: "alto", color: "rose", pulse: false };
    if (prazoVencido) return { level: "vencido", color: "rose", pulse: true };
    if (audienciaHoje) return { level: "hoje", color: "amber", pulse: true };
    if (audienciaAmanha || prazoUrgente) return { level: "urgente", color: "amber", pulse: false };
    return null;
  };

  const urgency = getUrgencyLevel();

  // Determinar a cor do destaque superior baseado no status
  const getTopBorderColor = () => {
    if (isPreso) return { color: "#f43f5e", gradient: "from-rose-500 via-rose-400 to-rose-500" };
    if (prazoVencido) return { color: "#f43f5e", gradient: "from-rose-500 via-rose-400 to-rose-500" };
    if (audienciaHoje) return { color: "#f59e0b", gradient: "from-amber-500 via-amber-400 to-amber-500" };
    if (isMonitorado) return { color: "#f59e0b", gradient: "from-amber-500 via-amber-400 to-amber-500" };
    return { color: primaryColor, gradient: `from-[${primaryColor}] via-[${primaryColor}]/80 to-[${primaryColor}]` };
  };

  const topBorder = getTopBorderColor();

  return (
    <Card className={cn(
      // Base Premium - Design clean e harmonioso
      "group relative flex flex-col justify-between overflow-hidden transition-all duration-200",
      "bg-white dark:bg-zinc-900",
      "border border-zinc-200/80 dark:border-zinc-800/80",
      "rounded-2xl",
      "shadow-apple dark:shadow-apple-dark",
      "hover:shadow-lg dark:hover:shadow-apple-dark-hover",
      "hover:-translate-y-1",
      getCardGlow(),
      // Fixado
      isPinned && "ring-2 ring-amber-400/50 dark:ring-amber-500/30"
    )}
    >
      {/* Borda superior premium — sempre visivel com cor da atribuicao */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1 rounded-t-xl transition-opacity duration-300",
          urgency?.pulse && "animate-pulse"
        )}
        style={{
          background: `linear-gradient(to right, transparent, ${topBorder.color}, transparent)`
        }}
      />

      {/* Gradiente de fundo */}
      <div
        className="absolute inset-0 opacity-30 group-hover:opacity-60 pointer-events-none rounded-xl transition-opacity duration-300"
        style={{
          background: `linear-gradient(to bottom right, ${topBorder.color}10 0%, ${topBorder.color}05 30%, transparent 60%)`
        }}
      />

      {/* Quick Actions Overlay - Aparece ao clicar no botao */}
      {showQuickActions && (
        <div
          className="absolute inset-0 bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setShowQuickActions(false)}
        >
          {/* Botao Fechar */}
          <button
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
            onClick={() => setShowQuickActions(false)}
          >
            <XCircle className="w-5 h-5" />
          </button>

          {/* Nome do assistido */}
          <p className="text-white/60 text-xs mb-3">{assistido.nome}</p>

          <div className="grid grid-cols-3 gap-3 p-4" onClick={(e) => e.stopPropagation()}>
            {[
              { icon: Eye, label: "Ver Perfil", href: `/admin/assistidos/${assistido.id}`, color: "emerald" },
              { icon: Scale, label: "Processos", href: `/admin/processos?assistido=${assistido.id}`, color: "violet" },
              { icon: FileText, label: "Demandas", href: `/admin/demandas?assistido=${assistido.id}`, color: "blue" },
              { icon: FolderOpen, label: "Drive", href: `/admin/drive?assistido=${assistido.id}`, color: "amber" },
              { icon: Plus, label: "Nova Demanda", href: `/admin/demandas/nova?assistido=${assistido.id}`, color: "emerald" },
              ...(whatsappUrl ? [{ icon: MessageCircle, label: "WhatsApp", href: whatsappUrl, external: true, color: "emerald" }] : []),
            ].map((action, idx) => (
              action.external ? (
                <a
                  key={idx}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all hover:scale-105"
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{action.label}</span>
                </a>
              ) : (
                <Link
                  key={idx}
                  href={action.href}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all hover:scale-105"
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{action.label}</span>
                </Link>
              )
            ))}
          </div>

          {/* Dica */}
          <p className="text-white/40 text-[10px] mt-3">Clique fora para fechar</p>
        </div>
      )}

      <div className="p-4 space-y-3 relative z-10">

        {/* 1. HEADER: Avatar + Info + Badges */}
        <div className="flex gap-3 items-start">
          {/* Avatar Premium - Cor neutra com indicador de status */}
          <AssistidoAvatar
            nome={assistido.nome}
            photoUrl={assistido.photoUrl}
            size="lg"
            atribuicao={primaryAttrValue}
            statusPrisional={assistido.statusPrisional}
            showStatusDot
            onClick={onPhotoClick}
          />

          {/* Info Principal */}
          <div className="flex-1 min-w-0">
            {/* Nome */}
            <Link href={`/admin/assistidos/${assistido.id}`}>
              <h3 className="font-serif font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors line-clamp-1">
                {assistido.nome}
              </h3>
            </Link>

            {/* Vulgo */}
            {assistido.vulgo && (
              <p className="text-[10px] text-zinc-400 italic truncate">&ldquo;{assistido.vulgo}&rdquo;</p>
            )}

            {/* Meta Info - Simplificado */}
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              {/* Status Badge - Mais discreto */}
              <span className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                isPreso && "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400",
                isMonitorado && "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
                !isPreso && !isMonitorado && "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
              )}>
                {statusConfig[assistido.statusPrisional]?.label || "Solto"}
              </span>

              {/* Tempo Preso */}
              {isPreso && tempoPreso && (
                <span className="text-[10px] text-zinc-400 font-mono tabular-nums">{tempoPreso}</span>
              )}

              {/* Idade */}
              {idade && (
                <span className="text-[10px] text-zinc-400">{idade}a</span>
              )}

              {/* Prazo countdown badge */}
              {prazoVencido && prazoInfo && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse">
                  <AlertCircle className="w-3 h-3" />
                  VENCIDO
                  {assistido.proximoPrazo && (
                    <span className="font-mono tabular-nums">
                      {Math.abs(differenceInDays(parseISO(assistido.proximoPrazo), new Date()))}d
                    </span>
                  )}
                </span>
              )}
              {!prazoVencido && prazoUrgente && prazoInfo && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                  <Clock className="w-3 h-3" />
                  {prazoInfo.text}
                </span>
              )}
            </div>
          </div>

          {/* Drive + Pin Buttons */}
          <div className="flex items-center gap-1">
            {/* Drive Link Indicator with Counter & Quick Action */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {assistido.driveFolderId ? (
                    <a
                      href={`https://drive.google.com/drive/folders/${assistido.driveFolderId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "h-7 rounded-md flex items-center gap-1.5 px-2 transition-all cursor-pointer",
                        "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
                        "hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
                        "border border-emerald-200/50 dark:border-emerald-800/30"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      {(assistido.driveFilesCount ?? 0) > 0 && (
                        <span className="text-[10px] font-medium tabular-nums">
                          {assistido.driveFilesCount}
                        </span>
                      )}
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ) : (
                    <div
                      className={cn(
                        "h-7 w-7 rounded-md flex items-center justify-center transition-all cursor-pointer",
                        "text-zinc-300 hover:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      )}
                    >
                      <Link2Off className="w-3.5 h-3.5" />
                    </div>
                  )}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {assistido.driveFolderId
                    ? `Abrir pasta no Drive${(assistido.driveFilesCount ?? 0) > 0 ? ` (${assistido.driveFilesCount} arquivo${(assistido.driveFilesCount ?? 0) > 1 ? 's' : ''})` : ''}`
                    : "Sem pasta no Drive"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Pin Button */}
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-7 w-7 transition-all",
                isPinned
                  ? "text-amber-500 bg-amber-100/50 dark:bg-amber-900/30"
                  : "text-zinc-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              )}
              onClick={onTogglePin}
            >
              {isPinned ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* 2. Badges de Atribuicao - Simplificados */}
        <div className="flex items-center justify-between gap-2">
          {/* Atribuicoes - NEUTRAS com apenas bolinha colorida */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {atribuicoesUnicas.slice(0, 3).map((attr, idx) => {
              const normalizedAttr = attr.toUpperCase().replace(/_/g, ' ');
              const option = ATRIBUICAO_OPTIONS.find(o =>
                o.value.toUpperCase() === normalizedAttr ||
                o.label.toUpperCase().includes(normalizedAttr) ||
                normalizedAttr.includes(o.value.toUpperCase())
              );
              const color = option ? SOLID_COLOR_MAP[option.value] || '#6b7280' : '#6b7280';
              const shortLabel = option?.shortLabel || attr.substring(0, 4);

              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                  {shortLabel}
                </span>
              );
            })}
            {atribuicoesUnicas.length > 3 && (
              <span className="text-[10px] text-zinc-400">+{atribuicoesUnicas.length - 3}</span>
            )}
          </div>

          {/* Badge de Urgencia - Apenas quando realmente urgente */}
          {urgency && urgency.level !== "normal" && (
            <span className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
              urgency.color === "rose" && "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400",
              urgency.color === "amber" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
              urgency.pulse && "animate-pulse"
            )}>
              <AlertCircle className="w-3 h-3" />
              {urgency.level}
            </span>
          )}
        </div>

        {/* 3. Local de Prisao (se preso) */}
        {isPreso && assistido.unidadePrisional && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30">
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-xs text-rose-700 dark:text-rose-400 truncate">{assistido.unidadePrisional}</span>
          </div>
        )}

        {/* 4. Inline Stats */}
        <div className="flex items-center gap-3 px-1">
          <Link
            href={`/admin/processos?assistido=${assistido.id}`}
            className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <Scale className="w-3.5 h-3.5" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{assistido.processosAtivos || 0}</span>
            <span>proc.</span>
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">&middot;</span>
          <Link
            href={`/admin/demandas?assistido=${assistido.id}`}
            className={cn(
              "flex items-center gap-1.5 text-xs transition-colors",
              assistido.demandasAbertas > 0
                ? "text-amber-600 dark:text-amber-400 hover:text-amber-700"
                : "text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400"
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="font-semibold">{assistido.demandasAbertas || 0}</span>
            <span>dem.</span>
          </Link>
          <span className="text-zinc-300 dark:text-zinc-600">&middot;</span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Brain className="w-3.5 h-3.5" />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{score}</span>
          </div>
        </div>

        {/* 5. Proxima Audiencia Compact */}
        {assistido.proximaAudiencia && (
          <div className={cn(
            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-200 hover:shadow-sm",
            audienciaHoje
              ? "bg-amber-50/80 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/40"
              : audienciaAmanha
                ? "bg-blue-50/80 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/40"
                : "bg-zinc-50/80 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/40"
          )}>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
              audienciaHoje && "bg-amber-500 text-white",
              audienciaAmanha && "bg-blue-500 text-white",
              !audienciaHoje && !audienciaAmanha && "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
            )}>
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wide",
                  audienciaHoje && "text-amber-700 dark:text-amber-400",
                  audienciaAmanha && "text-blue-700 dark:text-blue-400",
                  !audienciaHoje && !audienciaAmanha && "text-zinc-600 dark:text-zinc-300"
                )}>
                  {audienciaHoje ? "HOJE" : audienciaAmanha ? "AMANHA" : format(parseISO(assistido.proximaAudiencia), "dd/MM")}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  {format(parseISO(assistido.proximaAudiencia), "HH:mm")}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                  &middot; {assistido.tipoProximaAudiencia || "Audiencia"}
                </span>
              </div>
            </div>
            {(audienciaHoje || audienciaAmanha) && (
              <div className={cn(
                "w-2 h-2 rounded-full shrink-0",
                audienciaHoje && "bg-amber-500 animate-pulse",
                audienciaAmanha && "bg-blue-500"
              )} />
            )}
          </div>
        )}

        {/* 6. Crime Principal — inline */}
        {assistido.crimePrincipal && (
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 px-1">
            <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mr-1">Tipo:</span>
            {assistido.crimePrincipal}
          </p>
        )}

        {/* 7. Numero do Processo — inline */}
        {assistido.numeroProcesso && (
          <div
            className="flex items-center gap-1.5 px-1 cursor-pointer group/copy"
            onClick={handleCopyProcesso}
          >
            <Scale className="w-3 h-3 text-zinc-400" />
            <span className="font-mono tabular-nums text-[10px] text-zinc-400 dark:text-zinc-500 truncate flex-1">
              {assistido.numeroProcesso}
            </span>
            {copied ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            ) : (
              <Copy className="w-3 h-3 text-zinc-300 group-hover/copy:text-zinc-400 transition-colors" />
            )}
          </div>
        )}
      </div>

      {/* Footer com acoes e expansao */}
      <div className="px-4 py-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
        {/* Acoes Rapidas Inline */}
        <div className="flex items-center gap-1">
          {/* Botao Quick Actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                onClick={() => setShowQuickActions(true)}
              >
                <Zap className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px]">Acoes Rapidas</TooltipContent>
          </Tooltip>

          {onPreview && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPreview(); }}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">Visualizacao rapida</TooltipContent>
            </Tooltip>
          )}

          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

          {whatsappUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Button>
                </a>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-[10px]">WhatsApp</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/admin/drive?assistido=${assistido.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20">
                  <FolderOpen className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px]">Drive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={`/admin/demandas/nova?assistido=${assistido.id}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px]">Nova Demanda</TooltipContent>
          </Tooltip>
        </div>

        {/* Botao Expandir */}
        <button
          className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>{isExpanded ? "Menos detalhes" : "Mais detalhes"}</span>
          <ChevronDown className={cn(
            "w-3.5 h-3.5 transition-transform",
            isExpanded && "rotate-180"
          )} />
        </button>
      </div>

      {/* Secao Expandida Premium */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent>
          <div className="px-4 py-4 space-y-4 border-t border-zinc-100 dark:border-zinc-800 bg-gradient-to-b from-zinc-50/50 to-white dark:from-zinc-900/50 dark:to-zinc-900">

            {/* Contato Premium */}
            {(assistido.telefone || assistido.telefoneContato) && (
              <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Contato
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {assistido.telefone || assistido.telefoneContato}
                    </p>
                    {assistido.nomeContato && (
                      <p className="text-[10px] text-zinc-400">Responsavel: {assistido.nomeContato}</p>
                    )}
                  </div>
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Timeline Premium */}
            <div className="p-3 rounded-lg bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1">
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
                        {format(parseISO(assistido.proximaAudiencia), "dd/MM/yyyy 'as' HH:mm")}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {assistido.tipoProximaAudiencia || "Audiencia"} - Proxima
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
                      <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                        {assistido.ultimoEvento.data ? format(parseISO(assistido.ultimoEvento.data), "dd/MM/yyyy") : ""}
                      </p>
                      <p className="text-[10px] text-zinc-500">{assistido.ultimoEvento.titulo}</p>
                    </div>
                  </div>
                )}
                {/* Cadastro */}
                <div className="relative">
                  <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center">
                    <User className="w-2 h-2 text-white" />
                  </div>
                  <div className="ml-3">
                    <p className="text-xs text-zinc-400">
                      {format(new Date(assistido.createdAt), "dd/MM/yyyy")}
                    </p>
                    <p className="text-[10px] text-zinc-400">Cadastro no sistema</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Acoes Completas */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link href={`/admin/processos?assistido=${assistido.id}`}>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1">
                    <Scale className="w-3 h-3" />
                    Processos
                  </Button>
                </Link>
                <Link href={`/admin/audiencias?assistido=${assistido.id}`}>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1">
                    <Calendar className="w-3 h-3" />
                    Audiencias
                  </Button>
                </Link>
              </div>
              {onPreview && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2 gap-1 focus-visible:ring-2 focus-visible:ring-emerald-500/30 focus-visible:ring-offset-1"
                  onClick={onPreview}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </Button>
              )}
              <Link href={`/admin/assistidos/${assistido.id}`} className="flex-shrink-0">
                <Button size="sm" className="h-6 text-[10px] px-2 gap-1 bg-zinc-800 hover:bg-emerald-600 dark:bg-zinc-700 dark:hover:bg-emerald-600">
                  Ver Perfil
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
