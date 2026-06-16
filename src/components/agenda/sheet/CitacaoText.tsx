import React from "react";

/**
 * Realça referências processuais do PJe dentro de um texto corrido, como chips
 * monoespaçados sutis — melhora a leitura sem competir com a prosa:
 *   "Num. 542952637 - Pág. 1", "(Num. 543874521)", "ID 544052805", "fl. 2", "fls. 4 a 19".
 * Uma só captura no regex → índices ímpares do split são as referências.
 */
const REF_RE =
  /(\(?\b(?:Num\.\s*\d+\s*-\s*P[áa]g\.\s*[\d/–-]+|ID\s*n?\.?\s*º?\s*\d+|fls?\.\s*\d+(?:\s*(?:a|e|–|-)\s*\d+)?)\)?)/g;

export function CitacaoText({
  texto,
  className = "text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap",
}: {
  texto: string;
  className?: string;
}) {
  const parts = texto.split(REF_RE);
  return (
    <p className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            className="mx-0.5 inline-block rounded bg-neutral-100 px-1 font-mono text-[11px] leading-tight tracking-tight text-neutral-500 align-baseline dark:bg-neutral-800 dark:text-neutral-400"
          >
            {part.replace(/^\(|\)$/g, "")}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </p>
  );
}
