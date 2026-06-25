"use client";

import { use } from "react";
import { IntimacoesStagingView } from "@/components/demandas-premium/intimacoes-staging-view";

export default function ImportarIntimacoesPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  return <IntimacoesStagingView jobId={Number(jobId)} />;
}
