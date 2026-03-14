"use client";

import { Fragment, useMemo } from "react";
import { cn } from "@/lib/utils";

// ==========================================
// CROSS-REFERENCE LINK - Detecta e renderiza
// referencias cruzadas em texto juridico
// ==========================================

interface CrossReferenceLinkProps {
  text: string;
  currentLeiId: string;
  onNavigate?: (leiId: string, artigoId: string) => void;
}

/** Padroes de referencia cruzada em texto juridico */
const REFERENCE_PATTERN =
  /\b(art(?:igo)?\.?\s*\d+(?:-[A-Z])?(?:\s*,?\s*(?:§|par[aá]grafo)\s*(?:\d+[ºo]?|[uú]nico))?(?:\s*,?\s*(?:inciso\s+)?[IVXLCDM]+)?(?:\s*,?\s*(?:al[ií]nea\s+)?[""]?[a-z][""]?)?(?:\s*,?\s*(?:do|da|d[oe]s)\s+[A-Z][A-Za-zÀ-ÿ./-]+)?)/gi;

type Segment = { type: "text"; value: string } | { type: "ref"; value: string; artigoNum: string; leiTarget?: string };

/** Extrai numero do artigo da referencia */
function extractArtigoNum(ref: string): string {
  const match = ref.match(/art(?:igo)?\.?\s*(\d+(?:-[A-Z])?)/i);
  return match ? match[1] : "";
}

/** Tenta extrair a lei alvo da referencia (e.g., "do CP", "do CPP") */
function extractLeiTarget(ref: string): string | undefined {
  const match = ref.match(/(?:do|da|d[oe]s)\s+([A-Z][A-Za-zÀ-ÿ./-]+)$/i);
  return match ? match[1].trim() : undefined;
}

/** Segmenta o texto em partes normais e referencias */
function parseReferences(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  const regex = new RegExp(REFERENCE_PATTERN.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    const refText = match[0];
    segments.push({
      type: "ref",
      value: refText,
      artigoNum: extractArtigoNum(refText),
      leiTarget: extractLeiTarget(refText),
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

export function CrossReferenceLink({
  text,
  currentLeiId,
  onNavigate,
}: CrossReferenceLinkProps) {
  const segments = useMemo(() => parseReferences(text), [text]);

  if (segments.length === 1 && segments[0].type === "text") {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          return <Fragment key={i}>{seg.value}</Fragment>;
        }

        const leiId = seg.leiTarget ?? currentLeiId;
        const artigoId = `art-${seg.artigoNum}`;

        return (
          <span
            key={i}
            title={`Ver Art. ${seg.artigoNum}${seg.leiTarget ? ` do ${seg.leiTarget}` : ""}`}
            className={cn(
              "cursor-pointer underline decoration-emerald-500/50 underline-offset-2",
              "text-emerald-600 dark:text-emerald-400",
              "hover:decoration-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-300",
              "transition-colors"
            )}
            onClick={() => onNavigate?.(leiId, artigoId)}
            role="link"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigate?.(leiId, artigoId);
              }
            }}
          >
            {seg.value}
          </span>
        );
      })}
    </>
  );
}
