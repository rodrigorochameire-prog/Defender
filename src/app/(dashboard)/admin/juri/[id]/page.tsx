"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { PageLayout } from "@/components/shared/page-layout";
import { JuriTabsView } from "@/components/juri/juri-tabs-view";

// Mock data para demonstração
const MOCK_SESSAO = {
  id: 1,
  data: new Date(2026, 0, 25, 13, 30),
  tipo: "PLENARIO" as const,
  status: "AGENDADO" as const,
  local: "Fórum de Camaçari - Sala do Júri",
  juiz: "Dr. Roberto Almeida",
  promotor: "Dr. Carlos Eduardo",
  reus: [
    { 
      id: 1, 
      nome: "João Silva Santos", 
      crime: "Homicídio Qualificado", 
      artigo: "Art. 121, §2º, I e IV",
      numeroAutos: "0004567-89.2024.8.05.0000"
    },
  ],
  testemunhas: {
    acusacao: 3,
    defesa: 2,
    ouvidas: 4,
  },
  jurados: {
    convocados: 25,
    presentes: 0,
    selecionados: 0,
  },
  observacoes: "Réu preso. Verificar documentos de transferência.",
};

export default function SessaoJuriPage() {
  const params = useParams();
  const sessaoId = params.id as string;
  const sessao = MOCK_SESSAO;

  return (
    <PageLayout
      actions={
        <div className="flex items-center gap-2">
          <Link href="/admin/juri">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          <Link href={`/admin/juri/avaliacao/${sessaoId}`}>
            <Button variant="outline" size="sm" className="border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400">
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
