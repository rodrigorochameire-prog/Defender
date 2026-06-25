"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { usePageHeader } from "@/components/layouts/page-header-context";
import { HeaderUtilityRow } from "@/components/layouts/header-utility-row";
import { HEADER_STYLE } from "@/lib/config/design-tokens";

interface EntityPageHeaderProps {
  /** Avatar/identidade visual à esquerda (ex.: AssistidoAvatar). */
  avatar?: ReactNode;
  /** Nome serifado da entidade — assinatura do OMBUDS, preservada na variante B. */
  name: string;
  /**
   * Metadados horizontais ao lado do nome (CPF, status, contato). São dispostos
   * na MESMA faixa do nome (não empilhados como banner).
   */
  metadata?: ReactNode;
  /** Ações primárias da entidade (WhatsApp, Atendimento). Alinhadas à direita. */
  actions?: ReactNode;
  /**
   * Faixa secundária opcional renderada logo abaixo da identidade, dentro do
   * mesmo bloco charcoal (ex.: a nav de abas do perfil).
   */
  belowBand?: ReactNode;
  className?: string;
}

/**
 * Header de **entidade** (variante B) — irmão do `CollapsiblePageHeader` (variante A,
 * matriz "Demandas"). Compartilha a mesma métrica: barra utilitária charcoal embedded
 * + container charcoal (`HEADER_STYLE`), mesma altura-base e ancoragem sticky. A
 * diferença é a face: a identidade da entidade (avatar + nome serifado + CPF/status)
 * é disposta HORIZONTALMENTE como cabeçalho — não como banner empilhado — para que a
 * transição lista→entidade pareça contínua e a faixa "Atenção Imediata" ganhe
 * protagonismo logo abaixo.
 */
export function EntityPageHeader({
  avatar,
  name,
  metadata,
  actions,
  belowBand,
  className,
}: EntityPageHeaderProps) {
  const { setHasPageHeader } = usePageHeader();

  // Registra presença de page header (mesma semântica do CollapsiblePageHeader).
  useEffect(() => {
    setHasPageHeader(true);
    return () => setHasPageHeader(false);
  }, [setHasPageHeader]);

  return (
    <div
      className={cn(
        "sticky top-0 z-50 shrink-0",
        HEADER_STYLE.shellShadow,
        className,
      )}
    >
      {/* Utility Bar — mesma moldura charcoal do header compartilhado (embedded). */}
      <div className={HEADER_STYLE.utilityRow}>
        <HeaderUtilityRow variant="embedded" />
      </div>

      {/* Faixa de identidade — container charcoal (mesmo token do CollapsiblePageHeader). */}
      <div
        data-entity-identity-band
        className={cn(HEADER_STYLE.container, "rounded-none overflow-visible")}
      >
        <div className="px-4 sm:px-5 py-3">
          <div
            data-entity-identity-row
            className="flex flex-wrap items-center gap-x-3 gap-y-2"
          >
            {avatar && <div className="shrink-0">{avatar}</div>}

            {/* Nome serifado + metadados, todos na MESMA faixa horizontal. */}
            <div className="flex flex-1 min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="font-serif text-[17px] font-semibold tracking-tight truncate text-white">
                {name}
              </h1>
              {metadata}
            </div>

            {actions && (
              <div className="flex shrink-0 items-center gap-2">{actions}</div>
            )}
          </div>
        </div>

        {belowBand}
      </div>
    </div>
  );
}
