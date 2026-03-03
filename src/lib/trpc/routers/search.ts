import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { enrichmentClient } from "@/lib/services/enrichment-client";
import { db } from "@/lib/db";
import { assistidos, processos, demandas } from "@/lib/db/schema";
import { ilike, or } from "drizzle-orm";

export const searchRouter = router({
  /**
   * Busca semântica via pgvector (enrichment engine)
   */
  semantic: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(1000),
        filters: z
          .object({
            assistidoId: z.number().optional(),
            processoId: z.number().optional(),
            entityTypes: z.array(z.string()).optional(),
          })
          .optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await enrichmentClient.semanticSearch({
          query: input.query,
          filters: {
            assistido_id: input.filters?.assistidoId,
            processo_id: input.filters?.processoId,
            entity_types: input.filters?.entityTypes,
          },
          limit: input.limit,
        });

        return {
          results: result.results,
          total: result.total,
          query: result.query,
        };
      } catch (error) {
        // Fallback: se enrichment engine offline, retornar vazio
        console.error("[search.semantic] Enrichment engine error:", error);
        return { results: [], total: 0, query: input.query };
      }
    }),

  /**
   * Busca local rápida (DB direta) — processos, assistidos, demandas
   */
  local: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(200),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ input }) => {
      const term = `%${input.query}%`;

      // Buscar assistidos por nome ou CPF
      const matchingAssistidos = await db
        .select({
          id: assistidos.id,
          nome: assistidos.nome,
          cpf: assistidos.cpf,
          driveFolderId: assistidos.driveFolderId,
          atribuicao: assistidos.atribuicaoPrimaria,
        })
        .from(assistidos)
        .where(
          or(
            ilike(assistidos.nome, term),
            ilike(assistidos.cpf, term)
          )
        )
        .limit(input.limit);

      // Buscar processos por número, classe processual ou vara
      const matchingProcessos = await db
        .select({
          id: processos.id,
          numeroAutos: processos.numeroAutos,
          classeProcessual: processos.classeProcessual,
          vara: processos.vara,
          assistidoId: processos.assistidoId,
        })
        .from(processos)
        .where(
          or(
            ilike(processos.numeroAutos, term),
            ilike(processos.classeProcessual, term),
            ilike(processos.vara, term)
          )
        )
        .limit(input.limit);

      // Buscar demandas por ato ou tipo de ato
      const matchingDemandas = await db
        .select({
          id: demandas.id,
          ato: demandas.ato,
          status: demandas.status,
          prioridade: demandas.prioridade,
          tipoAto: demandas.tipoAto,
          createdAt: demandas.createdAt,
        })
        .from(demandas)
        .where(
          or(
            ilike(demandas.ato, term),
            ilike(demandas.tipoAto, term)
          )
        )
        .limit(input.limit);

      return {
        assistidos: matchingAssistidos,
        processos: matchingProcessos,
        demandas: matchingDemandas,
      };
    }),
});
