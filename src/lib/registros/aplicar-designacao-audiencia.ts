/**
 * Aplica uma designação de audiência detectada em texto (despacho de ciência
 * ou movimento de intimação do PJe) sobre a tabela `audiencias`:
 *
 *  - redesignação → cancela as audiências futuras do processo fora do novo
 *    dia (sem isso, "Próxima Audiência" fica presa na data antiga);
 *  - já existe audiência no dia → corrige hora/tipo/local quando o texto traz
 *    informação melhor (ex.: a existente foi criada com 00:00 por parse parcial);
 *  - caso contrário → insere a audiência.
 *
 * Usada pelo side-effect de `registros.create` (tipo "ciencia") e pela
 * importação de demandas do PJe. `tx` é tipado como `typeof db` — o mesmo
 * tipo que `withTransaction` passa ao callback (src/lib/db/index.ts).
 */

import { and, eq, gt, gte, lt, lte, or, sql } from "drizzle-orm";
import { db, audiencias, processos, assistidos } from "@/lib/db";
import type { DesignacaoAudiencia } from "./detectar-designacao-audiencia";

export interface AudienciaAplicada {
  id: number;
  data: string;
  horario: string;
  tipo: string;
  /** true quando reaproveitou/corrigiu audiência já existente no dia */
  atualizada: boolean;
}

export interface AudienciaSupersedida {
  id: number;
  googleCalendarEventId: string | null;
}

export interface ResultadoDesignacao {
  audiencia: AudienciaAplicada | null;
  supersedidas: AudienciaSupersedida[];
}

export async function aplicarDesignacaoAudiencia(
  tx: typeof db,
  params: {
    processoId: number;
    assistidoId: number;
    defensorId: number;
    det: DesignacaoAudiencia;
    /** Frase de origem para a descrição, ex. "registro de ciência" */
    origem: string;
  }
): Promise<ResultadoDesignacao> {
  const { processoId, assistidoId, defensorId, det, origem } = params;
  const inicioDia = new Date(`${det.data}T00:00:00-03:00`);
  const fimDia = new Date(`${det.data}T23:59:59-03:00`);

  let supersedidas: AudienciaSupersedida[] = [];
  if (det.redesignacao) {
    supersedidas = await tx
      .update(audiencias)
      .set({
        status: "cancelada",
        descricao: sql`coalesce(${audiencias.descricao}, '') || ${
          `\n[Cancelada automaticamente: redesignação para ${det.data} ${det.horario} detectada em ${origem}.]`
        }`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(audiencias.processoId, processoId),
          gte(audiencias.dataAudiencia, new Date()),
          sql`(${audiencias.status} IS NULL OR ${audiencias.status} NOT IN ('cancelada', 'realizada'))`,
          or(
            lt(audiencias.dataAudiencia, inicioDia),
            gt(audiencias.dataAudiencia, fimDia)
          )
        )
      )
      .returning({
        id: audiencias.id,
        googleCalendarEventId: audiencias.googleCalendarEventId,
      });
  }

  const [existente] = await tx
    .select({ id: audiencias.id, horario: audiencias.horario })
    .from(audiencias)
    .where(
      and(
        eq(audiencias.processoId, processoId),
        gte(audiencias.dataAudiencia, inicioDia),
        lte(audiencias.dataAudiencia, fimDia)
      )
    )
    .limit(1);

  if (existente) {
    if (det.horario !== "00:00" && det.horario !== existente.horario) {
      await tx
        .update(audiencias)
        .set({
          dataAudiencia: new Date(`${det.data}T${det.horario}:00-03:00`),
          horario: det.horario,
          tipo: det.tipo.slice(0, 50),
          ...(det.local ? { local: det.local } : {}),
          updatedAt: new Date(),
        })
        .where(eq(audiencias.id, existente.id));
    }
    return {
      audiencia: {
        id: existente.id,
        data: det.data,
        horario: det.horario,
        tipo: det.tipo,
        atualizada: true,
      },
      supersedidas,
    };
  }

  const [proc] = await tx
    .select({ numero: processos.numeroAutos })
    .from(processos)
    .where(eq(processos.id, processoId))
    .limit(1);
  const [assistido] = await tx
    .select({ nome: assistidos.nome })
    .from(assistidos)
    .where(eq(assistidos.id, assistidoId))
    .limit(1);

  const [aud] = await tx
    .insert(audiencias)
    .values({
      processoId,
      assistidoId,
      // hora local de Camaçari (UTC-3) gravada como UTC verdadeiro;
      // `horario` é a fonte da verdade de exibição
      dataAudiencia: new Date(`${det.data}T${det.horario}:00-03:00`),
      horario: det.horario,
      tipo: det.tipo.slice(0, 50),
      local: det.local,
      titulo: `${det.tipo} - ${assistido?.nome ?? ""} - ${proc?.numero ?? ""}`.trim(),
      descricao:
        `Agendada automaticamente a partir de ${origem} (designação detectada).` +
        (det.modalidade ? `\nModalidade: ${det.modalidade}` : "") +
        `\nTrecho: "${det.trecho}"`,
      status: "agendada",
      defensorId,
    })
    .returning({ id: audiencias.id });

  return {
    audiencia: aud
      ? {
          id: aud.id,
          data: det.data,
          horario: det.horario,
          tipo: det.tipo,
          atualizada: false,
        }
      : null,
    supersedidas,
  };
}

/**
 * Remove do Google Calendar os eventos das audiências canceladas por
 * redesignação. Best-effort e fire-and-forget — chamar FORA da transação.
 */
export function limparCalendarSupersedidas(
  processoId: number,
  supersedidas: AudienciaSupersedida[]
): void {
  const comEvento = supersedidas.filter((a) => a.googleCalendarEventId);
  if (comEvento.length === 0) return;
  (async () => {
    try {
      const [{ deleteCalendarEvent }, { resolveCalendarId }] = await Promise.all([
        import("@/lib/services/google-calendar"),
        import("@/lib/services/calendar-mapping"),
      ]);
      const [proc] = await db
        .select({ area: processos.area })
        .from(processos)
        .where(eq(processos.id, processoId))
        .limit(1);
      const calendarId = resolveCalendarId(proc?.area ?? null);
      for (const a of comEvento) {
        await deleteCalendarEvent(a.googleCalendarEventId!, { calendarId });
      }
    } catch (err) {
      console.error("[aplicar-designacao-audiencia] calendar cleanup failed", err);
    }
  })();
}
