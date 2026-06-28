export function statusEventoDeDiaria(status: string): "previsto" | "pendente" | "em_curso" | "concluido" {
  if (status === "requerida") return "pendente";
  if (status === "autorizada") return "em_curso";
  if (status === "paga") return "concluido";
  return "previsto"; // a_requerer
}

export function tituloDiaria(input: { destino: string; dataInicio: string }): string {
  return `Diária — ${input.destino} (${input.dataInicio})`;
}

export type ProjecaoDiariaEvento = {
  tipo: "DIARIA";
  cluster: "contraprestacao";
  titulo: string;
  dataEvento: string;
  dataFim: string;
  status: "previsto" | "pendente" | "em_curso" | "concluido";
  valorCents: number;
  dados: { diariaId: number | null };
};

export function projecaoEventoDeDiaria(
  diaria: { id: number | null; destino: string; dataInicio: string; dataFim: string; status: string },
  totalCents: number,
): ProjecaoDiariaEvento {
  return {
    tipo: "DIARIA",
    cluster: "contraprestacao",
    titulo: tituloDiaria({ destino: diaria.destino, dataInicio: diaria.dataInicio }),
    dataEvento: diaria.dataInicio,
    dataFim: diaria.dataFim,
    status: statusEventoDeDiaria(diaria.status),
    valorCents: totalCents,
    dados: { diariaId: diaria.id },
  };
}
