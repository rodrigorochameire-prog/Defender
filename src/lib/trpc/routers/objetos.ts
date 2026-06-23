import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import { objetos, participacoesObjeto } from "@/lib/db/schema/objetos";
import { processos, assistidos } from "@/lib/db/schema/core";
import { eq, and, isNull, desc, ilike, or, sql, inArray } from "drizzle-orm";
import { avaliarFlagsObjeto } from "@/lib/objetos/objetos-flags";

const TIPO = z.enum([
  "arma-fogo", "arma-branca", "droga", "veiculo", "celular", "dinheiro", "joia", "documento", "outro-bem",
]);
const PAPEL = z.enum(["apreendido", "utilizado", "produto-do-crime"]);
const DESTINO = z.enum(["pendente", "devolvido", "periciado", "incinerado", "em-custodia"]);

export const objetosRouter = router({
  /** Catálogo de objetos do workspace (busca por descrição/série/placa/marca). */
  listCatalogo: protectedProcedure
    .input(z.object({ search: z.string().optional(), tipo: TIPO.optional(), limit: z.number().max(200).default(50), offset: z.number().default(0) }).optional())
    .query(async ({ ctx, input }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const conds = [eq(objetos.workspaceId, wid)];
      if (input?.tipo) conds.push(eq(objetos.tipo, input.tipo));
      if (input?.search) {
        conds.push(
          or(
            ilike(objetos.descricaoLivre, `%${input.search}%`),
            ilike(objetos.numeroSerie, `%${input.search}%`),
            ilike(objetos.placa, `%${input.search}%`),
            ilike(objetos.marca, `%${input.search}%`),
          )!,
        );
      }
      return db.select().from(objetos).where(and(...conds)).orderBy(desc(objetos.updatedAt)).limit(input?.limit ?? 50).offset(input?.offset ?? 0);
    }),

  /** Objetos vinculados a um processo, com as flags de prova computadas. */
  listByProcesso: protectedProcedure
    .input(z.object({ processoId: z.number() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({ p: participacoesObjeto, o: objetos })
        .from(participacoesObjeto)
        .innerJoin(objetos, eq(objetos.id, participacoesObjeto.objetoId))
        .where(eq(participacoesObjeto.processoId, input.processoId));
      return rows.map((r) => ({
        participacaoId: r.p.id,
        objeto: r.o,
        papel: r.p.papel,
        destino: r.p.destino,
        dataApreensao: r.p.dataApreensao,
        flags: avaliarFlagsObjeto({ tipo: r.o.tipo }, { destino: r.p.destino }),
      }));
    }),

  /** Cria um objeto e o vincula a um processo. */
  create: protectedProcedure
    .input(
      z.object({
        tipo: TIPO,
        subtipo: z.string().optional(),
        numeroSerie: z.string().optional(),
        placa: z.string().optional(),
        modelo: z.string().optional(),
        marca: z.string().optional(),
        ano: z.number().int().optional(),
        calibre: z.string().optional(),
        tipoDroga: z.string().optional(),
        quantidade: z.number().optional(),
        unidade: z.string().optional(),
        valorEstimado: z.number().optional(),
        descricaoLivre: z.string().optional(),
        processoId: z.number(),
        pessoaId: z.number().optional(),
        papel: PAPEL.default("apreendido"),
        destino: DESTINO.default("pendente"),
        dataApreensao: z.string().optional(),
        localApreensao: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const wid = ctx.user.workspaceId ?? 1;
      const [obj] = await db
        .insert(objetos)
        .values({
          tipo: input.tipo,
          subtipo: input.subtipo ?? null,
          numeroSerie: input.numeroSerie ?? null,
          placa: input.placa ?? null,
          modelo: input.modelo ?? null,
          marca: input.marca ?? null,
          ano: input.ano ?? null,
          calibre: input.calibre ?? null,
          tipoDroga: input.tipoDroga ?? null,
          quantidade: input.quantidade != null ? String(input.quantidade) : null,
          unidade: input.unidade ?? null,
          valorEstimado: input.valorEstimado != null ? String(input.valorEstimado) : null,
          descricaoLivre: input.descricaoLivre ?? null,
          fonteCriacao: "manual",
          workspaceId: wid,
        } as any)
        .returning({ id: objetos.id });
      await db.insert(participacoesObjeto).values({
        objetoId: obj.id,
        processoId: input.processoId,
        pessoaId: input.pessoaId ?? null,
        papel: input.papel,
        destino: input.destino,
        dataApreensao: input.dataApreensao ?? null,
        localApreensao: input.localApreensao ?? null,
      } as any);
      return { id: obj.id };
    }),

  /** Atualiza o destino/papel de uma participação (ex.: marcar como periciado). */
  setDestino: protectedProcedure
    .input(z.object({ participacaoId: z.number(), destino: DESTINO }))
    .mutation(async ({ input }) => {
      await db.update(participacoesObjeto).set({ destino: input.destino, updatedAt: new Date() }).where(eq(participacoesObjeto.id, input.participacaoId));
      return { ok: true };
    }),

  /**
   * Cruzamento: objetos que aparecem em 2+ processos distintos (mesmo número de
   * série / placa, ou o mesmo registro de objeto). "Esta arma foi apreendida em
   * 3 casos" — bomba de defesa no júri. Para a Central de Inteligência.
   */
  emMultiplosCasos: protectedProcedure.query(async ({ ctx }) => {
    const wid = ctx.user.workspaceId ?? 1;
    const rows = await db
      .select({
        objetoId: participacoesObjeto.objetoId,
        tipo: objetos.tipo,
        descricao: objetos.descricaoLivre,
        numeroSerie: objetos.numeroSerie,
        placa: objetos.placa,
        n: sql<number>`count(distinct ${participacoesObjeto.processoId})::int`,
      })
      .from(participacoesObjeto)
      .innerJoin(objetos, and(eq(objetos.id, participacoesObjeto.objetoId), eq(objetos.workspaceId, wid)))
      .innerJoin(processos, and(eq(processos.id, participacoesObjeto.processoId), isNull(processos.deletedAt)))
      .groupBy(participacoesObjeto.objetoId, objetos.tipo, objetos.descricaoLivre, objetos.numeroSerie, objetos.placa)
      .having(sql`count(distinct ${participacoesObjeto.processoId}) >= 2`);
    return rows;
  }),
});
