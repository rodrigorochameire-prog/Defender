"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  CheckCircle,
  XCircle,
  Scissors,
  Eye,
  Loader2,
  FileText,
  User,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { TIPO_LABELS, TIPO_TO_TIER, TIER_CONFIG } from "@/components/drive/SectionCard";

const PdfViewerModal = dynamic(
  () => import("@/components/drive/PdfViewerModal").then((m) => m.PdfViewerModal),
  { ssr: false },
);

interface PecaPreviewProps {
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
    fileId: number;
    fileName: string;
    fileWebViewLink: string | null;
    fileDriveId: string | null;
  } | null;
  onUpdated?: () => void;
}

export function PecaPreview({ section, onUpdated }: PecaPreviewProps) {
  const [showPdf, setShowPdf] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedLink, setExtractedLink] = useState<string | null>(null);

  const approveMutation = trpc.documentSections.approveSection.useMutation({
    onSuccess: () => onUpdated?.(),
  });
  const rejectMutation = trpc.documentSections.rejectSection.useMutation({
    onSuccess: () => onUpdated?.(),
  });
  const extractMutation = trpc.documentSections.extractSectionToPdf.useMutation({
    onSuccess: (data) => {
      setExtractError(null);
      setExtractedLink(data.webViewLink || null);
      onUpdated?.();
    },
    onError: (err) => setExtractError(err.message),
  });

  if (!section) {
    return (
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50/40 dark:bg-neutral-900/40 p-12 text-center flex-1 flex flex-col items-center justify-center">
        <FileText className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mb-3" />
        <p className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">Selecione uma peça</p>
        <p className="text-xs text-neutral-500 mt-1">Clique num item da lista à esquerda para ver detalhes</p>
      </div>
    );
  }

  const tier = TIPO_TO_TIER[section.tipo] || "baixo";
  const tierConfig = TIER_CONFIG[tier];
  const tipoLabel = TIPO_LABELS[section.tipo] || section.tipo;
  const meta = section.metadata as any;
  const pessoas = meta?.pessoas as Array<{ nome: string; papel: string; descricao?: string }> | undefined;
  const cronologia = meta?.cronologia as Array<{ data: string; descricao: string }> | undefined;
  const teses = meta?.tesesDefensivas as Array<{ tipo: string; descricao: string; confianca?: number }> | undefined;
  const contradicoes = meta?.contradicoes as string[] | undefined;
  const fase = meta?.fase as string | undefined;

  const pageRange = section.paginaInicio === section.paginaFim
    ? `Página ${section.paginaInicio}`
    : `Páginas ${section.paginaInicio}–${section.paginaFim}`;

  const pageCount = section.paginaFim - section.paginaInicio + 1;

  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 overflow-hidden flex flex-col flex-1">
      <div className="p-5 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={tierConfig.color}>{tipoLabel}</Badge>
              {fase && (
                <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800/50">
                  {fase === "inquerito" ? "Delegacia" : fase === "instrucao" ? "Juízo" : "Plenário"}
                </Badge>
              )}
              {section.confianca !== null && (
                <Badge
                  variant="outline"
                  className={
                    section.confianca >= 90
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300"
                      : section.confianca >= 70
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300"
                      : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300"
                  }
                >
                  {section.confianca}% confiança
                </Badge>
              )}
              {section.reviewStatus === "approved" && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Aprovada</Badge>
              )}
              {section.reviewStatus === "rejected" && (
                <Badge className="bg-red-100 text-red-800 border-red-200">Rejeitada</Badge>
              )}
            </div>

            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mt-2">
              {section.titulo}
            </h2>

            <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
              <FileText className="w-3.5 h-3.5" />
              <span className="truncate">{section.fileName}</span>
              <span>•</span>
              <span className="font-mono">{pageRange}</span>
              <span>•</span>
              <span>{pageCount} {pageCount === 1 ? "página" : "páginas"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {section.fileId && section.fileName.endsWith(".pdf") && section.fileDriveId && (
            <Button
              size="sm"
              onClick={() => setShowPdf(true)}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Visualizar
            </Button>
          )}

          <Button
            size="sm"
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => extractMutation.mutate({ sectionId: section.id })}
            disabled={extractMutation.isPending}
          >
            {extractMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Scissors className="w-3.5 h-3.5 mr-1.5" />
            )}
            Fatiar PDF
          </Button>

          {section.reviewStatus !== "approved" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => approveMutation.mutate({ id: section.id })}
              disabled={approveMutation.isPending}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
              )}
              Aprovar
            </Button>
          )}

          {section.reviewStatus !== "rejected" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => rejectMutation.mutate({ id: section.id })}
              disabled={rejectMutation.isPending}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {rejectMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
              )}
              Rejeitar
            </Button>
          )}

          {section.fileWebViewLink && (
            <Button size="sm" variant="outline" asChild>
              <a href={section.fileWebViewLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                Drive
              </a>
            </Button>
          )}

          {extractedLink && (
            <Button size="sm" variant="outline" asChild className="text-emerald-700 border-emerald-200">
              <a href={extractedLink} target="_blank" rel="noopener noreferrer">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Abrir fatiado
              </a>
            </Button>
          )}
        </div>

        {extractError && (
          <p className="text-xs text-red-600 bg-red-50 p-2 rounded-md mt-3 border border-red-200">
            Erro ao fatiar: {extractError}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {section.resumo && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Resumo IA
            </h3>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              {section.resumo}
            </p>
          </div>
        )}

        {pessoas && pessoas.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
              <User className="w-3 h-3" />
              Pessoas ({pessoas.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {pessoas.map((p, i) => (
                <Badge key={i} variant="outline" className="bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500 text-[10px] uppercase tracking-wide mr-1">{p.papel}</span>
                  {p.nome}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {cronologia && cronologia.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Cronologia
            </h3>
            <div className="space-y-1.5 border-l-2 border-neutral-200 dark:border-neutral-700 pl-3">
              {cronologia.map((c, i) => (
                <div key={i} className="text-sm">
                  <span className="font-mono text-xs text-neutral-500">{c.data}</span>
                  <p className="text-neutral-700 dark:text-neutral-300">{c.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {teses && teses.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Teses Defensivas ({teses.length})
            </h3>
            <div className="space-y-2">
              {teses.map((t, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                      {t.tipo}
                    </Badge>
                    {t.confianca !== undefined && (
                      <span className="text-[10px] font-mono text-emerald-600">{t.confianca}%</span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{t.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {contradicoes && contradicoes.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Contradições
            </h3>
            <div className="space-y-1.5">
              {contradicoes.map((c, i) => (
                <p
                  key={i}
                  className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-md border border-amber-100 dark:border-amber-900/40"
                >
                  {c}
                </p>
              ))}
            </div>
          </div>
        )}

        {section.textoExtraido && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Trecho Original
            </h3>
            <div className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-md border border-neutral-200 dark:border-neutral-800 max-h-80 overflow-y-auto font-mono leading-relaxed">
              {section.textoExtraido}
            </div>
          </div>
        )}
      </div>

      {showPdf && section.fileId && section.fileDriveId && (
        <PdfViewerModal
          isOpen={showPdf}
          onClose={() => setShowPdf(false)}
          fileId={section.fileId}
          fileName={section.fileName}
          pdfUrl={`/api/drive/proxy?fileId=${section.fileDriveId}`}
        />
      )}
    </div>
  );
}
