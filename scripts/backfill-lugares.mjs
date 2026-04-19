#!/usr/bin/env node
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: "/Users/rodrigorochameire/projetos/Defender/.env.local" });

const DRY = process.argv.includes("--dry-run");

function normalizarEndereco(s) {
  if (!s) return "";
  let t = String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  t = t.replace(/\b\d{5}-?\d{3}\b/g, " ");
  t = t.replace(/\bcep\s*/gi, " ");
  t = t.replace(/[,;:()]/g, " ");
  t = t.replace(/\bs\s*\/\s*n\b/g, "sn");
  t = t.replace(/[-\/\\]/g, " ");
  t = t.replace(/\bav\.?/g, "avenida");
  t = t.replace(/\br\.\s*/g, "rua ");
  t = t.replace(/\btv\.?/g, "travessa");
  t = t.replace(/\bestr\.?/g, "estrada");
  t = t.replace(/\best\.?/g, "estrada");
  t = t.replace(/\brod\.?/g, "rodovia");
  t = t.replace(/\bal\.?/g, "alameda");
  t = t.replace(/\bpca\b/g, "praca");
  t = t.replace(/\bn[º°\u00ba\u00b0]\b/g, " ");
  t = t.replace(/\bn\.\s*/g, " ");
  t = t.replace(/\bno\.\s*/g, " ");
  t = t.replace(/\b(camacari|camaçari|salvador|lauro de freitas|dias davila|dias d avila)\b/g, " ");
  t = t.replace(/\b(bahia|brasil|brazil|ba)\b/g, " ");
  return t.replace(/\s+/g, " ").trim();
}

const PLACEHOLDER_PATTERNS = [
  /^\s*$/,
  /^\s*[-?.]+\s*$/,
  /^\s*n\/c\s*$/i,
  /^\s*n\.?a\.?\s*$/i,
  /\bn[aã]o\s+informad/i,
  /\bn[aã]o\s+consta\b/i,
  /\bsem\s+endere[çc]o\b/i,
  /\ba\s+confirmar\b/i,
  /\ba\s+extrair\b/i,
  /\bA\s+EXTRAIR\b/,
  /\bdesconhecid/i,
];
function isPlaceholder(s) {
  if (!s) return true;
  const str = String(s).trim();
  if (str.length < 3) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(str));
}

const sql = postgres(process.env.DATABASE_URL, { max: 3 });

const counters = {
  lugaresCriados: 0,
  lugaresExistentes: 0,
  participacoesCriadas: 0,
  participacoesExistentes: 0,
  warningsPlaceholder: 0,
};

