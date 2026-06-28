// src/app/(dashboard)/admin/carreira/page.tsx
"use client";

import { trpc } from "@/lib/trpc/client";
import { CarreiraCockpit } from "./_components/carreira-cockpit";
import { CoberturaRollupView } from "./_components/cobertura-rollup-view";

export default function CarreiraPage() {
  const { data: me, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  }

  // Admin/coordenador → rollup operacional; demais → cockpit pessoal.
  if (me?.role === "admin") {
    return <CoberturaRollupView />;
  }
  return <CarreiraCockpit />;
}
