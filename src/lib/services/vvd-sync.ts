/**
 * Sincroniza intimações VVD (ainda não promovidas a petição) para a aba
 * "Violência Doméstica" do Google Sheets.
 *
 * Motivação:
 *   O push padrão (`pushDemanda`) lê de `demandas`. Intimações VVD importadas
 *   do PJe só viram `demanda` quando o usuário clica em "Criar Petição".
 *   Sem esse passo intermediário, a intimação fica invisível na planilha.
 *
 *   Esta função cobre o gap: escreve cada intimação ativa como linha na aba,
 *   usando o próprio `pushDemanda` com um objeto sintético. Quando a intimação
 *   virar demanda depois, o `pushDemanda` da demanda vai localizar a linha
 *   existente via numeroAutos (fallback em `findRowById`) e sobrescrevê-la,
 *   trocando o __id__ da intimação pelo id da demanda. Auto-limpeza.
 */

import { db } from "@/lib/db";
import { intimacoesVVD, processosVVD, partesVVD } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { pushDemanda, type DemandaParaSync } from "./google-sheets";

export interface VVDSyncStats {
  considered: number;
  pushed: number;
  errors: string[];
}

/**
 * Percorre todas as intimações VVD ativas (sem demandaId) e escreve na planilha.
 * Idempotente: a linha é localizada por numeroAutos e sobrescrita quando já existe.
 */
export async function syncVVDIntimacoesToSheet(): Promise<VVDSyncStats> {
  const rows = await db
    .select({
      intimacaoId: intimacoesVVD.id,
      ato: intimacoesVVD.ato,
      dataExpedicao: intimacoesVVD.dataExpedicao,
      prazo: intimacoesVVD.prazo,
      prazoDias: intimacoesVVD.prazoDias,
      providencias: intimacoesVVD.providencias,
      defensorId: intimacoesVVD.defensorId,
      numeroAutos: processosVVD.numeroAutos,
      requeridoNome: partesVVD.nome,
    })
    .from(intimacoesVVD)
    .leftJoin(processosVVD, eq(intimacoesVVD.processoVVDId, processosVVD.id))
    .leftJoin(partesVVD, eq(processosVVD.requeridoId, partesVVD.id))
    .where(and(isNull(intimacoesVVD.demandaId), isNull(processosVVD.deletedAt)));

  const stats: VVDSyncStats = { considered: rows.length, pushed: 0, errors: [] };

  for (const r of rows) {
    try {
      // Prazo em data: se veio `prazo` como date, usa; senão deriva de dataExpedicao+prazoDias.
      let prazoStr: string | null = null;
      if (r.prazo) {
        prazoStr = r.prazo;
      } else if (r.dataExpedicao && r.prazoDias) {
        const base = new Date(`${r.dataExpedicao}T00:00:00`);
        base.setDate(base.getDate() + r.prazoDias);
        prazoStr = base.toISOString().slice(0, 10);
      }

      const demandaSync: DemandaParaSync = {
        id: r.intimacaoId,
        status: "2_ATENDER",
        substatus: null,
        reuPreso: false,
        dataEntrada: r.dataExpedicao ?? null,
        assistidoNome: r.requeridoNome ?? "",
        numeroAutos: r.numeroAutos ?? "",
        ato: r.ato ?? "Intimação",
        prazo: prazoStr,
        providencias: r.providencias ?? "Classificar demanda",
        delegadoNome: null,
        atribuicao: "VVD_CAMACARI",
        defensorId: r.defensorId,
      };

      const res = await pushDemanda(demandaSync);
      if (res.pushed) stats.pushed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stats.errors.push(`intimacao ${r.intimacaoId}: ${msg}`);
    }
  }

  return stats;
}
