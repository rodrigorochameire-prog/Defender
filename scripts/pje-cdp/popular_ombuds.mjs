/**
 * Popula audiencias.registro_audiencia + resumo_defesa e upsert em analises_cowork.
 * Variante do 07_popular_ombuds.ts com prepare:false (pooler Supabase 6543).
 *
 * Uso: node scripts/pje-cdp/popular_ombuds.mjs /tmp/registros-2026-06-11.json
 * Entrada: [{ audiencia_id, processo_id, registro_audiencia, resumo_defesa, analise_cowork? }]
 *   analise_cowork (opcional): { tipo, resumo_fato, tese_defesa, estrategia_atual, crime_principal, pontos_criticos, payload }
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/Projetos/Defender/.env.local" });
import postgres from "postgres";
import * as fs from "fs";

const sql = postgres(process.env.DATABASE_URL.replace(/^"|"$/g, ""), {
  prepare: false, connect_timeout: 20, ssl: "require",
});

const items = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

function validar(r) {
  const erros = [];
  const subtipo = r.subtipo_audiencia ?? "indefinido";
  if (!r.depoentes?.length && !["custodia", "qualificacao"].includes(subtipo))
    erros.push(`depoentes ausente (subtipo=${subtipo})`);
  for (const d of r.depoentes ?? []) {
    if (d.intimacao === "nao_intimado" && !d.motivo_nao_intimacao)
      erros.push(`depoente '${d.nome}' nao_intimado sem motivo`);
    if (d.ja_ouvido?.sim && !d.ja_ouvido.data)
      erros.push(`depoente '${d.nome}' ja_ouvido sem data`);
  }
  if (!r.tese_defesa?.principal) erros.push("tese_defesa.principal vazia");
  return erros;
}

let ok = 0, erro = 0;
for (const item of items) {
  const erros = validar(item.registro_audiencia ?? {});
  if (erros.length) {
    console.warn(`#${item.audiencia_id} INVÁLIDO: ${erros.join("; ")}`);
    erro++; continue;
  }
  const r = await sql`
    UPDATE audiencias
    SET registro_audiencia = ${item.registro_audiencia},
        resumo_defesa = ${item.resumo_defesa ?? null},
        anotacoes_versao = COALESCE(anotacoes_versao,0) + 1,
        updated_at = NOW()
    WHERE id = ${item.audiencia_id}
    RETURNING id`;
  if (!r.length) { console.warn(`#${item.audiencia_id} NÃO ENCONTRADA`); erro++; continue; }

  if (item.analise_cowork && item.processo_id) {
    const a = item.analise_cowork;
    await sql`
      INSERT INTO analises_cowork (processo_id, assistido_id, audiencia_id, tipo, schema_version,
                                   resumo_fato, tese_defesa, estrategia_atual, crime_principal,
                                   pontos_criticos, payload, fonte_arquivo, importado_em, created_at, updated_at)
      VALUES (${item.processo_id}, ${item.assistido_id ?? null}, ${item.audiencia_id}, ${a.tipo},
              ${a.schema_version ?? "2.0"}, ${a.resumo_fato ?? null}, ${a.tese_defesa ?? null},
              ${a.estrategia_atual ?? null}, ${a.crime_principal ?? null},
              ${a.pontos_criticos ?? null}, ${a.payload ?? null}, ${a.fonte_arquivo ?? null}, NOW(), NOW(), NOW())`;
  }
  console.log(`#${item.audiencia_id} ✓`);
  ok++;
}
console.log(`Resumo: ${ok} ok, ${erro} erro/inválida`);
await sql.end();
