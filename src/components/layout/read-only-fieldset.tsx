"use client";

import { ReactNode } from "react";
import { useIsViewingAsPeer } from "@/hooks/use-is-viewing-as-peer";

// Envolve o conteúdo em <fieldset disabled> quando o admin está
// visualizando como outro defensor. Desabilita nativamente todos
// os <button>, <input>, <select>, <textarea> descendentes.
// O `contents` className faz o fieldset não participar do layout.
export function ReadOnlyFieldset({ children }: { children: ReactNode }) {
  const isViewingAsPeer = useIsViewingAsPeer();

  return (
    <fieldset
      disabled={isViewingAsPeer}
      className="border-0 p-0 m-0 min-w-0 contents"
      data-read-only={isViewingAsPeer || undefined}
    >
      {children}
    </fieldset>
  );
}
