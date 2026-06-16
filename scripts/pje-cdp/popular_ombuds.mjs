/**
 * Popula audiencias.registro_audiencia + resumo_defesa, upsert em analises_cowork
 * E processos.analysis_data (formato-app) — fonte que o painel de detalhe da
 * audiência (event-detail-sheet) realmente lê para as seções por subtipo
 * (motivo da designação, relato da ofendida, resumo, requerimento, medidas).
 * Variante do 07_popular_ombuds.ts com prepare:false (pooler Supabase 6543).
 *
 * Uso: node scripts/pje-cdp/popular_ombuds.mjs /tmp/registros-2026-06-11.json
 * Entrada: [{ audiencia_id, processo_id, registro_audiencia, resumo_defesa, analise_cowork?, analysis_data? }]
 *   analise_cowork (opcional): { tipo, resumo_fato, tese_defesa, estrategia_atual, crime_principal, pontos_criticos, payload }
 *   analysis_data (opcional): objeto formato-app já pronto; se ausente, é derivado de
 *     analise_cowork.payload (o dossiê gerado pela skill).
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/Projetos/Defender/.env.local" });
import postgres from "postgres";
import * as fs from "fs";

const sql = postgres(process.env.DATABASE_URL.replace(/^"|"$/g, ""), {
  prepare: false, connect_timeout: 20, ssl: "require",
});

const items = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

/**
 * Converte o dossiê (payload da skill) no objeto formato-app que o painel lê de
 * processos.analysis_data. Mapeia as chaves esperadas pelo event-detail-sheet:
 * imputacao (string), motivo_designacao, relato_vitima, resumo_audiencia,
 * requerimento_defesa, medidas_protetivas(+_vigentes), teses_defesa,
 * depoentes_detalhe, etc. Retorna null se não houver dossiê utilizável.
 */
function dossieParaAnalysisData(d) {
  if (!d || typeof d !== "object") return null;
  const med = Array.isArray(d.medidas_protetivas) ? d.medidas_protetivas : [];
  const imputacao =
    typeof d.imputacao === "string" ? d.imputacao : (d.imputacao?.principal ?? null);
  return {
    schema_version: "2.0",
    fonte: "preparar-audiencias (popular_ombuds)",
    gerado_em: d?.audiencia?.data ?? d?.metadata?.gerado_em ?? null,
    imputacao,
    motivo_designacao: d.motivo_designacao ?? null,
    relato_vitima: d.relato_vitima ?? null,
    resumo_audiencia: d.resumo_audiencia ?? null,
    requerimento_defesa: d.requerimento_defesa ?? null,
    resumo_executivo: d.resumo_executivo ?? null,
    narrativa_denuncia_literal: d.narrativa_denuncia_literal ?? null,
    medidas_protetivas: med,
    medidas_protetivas_vigentes: med
      .filter((m) => m.status === "deferida")
      .map((m) => `${m.medida} (${m.inciso}) — ${m.id_fl}`),
    teses_defesa: d.teses ?? d.teses_defesa ?? [],
    depoentes_detalhe: d.depoentes ?? d.depoentes_detalhe ?? [],
    relato_assistido: d.relato_assistido ?? null,
    cronologia: d.cronologia ?? [],
    perguntas_estrategicas: d.perguntas_estrategicas ?? null,
    orientacao_assistido: d.orientacao_assistido ?? null,
    pendencias: d.pendencias ?? [],
    documentos_relevantes: d.documentos_relevantes ?? [],
    vulnerabilidades_acusacao: d.pontos_criticos ?? d.vulnerabilidades_acusacao ?? [],
  };
}

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

  // processos.analysis_data — fonte do painel por subtipo. Usa o objeto explícito
  // se fornecido; senão deriva do dossiê (analise_cowork.payload).
  if (item.processo_id) {
    const ad = item.analysis_data ?? dossieParaAnalysisData(item.analise_cowork?.payload);
    if (ad) {
      await sql`
        UPDATE processos
        SET analysis_data = ${ad}, analysis_status = 'completed',
            analyzed_at = NOW(), analysis_version = 2, updated_at = NOW()
        WHERE id = ${item.processo_id}`;
    }
  }
  console.log(`#${item.audiencia_id} ✓`);
  ok++;
}
console.log(`Resumo: ${ok} ok, ${erro} erro/inválida`);
await sql.end();
