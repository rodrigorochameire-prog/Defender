"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { IntimacoesStagingView } from "@/components/demandas-premium/intimacoes-staging-view";

function ImportarIntimacoesInner({ jobId }: { jobId: number }) {
  const searchParams = useSearchParams();
  const system = searchParams.get("system") === "seeu" ? "seeu" : "pje";
  return <IntimacoesStagingView jobId={jobId} system={system} />;
}

export default function ImportarIntimacoesPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  return (
    <Suspense fallback={null}>
      <ImportarIntimacoesInner jobId={Number(jobId)} />
    </Suspense>
  );
}
