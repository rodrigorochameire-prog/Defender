export function statusEventoDeParcela(status: string): "previsto" | "em_curso" | "concluido" {
  if (status === "em_fruicao") return "em_curso";
  if (status === "concluida") return "concluido";
  return "previsto"; // programada | homologada
}

function anoLabel(aquisitivoInicio: string, aquisitivoFim: string): string {
  const a = aquisitivoInicio.slice(0, 4);
  const b = aquisitivoFim.slice(0, 4);
  return a === b ? a : `${a}/${b}`;
}

export function tituloParcela(input: { aquisitivoInicio: string; aquisitivoFim: string; ordem: number }): string {
  return `Férias ${anoLabel(input.aquisitivoInicio, input.aquisitivoFim)} — ${input.ordem}ª parcela`;
}

export type ProjecaoEvento = {
  tipo: "FERIAS";
  cluster: "ausencias";
  titulo: string;
  dataEvento: string;
  dataFim: string;
  status: "previsto" | "em_curso" | "concluido";
  dados: { feriasParcelaId: number | null };
};

export function projecaoEventoDeParcela(
  parcela: { id: number | null; dataInicio: string; dataFim: string; status: string },
  periodo: { aquisitivoInicio: string; aquisitivoFim: string },
  ordem: number,
): ProjecaoEvento {
  return {
    tipo: "FERIAS",
    cluster: "ausencias",
    titulo: tituloParcela({ aquisitivoInicio: periodo.aquisitivoInicio, aquisitivoFim: periodo.aquisitivoFim, ordem }),
    dataEvento: parcela.dataInicio,
    dataFim: parcela.dataFim,
    status: statusEventoDeParcela(parcela.status),
    dados: { feriasParcelaId: parcela.id },
  };
}
