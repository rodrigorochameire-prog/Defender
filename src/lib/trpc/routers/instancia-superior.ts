/**
 * Router de Instância Superior (TJBA)
 *
 * Gerencia recursos (apelações, HC, RESE), acórdãos,
 * desembargadores e inteligência de atuação no 2º grau.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { db } from "@/lib/db";
import {
  recursos,
  acordaos,
  desembargadores,
  defensoresBa,
} from "@/lib/db/schema";
import { processos, assistidos } from "@/lib/db/schema/core";
import { eq, and, desc, asc, sql, count, isNull, inArray, ilike, or } from "drizzle-orm";

// ==========================================
// INSTANCIA SUPERIOR ROUTER
// ==========================================

export const instanciaSuperiorRouter = router({
  // ==========================================
  // RECURSOS
  // ==========================================

  /** Listar recursos com filtros */
  listRecursos: protectedProcedure
    .input(
      z.object({
        tipo: z.string().optional(),
        status: z.string().optional(),
        resultado: z.string().optional(),
        camara: z.string().optional(),
        defensorDestinoId: z.number().optional(),
        assistidoId: z.number().optional(),
        verTodos: z.boolean().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input ?? {};
      const conditions = [];
      const isAdmin = ctx.user.role === "admin";

      // Escopo automático: admin com verTodos=true vê tudo;
      // defensor vê recursos onde é origem ou destino;
      // sem ponte (defensorBaId null) e sem verTodos → lista vazia
      if (isAdmin && input?.verTodos === true) {
        // sem filtro de escopo
      } else if (ctx.user.defensorBaId) {
        conditions.push(
          or(
            eq(recursos.defensorOrigemId, ctx.user.defensorBaId),
            eq(recursos.defensorDestinoId, ctx.user.defensorBaId)
          )!
        );
      } else {
        // sem ponte e não é admin verTodos → retorno defensivo vazio
        return { rows: [], total: 0 };
      }

      if (filters.tipo) conditions.push(eq(recursos.tipo, filters.tipo));
      if (filters.status) conditions.push(eq(recursos.status, filters.status));
      if (filters.resultado) conditions.push(eq(recursos.resultado, filters.resultado));
      if (filters.camara) conditions.push(eq(recursos.camara, filters.camara));
      if (filters.defensorDestinoId) conditions.push(eq(recursos.defensorDestinoId, filters.defensorDestinoId));
      if (filters.assistidoId) conditions.push(eq(recursos.assistidoId, filters.assistidoId));

      const [rows, totalRows] = await Promise.all([
        db
          .select({
            id: recursos.id,
            tipo: recursos.tipo,
            numeroRecurso: recursos.numeroRecurso,
            camara: recursos.camara,
            status: recursos.status,
            resultado: recursos.resultado,
            dataInterposicao: recursos.dataInterposicao,
            dataJulgamento: recursos.dataJulgamento,
            resumo: recursos.resumo,
            tesesInvocadas: recursos.tesesInvocadas,
            tiposPenais: recursos.tiposPenais,
            // Joins
            assistidoNome: assistidos.nome,
            processoNumero: processos.numeroAutos,
            relatorNome: desembargadores.nome,
            defensorOrigemNome: sql<string>`do.nome`.as("defensor_origem_nome"),
            defensorDestinoNome: sql<string>`dd.nome`.as("defensor_destino_nome"),
          })
          .from(recursos)
          .leftJoin(assistidos, eq(recursos.assistidoId, assistidos.id))
          .leftJoin(processos, eq(recursos.processoOrigemId, processos.id))
          .leftJoin(desembargadores, eq(recursos.relatorId, desembargadores.id))
          .leftJoin(sql`defensores_ba do`, sql`${recursos.defensorOrigemId} = do.id`)
          .leftJoin(sql`defensores_ba dd`, sql`${recursos.defensorDestinoId} = dd.id`)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(recursos.createdAt))
          .limit(filters.limit)
          .offset(filters.offset),
        db
          .select({ total: count() })
          .from(recursos)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ]);

      return { rows, total: totalRows[0]?.total ?? 0 };
    }),

  /** Buscar recurso por ID com detalhes completos */
  getRecurso: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [recurso] = await db
        .select()
        .from(recursos)
        .where(eq(recursos.id, input.id))
        .limit(1);

      if (!recurso) return null;

      // Buscar dados relacionados em paralelo
      const [acordaoRows, relator, defOrigem, defDestino, assistido, processo] = await Promise.all([
        db.select().from(acordaos).where(eq(acordaos.recursoId, recurso.id)).orderBy(desc(acordaos.dataJulgamento)),
        recurso.relatorId ? db.select().from(desembargadores).where(eq(desembargadores.id, recurso.relatorId)).limit(1) : Promise.resolve([]),
        recurso.defensorOrigemId ? db.select().from(defensoresBa).where(eq(defensoresBa.id, recurso.defensorOrigemId)).limit(1) : Promise.resolve([]),
        recurso.defensorDestinoId ? db.select().from(defensoresBa).where(eq(defensoresBa.id, recurso.defensorDestinoId)).limit(1) : Promise.resolve([]),
        recurso.assistidoId ? db.select({ id: assistidos.id, nome: assistidos.nome }).from(assistidos).where(eq(assistidos.id, recurso.assistidoId)).limit(1) : Promise.resolve([]),
        recurso.processoOrigemId ? db.select({ id: processos.id, numeroAutos: processos.numeroAutos, vara: processos.vara }).from(processos).where(eq(processos.id, recurso.processoOrigemId)).limit(1) : Promise.resolve([]),
      ]);

      return {
        ...recurso,
        acordaos: acordaoRows,
        relator: relator[0] ?? null,
        defensorOrigem: defOrigem[0] ?? null,
        defensorDestino: defDestino[0] ?? null,
        assistido: assistido[0] ?? null,
        processoOrigem: processo[0] ?? null,
      };
    }),

  /** Criar recurso */
  createRecurso: protectedProcedure
    .input(
      z.object({
        tipo: z.string(),
        numeroRecurso: z.string().optional(),
        processoOrigemId: z.number().optional(),
        assistidoId: z.number().optional(),
        defensorOrigemId: z.number().optional(),
        defensorDestinoId: z.number().optional(),
        camara: z.string().optional(),
        relatorId: z.number().optional(),
        dataInterposicao: z.string().optional(),
        tesesInvocadas: z.array(z.string()).optional(),
        tiposPenais: z.array(z.string()).optional(),
        resumo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [created] = await db
        .insert(recursos)
        .values({
          tipo: input.tipo,
          numeroRecurso: input.numeroRecurso,
          processoOrigemId: input.processoOrigemId,
          assistidoId: input.assistidoId,
          defensorOrigemId: input.defensorOrigemId,
          defensorDestinoId: input.defensorDestinoId,
          camara: input.camara,
          relatorId: input.relatorId,
          dataInterposicao: input.dataInterposicao,
          tesesInvocadas: input.tesesInvocadas ?? [],
          tiposPenais: input.tiposPenais ?? [],
          resumo: input.resumo,
        })
        .returning();

      return created;
    }),

  /**
   * Cria recurso a partir do formulário disparado ao protocolar uma demanda
   * de HC/Apelação/RSE/Agravo. Aceita relator por nome (find-or-create em
   * desembargadores) e combina câmara+turma numa única string. Evita
   * duplicata (mesmo processoOrigem+tipo ativo).
   */
  createRecursoFromForm: protectedProcedure
    .input(
      z.object({
        tipo: z.enum(["HC", "APELACAO", "RSE", "AGRAVO_EXECUCAO"]),
        numeroRecurso: z.string().optional(),
        processoOrigemId: z.number(),
        assistidoId: z.number().optional(),
        dataInterposicao: z.string().optional(), // YYYY-MM-DD
        camara: z.string().optional(),
        turma: z.string().optional(),
        relatorNome: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // 1. Checar duplicata: mesmo processoOrigem + tipo (qualquer status)
      const [existente] = await db
        .select({ id: recursos.id, numero: recursos.numeroRecurso })
        .from(recursos)
        .where(and(eq(recursos.processoOrigemId, input.processoOrigemId), eq(recursos.tipo, input.tipo)))
        .limit(1);
      if (existente) {
        return { created: false, recursoId: existente.id, duplicate: true };
      }

      // 2. Câmara combinada: "Turma X — Câmara Y" (ou só um dos dois)
      const camaraCombinada = [input.turma?.trim(), input.camara?.trim()]
        .filter(Boolean)
        .join(" — ") || null;

      // 3. Resolver relator por nome (find-or-create)
      let relatorId: number | null = null;
      if (input.relatorNome?.trim()) {
        const nome = input.relatorNome.trim();
        const [exist] = await db
          .select({ id: desembargadores.id })
          .from(desembargadores)
          .where(ilike(desembargadores.nome, nome))
          .limit(1);
        if (exist) {
          relatorId = exist.id;
        } else {
          const [novo] = await db
            .insert(desembargadores)
            .values({ nome, camara: input.camara?.trim() || null, area: "CRIMINAL" })
            .returning({ id: desembargadores.id });
          relatorId = novo.id;
        }
      }

      // 4. Inserir recurso
      const [created] = await db
        .insert(recursos)
        .values({
          tipo: input.tipo,
          numeroRecurso: input.numeroRecurso?.trim() || null,
          processoOrigemId: input.processoOrigemId,
          assistidoId: input.assistidoId,
          dataInterposicao: input.dataInterposicao || new Date().toISOString().slice(0, 10),
          camara: camaraCombinada,
          relatorId,
          tesesInvocadas: [],
          tiposPenais: [],
        })
        .returning();

      return { created: true, recursoId: created.id, duplicate: false };
    }),

  /** Atualizar recurso */
  updateRecurso: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.string().optional(),
        resultado: z.string().optional(),
        camara: z.string().optional(),
        relatorId: z.number().nullable().optional(),
        revisorId: z.number().nullable().optional(),
        defensorDestinoId: z.number().nullable().optional(),
        dataDistribuicao: z.string().nullable().optional(),
        dataPauta: z.string().nullable().optional(),
        dataJulgamento: z.string().nullable().optional(),
        dataTransito: z.string().nullable().optional(),
        tesesInvocadas: z.array(z.string()).optional(),
        resumo: z.string().nullable().optional(),
        observacoes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(recursos)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(recursos.id, id))
        .returning();

      return updated;
    }),

  // ==========================================
  // ACÓRDÃOS
  // ==========================================

  /** Criar acórdão vinculado a recurso */
  createAcordao: protectedProcedure
    .input(
      z.object({
        recursoId: z.number(),
        numeroAcordao: z.string().optional(),
        dataJulgamento: z.string().optional(),
        dataPublicacao: z.string().optional(),
        ementa: z.string().optional(),
        relator: z.string().optional(),
        resultado: z.string().optional(),
        votacao: z.string().optional(),
        driveFileId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [created] = await db
        .insert(acordaos)
        .values(input)
        .returning();

      // Atualizar status do recurso para JULGADO se ainda não estiver
      if (input.resultado) {
        await db
          .update(recursos)
          .set({
            status: "JULGADO",
            resultado: input.resultado,
            dataJulgamento: input.dataJulgamento,
            updatedAt: new Date(),
          })
          .where(eq(recursos.id, input.recursoId));
      }

      return created;
    }),

  /** Atualizar acórdão (inclui análise IA) */
  updateAcordao: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        ementa: z.string().optional(),
        resultado: z.string().optional(),
        votacao: z.string().optional(),
        votos: z.array(z.object({
          desembargadorId: z.number(),
          nome: z.string(),
          voto: z.string(),
          observacao: z.string().optional(),
        })).optional(),
        analiseIa: z.any().optional(),
        analiseStatus: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(acordaos)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(acordaos.id, id))
        .returning();

      return updated;
    }),

  // ==========================================
  // DESEMBARGADORES
  // ==========================================

  /** Listar desembargadores (filtro por câmara/área) */
  listDesembargadores: protectedProcedure
    .input(
      z.object({
        camara: z.string().optional(),
        area: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input?.camara) conditions.push(eq(desembargadores.camara, input.camara));
      if (input?.area) conditions.push(eq(desembargadores.area, input.area));

      return db
        .select()
        .from(desembargadores)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(desembargadores.nome));
    }),

  /** Criar desembargador */
  createDesembargador: protectedProcedure
    .input(z.object({
      nome: z.string(),
      camara: z.string().optional(),
      area: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [created] = await db.insert(desembargadores).values(input).returning();
      return created;
    }),

  // ==========================================
  // DEFENSORES BA (consulta)
  // ==========================================

  /** Buscar defensores da BA por área/instância */
  listDefensores: protectedProcedure
    .input(
      z.object({
        area: z.string().optional(),
        instancia: z.string().optional(),
        especialidade: z.string().optional(),
        localizacao: z.string().optional(),
        comarca: z.string().optional(),
        busca: z.string().optional(),
        limit: z.number().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const filters = input ?? {};
      const conditions = [eq(defensoresBa.ativo, true)];

      if (filters.area) conditions.push(eq(defensoresBa.area, filters.area));
      if (filters.instancia) conditions.push(eq(defensoresBa.instancia, filters.instancia));
      if (filters.especialidade) conditions.push(eq(defensoresBa.especialidade, filters.especialidade));
      if (filters.localizacao) conditions.push(eq(defensoresBa.localizacao, filters.localizacao));
      if (filters.comarca) conditions.push(eq(defensoresBa.comarca, filters.comarca));
      if (filters.busca) conditions.push(ilike(defensoresBa.nome, `%${filters.busca}%`));

      return db
        .select()
        .from(defensoresBa)
        .where(and(...conditions))
        .orderBy(asc(defensoresBa.nome))
        .limit(filters.limit);
    }),

  // ==========================================
  // INTELIGÊNCIA / ESTATÍSTICAS
  // ==========================================

  /** Estatísticas gerais da instância superior */
  stats: protectedProcedure.query(async () => {
    const [
      totalRecursos,
      porTipo,
      porResultado,
      porCamara,
      pendentes,
    ] = await Promise.all([
      db.select({ total: count() }).from(recursos),

      db
        .select({ tipo: recursos.tipo, total: count() })
        .from(recursos)
        .groupBy(recursos.tipo)
        .orderBy(desc(count())),

      db
        .select({ resultado: recursos.resultado, total: count() })
        .from(recursos)
        .where(sql`${recursos.resultado} != 'PENDENTE'`)
        .groupBy(recursos.resultado)
        .orderBy(desc(count())),

      db
        .select({ camara: recursos.camara, total: count() })
        .from(recursos)
        .where(sql`${recursos.camara} IS NOT NULL`)
        .groupBy(recursos.camara)
        .orderBy(desc(count())),

      db
        .select({ total: count() })
        .from(recursos)
        .where(eq(recursos.resultado, "PENDENTE")),
    ]);

    return {
      total: totalRecursos[0]?.total ?? 0,
      pendentes: pendentes[0]?.total ?? 0,
      porTipo,
      porResultado,
      porCamara,
    };
  }),

  /** Perfil de atuação de um desembargador */
  perfilDesembargador: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [info] = await db
        .select()
        .from(desembargadores)
        .where(eq(desembargadores.id, input.id))
        .limit(1);

      if (!info) return null;

      const [totalRelator, resultados, tesesFrequentes] = await Promise.all([
        db.select({ total: count() }).from(recursos).where(eq(recursos.relatorId, input.id)),

        db
          .select({ resultado: recursos.resultado, total: count() })
          .from(recursos)
          .where(and(eq(recursos.relatorId, input.id), sql`${recursos.resultado} != 'PENDENTE'`))
          .groupBy(recursos.resultado),

        // Teses mais frequentes nos acórdãos deste relator
        db
          .select({
            ementa: acordaos.ementa,
            resultado: acordaos.resultado,
            dataJulgamento: acordaos.dataJulgamento,
          })
          .from(acordaos)
          .innerJoin(recursos, eq(acordaos.recursoId, recursos.id))
          .where(eq(recursos.relatorId, input.id))
          .orderBy(desc(acordaos.dataJulgamento))
          .limit(20),
      ]);

      const totalJulgados = resultados.reduce((sum, r) => sum + Number(r.total), 0);
      const providos = resultados.find(r => r.resultado === "PROVIDO" || r.resultado === "CONCEDIDO");
      const taxaProvimento = totalJulgados > 0 ? ((Number(providos?.total ?? 0) / totalJulgados) * 100).toFixed(1) : null;

      return {
        ...info,
        totalComoRelator: totalRelator[0]?.total ?? 0,
        resultados,
        taxaProvimento,
        ultimosAcordaos: tesesFrequentes,
      };
    }),
});
