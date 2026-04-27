"use client";

import { trpc } from "@/lib/trpc/client";

export function useDriveFolder(opts: {
  processoId?: number | null;
  assistidoId?: number | null;
}) {
  const processo = trpc.drive.getDriveStatusForProcesso.useQuery(
    { processoId: opts.processoId ?? 0 },
    { enabled: !!opts.processoId, retry: false }
  );
  const assistido = trpc.drive.getDriveStatusForAssistido.useQuery(
    { assistidoId: opts.assistidoId ?? 0 },
    { enabled: !!opts.assistidoId, retry: false }
  );

  return {
    processoFolderId: (processo.data as any)?.folderId ?? null,
    assistidoFolderId: (assistido.data as any)?.folderId ?? null,
    isLoading: processo.isLoading || assistido.isLoading,
    isDriveConnected:
      (processo.data as any)?.linked !== false ||
      (assistido.data as any)?.linked !== false,
  };
}
