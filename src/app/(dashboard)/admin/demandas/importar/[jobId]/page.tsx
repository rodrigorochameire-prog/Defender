"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { IntimacoesStagingView } from "@/components/demandas-premium/intimacoes-staging-view";

export default function ImportarIntimacoesPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const searchParams = useSearchParams();
  const system = searchParams.get("system") === "seeu" ? "seeu" : "pje";
  return <IntimacoesStagingView jobId={Number(jobId)} system={system} />;
}
