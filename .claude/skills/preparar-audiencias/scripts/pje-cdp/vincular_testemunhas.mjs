/**
 * vincular_testemunhas.mjs
 * Popula testemunhas.termo_delegacia_drive_file_id / pagina,
 * depoimento_timestamp_inicio_s / fim_s, e pinos (JSONB append)
 * a partir do registro_audiencia enriquecido.
 *
 * Uso: node scripts/pje-cdp/vincular_testemunhas.mjs /tmp/registros-2026-06-30.json
 * Entrada: mesmo formato do popular_ombuds.mjs —
 *   [{ audiencia_id, registro_audiencia: { depoentes: [...] }, ... }]
 *
 * Requer migração 20260630_testemunhas_pins_timestamps.sql aplicada.
 * pinos_sugeridos: stub — silenciosamente no-op enquanto spec D3 não for implementado.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/Projetos/Defender/.env.local" });
import postgres from "postgres";
import * as fs from "fs";
import { randomUUID } from "crypto";

const DRY_RUN = process.env.DRY_RUN === "1";

const sql = postgres(process.env.DATABASE_URL.replace(/^"|"$/g, ""), {
  prepare: false, connect_timeout: 20, ssl: "require",
});

const items = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

async function appendPinos(depoenteId, pinosToAdd) {
  if (!pinosToAdd || pinosToAdd.length === 0) return 0;
  let appended = 0;
  for (const p of pinosToAdd) {
    // Convert from JSON sidecar format (timestamp_s, snake_case)
    // to DB Pino format (timestampS, camelCase) per the Pino interface
    const dbPino = {
      id: randomUUID(),
      timestampS: p.timestamp_s,        // convert snake_case → camelCase
      nota: p.nota ?? undefined,
      fonte: "IA",
      categoria: p.categoria ?? undefined,
    };
    if (DRY_RUN) {
      console.log(`    [DRY] appendPino depoenteId=${depoenteId} ts=${dbPino.timestampS}`);
      appended++;
      continue;
    }
    const result = await sql`
      UPDATE testemunhas
      SET pinos = pinos || ${JSON.stringify(dbPino)}::jsonb
      WHERE id = ${depoenteId}
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(pinos) p2
          WHERE (p2->>'timestampS')::float = ${dbPino.timestampS}
            AND p2->>'fonte' = 'IA'
        )
      RETURNING id
    `;
    if (result.length) appended++;
  }
  return appended;
}

let ok = 0, skipped = 0, notFound = 0;

for (const item of items) {
  const audienciaId = item.audiencia_id;
  const depoentes = item.registro_audiencia?.depoentes ?? [];

  for (const dep of depoentes) {
    const nome = dep.nome?.trim();
    if (!nome) continue;

    const termoDriveFileId = dep.termo_delegacia?.drive_file_id ?? null;
    const termoPagina = dep.termo_delegacia?.pagina_inicio ?? null;    // spec: pagina_inicio
    const tsInicio = dep.gravacao_judicial?.timestamp_inicio_s ?? null; // spec: timestamp_inicio_s
    const tsFim = dep.gravacao_judicial?.timestamp_fim_s ?? null;       // spec: timestamp_fim_s
    const pinosSugeridos = dep.pinos_sugeridos ?? [];                   // stub: usually []

    // Nothing to write — skip
    if (!termoDriveFileId && tsInicio === null && pinosSugeridos.length === 0) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[DRY] audiencia=${audienciaId} nome="${nome}" termo=${termoDriveFileId} pg=${termoPagina} ts=${tsInicio}→${tsFim}`);
      ok++;
      continue;
    }

    // Find testemunha row by audiencia_id + name match
    const rows = await sql`
      SELECT id FROM testemunhas
      WHERE audiencia_id = ${audienciaId}
        AND LOWER(TRIM(nome)) = LOWER(TRIM(${nome}))
      LIMIT 1
    `;
    if (!rows.length) {
      console.warn(`  ⚠ não encontrado: audiencia=${audienciaId} nome="${nome}"`);
      notFound++;
      continue;
    }
    const depoenteId = rows[0].id;

    // Update new columns — COALESCE so null values don't overwrite existing data
    await sql`
      UPDATE testemunhas
      SET
        termo_delegacia_drive_file_id = COALESCE(${termoDriveFileId}, termo_delegacia_drive_file_id),
        termo_delegacia_pagina        = COALESCE(${termoPagina},      termo_delegacia_pagina),
        depoimento_timestamp_inicio_s = COALESCE(${tsInicio},         depoimento_timestamp_inicio_s),
        depoimento_timestamp_fim_s    = COALESCE(${tsFim},            depoimento_timestamp_fim_s),
        updated_at = NOW()
      WHERE id = ${depoenteId}
    `;

    const pinosAppended = await appendPinos(depoenteId, pinosSugeridos);
    console.log(`  ✓ ${nome} (id=${depoenteId}) → termo=${termoDriveFileId ?? "—"} pg=${termoPagina ?? "—"} ts=${tsInicio ?? "—"}s pinos+=${pinosAppended}`);
    ok++;
  }
}

console.log(`\nResumo: ${ok} ok, ${skipped} sem dados (skip), ${notFound} testemunha não encontrada`);
if (DRY_RUN) console.log("(DRY RUN — nada foi escrito no banco)");
await sql.end();
