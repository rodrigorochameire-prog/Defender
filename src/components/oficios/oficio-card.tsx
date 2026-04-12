"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  MoreVertical,
  ExternalLink,
  Copy,
  Pencil,
  Archive,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface OficioCardProps {
  oficio: {
    id: number;
    titulo: string;
    metadata: {
      tipoOficio?: string;
      destinatario?: string;
      urgencia?: string;
      status?: string;
    } | null;
    geradoPorIA: boolean | null;
    googleDocUrl: string | null;
    assistidoNome: string | null;
    processoNumero: string | null;
    modeloTitulo: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  onDuplicate?: (id: number) => void;
  onArchive?: (id: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  rascunho: { label: "Rascunho", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20", icon: Pencil },
  revisao: { label: "Em Revisao", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", icon: Clock },
  enviado: { label: "Enviado", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  arquivado: { label: "Arquivado", color: "bg-neutral-500/10 text-neutral-500 dark:text-neutral-400 border-neutral-500/20", icon: Archive },
};

const TIPO_LABELS: Record<string, string> = {
  requisitorio: "Requisitorio",
  comunicacao: "Comunicacao",
  encaminhamento: "Encaminhamento",
  solicitacao_providencias: "Solic. Providencias",
  intimacao: "Intimacao",
  pedido_informacao: "Pedido de Info",
  manifestacao: "Manifestacao",
  representacao: "Representacao",
  parecer_tecnico: "Parecer Tecnico",
  convite: "Convite",
  resposta_oficio: "Resposta",
  certidao: "Certidao",
};

export function OficioCard({ oficio, onDuplicate, onArchive }: OficioCardProps) {
  const meta = oficio.metadata || {};
  const statusKey = meta.status || "rascunho";
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.rascunho;
  const StatusIcon = statusCfg.icon;
  const tipoLabel = TIPO_LABELS[meta.tipoOficio || ""] || meta.tipoOficio || "Oficio";

  const urgenciaColor =
    meta.urgencia === "urgentissimo"
      ? "border-l-red-500"
      : meta.urgencia === "urgente"
        ? "border-l-amber-500"
        : "border-l-neutral-300 dark:border-l-neutral-600";

  return (
    <div
      className={`group relative rounded-xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white dark:bg-neutral-900 p-4
        shadow-sm shadow-black/[0.04] hover:shadow-md hover:shadow-black/[0.08] transition-all duration-200 border-l-4 ${urgenciaColor}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusCfg.label}
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground border-border">
              {tipoLabel}
            </Badge>
            {oficio.geradoPorIA && (
              <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
            )}
          </div>

          <Link
            href={`/admin/oficios/${oficio.id}`}
            className="block"
          >
            <h3 className="font-medium text-foreground truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer">
              {oficio.titulo}
            </h3>
          </Link>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            {oficio.assistidoNome && (
              <span className="truncate max-w-[200px]">{oficio.assistidoNome}</span>
            )}
            {oficio.processoNumero && (
              <span className="font-mono truncate max-w-[220px]">
                {oficio.processoNumero}
              </span>
            )}
            {meta.destinatario && (
              <span className="truncate max-w-[150px]">
                <Send className="w-3 h-3 inline mr-0.5" />
                {meta.destinatario}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground/50">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(oficio.updatedAt), {
              addSuffix: true,
              locale: ptBR,
            })}
            {oficio.modeloTitulo && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{oficio.modeloTitulo}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {oficio.googleDocUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-emerald-500 dark:hover:text-emerald-400"
              asChild
            >
              <a href={oficio.googleDocUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/admin/oficios/${oficio.id}`}>
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Editar
                </Link>
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(oficio.id)}>
                  <Copy className="w-3.5 h-3.5 mr-2" /> Duplicar
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem onClick={() => onArchive(oficio.id)}>
                  <Archive className="w-3.5 h-3.5 mr-2" /> Arquivar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
