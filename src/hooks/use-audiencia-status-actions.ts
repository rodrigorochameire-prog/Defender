"use client";

import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export function useAudienciaStatusActions(audienciaId: number | null) {
  const utils = trpc.useUtils();
  const invalidate = () => {
    if (audienciaId) {
      utils.audiencias.getAudienciaContext.invalidate({ audienciaId });
    }
  };

  const concluir = trpc.audiencias.marcarConcluida.useMutation({
    onSuccess: () => {
      toast.success("Audiência marcada como concluída");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const redesignar = trpc.audiencias.redesignarAudiencia.useMutation({
    onSuccess: () => {
      toast.success("Audiência redesignada");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const marcarOuvido = trpc.audiencias.marcarDepoenteOuvido.useMutation({
    onSuccess: () => {
      toast.success("Depoente marcado como ouvido");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const redesignarDep = trpc.audiencias.redesignarDepoente.useMutation({
    onSuccess: () => {
      toast.success("Depoente redesignado");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const addNote = trpc.audiencias.addQuickNote.useMutation({
    onSuccess: () => {
      toast.success("Anotação salva");
      invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return { concluir, redesignar, marcarOuvido, redesignarDep, addNote };
}
