import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { processos } from "@/lib/db/schema";
import { and, eq, gte, lte, isNotNull, isNull, count, sql } from "drizzle-orm";

// ==========================================
// SEGUNDO GRAU CRIMINAL ROUTER
// Gerencia processos criminais no 2º Grau (TJBA)
// ==========================================

export const segundoGrauRouter = router({
  // ==========================================
  // DASHBOARD KPIs
  // ==========================================

  /** KPIs resumidos para o dashboard de 2º Grau Criminal */
  dashboardKpis: protectedProcedure
    .query(async () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const hojeStr = hoje.toISOString().split("T")[0];

      const mais7 = new Date(hoje);
      mais7.setDate(mais7.getDate() + 7);
      const mais7Str = mais7.toISOString().split("T")[0];

      const menos30 = new Date(hoje);
      menos30.setDate(menos30.getDate() - 30);
      const menos30Str = menos30.toISOString().split("T")[0];

      const [totalResult, pautaResult, conclusosResult] = await Promise.all([
        // Total de processos do 2º Grau Criminal
        db
          .select({ value: count() })
          .from(processos)
          .where(
            and(
              eq(processos.area, "CRIMINAL_2_GRAU"),
              isNull(processos.deletedAt)
            )
          ),

        // Pauta próxima: data_pauta entre hoje e hoje+7
        db
          .select({ value: count() })
          .from(processos)
          .where(
            and(
              eq(processos.area, "CRIMINAL_2_GRAU"),
              isNull(processos.deletedAt),
              isNotNull(processos.dataPauta),
              gte(processos.dataPauta, hojeStr),
              lte(processos.dataPauta, mais7Str)
            )
          ),

        // Conclusos há mais de 30 dias sem julgamento
        db
          .select({ value: count() })
          .from(processos)
          .where(
            and(
              eq(processos.area, "CRIMINAL_2_GRAU"),
              isNull(processos.deletedAt),
              isNotNull(processos.dataConclusao),
              lte(processos.dataConclusao, menos30Str),
              isNull(processos.dataJulgamento)
            )
          ),
      ]);

      return {
        total: totalResult[0]?.value ?? 0,
        pautaProxima: pautaResult[0]?.value ?? 0,
        conclusosHaMais30: conclusosResult[0]?.value ?? 0,
      };
    }),

  // ==========================================
  // LISTAR PROCESSOS
  // ==========================================

  /** Listar processos de 2º Grau Criminal com filtros opcionais */
  listar: protectedProcedure
    .input(
      z
        .object({
          classe: z.string().optional(),
          camara: z.string().optional(),
          relator: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const filters = input ?? {};
      const conditions = [
        eq(processos.area, "CRIMINAL_2_GRAU"),
        isNull(processos.deletedAt),
      ];

      if (filters.classe) {
        conditions.push(eq(processos.classeRecursal, filters.classe as any));
      }
      if (filters.camara) {
        conditions.push(eq(processos.camara, filters.camara));
      }
      if (filters.relator) {
        conditions.push(eq(processos.relator, filters.relator));
      }

      const rows = await db
        .select()
        .from(processos)
        .where(and(...conditions))
        .orderBy(processos.dataPauta, processos.createdAt);

      return rows;
    }),

  // ==========================================
  // PAUTA
  // ==========================================

  /** Listar processos pautados nos próximos N dias */
  pauta: protectedProcedure
    .input(
      z.object({
        dias: z.number().min(1).max(365).default(30),
      })
    )
    .query(async ({ input }) => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const hojeStr = hoje.toISOString().split("T")[0];

      const limite = new Date(hoje);
      limite.setDate(limite.getDate() + input.dias);
      const limiteStr = limite.toISOString().split("T")[0];

      const rows = await db
        .select()
        .from(processos)
        .where(
          and(
            eq(processos.area, "CRIMINAL_2_GRAU"),
            isNull(processos.deletedAt),
            isNotNull(processos.dataPauta),
            gte(processos.dataPauta, hojeStr),
            lte(processos.dataPauta, limiteStr)
          )
        )
        .orderBy(processos.dataPauta);

      return rows;
    }),
});
