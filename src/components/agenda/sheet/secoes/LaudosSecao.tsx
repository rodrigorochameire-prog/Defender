"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink, Loader2, Microscope } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { secoesPorTipo, type SecaoClassificada } from "@/lib/agenda/secao-classificada";

/** Texto de um item de laudo da análise IA (`ad.laudos`), mesma lógica de antes. */
function rotuloLaudo(l: unknown): string {
  if (typeof l === "string") return l;
  const o = (l ?? {}) as Record<string, unknown>;
  return (
    (o.nome as string) ??
    (o.titulo as string) ??
    JSON.stringify(l)
  );
}

function rotuloLacuna(l: unknown): string {
  if (typeof l === "string") return l;
  const o = (l ?? {}) as Record<string, unknown>;
  return (o.descricao as string) ?? JSON.stringify(l);
}

function linkLaudo(s: SecaoClassificada): string | null {
  if (!s.fileWebViewLink) return null;
  return s.paginaInicio ? `${s.fileWebViewLink}#page=${s.paginaInicio}` : s.fileWebViewLink;
}

function SecaoLaudoVerbatim({ secao }: { secao: SecaoClassificada }) {
  const [open, setOpen] = useState(false);
  const href = linkLaudo(secao);
  return (
    <div className="rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300">
          <Microscope className="h-3 w-3 text-purple-500" />
          {secao.tipo}
        </span>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 ring-1 ring-inset ring-neutral-200 transition-colors hover:bg-neutral-50 hover:text-neutral-700 dark:ring-neutral-700 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <ExternalLink className="h-2.5 w-2.5" /> ver laudo
          </a>
        )}
      </div>
      {secao.textoExtraido && (
        <div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 cursor-pointer"
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
            {open ? "Ocultar teor do laudo" : "Ver teor do laudo"}
          </button>
          {open && (
            <p className="mt-1.5 max-h-64 overflow-y-auto rounded-lg ring-1 ring-neutral-200 dark:ring-neutral-800 p-2.5 text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
              {secao.textoExtraido}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Laudos e Perícias — análise IA (`ad.laudos`) + seções classificadas do laudo
 * (deep-link ao PDF + teor verbatim expansível). Mantém a subseção de lacunas.
 */
export function LaudosSecao({
  processoId,
  laudos = [],
  lacunas = [],
}: {
  processoId: number | null;
  laudos?: unknown[];
  lacunas?: string[];
}) {
  const { data, isLoading } = trpc.drive.sectionsByProcesso.useQuery(
    { processoId: processoId ?? 0 },
    { enabled: typeof processoId === "number", retry: false },
  );

  const secoes = secoesPorTipo(data ?? [], ["laudo", "pericia"]);

  return (
    <div className="space-y-3">
      {/* Laudos da análise IA (lógica preservada). */}
      {laudos.length > 0 && (
        <ul className="space-y-1">
          {laudos.map((l, i) => (
            <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
              • {rotuloLaudo(l)}
            </li>
          ))}
        </ul>
      )}

      {/* Seções classificadas do laudo: deep-link + teor verbatim. */}
      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando laudos nos autos…
        </div>
      )}
      {secoes.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium text-neutral-400">Laudos nos autos</p>
          {secoes.map((s, i) => (
            <SecaoLaudoVerbatim key={`${s.fileDriveId ?? "laudo"}-${i}`} secao={s} />
          ))}
        </div>
      )}

      {laudos.length === 0 && secoes.length === 0 && !isLoading && (
        <p className="text-xs text-neutral-400">Nenhum laudo ou perícia identificado.</p>
      )}

      {/* Lacunas probatórias (preservado). */}
      {lacunas.length > 0 && (
        <div className="mt-1 pt-2 border-t border-neutral-100 dark:border-neutral-800/40">
          <p className="text-[10px] font-medium text-neutral-400 mb-1">Lacunas probatórias</p>
          <ul className="space-y-1">
            {lacunas.map((l, i) => (
              <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                • {rotuloLacuna(l)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
