#!/usr/bin/env node
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const DRY = process.argv.includes("--dry-run");

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

function parseDateTolerant(raw) {
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

const SPARSE_MARCO_FIELDS = [
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

function readMarcos(ed) {
  if (!ed || typeof ed !== "object") return [];
  const out = [];
  const arr = ed.cronologia ?? ed.linha_tempo ?? ed.marcos ?? ed.timeline;
  if (Array.isArray(arr)) {
    for (const m of arr) {
      if (!m || typeof m !== "object") continue;
      const tipo = String(m.tipo ?? "").trim();
      const data = parseDateTolerant(m.data);
      if (!MARCO_TIPOS.has(tipo) || !data) continue;
      out.push({ tipo, data });
    }
  }
  for (const [fields, tipo] of SPARSE_MARCO_FIELDS) {
    for (const f of fields) {
      if (ed[f]) {
        const data = parseDateTolerant(ed[f]);
        if (data && !out.some((m) => m.tipo === tipo && m.data === data)) {
          out.push({ tipo, data });
        }
      }
    }
  }
  return out;
}

function readPrisoes(ed) {
  if (!ed || typeof ed !== "object") return [];
  const out = [];
  const arr = ed.prisoes;
  if (Array.isArray(arr)) {
    for (const p of arr) {
      if (!p || typeof p !== "object") continue;
      const tipo = String(p.tipo ?? "").trim();
      const dataInicio = parseDateTolerant(p.data_inicio ?? p.dataInicio);
      const situacao = String(p.situacao ?? "ativa");
      if (!PRISAO_TIPOS.has(tipo) || !dataInicio || !PRISAO_SITUACOES.has(situacao)) continue;
      out.push({ tipo, dataInicio, situacao, dataFim: parseDateTolerant(p.data_fim) ?? null });
    }
  }
  if (ed.esta_preso === true) {
    const d = parseDateTolerant(ed.data_prisao);
    if (d && !out.some((p) => p.dataInicio === d)) {
      out.push({ tipo: "preventiva", dataInicio: d, situacao: "ativa" });
    }
  }
  return out;
}

function readCautelares(ed) {
  if (!ed || typeof ed !== "object") return [];
  const out = [];
  const arr = ed.cautelares ?? ed.medidas_cautelares;
  if (Array.isArray(arr)) {
    for (const c of arr) {
      if (!c || typeof c !== "object") continue;
      const tipo = String(c.tipo ?? "").trim();
      const dataInicio = parseDateTolerant(c.data_inicio ?? c.dataInicio);
      const status = String(c.status ?? "ativa");
      if (!CAUTELAR_TIPOS.has(tipo) || !dataInicio || !CAUTELAR_STATUSES.has(status)) continue;
      out.push({ tipo, dataInicio, status });
    }
  }
  if (ed.tem_tornozeleira === true) {
    const d = parseDateTolerant(ed.data_tornozeleira ?? ed.data_inicio_tornozeleira);
    if (d && !out.some((c) => c.tipo === "monitoramento-eletronico" && c.dataInicio === d)) {
      out.push({ tipo: "monitoramento-eletronico", dataInicio: d, status: "ativa" });
    }
  }
  if (ed.mpu_ativa === true || ed.medida_protetiva_ativa === true) {
    const d = parseDateTolerant(ed.data_mpu ?? ed.data_medida_protetiva);
    if (d && !out.some((c) => c.tipo === "proibicao-contato" && c.dataInicio === d)) {
      out.push({ tipo: "proibicao-contato", dataInicio: d, status: "ativa" });
    }
  }
  return out;
}

const sql = postgres(process.env.DATABASE_URL, { max: 3 });

const counters = {
  atendimentosProcessados: 0,
  marcosCriados: 0,
  marcosExistentes: 0,
  prisoesCriadas: 0,
  prisoesExistentes: 0,
  cautelaresCriadas: 0,
  cautelaresExistentes: 0,
};

async function insertMarco(processoId, m) {
  const exists = await sql`
    SELECT id FROM marcos_processuais
    WHERE processo_id = ${processoId} AND tipo = ${m.tipo} AND data = ${m.data} AND fonte = 'backfill-ia'
    LIMIT 1
  `;
  if (exists.length > 0) { counters.marcosExistentes++; return; }
  if (DRY) { counters.marcosCriados++; return; }
  await sql`
    INSERT INTO marcos_processuais (processo_id, tipo, data, fonte, confidence)
    VALUES (${processoId}, ${m.tipo}, ${m.data}, 'backfill-ia', 0.7)
  `;
  counters.marcosCriados++;
}

async function insertPrisao(processoId, p) {
  const exists = await sql`
    SELECT id FROM prisoes
    WHERE processo_id = ${processoId} AND tipo = ${p.tipo} AND data_inicio = ${p.dataInicio} AND fonte = 'backfill-ia'
    LIMIT 1
  `;
  if (exists.length > 0) { counters.prisoesExistentes++; return; }
  if (DRY) { counters.prisoesCriadas++; return; }
  await sql`
    INSERT INTO prisoes (processo_id, tipo, data_inicio, data_fim, situacao, fonte, confidence)
    VALUES (${processoId}, ${p.tipo}, ${p.dataInicio}, ${p.dataFim ?? null}, ${p.situacao}, 'backfill-ia', 0.7)
  `;
  counters.prisoesCriadas++;
}

async function insertCautelar(processoId, c) {
  const exists = await sql`
    SELECT id FROM cautelares
    WHERE processo_id = ${processoId} AND tipo = ${c.tipo} AND data_inicio = ${c.dataInicio} AND fonte = 'backfill-ia'
    LIMIT 1
  `;
  if (exists.length > 0) { counters.cautelaresExistentes++; return; }
  if (DRY) { counters.cautelaresCriadas++; return; }
  await sql`
    INSERT INTO cautelares (processo_id, tipo, data_inicio, status, fonte, confidence)
    VALUES (${processoId}, ${c.tipo}, ${c.dataInicio}, ${c.status}, 'backfill-ia', 0.7)
  `;
  counters.cautelaresCriadas++;
}

async function main() {
  console.log(DRY ? "DRY RUN CRONOLOGIA\n" : "BACKFILL CRONOLOGIA\n");

  const col = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'atendimentos' AND column_name = 'enrichment_data'
  `;
  if (col.length === 0) {
    console.log("atendimentos.enrichment_data não existe — nada a fazer.");
    await sql.end();
    return;
  }

  const rows = await sql`
    SELECT id, processo_id, enrichment_data
    FROM atendimentos
    WHERE processo_id IS NOT NULL AND enrichment_data IS NOT NULL
      AND jsonb_typeof(enrichment_data) = 'object'
  `;
  console.log(`atendimentos candidatos: ${rows.length}`);

  for (const a of rows) {
    counters.atendimentosProcessados++;
    const ed = a.enrichment_data;
    for (const m of readMarcos(ed)) await insertMarco(a.processo_id, m);
    for (const p of readPrisoes(ed)) await insertPrisao(a.processo_id, p);
    for (const c of readCautelares(ed)) await insertCautelar(a.processo_id, c);
  }

  console.log("\n=== Resultado ===");
  for (const [k, v] of Object.entries(counters)) console.log(`${k.padEnd(28)} ${v}`);
  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
