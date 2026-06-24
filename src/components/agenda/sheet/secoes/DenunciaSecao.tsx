"use client";

import { ExternalLink, Loader2, ScrollText } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { secoesPorTipo } from "@/lib/agenda/secao-classificada";

/** Monta o deep-link do PDF, ancorando na página inicial quando houver. */
function linkExordial(link: string | null, pagina: number | null): string | null {
  if (!link) return null;
  return pagina ? `${link}#page=${pagina}` : link;
}

/**
 * Denúncia — termos da exordial (verbatim, p/ o princípio da correlação).
 *
 * Lê as seções classificadas do processo (`drive.sectionsByProcesso`) e exibe
 * o texto literal da denúncia como citação. Sem seção classificada, cai no
 * resumo (`narrativa_denuncia`) com aviso de que é resumo, não verbatim.
 */
export function DenunciaSecao({
  processoId,
  fallbackResumo,
}: {
  processoId: number | null;
  fallbackResumo?: string | null;
}) {
  const { data, isLoading } = trpc.drive.sectionsByProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: typeof processoId === "number", retry: false },
  );

  const secoes = secoesPorTipo(data ?? [], ["denuncia", "recebimento_denuncia"]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando termos da exordial…
      </div>
    );
  }

  // Caminho feliz: há seção classificada → verbatim citável.
  if (secoes.length > 0) {
    return (
      <div className="space-y-3">
        {secoes.map((s, i) => {
          const href = linkExordial(s.fileWebViewLink, s.paginaInicio);
          return (
            <div key={`${s.fileDriveId ?? "den"}-${i}`} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                  <ScrollText className="h-3 w-3 text-neutral-400" /> Termos da exordial
                </span>
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 ring-1 ring-inset ring-neutral-200 transition-colors hover:bg-neutral-50 hover:text-neutral-700 dark:ring-neutral-700 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <ExternalLink className="h-2.5 w-2.5" /> ver na exordial
                  </a>
                )}
              </div>
              {s.textoExtraido ? (
                <blockquote className="whitespace-pre-wrap border-l-2 border-neutral-300 pl-3 font-serif text-[13px] leading-relaxed text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
                  {s.textoExtraido}
                </blockquote>
              ) : (
                <p className="text-xs italic text-neutral-400">
                  Seção da denúncia localizada, mas sem texto extraído. Use “ver na exordial”.
                </p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: resumo (não verbatim).
  if (fallbackResumo) {
    return (
      <div className="space-y-1.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          resumo da denúncia — não é o texto literal da exordial
        </span>
        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {fallbackResumo}
        </p>
      </div>
    );
  }

  return (
    <p className="text-xs text-neutral-400">
      Denúncia não disponível — nenhuma seção classificada nem resumo nos autos.
    </p>
  );
}
