"use client";

import { useParams } from "next/navigation";
import { TabDemandas } from "../_components/tab-demandas";
import { TabOficios } from "../_components/tab-oficios";
import { TabAtendimentos } from "../_components/tab-atendimentos";
import { TabInvestigacao } from "../_components/tab-investigacao";
import { TabAudiencias } from "../_components/tab-audiencias";
import { TabDocumentos } from "../_components/tab-documentos";
import { TabMidias } from "../_components/tab-midias";
import { TabPessoas } from "../_components/tab-pessoas";
import { TabCronologia } from "../_components/tab-cronologia";
import { TabDelitos } from "../_components/tab-delitos";
import { TabInstitutos } from "../_components/tab-institutos";
import { TabMpu } from "../_components/tab-mpu";
import { TabExecucaoPenal } from "../_components/tab-execucao-penal";
import { TabAtosInfracionais } from "../_components/tab-atos-infracionais";

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
    case "pessoas":
      return <TabPessoas casoId={casoId} />;
    case "cronologia":
      return <TabCronologia casoId={casoId} />;
    case "delitos":
      return <TabDelitos casoId={casoId} />;
    case "institutos":
      return <TabInstitutos casoId={casoId} />;
    case "mpu":
      return <TabMpu casoId={casoId} />;
    case "execucao-penal":
      return <TabExecucaoPenal casoId={casoId} />;
    case "atos-infracionais":
      return <TabAtosInfracionais casoId={casoId} />;
    default:
      return (
        <p className="p-4 italic text-neutral-400">Aba &quot;{aba}&quot; ainda não implementada.</p>
      );
  }
}
