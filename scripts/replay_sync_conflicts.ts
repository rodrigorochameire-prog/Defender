/**
 * Reaplica no banco as mudanças que foram bloqueadas por falso-conflito
 * na sync_log. A planilha é fonte de verdade para status, então aplicamos
 * o valor_planilha de cada entrada não resolvida.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

// Copiado de src/app/api/sheets/webhook/route.ts
const SHEETS_LABEL_TO_STATUS: Record<string, { status: string; substatus: string | null }> = {
  "1 - URGENTE":            { status: "URGENTE",       substatus: null },
  "2 - RELATÓRIO":          { status: "2_ATENDER",     substatus: "2 - Relatório" },
  "2 - ANALISAR":           { status: "2_ATENDER",     substatus: "2 - Analisar" },
  "2 - ATENDER":            { status: "2_ATENDER",     substatus: "2 - Atender" },
  "2 - BUSCAR":             { status: "2_ATENDER",     substatus: "2 - Buscar" },
  "2 - DILIGENCIAR":        { status: "2_ATENDER",     substatus: "2 - Diligenciar" },
  "2 - INVESTIGAR":         { status: "2_ATENDER",     substatus: "2 - Investigar" },
  "2 - ELABORAR":           { status: "2_ATENDER",     substatus: "2 - Elaborar" },
  "2 - ELABORANDO":         { status: "2_ATENDER",     substatus: "2 - Elaborando" },
  "2 - REVISAR":            { status: "2_ATENDER",     substatus: "2 - Revisar" },
  "2 - REVISANDO":          { status: "2_ATENDER",     substatus: "2 - Revisando" },
  "3 - PROTOCOLAR":         { status: "2_ATENDER",     substatus: "3 - Protocolar" },
  "4 - AMANDA":             { status: "4_MONITORAR",   substatus: "4 - Amanda" },
  "4 - ESTÁGIO - TAISSA":   { status: "4_MONITORAR",   substatus: "4 - Estágio - Taissa" },
  "4 - EMILLY":             { status: "4_MONITORAR",   substatus: "4 - Emilly" },
  "4 - MONITORAR":          { status: "4_MONITORAR",   substatus: "4 - Monitorar" },
  "5 - TRIAGEM":            { status: "5_TRIAGEM",     substatus: "triagem" },
  "6 - DOCUMENTOS":         { status: "2_ATENDER",     substatus: "6 - Documentos" },
  "6 - TESTEMUNHAS":        { status: "2_ATENDER",     substatus: "6 - Testemunhas" },
  "7 - PROTOCOLADO":        { status: "7_PROTOCOLADO", substatus: null },
  "7 - SIGAD":              { status: "7_PROTOCOLADO", substatus: "7 - Sigad" },
  "7 - CIÊNCIA":            { status: "7_CIENCIA",     substatus: null },
  "7 - RESOLVIDO":          { status: "CONCLUIDO",     substatus: "7 - Resolvido" },
  "7 - CONSTITUIU ADVOGADO":{ status: "CONCLUIDO",     substatus: "7 - Constituiu advogado" },
  "7 - SEM ATUAÇÃO":        { status: "7_SEM_ATUACAO", substatus: null },
  "7 - PETICIONAMENTO INTERMEDIÁRIO": { status: "7_PROTOCOLADO", substatus: "7 - Peticionamento intermediário" },
};

function normalizar(valor: string) {
  return SHEETS_LABEL_TO_STATUS[valor.toUpperCase().trim()] ?? null;
}

async function main() {
  // Busca só a última entrada por (demanda_id, campo) para evitar aplicar
  // valores intermediários quando houve múltiplas edições
  const pendentes = await sql`
    SELECT DISTINCT ON (demanda_id, campo)
      id, demanda_id, campo, valor_planilha, created_at
    FROM sync_log
    WHERE origem = 'CONFLITO_RESOLVIDO'
      AND resolvido_em IS NULL
    ORDER BY demanda_id, campo, created_at DESC
  `;

  console.log(`\nPendentes: ${pendentes.length}\n`);

  let aplicados = 0;
  let pulados = 0;

  for (const p of pendentes) {
    const valor = String(p.valor_planilha ?? "").trim();

    if (p.campo === "status") {
      const parsed = normalizar(valor);
      if (!parsed) {
        console.log(`[SKIP] demanda ${p.demanda_id}: status inválido "${valor}"`);
        pulados++;
        continue;
      }
      await sql`
        UPDATE demandas
        SET status = ${parsed.status}, substatus = ${parsed.substatus}, updated_at = NOW(), synced_at = NOW()
        WHERE id = ${p.demanda_id}
      `;
      console.log(`[OK]   demanda ${p.demanda_id}: status → ${parsed.status} / ${parsed.substatus ?? "null"}`);
      aplicados++;
    } else if (p.campo === "providencias") {
      await sql`
        UPDATE demandas
        SET providencias = ${valor || null}, updated_at = NOW(), synced_at = NOW()
        WHERE id = ${p.demanda_id}
      `;
      console.log(`[OK]   demanda ${p.demanda_id}: providencias → "${valor.slice(0, 40)}..."`);
      aplicados++;
    } else {
      console.log(`[SKIP] demanda ${p.demanda_id}: campo não suportado "${p.campo}"`);
      pulados++;
      continue;
    }

    // Marca como resolvido
    await sql`
      UPDATE sync_log
      SET resolvido_em = NOW(), resolvido_por = 'system-replay', resolvido_valor = ${valor}
      WHERE demanda_id = ${p.demanda_id} AND campo = ${p.campo} AND resolvido_em IS NULL
    `;
  }

  console.log(`\n✓ Aplicados: ${aplicados}  |  Pulados: ${pulados}\n`);
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
