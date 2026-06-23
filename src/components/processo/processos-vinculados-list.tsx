"use client";

import { trpc } from "@/lib/trpc/client";
import { ProcessoVinculadoRow } from "./processo-vinculado-row";
import { NovoProcessoVinculadoButton } from "./novo-processo-vinculado-button";

interface Props {
  processoId: number;
  /** Renderiza um botão "Novo vinculado" no final da lista. */
  showCreateButton?: boolean;
  /** Marca a linha como "atual" para destaque visual. */
  currentId?: number;
  /** Variante visual. "dark" para o header escuro, "light" default. */
  variant?: "dark" | "light";
}

export function ProcessosVinculadosList({
  processoId,
  showCreateButton,
  currentId,
  variant = "light",
}: Props) {
  const { data: vinculados = [], isLoading } = trpc.processos.vinculados.useQuery({ processoId });

  if (isLoading) return null;
  if (vinculados.length === 0 && !showCreateButton) return null;

  const principal = vinculados.find((p) => p.processoOrigemId === null);
  const incidentais = vinculados.filter((p) => p.processoOrigemId !== null);
  const principalId = principal?.id ?? processoId;

  return (
    <div className="space-y-0.5">
      {principal && (
        <ProcessoVinculadoRow
          proc={principal}
          hierarchy="principal"
          isCurrent={principal.id === currentId}
          variant={variant}
        />
      )}
      {incidentais.map((p) => (
        <ProcessoVinculadoRow
          key={p.id}
          proc={p}
          hierarchy="incidental"
          isCurrent={p.id === currentId}
          variant={variant}
        />
      ))}
      {showCreateButton && (
        <div className={incidentais.length > 0 ? "ml-4 pt-1" : "pt-1"}>
          <NovoProcessoVinculadoButton processoOrigemId={principalId} variant={variant} />
        </div>
      )}
    </div>
  );
}
