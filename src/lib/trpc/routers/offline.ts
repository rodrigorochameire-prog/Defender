import { z } from "zod";
import { protectedProcedure, router } from "../init";
import { db } from "@/lib/db";
import {
  assistidos,
  processos,
  demandas,
  atendimentos,
  casos,
} from "@/lib/db/schema";
import { and, eq, gt, isNull, sql } from "drizzle-orm";

// ==========================================
// OFFLINE SYNC ROUTER
// Endpoints para hydration e sync incremental
// Exclui colunas JSONB pesadas
// ==========================================

// Column projections — lightweight subsets for offline cache

const assistidoColumns = {
  id: assistidos.id,
  nome: assistidos.nome,
  cpf: assistidos.cpf,
  rg: assistidos.rg,
  nomeMae: assistidos.nomeMae,
  dataNascimento: assistidos.dataNascimento,
  statusPrisional: assistidos.statusPrisional,
  localPrisao: assistidos.localPrisao,
  telefone: assistidos.telefone,
  endereco: assistidos.endereco,
  photoUrl: assistidos.photoUrl,
  observacoes: assistidos.observacoes,
  defensorId: assistidos.defensorId,
  atribuicaoPrimaria: assistidos.atribuicaoPrimaria,
  driveFolderId: assistidos.driveFolderId,
  deletedAt: assistidos.deletedAt,
  createdAt: assistidos.createdAt,
  updatedAt: assistidos.updatedAt,
} as const;

const processoColumns = {
  id: processos.id,
  assistidoId: processos.assistidoId,
  atribuicao: processos.atribuicao,
  numeroAutos: processos.numeroAutos,
  comarca: processos.comarca,
  vara: processos.vara,
  area: processos.area,
  assunto: processos.assunto,
  parteContraria: processos.parteContraria,
  fase: processos.fase,
  situacao: processos.situacao,
  isJuri: processos.isJuri,
  dataSessaoJuri: processos.dataSessaoJuri,
  defensorId: processos.defensorId,
  observacoes: processos.observacoes,
  driveFolderId: processos.driveFolderId,
  casoId: processos.casoId,
  deletedAt: processos.deletedAt,
  createdAt: processos.createdAt,
  updatedAt: processos.updatedAt,
} as const;

const demandaColumns = {
  id: demandas.id,
  processoId: demandas.processoId,
  assistidoId: demandas.assistidoId,
  ato: demandas.ato,
  tipoAto: demandas.tipoAto,
  prazo: demandas.prazo,
  dataEntrada: demandas.dataEntrada,
  dataIntimacao: demandas.dataIntimacao,
  dataConclusao: demandas.dataConclusao,
  status: demandas.status,
  substatus: demandas.substatus,
  prioridade: demandas.prioridade,
  providencias: demandas.providencias,
  defensorId: demandas.defensorId,
  delegadoParaId: demandas.delegadoParaId,
  reuPreso: demandas.reuPreso,
  casoId: demandas.casoId,
  ordemManual: demandas.ordemManual,
  deletedAt: demandas.deletedAt,
  createdAt: demandas.createdAt,
  updatedAt: demandas.updatedAt,
} as const;

const atendimentoColumns = {
  id: atendimentos.id,
  assistidoId: atendimentos.assistidoId,
  processoId: atendimentos.processoId,
  casoId: atendimentos.casoId,
  dataRegistro: atendimentos.dataRegistro,
  duracao: atendimentos.duracao,
  tipo: atendimentos.tipo,
  local: atendimentos.local,
  assunto: atendimentos.assunto,
  conteudo: atendimentos.conteudo,
  status: atendimentos.status,
  transcricaoStatus: atendimentos.transcricaoStatus,
  enrichmentStatus: atendimentos.enrichmentStatus,
  autorId: atendimentos.autorId,
  createdAt: atendimentos.createdAt,
  updatedAt: atendimentos.updatedAt,
} as const;

const casoColumns = {
  id: casos.id,
  titulo: casos.titulo,
  codigo: casos.codigo,
  atribuicao: casos.atribuicao,
  status: casos.status,
  fase: casos.fase,
  prioridade: casos.prioridade,
  defensorId: casos.defensorId,
  observacoes: casos.observacoes,
  deletedAt: casos.deletedAt,
  createdAt: casos.createdAt,
  updatedAt: casos.updatedAt,
} as const;

