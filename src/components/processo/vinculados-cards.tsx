// src/components/processo/vinculados-cards.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Users } from "lucide-react";
import Link from "next/link";
import { TYPO, CARD_STYLE } from "@/lib/config/design-tokens";

interface ProcessoVinculado {
  id: number;
  numeroAutos: string;
  classeProcessual: string | null;
  atribuicao: string;
  status?: string;
  countDocs?: number;
  countDepoimentos?: number;
}

interface VinculadosCardsProps {
  processos: ProcessoVinculado[];
}

const CLASSE_LABELS: Record<string, string> = {
  "Inquérito Policial": "IP",
  "Auto de Prisão em Flagrante": "APF",
  "Medidas Protetivas de Urgência": "MPU",
  "Execução da Pena": "EP",
  "Ação Penal": "AP",
  "Ação Penal de Competência do Júri": "AP Júri",
  "Incidente de Insanidade Mental": "IIM",
};

export function VinculadosCards({ processos }: VinculadosCardsProps) {
  if (processos.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <p className={TYPO.body + " text-muted-foreground"}>Nenhum processo vinculado.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-4">
      <p className={TYPO.label}>{processos.length} processo(s) vinculado(s)</p>
      <div className="space-y-3">
        {processos.map((p) => {
          const classeAbrev = CLASSE_LABELS[p.classeProcessual ?? ""] ?? p.classeProcessual ?? "Processo";
          return (
            <div key={p.id} className={CARD_STYLE.base + " space-y-2"}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">{classeAbrev}</Badge>
                  <span className={TYPO.mono + " text-sm"}>{p.numeroAutos}</span>
                </div>
                <Link href={`/admin/processos/${p.id}`}>
                  <Button variant="ghost" size="sm" className="gap-1">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </Button>
                </Link>
              </div>
              {p.classeProcessual && (
                <p className={TYPO.body + " text-muted-foreground"}>{p.classeProcessual}</p>
              )}
              <div className="flex items-center gap-4">
                {p.countDocs !== undefined && p.countDocs > 0 && (
                  <span className={TYPO.small + " text-muted-foreground flex items-center gap-1"}>
                    <FileText className="h-3.5 w-3.5" /> {p.countDocs} docs
                  </span>
                )}
                {p.countDepoimentos !== undefined && p.countDepoimentos > 0 && (
                  <span className={TYPO.small + " text-muted-foreground flex items-center gap-1"}>
                    <Users className="h-3.5 w-3.5" /> {p.countDepoimentos} depoimentos
                  </span>
                )}
              </div>
              <p className={TYPO.caption}>
                Dados integrados na aba Análise
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
