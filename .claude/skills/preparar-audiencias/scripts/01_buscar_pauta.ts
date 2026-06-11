/**
 * Lista a pauta de audiências do dia + calendar_events redundantes.
 * Output JSON em /tmp/pauta-<YYYY-MM-DD>.json (entrada para os passos seguintes).
 *
 * Uso:
 *   npx tsx .claude/skills-cowork/preparar-audiencias/scripts/01_buscar_pauta.ts 2026-05-05
 */
import * as dotenv from "dotenv";
dotenv.config({ path: "/Users/rodrigorochameire/Projetos/Defender/.env.local" });

import postgres from "postgres";
import * as fs from "fs";

const sql = postgres(process.env.DATABASE_URL!);

const dia = process.argv[2] ?? new Date().toISOString().slice(0, 10);

(async () => {
  const audiencias = await sql`
    SELECT
      a.id, a.data_audiencia, a.tipo, a.titulo, a.local, a.sala, a.horario,
      a.juiz, a.promotor, a.status, a.observacoes, a.descricao,
      a.registro_audiencia, a.resumo_defesa, a.anotacoes,
      a.google_calendar_event_id, a.caso_id, a.defensor_id,
      p.id AS processo_id, p.numero_autos, p.classe_processual, p.tipo_processo,
      p.atribuicao, p.area, p.vara, p.comarca,
      ass.id AS assistido_id, ass.nome AS assistido_nome,
      ass.status_prisional, ass.cpf, ass.data_nascimento
    FROM audiencias a
    LEFT JOIN processos p ON p.id = a.processo_id
    LEFT JOIN assistidos ass ON ass.id = a.assistido_id
    WHERE DATE(a.data_audiencia) = ${dia}
    ORDER BY a.data_audiencia, a.id
  `;

  const eventos = await sql`
    SELECT id, title, description, event_date, event_type, processo_id, assistido_id, status, deleted_at, created_at
    FROM calendar_events
    WHERE DATE(event_date) = ${dia} AND deleted_at IS NULL
    ORDER BY event_date, id
  `;

  // Detectar redundâncias: calendar_event sem audiência correspondente, ou audiência+evento mesmo processo
  const procsComAud = new Set(audiencias.map((a) => a.processo_id));
  const eventosRedundantes = eventos.filter((e) => procsComAud.has(e.processo_id));
  const eventosOrfaos = eventos.filter((e) => !procsComAud.has(e.processo_id));

  // Para cada audiência, conferir se há análise e relatório
  const enriched = await Promise.all(audiencias.map(async (a) => {
    const [analise] = await sql`
      SELECT id, tipo, schema_version, resumo_fato, tese_defesa, estrategia_atual,
             crime_principal, pontos_criticos, payload, importado_em, updated_at
      FROM analises_cowork
      WHERE processo_id = ${a.processo_id}
      ORDER BY updated_at DESC LIMIT 1
    `;

    const [tem_relatorio_individual] = await sql`
      SELECT 1 AS x FROM analises_cowork
      WHERE processo_id = ${a.processo_id} AND tipo LIKE 'vvd_%' OR tipo LIKE 'juri_%'
      LIMIT 1
    `.catch(() => [null]);

    return { ...a, analise: analise ?? null, tem_relatorio_individual: !!tem_relatorio_individual };
  }));

  const out = {
    data: dia,
    total_audiencias: audiencias.length,
    audiencias: enriched,
    eventos_redundantes: eventosRedundantes,
    eventos_orfaos: eventosOrfaos,
    metadata: { gerado_em: new Date().toISOString() },
  };

  const outPath = `/tmp/pauta-${dia}.json`;
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Pauta de ${dia} → ${outPath}`);
  console.log(`  audiências: ${audiencias.length}`);
  console.log(`  eventos redundantes (a soft-delete): ${eventosRedundantes.length}`);
  console.log(`  eventos órfãos (sem audiência): ${eventosOrfaos.length}`);

  await sql.end();
})();
