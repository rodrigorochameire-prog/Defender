import { sql, type SQL } from "drizzle-orm";

/**
 * Prévia (450 chars) do resumo de análise para o card. Discrimina pelo marcador
 * do contrato `jsonb_exists(enrichment_data, 'objeto')` (evita pegar "Termos da
 * pronúncia" / "Relato da suposta vítima" / anotação manual, que também usam
 * tipo='analise'). Fallback: título exato "Resumo e providências" (registros
 * antigos, escritos antes do contrato JSON). Ver spec §A2.2/§A4.
 */
export function analiseResumoSql(registros: any, demandas: any): SQL<string | null> {
  return sql<string | null>`COALESCE(
    (SELECT left(${registros.conteudo}, 450) FROM ${registros}
       WHERE ${registros.demandaId} = ${demandas.id}
         AND ${registros.tipo} = 'analise'
         AND jsonb_exists(${registros.enrichmentData}, 'objeto')
       ORDER BY ${registros.id} DESC LIMIT 1),
    (SELECT left(${registros.conteudo}, 450) FROM ${registros}
       WHERE ${registros.demandaId} = ${demandas.id}
         AND ${registros.titulo} = ${'Resumo e providências'}
       ORDER BY ${registros.id} DESC LIMIT 1)
  )`;
}

/** enrichment_data (JSON de contrato) do registro discriminado, p/ campos rotulados. */
export function analiseDataSql(registros: any, demandas: any): SQL<unknown> {
  return sql`(SELECT ${registros.enrichmentData} FROM ${registros}
       WHERE ${registros.demandaId} = ${demandas.id}
         AND ${registros.tipo} = 'analise'
         AND jsonb_exists(${registros.enrichmentData}, 'objeto')
       ORDER BY ${registros.id} DESC LIMIT 1)`;
}
