"use client";

import { trpc } from "@/lib/trpc/client";

type MedidasInput =
  | { processoId: number | null | undefined; processoVvdId?: undefined }
  | { processoVvdId: number | null | undefined; processoId?: undefined };

/**
 * Hook que encapsula a query trpc.mpu.listMedidas para reuso pelo
 * MedidasVigentesPanel e pelo EventDetailSheet (e qualquer outro consumidor).
 *
 * Aceita o mesmo tipo de entrada que o panel: ou { processoId } ou
 * { processoVvdId }. A prioridade espelha a lógica do panel:
 * processoVvdId tem precedência quando fornecido e não-nulo.
 *
 * Retorna:
 *  - medidas: array de medidas ([] quando vazio ou loading)
 *  - qtd: atalho para medidas.length
 *  - processoVvdId: o processoVvdId resolvido pelo backend (útil para mutations)
 *  - isLoading: true enquanto a query está em andamento
 */
export function useMedidasVigentes(input: MedidasInput) {
  const processoVvdId =
    "processoVvdId" in input && input.processoVvdId != null
      ? input.processoVvdId
      : undefined;
  const processoId =
    processoVvdId == null &&
    "processoId" in input &&
    input.processoId != null
      ? input.processoId
      : undefined;

  const query = trpc.mpu.listMedidas.useQuery(
    { processoVvdId, processoId },
    { enabled: processoVvdId != null || processoId != null },
  );

  const medidas = query.data?.medidas ?? [];
  const resolvedProcessoVvdId = query.data?.processoVvdId ?? null;

  return {
    medidas,
    qtd: medidas.length,
    processoVvdId: resolvedProcessoVvdId,
    isLoading: query.isLoading,
  };
}
