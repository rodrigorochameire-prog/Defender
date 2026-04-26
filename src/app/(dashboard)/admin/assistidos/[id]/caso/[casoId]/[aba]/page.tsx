"use client";

import { useParams } from "next/navigation";
import { TabDemandas } from "../_components/tab-demandas";
import { TabOficios } from "../_components/tab-oficios";
import { TabAtendimentos } from "../_components/tab-atendimentos";
import { TabInvestigacao } from "../_components/tab-investigacao";
import { TabAudiencias } from "../_components/tab-audiencias";
import { TabDocumentos } from "../_components/tab-documentos";
import { TabMidias } from "../_components/tab-midias";

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
    case "audiencias":
      return <TabAudiencias casoId={casoId} />;
    case "documentos":
      return <TabDocumentos casoId={casoId} />;
    case "midias":
      return <TabMidias casoId={casoId} />;
    default:
      return (
        <p className="p-4 italic text-neutral-400">Aba &quot;{aba}&quot; ainda não implementada.</p>
      );
  }
}
