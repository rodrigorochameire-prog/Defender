"use client";

import { useEffect, useState } from "react";

/**
 * Retorna `true` enquanto houver um Radix Dialog/Sheet/AlertDialog aberto na
 * página (qualquer `[role="dialog"][data-state="open"]`). Útil para esconder
 * FABs flutuantes que, fixos no canto, se sobrepõem à barra de ação de um sheet
 * lateral. Não dispara para Popover/Tooltip (esses não usam role="dialog").
 */
export function useDialogOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () =>
      setOpen(!!document.querySelector('[role="dialog"][data-state="open"]'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    return () => obs.disconnect();
  }, []);

  return open;
}