export const offlineRouter = router({
  /**
   * Full sync — downloads all data.
   * Called after login or on first app load.
   */
  fullSync: protectedProcedure.query(async ({ ctx }) => {
    const [
      allAssistidos,
      allProcessos,
      allDemandas,
      allAtendimentos,
      allCasos,
    ] = await Promise.all([
      db.select(assistidoColumns).from(assistidos).where(isNull(assistidos.deletedAt)),
      db.select(processoColumns).from(processos).where(isNull(processos.deletedAt)),
      db.select(demandaColumns).from(demandas).where(isNull(demandas.deletedAt)),
      db.select(atendimentoColumns).from(atendimentos),
      db.select(casoColumns).from(casos).where(isNull(casos.deletedAt)),
    ]);

    return {
      assistidos: allAssistidos,
      processos: allProcessos,
      demandas: allDemandas,
      atendimentos: allAtendimentos,
      casos: allCasos,
      syncedAt: new Date().toISOString(),
    };
  }),

  /**
   * Incremental sync — downloads only records updated since lastSyncAt.
   * Called every 15 minutes or when coming back online.
   */
  incrementalSync: protectedProcedure
    .input(z.object({ since: z.string() }))
    .query(async ({ ctx, input }) => {
      const sinceDate = new Date(input.since);

      const [
        updatedAssistidos,
        updatedProcessos,
        updatedDemandas,
        updatedAtendimentos,
        updatedCasos,
      ] = await Promise.all([
        db.select(assistidoColumns).from(assistidos).where(gt(assistidos.updatedAt, sinceDate)),
        db.select(processoColumns).from(processos).where(gt(processos.updatedAt, sinceDate)),
        db.select(demandaColumns).from(demandas).where(gt(demandas.updatedAt, sinceDate)),
        db.select(atendimentoColumns).from(atendimentos).where(gt(atendimentos.updatedAt, sinceDate)),
        db.select(casoColumns).from(casos).where(gt(casos.updatedAt, sinceDate)),
      ]);

      return {
        assistidos: updatedAssistidos,
        processos: updatedProcessos,
        demandas: updatedDemandas,
        atendimentos: updatedAtendimentos,
        casos: updatedCasos,
        syncedAt: new Date().toISOString(),
      };
    }),

  /**
   * Push a single sync queue item to the server.
   * Handles create, update, delete for any supported table.
   */
  pushItem: protectedProcedure
    .input(
      z.object({
        table: z.enum(["assistidos", "processos", "demandas", "atendimentos", "casos"]),
        operation: z.enum(["create", "update", "delete"]),
        data: z.record(z.unknown()),
        expectedUpdatedAt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { table, operation, data, expectedUpdatedAt } = input;

      const tableMap = { assistidos, processos, demandas, atendimentos, casos };
      const targetTable = tableMap[table];

      if (operation === "create") {
        // Remove temp ID, let DB generate real one
        const { id: _tempId, createdAt: _ca, updatedAt: _ua, ...insertData } = data as any;
        const [result] = await db
          .insert(targetTable)
          .values({ ...insertData, defensorId: ctx.user.id } as any)
          .returning({ id: (targetTable as any).id });
        return { success: true, id: result.id, conflict: false };
      }

      if (operation === "update") {
        const { id, ...updateData } = data as any;
        if (!id) throw new Error("Update requires id");

        // Check for conflict if expectedUpdatedAt provided
        if (expectedUpdatedAt) {
          const [current] = await db
            .select({ updatedAt: (targetTable as any).updatedAt })
            .from(targetTable)
            .where(eq((targetTable as any).id, id));

          if (current) {
            const serverTime = new Date(current.updatedAt).getTime();
            const expectedTime = new Date(expectedUpdatedAt).getTime();
            if (serverTime > expectedTime) {
              return { success: false, id, conflict: true };
            }
          }
        }

        await db
          .update(targetTable)
          .set({ ...updateData, updatedAt: new Date() } as any)
          .where(eq((targetTable as any).id, id));

        return { success: true, id, conflict: false };
      }

      if (operation === "delete") {
        const { id } = data as any;
        if (!id) throw new Error("Delete requires id");
        // Soft delete
        await db
          .update(targetTable)
          .set({ deletedAt: new Date(), updatedAt: new Date() } as any)
          .where(eq((targetTable as any).id, id));

        return { success: true, id, conflict: false };
      }

      throw new Error(`Unknown operation: ${operation}`);
    }),

  /**
   * Fetch a single record from any supported table.
   * Used by the conflict resolution UI to get the server version.
   */
  getRecord: protectedProcedure
    .input(
      z.object({
        table: z.enum(["assistidos", "processos", "demandas", "atendimentos", "casos"]),
        id: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const { table, id } = input;
      const columnMap = {
        assistidos: { columns: assistidoColumns, tbl: assistidos },
        processos: { columns: processoColumns, tbl: processos },
        demandas: { columns: demandaColumns, tbl: demandas },
        atendimentos: { columns: atendimentoColumns, tbl: atendimentos },
        casos: { columns: casoColumns, tbl: casos },
      };

      const { columns, tbl } = columnMap[table];
      const [record] = await db
        .select(columns)
        .from(tbl)
        .where(eq((tbl as any).id, id))
        .limit(1);

      return record ?? null;
    }),

  /**
   * Force update a record — used when resolving a conflict with "keep local".
   */
  forceUpdate: protectedProcedure
    .input(
      z.object({
        table: z.enum(["assistidos", "processos", "demandas", "atendimentos", "casos"]),
        id: z.number(),
        data: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ input }) => {
      const { table, id, data } = input;
      const tableMap = { assistidos, processos, demandas, atendimentos, casos };
      const targetTable = tableMap[table];

      const { id: _id, createdAt: _ca, ...updateData } = data as any;

      await db
        .update(targetTable)
        .set({ ...updateData, updatedAt: new Date() } as any)
        .where(eq((targetTable as any).id, id));

      return { success: true };
    }),
});
