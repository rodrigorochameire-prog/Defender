import { addDays, format } from "date-fns";
import type { PrescricaoExecutoriaResult } from "./prescricao";
import type { BeneficioFlag } from "./flags-beneficios";

/**
 * Tradução pura de flags da execução → demandas candidatas (kanban).
 * Cada candidata carrega um `tipoAto` estável que serve de chave de dedup
 * (uma demanda aberta por execução×tipo). Não acessa banco.
 */

export interface CandidatoDemanda {
  tipoAto: string;
  ato: string;
  prazo: string | null;
  status: "URGENTE" | "2_ATENDER";
  prioridade: "URGENTE" | "ALTA" | "NORMAL";
  reuPreso: boolean;
}

const SITUACAO_PRESO = ["preso", "domiciliar"];

export function montarDemandasDeExecucao(args: {
  situacao: string;
  prescricao: PrescricaoExecutoriaResult | null;
  beneficios: BeneficioFlag[];
  hoje?: Date;
}): CandidatoDemanda[] {
  const hoje = args.hoje ?? new Date();
  const reuPreso = SITUACAO_PRESO.includes(args.situacao);
  const out: CandidatoDemanda[] = [];

  if (args.prescricao) {
    const p = args.prescricao;
    const prazoDate = addDays(hoje, Math.max(0, p.diasParaPrescricao));
    out.push({
      tipoAto: "exec:prescricao",
      ato: `Prescrição executória — ${p.motivo}`,
      prazo: format(prazoDate, "yyyy-MM-dd"),
      status: p.nivel === "red" ? "URGENTE" : "2_ATENDER",
      prioridade: p.nivel === "red" ? "URGENTE" : "ALTA",
      reuPreso,
    });
  }

  for (const b of args.beneficios) {
    if (b.tipo === "risco-regressao-cadastral") {
      out.push({
        tipoAto: "exec:regressao",
        ato: `Confirmar endereço/contato do executado — ${b.motivo}`,
        prazo: format(addDays(hoje, 15), "yyyy-MM-dd"),
        status: "2_ATENDER",
        prioridade: "ALTA",
        reuPreso,
      });
    } else if (b.tipo === "saida-temporaria") {
      out.push({
        tipoAto: "exec:saida",
        ato: `Requerer saída temporária (art. 122 LEP) — ${b.motivo}`,
        prazo: null,
        status: "2_ATENDER",
        prioridade: "NORMAL",
        reuPreso,
      });
    } else if (b.tipo === "livramento-condicional") {
      out.push({
        tipoAto: "exec:livramento",
        ato: `Requerer livramento condicional (art. 83 CP) — ${b.motivo}`,
        prazo: null,
        status: "2_ATENDER",
        prioridade: "NORMAL",
        reuPreso,
      });
    }
  }

  return out;
}