async function columnExists(table, column) {
  const res = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}
  `;
  return res.length > 0;
}

async function getOrCreateLugar({
  workspaceId,
  logradouro,
  numero,
  bairro,
  cidade,
  uf,
  enderecoCompleto,
  lat,
  lng,
  fonte,
}) {
  const full =
    enderecoCompleto ||
    [logradouro, numero, bairro, cidade, uf].filter(Boolean).join(", ");
  if (isPlaceholder(full) && isPlaceholder(logradouro)) {
    counters.warningsPlaceholder++;
    return null;
  }
  const norm = normalizarEndereco(full);
  if (!norm) {
    counters.warningsPlaceholder++;
    return null;
  }

  const wsId = workspaceId ?? 1;
  const existing = await sql`
    SELECT id FROM lugares
    WHERE endereco_normalizado = ${norm}
      AND merged_into IS NULL
      AND workspace_id = ${wsId}
    LIMIT 1
  `;
  if (existing.length > 0) {
    counters.lugaresExistentes++;
    return existing[0].id;
  }

  if (DRY) {
    counters.lugaresCriados++;
    return -1;
  }
  const [row] = await sql`
    INSERT INTO lugares (
      workspace_id, logradouro, numero, bairro, cidade, uf,
      endereco_completo, endereco_normalizado, latitude, longitude,
      fonte_criacao, geocoded_at, geocoding_source
    )
    VALUES (
      ${wsId},
      ${logradouro ?? null},
      ${numero ?? null},
      ${bairro ?? null},
      ${cidade ?? "Camaçari"},
      ${uf ?? "BA"},
      ${full},
      ${norm},
      ${lat ?? null},
      ${lng ?? null},
      ${fonte},
      ${lat != null ? new Date() : null},
      ${lat != null ? "origem" : null}
    )
    RETURNING id
  `;
  counters.lugaresCriados++;
  return row.id;
}

async function addParticipacao({
  lugarId,
  processoId,
  pessoaId,
  tipo,
  dataRelacionada,
  sourceTable,
  sourceId,
  fonte,
  confidence = 0.9,
}) {
  if (!lugarId || lugarId === -1) return;
  const exists = await sql`
    SELECT id FROM participacoes_lugar
    WHERE lugar_id = ${lugarId}
      AND processo_id IS NOT DISTINCT FROM ${processoId ?? null}
      AND tipo = ${tipo}
      AND source_table IS NOT DISTINCT FROM ${sourceTable ?? null}
      AND source_id IS NOT DISTINCT FROM ${sourceId ?? null}
    LIMIT 1
  `;
  if (exists.length > 0) {
    counters.participacoesExistentes++;
    return;
  }
  if (DRY) {
    counters.participacoesCriadas++;
    return;
  }
  await sql`
    INSERT INTO participacoes_lugar
      (lugar_id, processo_id, pessoa_id, tipo, data_relacionada,
       source_table, source_id, fonte, confidence)
    VALUES
      (${lugarId}, ${processoId ?? null}, ${pessoaId ?? null}, ${tipo},
       ${dataRelacionada ?? null}, ${sourceTable ?? null}, ${sourceId ?? null},
       ${fonte}, ${confidence})
    ON CONFLICT DO NOTHING
  `;
  counters.participacoesCriadas++;
}

async function main() {
  console.log(DRY ? "=== DRY RUN ===\n" : "=== BACKFILL LUGARES ===\n");

  // 1/6 processos.local_do_fato_endereco
  console.log("1/6 processos.local_do_fato_endereco...");
  if (await columnExists("processos", "local_do_fato_endereco")) {
    const rows = await sql`
      SELECT id, workspace_id,
             local_do_fato_endereco AS endereco,
             local_do_fato_lat     AS lat,
             local_do_fato_lng     AS lng
      FROM processos
      WHERE local_do_fato_endereco IS NOT NULL
        AND local_do_fato_endereco != ''
    `;
    console.log(`  ${rows.length} registros`);
    for (const p of rows) {
      const lugarId = await getOrCreateLugar({
        workspaceId: p.workspace_id,
        enderecoCompleto: p.endereco,
        lat: p.lat,
        lng: p.lng,
        fonte: "backfill",
      });
      await addParticipacao({
        lugarId,
        processoId: p.id,
        tipo: "local-do-fato",
        sourceTable: "processos",
        sourceId: p.id,
        fonte: "backfill",
      });
    }
  } else {
    console.log("  coluna ausente, skip");
  }

  // 2/6 processos.vvd_agressor_residencia_endereco
  console.log("2/6 processos.vvd_agressor_residencia_endereco...");
  if (await columnExists("processos", "vvd_agressor_residencia_endereco")) {
    const rows = await sql`
      SELECT id, workspace_id,
             vvd_agressor_residencia_endereco AS endereco,
             vvd_agressor_residencia_lat      AS lat,
             vvd_agressor_residencia_lng      AS lng
      FROM processos
      WHERE vvd_agressor_residencia_endereco IS NOT NULL
        AND vvd_agressor_residencia_endereco != ''
    `;
    console.log(`  ${rows.length} registros`);
    for (const p of rows) {
      const lugarId = await getOrCreateLugar({
        workspaceId: p.workspace_id,
        enderecoCompleto: p.endereco,
        lat: p.lat,
        lng: p.lng,
        fonte: "backfill",
      });
      const ag = await sql`
        SELECT pessoa_id FROM participacoes_processo
        WHERE processo_id = ${p.id} AND papel = 'co-reu'
        LIMIT 1
      `;
      await addParticipacao({
        lugarId,
        processoId: p.id,
        pessoaId: ag[0]?.pessoa_id ?? null,
        tipo: "residencia-agressor",
        sourceTable: "processos_vvd_res",
        sourceId: p.id,
        fonte: "backfill",
      });
    }
  } else {
    console.log("  coluna ausente, skip");
  }

  // 3/6 processos.vvd_agressor_trabalho_endereco
  console.log("3/6 processos.vvd_agressor_trabalho_endereco...");
  if (await columnExists("processos", "vvd_agressor_trabalho_endereco")) {
    const rows = await sql`
      SELECT id, workspace_id,
             vvd_agressor_trabalho_endereco AS endereco,
             vvd_agressor_trabalho_lat      AS lat,
             vvd_agressor_trabalho_lng      AS lng
      FROM processos
      WHERE vvd_agressor_trabalho_endereco IS NOT NULL
        AND vvd_agressor_trabalho_endereco != ''
    `;
    console.log(`  ${rows.length} registros`);
    for (const p of rows) {
      const lugarId = await getOrCreateLugar({
        workspaceId: p.workspace_id,
        enderecoCompleto: p.endereco,
        lat: p.lat,
        lng: p.lng,
        fonte: "backfill",
      });
      const ag = await sql`
        SELECT pessoa_id FROM participacoes_processo
        WHERE processo_id = ${p.id} AND papel = 'co-reu'
        LIMIT 1
      `;
      await addParticipacao({
        lugarId,
        processoId: p.id,
        pessoaId: ag[0]?.pessoa_id ?? null,
        tipo: "trabalho-agressor",
        sourceTable: "processos_vvd_trab",
        sourceId: p.id,
        fonte: "backfill",
      });
    }
  } else {
    console.log("  coluna ausente, skip");
  }

  // 4/6 assistidos.endereco
  // Note: assistidos has no bairro/cidade columns confirmed by inspection
  console.log("4/6 assistidos.endereco...");
  if (await columnExists("assistidos", "endereco")) {
    const hasBairro = await columnExists("assistidos", "bairro");
    const hasCidade = await columnExists("assistidos", "cidade");

    const rows = hasBairro && hasCidade
      ? await sql`
          SELECT id, workspace_id, endereco, bairro, cidade
          FROM assistidos
          WHERE endereco IS NOT NULL AND endereco != ''
        `
      : await sql`
          SELECT id, workspace_id, endereco
          FROM assistidos
          WHERE endereco IS NOT NULL AND endereco != ''
        `;
    console.log(`  ${rows.length} registros`);
    for (const a of rows) {
      const parts = [a.endereco, a.bairro ?? null, a.cidade ?? null].filter(Boolean);
      const enderecoCompleto = parts.join(", ");
      const lugarId = await getOrCreateLugar({
        workspaceId: a.workspace_id,
        logradouro: a.endereco,
        bairro: a.bairro ?? null,
        cidade: a.cidade ?? null,
        enderecoCompleto,
        fonte: "backfill",
      });
      await addParticipacao({
        lugarId,
        processoId: null,
        pessoaId: null,
        tipo: "endereco-assistido",
        sourceTable: "assistidos",
        sourceId: a.id,
        fonte: "backfill",
      });
    }
  } else {
    console.log("  coluna ausente, skip");
  }

  // 5/6 atendimentos.endereco
  console.log("5/6 atendimentos.endereco...");
  if (await columnExists("atendimentos", "endereco")) {
    const rows = await sql`
      SELECT id, workspace_id, endereco, processo_id
      FROM atendimentos
      WHERE endereco IS NOT NULL AND endereco != ''
    `;
    console.log(`  ${rows.length} registros`);
    for (const a of rows) {
      const lugarId = await getOrCreateLugar({
        workspaceId: a.workspace_id,
        enderecoCompleto: a.endereco,
        fonte: "backfill",
      });
      await addParticipacao({
        lugarId,
        processoId: a.processo_id ?? null,
        tipo: "local-atendimento",
        sourceTable: "atendimentos",
        sourceId: a.id,
        fonte: "backfill",
      });
    }
  } else {
    console.log("  coluna ausente, skip");
  }

  // 6/6 radar_noticias (logradouro / bairro)
  // Note: radar_noticias has data_publicacao (not publicado_em) and no workspace_id
  console.log("6/6 radar_noticias...");
  if (await columnExists("radar_noticias", "logradouro")) {
    const hasWorkspace = await columnExists("radar_noticias", "workspace_id");
    const hasDataPublicacao = await columnExists("radar_noticias", "data_publicacao");

    const rows = await sql`
      SELECT id, logradouro, bairro, latitude, longitude
             ${hasWorkspace     ? sql`, workspace_id`   : sql``}
             ${hasDataPublicacao ? sql`, data_publicacao` : sql``}
      FROM radar_noticias
      WHERE (logradouro IS NOT NULL AND logradouro != '')
         OR (bairro     IS NOT NULL AND bairro     != '')
    `;
    console.log(`  ${rows.length} registros`);
    for (const r of rows) {
      const enderecoCompleto = [r.logradouro, r.bairro, "Camaçari", "BA"]
        .filter(Boolean)
        .join(", ");
      const lugarId = await getOrCreateLugar({
        workspaceId: r.workspace_id ?? 1,
        logradouro: r.logradouro ?? null,
        bairro: r.bairro ?? null,
        enderecoCompleto,
        lat: r.latitude ?? null,
        lng: r.longitude ?? null,
        fonte: "backfill",
      });
      await addParticipacao({
        lugarId,
        processoId: null,
        tipo: "radar-noticia",
        dataRelacionada: r.data_publicacao ?? null,
        sourceTable: "radar_noticias",
        sourceId: r.id,
        fonte: "backfill",
      });
    }
  } else {
    console.log("  coluna ausente, skip");
  }

  console.log("\n=== Resultado ===");
  for (const [k, v] of Object.entries(counters)) {
    console.log(`${k.padEnd(28)} ${v}`);
  }
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
