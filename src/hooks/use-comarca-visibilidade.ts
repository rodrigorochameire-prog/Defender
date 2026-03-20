"use client";

import { trpc } from "@/lib/trpc/client";

export function useComarcaVisibilidade() {
  const utils = trpc.useUtils();
  const { data } = trpc.settings.getComarcaVisibilidade.useQuery();
  const mutation = trpc.settings.setComarcaVisibilidade.useMutation({
    onSuccess: () => {
      utils.settings.getComarcaVisibilidade.invalidate();
      utils.assistidos.list.invalidate();
    },
  });

  return {
    verRMS: data?.verRMS ?? false,
    toggle: (verRMS: boolean) => mutation.mutate({ verRMS }),
    isLoading: mutation.isPending,
  };
}
