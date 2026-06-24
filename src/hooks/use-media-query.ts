"use client";

import * as React from "react";

/**
 * Hook genérico de media query (mounted-safe). Retorna false na 1ª renderização
 * (SSR/pré-hidratação) e o valor real após montar — evita hydration mismatch.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
