const MARCO_TIPOS = new Set([
  "fato","apf","audiencia-custodia","denuncia","recebimento-denuncia",
  "resposta-acusacao","aij-designada","aij-realizada","memoriais",
  "sentenca","recurso-interposto","acordao-recurso","transito-julgado",
  "execucao-inicio","outro",
]);
const PRISAO_TIPOS = new Set(["flagrante","temporaria","preventiva","decorrente-sentenca","outro"]);
const PRISAO_SITUACOES = new Set(["ativa","relaxada","revogada","extinta","cumprida","convertida-em-preventiva"]);
const CAUTELAR_TIPOS = new Set([
  "monitoramento-eletronico","comparecimento-periodico","recolhimento-noturno",
  "proibicao-contato","proibicao-frequentar","afastamento-lar","fianca",
  "suspensao-porte-arma","suspensao-habilitacao","outro",
]);
const CAUTELAR_STATUSES = new Set(["ativa","cumprida","descumprida","revogada","extinta"]);

export function parseDateTolerant(raw: unknown): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return s.slice(0, 10);
  }
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (br) {
    const [, dd, mm, yyyy] = br;
    const iso = `${yyyy}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return iso;
  }
  return null;
}

export interface MarcoRead {
  tipo: string;
  data: string;
  documentoReferencia?: string | null;
  observacoes?: string | null;
}

const SPARSE_MARCO_FIELDS: Array<[string[], string]> = [
  [["data_fato","dataFato","fato_data"], "fato"],
  [["data_apf","data_flagrante"], "apf"],
  [["data_audiencia_custodia"], "audiencia-custodia"],
  [["data_denuncia","dataDenuncia"], "denuncia"],
  [["data_recebimento_denuncia"], "recebimento-denuncia"],
  [["data_resposta_acusacao"], "resposta-acusacao"],
  [["data_aij","data_audiencia_instrucao"], "aij-designada"],
  [["data_memoriais"], "memoriais"],
  [["data_sentenca","dataSentenca"], "sentenca"],
  [["data_acordao"], "acordao-recurso"],
  [["data_transito_julgado","dataTransito"], "transito-julgado"],
];

export function readMarcos(ed: Record<string, any> | null | undefined): MarcoRead[] {
  if (!ed || typeof ed !== "object") return [];
  const out: MarcoRead[] = [];

  const arr = ed.cronologia ?? ed.linha_tempo ?? ed.marcos ?? ed.timeline;
  if (Array.isArray(arr)) {
    for (const m of arr) {
      if (!m || typeof m !== "object") continue;
      const tipo = String(m.tipo ?? "").trim();
      const data = parseDateTolerant(m.data);
      if (!MARCO_TIPOS.has(tipo) || !data) continue;
      out.push({
        tipo, data,
        documentoReferencia: m.documento_referencia ?? m.documentoReferencia ?? null,
        observacoes: m.observacoes ?? null,
      });
    }
  }

  for (const [fields, tipo] of SPARSE_MARCO_FIELDS) {
    for (const f of fields) {
      if (ed[f]) {
        const data = parseDateTolerant(ed[f]);
        if (data) {
          const exists = out.some((m) => m.tipo === tipo && m.data === data);
          if (!exists) out.push({ tipo, data });
        }
      }
    }
  }

  return out;
}

export interface PrisaoRead {
  tipo: string;
  dataInicio: string;
  dataFim?: string | null;
  motivo?: string | null;
  unidade?: string | null;
  situacao: string;
}

export function readPrisoes(ed: Record<string, any> | null | undefined): PrisaoRead[] {
  if (!ed || typeof ed !== "object") return [];
  const out: PrisaoRead[] = [];

  const arr = ed.prisoes;
  if (Array.isArray(arr)) {
    for (const p of arr) {
      if (!p || typeof p !== "object") continue;
      const tipo = String(p.tipo ?? "").trim();
      const dataInicio = parseDateTolerant(p.data_inicio ?? p.dataInicio);
      const situacao = String(p.situacao ?? "ativa");
      if (!PRISAO_TIPOS.has(tipo) || !dataInicio) continue;
      if (!PRISAO_SITUACOES.has(situacao)) continue;
      out.push({
        tipo, dataInicio, situacao,
        dataFim: parseDateTolerant(p.data_fim ?? p.dataFim) ?? null,
        motivo: p.motivo ?? null,
        unidade: p.unidade ?? null,
      });
    }
  }

  if (ed.esta_preso === true) {
    const data = parseDateTolerant(ed.data_prisao ?? ed.data_prisao_preventiva);
    if (data && !out.some((p) => p.dataInicio === data)) {
      out.push({ tipo: "preventiva", dataInicio: data, situacao: "ativa" });
    }
  }
  if (ed.data_flagrante) {
    const ini = parseDateTolerant(ed.data_flagrante);
    const fim = parseDateTolerant(ed.data_soltura);
    if (ini && !out.some((p) => p.tipo === "flagrante" && p.dataInicio === ini)) {
      out.push({ tipo: "flagrante", dataInicio: ini, dataFim: fim, situacao: fim ? "relaxada" : "ativa" });
    }
  }

  return out;
}

export interface CautelarRead {
  tipo: string;
  dataInicio: string;
  dataFim?: string | null;
  detalhes?: string | null;
  status: string;
}

export function readCautelares(ed: Record<string, any> | null | undefined): CautelarRead[] {
  if (!ed || typeof ed !== "object") return [];
  const out: CautelarRead[] = [];

  const arr = ed.cautelares ?? ed.medidas_cautelares;
  if (Array.isArray(arr)) {
    for (const c of arr) {
      if (!c || typeof c !== "object") continue;
      const tipo = String(c.tipo ?? "").trim();
      const dataInicio = parseDateTolerant(c.data_inicio ?? c.dataInicio);
      const status = String(c.status ?? "ativa");
      if (!CAUTELAR_TIPOS.has(tipo) || !dataInicio) continue;
      if (!CAUTELAR_STATUSES.has(status)) continue;
      out.push({
        tipo, dataInicio, status,
        dataFim: parseDateTolerant(c.data_fim ?? c.dataFim) ?? null,
        detalhes: c.detalhes ?? null,
      });
    }
  }

  if (ed.tem_tornozeleira === true) {
    const data = parseDateTolerant(ed.data_tornozeleira) ?? parseDateTolerant(ed.data_inicio_tornozeleira);
    if (data && !out.some((c) => c.tipo === "monitoramento-eletronico" && c.dataInicio === data)) {
      out.push({ tipo: "monitoramento-eletronico", dataInicio: data, status: "ativa" });
    }
  }

  if (ed.mpu_ativa === true || ed.medida_protetiva_ativa === true) {
    const data = parseDateTolerant(ed.data_mpu) ?? parseDateTolerant(ed.data_medida_protetiva);
    if (data && !out.some((c) => c.tipo === "proibicao-contato" && c.dataInicio === data)) {
      out.push({ tipo: "proibicao-contato", dataInicio: data, status: "ativa" });
    }
  }

  if (ed.afastamento_lar_ativo === true) {
    const data = parseDateTolerant(ed.data_afastamento_lar);
    if (data && !out.some((c) => c.tipo === "afastamento-lar" && c.dataInicio === data)) {
      out.push({ tipo: "afastamento-lar", dataInicio: data, status: "ativa" });
    }
  }

  if (ed.fianca_paga === true) {
    const data = parseDateTolerant(ed.data_fianca);
    if (data && !out.some((c) => c.tipo === "fianca" && c.dataInicio === data)) {
      out.push({ tipo: "fianca", dataInicio: data, status: "cumprida" });
    }
  }

  return out;
}
