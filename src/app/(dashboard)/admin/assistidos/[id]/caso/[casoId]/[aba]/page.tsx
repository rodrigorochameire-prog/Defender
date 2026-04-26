"use client";

import { useParams } from "next/navigation";
import { TabDemandas } from "../_components/tab-demandas";
import { TabOficios } from "../_components/tab-oficios";
import { TabAtendimentos } from "../_components/tab-atendimentos";
import { TabInvestigacao } from "../_components/tab-investigacao";

export default function CasoAbaPage() {
  const params = useParams();
  const casoId = Number(params?.casoId);
  const aba = String(params?.aba);

  switch (aba) {
    case "demandas":
      return <TabDemandas casoId={casoId} />;
    case "oficios":
      return <TabOficios casoId={casoId} />;
    case "atendimentos":
      return <TabAtendimentos casoId={casoId} />;
    case "investigacao":
      return <TabInvestigacao />;
    default:
      return (
        <p className="p-4 italic text-neutral-400">Aba &quot;{aba}&quot; ainda não implementada.</p>
      );
  }
}
