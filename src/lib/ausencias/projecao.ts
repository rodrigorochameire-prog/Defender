export function statusEventoDeAusencia(situacao: string): "previsto" | "pendente" | "concluido" {
  if (situacao === "solicitada") return "pendente";
  if (situacao === "gozada") return "concluido";
  return "previsto"; // deferida
}

export function tipoEventoDeAusencia(tipo: string): "LICENCA" | "OUTRA_AUSENCIA" {
  return tipo === "outra_ausencia" ? "OUTRA_AUSENCIA" : "LICENCA";
}

export function tituloAusencia(input: { tipo: string; motivo: string | null; dataInicio: string }): string {
  const label = input.tipo === "outra_ausencia" ? "Ausência" : "Licença";
  const m = input.motivo ? ` — ${input.motivo}` : "";
  return `${label}${m} (${input.dataInicio})`;
}

export type ProjecaoAusenciaEvento = {
  tipo: "LICENCA" | "OUTRA_AUSENCIA";
  cluster: "ausencias";
  titulo: string;
  dataEvento: string;
  dataFim: string;
  status: "previsto" | "pendente" | "concluido";
  dados: { ausenciaId: number | null };
};

export function projecaoEventoDeAusencia(
  ausencia: { id: number | null; tipo: string; motivo: string | null; dataInicio: string; dataFim: string; situacao: string },
): ProjecaoAusenciaEvento {
  return {
    tipo: tipoEventoDeAusencia(ausencia.tipo),
    cluster: "ausencias",
    titulo: tituloAusencia({ tipo: ausencia.tipo, motivo: ausencia.motivo, dataInicio: ausencia.dataInicio }),
    dataEvento: ausencia.dataInicio,
    dataFim: ausencia.dataFim,
    status: statusEventoDeAusencia(ausencia.situacao),
    dados: { ausenciaId: ausencia.id },
  };
}
