"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { PageLayout } from "@/components/shared/page-layout";
import { JuriTabsView } from "@/components/juri/juri-tabs-view";
import { trpc } from "@/lib/trpc/client";

export default function SessaoJuriPage() {
  const params = useParams();
  const sessaoId = params.id as string;

  const { data: sessaoRaw, isLoading } = trpc.juri.getById.useQuery(
    { id: Number(sessaoId) },
    { enabled: !!sessaoId && !isNaN(Number(sessaoId)) }
  );

  if (isLoading) {
    return (
      <PageLayout>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (!sessaoRaw) {
    return (
      <PageLayout>
        <div className="text-center py-20">
          <h2 className="text-lg font-semibold text-foreground">
            Sessão não encontrada
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            A sessão #{sessaoId} não existe ou foi removida.
          </p>
          <Link href="/admin/juri">
            <Button variant="outline" className="mt-4 cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Sessões
            </Button>
          </Link>
        </div>
      </PageLayout>
    );
  }

  // Adaptar dados do banco para o formato que JuriTabsView espera
  const sessao = {
    id: sessaoRaw.id,
    data: new Date(sessaoRaw.dataSessao),
    tipo: "PLENARIO" as const,
    status: sessaoRaw.status?.toUpperCase() || "AGENDADO",
    local: sessaoRaw.sala || "Sala do Júri",
    juiz: sessaoRaw.juizPresidente || "",
    promotor: sessaoRaw.promotor || "",
    reus: [
      {
        id: sessaoRaw.id,
        nome: sessaoRaw.assistidoNome || "Réu não identificado",
        crime: sessaoRaw.tipoPenal || "",
        artigo: "",
        numeroAutos: "",
      },
    ],
    testemunhas: {
      acusacao: 0,
      defesa: 0,
      ouvidas: 0,
    },
    jurados: {
      convocados: 25,
      presentes: 0,
      selecionados: 0,
    },
    observacoes: sessaoRaw.observacoes || "",
  };

  return (
    <PageLayout
      actions={
        <div className="flex items-center gap-2">
          <Link href="/admin/juri">
            <Button variant="outline" size="sm" className="cursor-pointer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          </Link>
          <Link href={`/admin/juri/registro/${sessaoId}`}>
            <Button variant="outline" size="sm" className="cursor-pointer">
              <Edit className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Registro</span>
            </Button>
          </Link>
          <Link href={`/admin/juri/avaliacao/${sessaoId}`}>
            <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 cursor-pointer">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Avaliação</span>
            </Button>
          </Link>
        </div>
      }
    >
      <JuriTabsView sessaoId={sessaoId} sessao={sessao} />
    </PageLayout>
  );
}
