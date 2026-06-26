import { DOMINIOS } from "./dominios";

export type Severidade = "critico" | "atencao" | "info";

export interface RadarEventoInput {
  id: number;
  tipo: string;
  titulo: string;
  status: string;
  dataEvento: string;
  dataFim: string | null;
  prazo: string | null;
  dados: Record<string, unknown>;
}

export interface RadarAlert {
  eventoId: number;
  tipo: string;
  severidade: Severidade;
  titulo: string;
  prazo: string | null; // data-alvo do alerta (vencimento/prazo/dataFim) quando houver
  motivo: string;
  dominioKey: string | null;
}

export const SEV_RANK: Record<Severidade, number> = { critico: 0, atencao: 1, info: 2 };

// tipo → primeira key de domínio que o contém (marcos/progressao → undefined)
const TIPO_TO_DOMINIO: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const d of DOMINIOS) for (const t of d.tipos) if (!(t in m)) m[t] = d.key;
  return m;
})();

const ativo = (status: string) => status !== "concluido" && status !== "arquivado";

/** Dias do hoje até a data, em date-only local. Negativo = passado. */
export function daysUntil(dateStr: string, today: Date): number {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const target = new Date(y, mo - 1, d).getTime();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((target - base) / 86400000);
}

function sevByDias(dias: number): Severidade {
  if (dias <= 7) return "critico";
  if (dias <= 30) return "atencao";
  return "info";
}

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function computeRadar(eventos: RadarEventoInput[], today: Date): RadarAlert[] {
  const alerts: RadarAlert[] = [];

  for (const e of eventos) {
    const tipo = e.tipo;
    const dom = TIPO_TO_DOMINIO[tipo] ?? null;
    const dados = e.dados ?? {};

    // FOLGA com vencimento (usar ou virar pecúnia)
    const vencimento = str(dados.vencimento);
    if (tipo === "FOLGA" && vencimento && ativo(e.status)) {
      const dias = daysUntil(vencimento, today);
      if (dias >= -1 && dias <= 60) {
        alerts.push({ eventoId: e.id, tipo, severidade: sevByDias(dias), titulo: e.titulo, prazo: vencimento, motivo: dias < 0 ? "folga vencida" : `folga vence em ${dias}d`, dominioKey: dom });
        continue;
      }
    }

    // DIARIA a requerer
    if (tipo === "DIARIA" && str(dados.status) === "a_requerer") {
      alerts.push({ eventoId: e.id, tipo, severidade: "atencao", titulo: e.titulo, prazo: e.prazo, motivo: "diária a requerer", dominioKey: dom });
      continue;
    }

    // GRATIFICACAO/SUBSTITUICAO com SEI pendente e período encerrado
    const seiStatus = str(dados.seiStatus);
    if ((tipo === "GRATIFICACAO" || tipo === "SUBSTITUICAO") && seiStatus && seiStatus !== "enviado") {
      const encerrada = e.dataFim ? daysUntil(e.dataFim, today) < 0 : false;
      if (encerrada) {
        alerts.push({ eventoId: e.id, tipo, severidade: "atencao", titulo: e.titulo, prazo: e.dataFim, motivo: "ofício/SEI pendente", dominioKey: dom });
        continue;
      }
    }

    // SOLICITACAO_ADM pendente há muito tempo
    if (tipo === "SOLICITACAO_ADM" && e.status === "pendente") {
      const idade = -daysUntil(e.dataEvento, today);
      if (idade > 15) {
        alerts.push({ eventoId: e.id, tipo, severidade: "atencao", titulo: e.titulo, prazo: null, motivo: `sem resposta há ${idade}d`, dominioKey: dom });
        continue;
      }
    }

    // Regra base: evento ativo com prazo próximo
    if (e.prazo && ativo(e.status)) {
      const dias = daysUntil(e.prazo, today);
      if (dias >= -3 && dias <= 60) {
        const sev: Severidade = tipo === "PROMOCAO" ? "info" : sevByDias(dias);
        alerts.push({ eventoId: e.id, tipo, severidade: sev, titulo: e.titulo, prazo: e.prazo, motivo: dias < 0 ? "prazo vencido" : `em ${dias}d`, dominioKey: dom });
      }
    }
  }

  alerts.sort((a, b) => {
    const s = SEV_RANK[a.severidade] - SEV_RANK[b.severidade];
    if (s !== 0) return s;
    const pa = a.prazo ? daysUntil(a.prazo, today) : 9999;
    const pb = b.prazo ? daysUntil(b.prazo, today) : 9999;
    return pa - pb;
  });

  return alerts;
}
