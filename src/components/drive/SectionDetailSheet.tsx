"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, FileText, User, Calendar, Shield, AlertTriangle, Scissors, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { TIPO_LABELS, TIPO_TO_TIER, TIER_CONFIG } from "./SectionCard";

interface SectionDetailSheetProps {
  section: {
    id: number;
    tipo: string;
    titulo: string;
    paginaInicio: number;
    paginaFim: number;
    resumo: string | null;
    textoExtraido: string | null;
    confianca: number | null;
    reviewStatus: string | null;
    fichaData: any;
    metadata: any;
    fileName: string;
    fileWebViewLink: string | null;
    fileId?: number;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSectionUpdated?: () => void;
}

export function SectionDetailSheet({ section, open, onOpenChange, onSectionUpdated }: SectionDetailSheetProps) {
  const utils = trpc.useUtils();

  const approveMutation = trpc.documentSections.approveSection.useMutation({
    onSuccess: () => onSectionUpdated?.(),
  });

  const rejectMutation = trpc.documentSections.rejectSection.useMutation({
    onSuccess: () => onSectionUpdated?.(),
  });

  const extractMutation = trpc.documentSections.extractSectionToPdf.useMutation({
    onSuccess: () => onSectionUpdated?.(),
  });

  if (!section) return null;

  const tier = TIPO_TO_TIER[section.tipo] || "baixo";
  const tierConfig = TIER_CONFIG[tier];
  const tipoLabel = TIPO_LABELS[section.tipo] || section.tipo;
  const meta = section.metadata as any;
  const pessoas = meta?.pessoas as Array<{ nome: string; papel: string; descricao?: string }> | undefined;
  const cronologia = meta?.cronologia as Array<{ data: string; descricao: string }> | undefined;
  const teses = meta?.tesesDefensivas as Array<{ tipo: string; descricao: string; confianca: number }> | undefined;
  const contradicoes = meta?.contradicoes as string[] | undefined;
  const pontosCriticos = meta?.pontosCriticos as string[] | undefined;
  const fase = meta?.fase as string | undefined;

  const pageRange = section.paginaInicio === section.paginaFim
    ? `Página ${section.paginaInicio}`
    : `Páginas ${section.paginaInicio}-${section.paginaFim}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0">
        <div className="p-4 border-b border-zinc-200 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={tierConfig.color}>{tipoLabel}</Badge>
            {fase && (
              <Badge variant="outline" className="bg-violet-50 text-violet-600 border-violet-200">
                {fase === "inquerito" ? "Inquérito" : fase === "instrucao" ? "Instrução" : "Plenário"}
              </Badge>
            )}
            {section.confianca !== null && (
              <Badge variant="outline" className={
                section.confianca >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                section.confianca >= 70 ? "bg-amber-50 text-amber-700 border-amber-200" :
                "bg-red-50 text-red-700 border-red-200"
              }>
                {section.confianca}% confiança
              </Badge>
            )}
          </div>
          <SheetTitle className="text-base">{section.titulo}</SheetTitle>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <FileText className="w-3.5 h-3.5" />
            <span className="truncate">{section.fileName}</span>
            <span className="font-mono">{pageRange}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {section.fileWebViewLink && (
              <Button variant="outline" size="sm" asChild>
                <a href={section.fileWebViewLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Abrir PDF
                </a>
              </Button>
            )}

            {section.reviewStatus !== "approved" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => approveMutation.mutate({ id: section.id })}
                disabled={approveMutation.isPending}
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                {approveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1.5" />}
                Aprovar
              </Button>
            )}

            {section.reviewStatus !== "rejected" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => rejectMutation.mutate({ id: section.id })}
                disabled={rejectMutation.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {rejectMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
                Rejeitar
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={() => extractMutation.mutate({ sectionId: section.id })}
              disabled={extractMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {extractMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5 mr-1.5" />}
              Extrair PDF
            </Button>

            {extractMutation.isSuccess && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                PDF extraído com sucesso
              </Badge>
            )}

            {section.reviewStatus === "approved" && (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Aprovada</Badge>
            )}
            {section.reviewStatus === "rejected" && (
              <Badge className="bg-red-50 text-red-600 border-red-200">Rejeitada</Badge>
            )}
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-4 space-y-4">
            {section.resumo && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Resumo</h4>
                <p className="text-sm text-zinc-700">{section.resumo}</p>
              </div>
            )}

            {pessoas && pessoas.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <User className="w-3 h-3" /> Pessoas ({pessoas.length})
                </h4>
                <div className="space-y-1.5">
                  {pessoas.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-[10px]">{p.papel}</Badge>
                      <span className="font-medium text-zinc-800">{p.nome}</span>
                      {p.descricao && <span className="text-zinc-500 text-xs">— {p.descricao}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cronologia && cronologia.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Cronologia ({cronologia.length})
                </h4>
                <div className="space-y-1.5 border-l-2 border-zinc-200 pl-3">
                  {cronologia.map((c, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-mono text-xs text-zinc-400">{c.data}</span>
                      <p className="text-zinc-700">{c.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {teses && teses.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Teses Defensivas ({teses.length})
                </h4>
                <div className="space-y-2">
                  {teses.map((t, i) => (
                    <div key={i} className="p-2 rounded bg-emerald-50/50 border border-emerald-100">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">{t.tipo}</Badge>
                        <span className="text-[10px] font-mono text-emerald-600">{t.confianca}%</span>
                      </div>
                      <p className="text-sm text-zinc-700 mt-1">{t.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {contradicoes && contradicoes.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Contradições ({contradicoes.length})
                </h4>
                <div className="space-y-1">
                  {contradicoes.map((c, i) => (
                    <p key={i} className="text-sm text-amber-700 bg-amber-50/50 p-2 rounded border border-amber-100">{c}</p>
                  ))}
                </div>
              </div>
            )}

            {pontosCriticos && pontosCriticos.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Pontos Críticos</h4>
                <ul className="space-y-1 list-disc list-inside">
                  {pontosCriticos.map((p, i) => (
                    <li key={i} className="text-sm text-zinc-700">{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {section.textoExtraido && (
              <div>
                <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Texto Extraído</h4>
                <div className="text-xs text-zinc-600 whitespace-pre-wrap bg-zinc-50 p-3 rounded border border-zinc-200 max-h-96 overflow-y-auto font-mono leading-relaxed">
                  {section.textoExtraido}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
