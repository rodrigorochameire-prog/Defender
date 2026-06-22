// Deriva o status de oitiva de um depoente a partir do dado do dossiê.
// Separa DELEGACIA (depoimento_ip) de JUÍZO (depoimento_juizo / já ouvido) e,
// quando ainda falta ouvir em juízo, o status de intimação + o motivo se não
// intimado. Fonte única usada pelo painel de depoentes.

const MOTIVO_LABEL: Record<string, string> = {
  nao_localizado: "não localizado",
  mandado_nao_cumprido: "mandado não cumprido",
  endereco_invalido: "endereço inválido",
  em_diligencia: "em diligência",
  recusa_recebimento: "recusou ciência",
  precatoria_devolvida: "precatória devolvida",
  precatoria_pendente: "precatória pendente",
  mandado_nao_emitido: "mandado não expedido",
  falta_de_informacoes: "sem informação nos autos",
};

export type IntimacaoStatus =
  | "intimado"
  | "nao_intimado"
  | "pendente"
  | "dispensada"
  | "desconhecido";

export interface StatusOitiva {
  ouvidoDelegacia: boolean;
  ouvidoJuizo: boolean;
  intimacao: IntimacaoStatus;
  motivoLabel: string | null;
  faltaJuizo: boolean;
}

const naoVazio = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

export function derivarStatusOitiva(d: any): StatusOitiva {
  const ouvidoDelegacia = naoVazio(d?.depoimento_ip);
  const ouvidoJuizo =
    naoVazio(d?.depoimento_juizo) ||
    !!d?.ja_ouvido?.sim ||
    d?.comparecimento === "ouvido_anteriormente";
  const intimacao: IntimacaoStatus = (d?.intimacao ?? "desconhecido") as IntimacaoStatus;
  const motivoLabel =
    intimacao === "nao_intimado" && d?.motivo_nao_intimacao
      ? MOTIVO_LABEL[d.motivo_nao_intimacao] ?? d.motivo_nao_intimacao
      : null;
  return { ouvidoDelegacia, ouvidoJuizo, intimacao, motivoLabel, faltaJuizo: !ouvidoJuizo };
}
