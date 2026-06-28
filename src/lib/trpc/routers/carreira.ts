// src/lib/trpc/routers/carreira.ts
import { and, desc, inArray, isNull } from "drizzle-orm";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { vidaFuncionalEventos, substituicoes, afastamentos, users } from "@/lib/db/schema";
import { getVidaFuncionalScope } from "../vida-funcional-scope";
import { buildMeuPanorama, type EventoLite, type SubLite } from "@/lib/carreira/panorama";
import {
  buildCoberturaRollup,
  type AfastamentoLite,
  type SubstituicaoLite,
  type UserLite,
} from "@/lib/carreira/cobertura-rollup";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export const carreiraRouter = router({
  /** Cockpit pessoal — privado ao defensor (admin sem god-view). */
  meuPanorama: protectedProcedure.query(async ({ ctx }) => {
    const scope = getVidaFuncionalScope(ctx.user);

    const eventosRows = await db
      .select()
      .from(vidaFuncionalEventos)
      .where(and(isNull(vidaFuncionalEventos.deletedAt), inArray(vidaFuncionalEventos.defensorId, scope)))
      .orderBy(desc(vidaFuncionalEventos.dataEvento));

    const subsRows = await db
      .select({ id: substituicoes.id, status: substituicoes.status })
      .from(substituicoes)
      .where(inArray(substituicoes.defensorId, scope));

    const eventos: EventoLite[] = eventosRows.map((e) => ({
      id: e.id, tipo: e.tipo, cluster: e.cluster, titulo: e.titulo, status: e.status,
      dataEvento: e.dataEvento, dataFim: e.dataFim, prazo: e.prazo, valorCents: e.valorCents,
    }));
    const subs: SubLite[] = subsRows.map((s) => ({ id: s.id, status: s.status ?? "em_andamento" }));

    return buildMeuPanorama({ eventos, substituicoes: subs }, todayISO());
  }),

  /** Rollup operacional de cobertura — admin, somente dados operacionais. */
  coberturaRollup: adminProcedure.query(async () => {
    const afRows = await db.select().from(afastamentos);
    const subRows = await db
      .select({
        id: substituicoes.id,
        defensorId: substituicoes.defensorId,
        afastamentoId: substituicoes.afastamentoId,
        unidadeSubstituida: substituicoes.unidadeSubstituida,
        status: substituicoes.status,
        oficioNumero: substituicoes.oficioNumero,
        relatorioPath: substituicoes.relatorioPath,
        seiProtocolo: substituicoes.seiProtocolo,
      })
      .from(substituicoes);
    const userRows = await db.select({ id: users.id, name: users.name }).from(users);

    const af: AfastamentoLite[] = afRows.map((a) => ({
      id: a.id, defensorId: a.defensorId, substitutoId: a.substitutoId,
      dataInicio: a.dataInicio, dataFim: a.dataFim, ativo: a.ativo, tipo: a.tipo,
    }));
    const sub: SubstituicaoLite[] = subRows.map((s) => ({
      id: s.id, defensorId: s.defensorId, afastamentoId: s.afastamentoId,
      unidadeSubstituida: s.unidadeSubstituida, status: s.status ?? "em_andamento",
      oficioNumero: s.oficioNumero, relatorioPath: s.relatorioPath, seiProtocolo: s.seiProtocolo,
    }));
    const us: UserLite[] = userRows.map((u) => ({ id: u.id, name: u.name ?? `#${u.id}` }));

    return buildCoberturaRollup({ afastamentos: af, substituicoes: sub, users: us }, todayISO());
  }),
});
